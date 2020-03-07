import stream from "stream"
import { createNode } from "./testUtil"
import { ScriptError } from "./ScriptError"
import { Utility, PathInfo, PathAccess } from "./util"
import fs from "fs-extra"

const testString = "the quick brown fox jumps over the lazy dog"

test("PathAccess", () => {
  let access = new PathAccess(7)

  expect(access.isReadable()).toBe(true)
  expect(access.isReadWrite()).toBe(true)
  expect(access.isExecutable()).toBe(true)
  expect(access.isTraversable()).toBe(true)
  expect(access.toString()).toBe("rwx")

  access = new PathAccess(0)

  expect(access.isReadable()).toBe(false)
  expect(access.isReadWrite()).toBe(false)
  expect(access.isExecutable()).toBe(false)
  expect(access.isTraversable()).toBe(false)
  expect(access.toString()).toBe("---")
})

test("PathInfo", async () => {
  const container = {
    process: {
      geteuid: () => 1,
      getgroups: () => [1, 2],
    },
  }
  const util = new Utility(container)

  // File
  let info = new PathInfo(
    {
      isFile: () => true,
      gid: 1,
      uid: 1,
      size: 100,
      mode: 0o777,
    },
    container
  )

  expect(info).toMatchObject({
    uid: 1,
    gid: 1,
    mode: 0o777,
    size: 100,
    type: 1,
  })
  expect(info.isFile()).toBe(true)
  expect(info.toString()).toBe(
    '{"type":1,"size":100,"uid":1,"gid":1,"mode":511}'
  )
  expect(info.modeString()).toBe("rwxrwxrwx")
  expect(info.getAccess().isReadable()).toBe(true)

  // Inaccessible directory
  info = new PathInfo(
    {
      isFile: () => false,
      isDirectory: () => true,
      uid: 0,
      gid: 2,
      size: 0,
      mode: 0,
    },
    container
  )
  expect(info).toMatchObject({
    uid: 0,
    gid: 2,
    size: 0,
    mode: 0,
    type: 2,
  })
  expect(info.isDirectory()).toBe(true)
  expect(info.modeString()).toBe("---------")
  expect(info.getAccess().isWriteable()).toBe(false)

  // Other
  info = new PathInfo(
    {
      isFile: () => false,
      isDirectory: () => false,
      uid: 0,
      gid: 0,
      size: 0,
      mode: 0o666,
    },
    container
  )
  expect(info).toMatchObject({
    type: 3,
    mode: 0o666,
    uid: 0,
    gid: 0,
    size: 0,
  })
  expect(info.isOther()).toBe(true)
  expect(info.getAccess(1, [1, 2]).isReadWrite()).toBe(true)
  expect(info.getAccess(0, [0]).isReadWrite()).toBe(true)

  // Bad file
  info = await util.pathInfo("/noexist")
  expect(info).toMatchObject({
    type: 0,
  })
  expect(info.isMissing()).toBe(true)
  expect(info.toString()).toBe('{"type":0}')
})

test("generateDigestFromFile", async () => {
  const util = new Utility({
    fs: {
      createReadStream: jest.fn((fileName) => {
        return new stream.Readable({
          read(size) {
            this.push(testString)
            this.push(null)
          },
        })
      }),
    },
  })

  await expect(util.generateDigestFromFile(testString)).resolves.toBe(
    "05c6e08f1d9fdafa03147fcb8f82f124c76d2f70e3d989dc8aadb5e7d7450bec"
  )
})

test("generateDigest", () => {
  const util = new Utility()

  expect(util.generateDigest(testString)).toBe(
    "05c6e08f1d9fdafa03147fcb8f82f124c76d2f70e3d989dc8aadb5e7d7450bec"
  )
})

test("pathInfo", async () => {
  const container = {
    fs: {
      lstat: async (pathName) => null,
    },
  }
  const util = new Utility(container)

  // Good(ish) file
  await expect(util.pathInfo("/file")).resolves.toMatchObject({
    type: 0,
  })

  // Bad file
  await expect(util.pathInfo("/noexist")).resolves.toMatchObject({
    type: 0,
  })
})

test("pipeToPromise", async () => {
  const util = new Utility()
  let readable = new stream.Readable({
    read(size) {
      this.push(testString)
      this.push(null)
    },
  })
  let writeable = new stream.Writable({
    write(chunk, encoding, callback) {
      callback()
    },
  })

  await expect(util.pipeToPromise(readable, writeable)).resolves.toBeUndefined()

  readable = new stream.Readable({
    read(size) {
      process.nextTick(() => this.emit("error", new Error()))
    },
  })

  await expect(util.pipeToPromise(readable, writeable)).rejects.toThrow(Error)

  // Readable is only useful once
  readable = new stream.Readable({
    read(size) {
      this.push(testString)
      this.push(null)
    },
  })
  writeable = new stream.Writable({
    write(chunk, encoding, callback) {
      callback(new Error())
    },
  })

  await expect(util.pipeToPromise(readable, writeable)).rejects.toThrow(Error)
})

test("runningAsRoot", async () => {
  const util = new Utility({
    os: {
      userInfo: jest.fn(() => ({
        uid: 0,
      })),
    },
  })

  expect(util.runningAsRoot()).toBe(true)
})

test("getUsers", async () => {
  const container = {
    os: { userInfo: () => ({ uid: 1000, gid: 1000 }) },
    fs: {
      readFile: async (path) => {
        if (path === "/etc/passwd") {
          return `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
someuser:x:1000:1000:Some User:/home/someuser:/bin/bash
sshd:x:110:65534::/run/sshd:/usr/sbin/nologin
ntp:x:111:113::/nonexistent:/usr/sbin/nologin`
        } else if (path === "/etc/shadow") {
          return `root:*:17941:0:99999:7:::
daemon:*:17941:0:99999:7:::
extra:!:1234:0:99999:7:::
proxy:!:18093::::::
www-data:*:18267:0:99999:7:::
someuser:$6$asthoeu08aeoust/:18010:0:99999:7:::
sshd:*:18267:0:99999:7:::
ntp:*:18267:0:99999:7:::`
        }
      },
    },
  }
  const util = new Utility(container)

  await expect(util.getUsers()).resolves.toContainEqual({
    name: "proxy",
    uid: 13,
    gid: 13,
    homeDir: "/bin",
    shell: "/usr/sbin/nologin",
    comment: "proxy",
  })

  container.os.userInfo = () => ({ uid: 0, gid: 0 })

  await expect(util.getUsers()).resolves.toContainEqual({
    name: "someuser",
    passwordDisabled: false,
    uid: 1000,
    gid: 1000,
    homeDir: "/home/someuser",
    shell: "/bin/bash",
    comment: "Some User",
  })
})

test("getGroups", async () => {
  const util = new Utility({
    fs: {
      readFile: jest.fn(async (path, options) => {
        return `root:x:0:
daemon:x:1:
bin:x:2:
sys:x:3:
adm:x:4:syslog,someuser
tty:x:5:
disk:x:6:
lp:x:7:
mail:x:8:
news:x:9:
uucp:x:10:
man:x:12:
cdrom:x:24:someuser
floppy:x:25:
tape:x:26:
sudo:x:27:someuser`
      }),
    },
  })

  await expect(util.getGroups()).resolves.toContainEqual({
    name: "adm",
    password: "x",
    gid: 4,
    users: ["syslog", "someuser"],
  })
})

test("getLoginDefs", async () => {
  const util = new Utility({
    fs: {
      readFile: jest.fn(async (path) => {
        return `#
# /etc/login.defs - Configuration control definitions for the login package.
   # REQUIRED for useradd/userdel/usermod
MAIL_DIR        /var/mail
#MAIL_FILE      .mail`
      }),
    },
  })

  await expect(util.getLoginDefs()).resolves.toEqual({
    MAIL_DIR: "/var/mail",
  })
})

test("parseOwnerNode", async () => {
  const util = new Utility()

  expect(util.parseOwnerNode(null, [], [])).toEqual({})

  expect(util.parseOwnerNode(createNode("test.json5", {}), [], [])).toEqual({})

  expect(
    util.parseOwnerNode(
      createNode("test.json5", {
        user: "root",
        group: "wheel",
      }),
      [{ name: "root", uid: 0 }],
      [{ name: "wheel", gid: 0 }]
    )
  ).toEqual({ uid: 0, gid: 0 })

  expect(
    util.parseOwnerNode(
      createNode("test.json5", {
        user: 0,
        group: 0,
      }),
      [{ name: "root", uid: 0 }],
      [{ name: "wheel", gid: 0 }]
    )
  ).toEqual({ uid: 0, gid: 0 })

  expect(() => util.parseOwnerNode(createNode("test.json5"), [], [])).toThrow(
    ScriptError
  )

  expect(() =>
    util.parseOwnerNode(createNode("test.json5", { user: true }), [], [])
  ).toThrow(ScriptError)

  expect(() =>
    util.parseOwnerNode(
      createNode("test.json5", {
        user: 0,
      }),
      [],
      []
    )
  ).toThrow(Error)

  expect(() =>
    util.parseOwnerNode(createNode("test.json5", { group: true }), [], [])
  ).toThrow(ScriptError)

  expect(() =>
    util.parseOwnerNode(
      createNode("test.json5", {
        group: 0,
      }),
      [],
      []
    )
  ).toThrow(Error)
})

test("parseModeNode", async () => {
  const util = new Utility()

  expect(util.parseModeNode(null)).toBe(0o644)

  expect(() => util.parseModeNode(1)).toThrow(ScriptError)

  expect(
    util.parseModeNode(
      createNode("test.json5", {
        user: "-wx",
        group: "r-x",
        other: "r--",
      })
    )
  ).toBe(0o354)

  expect(() =>
    util.parseModeNode(
      createNode("test.json5", {
        user: "abc",
      })
    )
  ).toThrow(ScriptError)

  expect(util.parseModeNode(createNode("test.json5", {}))).toBe(0o000)
})

test("parseNode", async () => {
  const util = new Utility()
  const interpolator = (node) => {
    if (node.value === "{true}") {
      return true
    } else if (node.value === "{{}}") {
      return {}
    } else if (node.value === "{null}") {
      return null
    } else if (node.value === "{[]}") {
      return []
    } else {
      return node.value
    }
  }
  const withNode = createNode("test.json5", {
    s: "abc",
    n: 2,
    b: false,
    c: "{true}",
    o: "{{}}",
    a: "{[]}",
    v: "{null}",
  })

  // Happy path
  expect(util.parseNode({ withNode, name: "s", type: "string" })).toEqual({
    node: withNode.value.s,
    value: "abc",
  })

  // Missing node
  expect(() => util.parseNode({ withNode, name: "t", type: "string" })).toThrow(
    ScriptError
  )

  // Missing node with defaultValue
  expect(
    util.parseNode({ withNode, name: "t", type: "string", defaultValue: "xyz" })
  ).toEqual({ node: withNode, value: "xyz" })

  // Interpolated string to boolean
  expect(
    util.parseNode({ withNode, name: "c", type: "boolean", interpolator })
  ).toEqual({
    node: withNode.value.c,
    value: true,
  })

  // Interpolated string to object
  expect(
    util.parseNode({ withNode, name: "o", type: "object", interpolator })
  ).toEqual({
    node: withNode.value.o,
    value: {},
  })

  // Interpolated string to null
  expect(
    util.parseNode({ withNode, name: "v", type: "null", interpolator })
  ).toEqual({
    node: withNode.value.v,
    value: null,
  })

  // Interpolated string to array
  expect(
    util.parseNode({ withNode, name: "a", type: "array", interpolator })
  ).toEqual({
    node: withNode.value.a,
    value: [],
  })

  // Interpolated string to wrong type
  expect(() =>
    util.parseNode({ withNode, name: "c", type: "string", interpolator })
  ).toThrow(ScriptError)
})

test("osInfo", async () => {
  const util = new Utility({
    osInfo: async () => ({ id: "", platform: "", version_id: "" }),
  })

  await expect(util.osInfo()).resolves.toEqual({
    id: "",
    platform: "",
    versionId: "",
  })
})

test("parsePort", () => {
  const util = new Utility()

  expect(util.parsePort("123")).toBe(123)
  expect(util.parsePort(123)).toBe(123)
  expect(util.parsePort(true)).toBeUndefined()
  expect(() => util.parsePort("70000")).toThrow(Error)
})

test("expandTilde", async () => {
  const util = new Utility({ process: { env: { HOME: "/x/y" } } })

  expect(util.expandTilde("~/a.txt")).toBe("/x/y/a.txt")
  expect(util.expandTilde("a.txt")).toBe("a.txt")
})

test("userInfo", () => {
  const util = new Utility({
    os: {
      userInfo: () => ({
        username: "",
        uid: 0,
        gid: 0,
        shell: "",
        homedir: "",
      }),
    },
  })

  expect(util.userInfo()).toEqual({
    name: "",
    uid: 0,
    gid: 0,
    shell: "",
    homeDir: "",
  })
})
