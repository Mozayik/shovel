import { ShovelTool } from "./ShovelTool"
import * as testUtil from "./testUtil"
import * as version from "./version"
import { ScriptError } from "./ScriptError"

let container = null

beforeEach(() => {
  container = {
    toolName: "shovel",
    log: {
      info: jest.fn(),
      warning: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      output: jest.fn(),
      enableSpinner: jest.fn(),
      startSpinner: jest.fn(),
      stopSpinner: jest.fn(),
    },
  }
})

test("constructor", () => {
  const tool = new ShovelTool()

  expect(tool).not.toBe(null)
  expect(tool.createSsh()).not.toBe(null)
  expect(tool.createSftp()).not.toBe(null)
})

test("assertHasNode", async () => {
  const ssh = {
    run: async (command, options) => {
      if (command === "node --version") {
        return {
          exitCode: 0,
          output: [ShovelTool.minNodeVersion],
        }
      } else {
        return {
          exitCode: 255,
          output: [""],
        }
      }
    },
  }
  const tool = new ShovelTool(container)

  await expect(tool.assertHasNode(ssh)).resolves.toBe(true)
})

test("rectifyHasNode", async () => {
  const tool = new ShovelTool(container)

  // Success
  const ssh = {
    run: async (command, options) => {
      if (command === 'bash -c "echo /$(date)"') {
        return {
          exitCode: 0,
          output: ["/" + new Date().toString()],
        }
      } else if (command === "node --version") {
        return {
          exitCode: 0,
          output: [ShovelTool.minNodeVersion],
        }
      } else if (command === "bash -c 'echo /$EUID'") {
        return {
          exitCode: 0,
          output: ["/0"],
        }
      } else {
        return {
          exitCode: 0,
          output: [""],
        }
      }
    },
  }
  const sftp = { putContent: async () => undefined }

  await expect(tool.rectifyHasNode(ssh, sftp)).resolves.toBeUndefined()

  // Test debug stuff now
  tool.debug = true
  await expect(tool.rectifyHasNode(ssh, sftp)).resolves.toBeUndefined()
  tool.debug = false

  // Unable to get date
  ssh.run = async (command, options) => ({
    exitCode: 0,
    output: [""],
  })
  await expect(tool.rectifyHasNode(ssh, sftp)).rejects.toThrow(Error)

  // Bad date
  ssh.run = async (command, options) => ({
    exitCode: 0,
    output: ["/Wed Oct 1 12:00:00 UTC 2010"],
  })
  await expect(tool.rectifyHasNode(ssh)).rejects.toThrow(Error)

  // Bad install
  ssh.run = async (command, options) => {
    if (command === 'bash -c "echo /$(date)"') {
      return {
        exitCode: 0,
        output: ["/" + new Date().toString()],
      }
    } else if (command === "mktemp") {
      return {
        exitCode: 0,
        output: [""],
      }
    } else {
      return {
        exitCode: 255,
        output: [""],
      }
    }
  }
  await expect(tool.rectifyHasNode(ssh, sftp)).rejects.toThrow(Error)

  // Bad install
  ssh.run = async (command, options) => {
    if (command === 'bash -c "echo /$(date)"') {
      return {
        exitCode: 0,
        output: ["/" + new Date().toString()],
      }
    } else if (command === "mktemp") {
      return {
        exitCode: 0,
        output: [""],
      }
    } else {
      return {
        exitCode: 255,
        output: [""],
      }
    }
  }
  await expect(tool.rectifyHasNode(ssh, sftp)).rejects.toThrow(Error)

  // Bad version
  ssh.run = async (command, options) => {
    if (command === 'bash -c "echo /$(date)"') {
      return {
        exitCode: 0,
        output: ["/" + new Date().toString()],
      }
    } else if (command === "node --version") {
      return {
        exitCode: 255,
        output: ["/255"],
      }
    } else {
      return {
        exitCode: 0,
        output: [""],
      }
    }
  }
  await expect(tool.rectifyHasNode(ssh, sftp)).rejects.toThrow(Error)
})

test("assertHasShovel", async () => {
  const ssh = {
    run: async (command, options) => ({
      exitCode: 0,
      output: [version.shortVersion],
    }),
  }
  const tool = new ShovelTool(container)

  await expect(tool.assertHasShovel(ssh)).resolves.toBe(true)
})

test("rectifyHasShovel", async () => {
  const ssh = {
    run: async (command, options) => {
      if (command === `npm install -g ${ShovelTool.npmPackageName}`) {
        return {
          exitCode: 0,
          output: [],
        }
      } else if (command === "shovel --version") {
        return {
          exitCode: 0,
          output: [version.shortVersion],
        }
      } else {
        return {
          exitCode: 0,
          output: [""],
        }
      }
    },
  }
  const tool = new ShovelTool(container)

  // Success
  await expect(tool.rectifyHasShovel(ssh)).resolves.toBeUndefined()

  // Failed after install
  ssh.run = async (command, options) => ({
    exitCode: 255,
    output: [],
  })
  await expect(tool.rectifyHasShovel(ssh)).rejects.toThrow(Error)

  // Failed install
  ssh.run = async (command, options) => {
    return {
      exitCode: 0,
      output: [""],
    }
  }
  await expect(tool.rectifyHasShovel(ssh)).rejects.toThrow(Error)
})

test("loadScriptFile", async () => {
  Object.assign(container, { fs: { readFile: (path) => "[]" } })

  const tool = new ShovelTool(container)

  // Bad empty script
  await expect(tool.loadScriptFile("test.shovel")).rejects.toThrow(ScriptError)

  // Empty script
  container.fs.readFile = async (path) => "{}"
  await expect(tool.loadScriptFile("test.shovel")).resolves.not.toBeNull()

  // Clean script
  container.fs.readFile = async (path) =>
    `{
      metadata: {},
      includes: ["something.shovel"],
      vars: { a: 1, b: null, c: [1,2,3], d: { x: "x" }},
      statements: [{assert: "Thing", with: {}}],
    }`
  await expect(tool.loadScriptFile("test.shovel")).resolves.not.toBeNull()

  // Bad metadata
  container.fs.readFile = async (path) =>
    `{
      metadata: [],
    }`
  await expect(tool.loadScriptFile("test.shovel")).rejects.toThrow(ScriptError)

  // Bad description
  container.fs.readFile = async (path) =>
    `{
      metadata: {description: 1},
    }`
  await expect(tool.loadScriptFile("test.shovel")).rejects.toThrow(ScriptError)

  // Bad includes
  container.fs.readFile = async (path) =>
    `{
      includes: {},
    }`
  await expect(tool.loadScriptFile("test.shovel")).rejects.toThrow(ScriptError)

  // Bad include type
  container.fs.readFile = async (path) =>
    `{
      includes: [1],
    }`
  await expect(tool.loadScriptFile("test.shovel")).rejects.toThrow(ScriptError)

  // Bad include absolute path
  container.fs.readFile = async (path) =>
    `{
      includes: ["/absolute/path"],
    }`
  await expect(tool.loadScriptFile("test.shovel")).rejects.toThrow(ScriptError)

  // Bad vars
  container.fs.readFile = async (path) =>
    `{
      vars: [],
    }`
  await expect(tool.loadScriptFile("test.shovel")).rejects.toThrow(ScriptError)

  // Bad statements
  container.fs.readFile = async (path) =>
    `{
      statements: {},
    }`
  await expect(tool.loadScriptFile("test.shovel")).rejects.toThrow(ScriptError)

  // Bad statement
  container.fs.readFile = async (path) =>
    `{
      statements: [1],
    }`
  await expect(tool.loadScriptFile("test.shovel")).rejects.toThrow(ScriptError)

  // Missing statement name
  container.fs.readFile = async (path) =>
    `{
      statements: [{}],
    }`
  await expect(tool.loadScriptFile("test.shovel")).rejects.toThrow(ScriptError)

  // Bad statement name
  container.fs.readFile = async (path) =>
    `{
      statements: [{ assert: 1 }],
    }`
  await expect(tool.loadScriptFile("test.shovel")).rejects.toThrow(ScriptError)

  // Bad statement description
  container.fs.readFile = async (path) =>
    `{
      statements: [{ assert: "Thing", description: 1 }],
    }`
  await expect(tool.loadScriptFile("test.shovel")).rejects.toThrow(ScriptError)

  // Bad statement with
  container.fs.readFile = async (path) =>
    `{
      statements: [{ assert: "Thing", with: 1 }],
    }`
  await expect(tool.loadScriptFile("test.shovel")).rejects.toThrow(ScriptError)
  // Bad statement when
  container.fs.readFile = async (path) =>
    `{
      statements: [{ assert: "Thing", when: 1 }],
    }`
  await expect(tool.loadScriptFile("test.shovel")).rejects.toThrow(ScriptError)
})

test("createScriptContext", async () => {
  Object.assign(container, {
    fs: {
      readFile: (path) => {
        switch (path) {
          case "/a/b.shovel":
            // Adding c.shovel twice is not a mistake
            return `{
          includes: [
            "./c.shovel",
            "./c.shovel",
          ],
          statements: [
            {
              assert: "Something",
              with: {},
              become: true,
            }
          ]
        }`
          case "/a/c.shovel":
            return `{
          statements: []
          }`
          case "/a/d.shovel":
            return `{
            includes: [
              "../e.shovel",
            ]
          }`
          default:
            throw new Error()
        }
      },
    },
  })

  const tool = new ShovelTool(container)

  await expect(tool.createScriptContext("/a/b.shovel")).resolves.toMatchObject({
    anyScriptHasBecomes: true,
    rootScriptDirPath: "/a",
    scriptNodes: expect.any(Map),
    scriptPaths: expect.any(Array),
  })

  await expect(tool.createScriptContext("/a/d.shovel")).rejects.toThrow(
    ScriptError
  )
})

test("createRunContext", async () => {
  Object.assign(container, {
    util: {
      osInfo: async () => ({
        platform: "blah",
        id: "blah",
        versionId: "1.2.3",
      }),
      userInfo: () => ({}),
    },
    fs: {
      readFileSync: () => "foobar",
    },
  })

  const tool = new ShovelTool(container)
  const scriptNode = testUtil.createScriptNode("a.shovel")
  let result = await tool.createRunContext(scriptNode)

  expect(result).not.toBe(null)
  expect(result.interpolator).not.toBe(null)

  result.runContext.results.push({ a: 1, b: 2 })

  // fs functions
  expect(
    result.interpolator(
      testUtil.createNode(scriptNode.filename, "{fs.readFile('blah')}")
    )
  ).toBe("foobar")

  // path functions
  expect(
    result.interpolator(
      testUtil.createNode(scriptNode.filename, "{path.join('foo', 'bar')}")
    )
  ).toBe("foo/bar")
  expect(
    result.interpolator(
      testUtil.createNode(scriptNode.filename, "{path.dirname('foo/bar')}")
    )
  ).toBe("foo")
  expect(
    result.interpolator(
      testUtil.createNode(scriptNode.filename, "{path.basename('foo/bar.zip')}")
    )
  ).toBe("bar.zip")
  expect(
    result.interpolator(
      testUtil.createNode(scriptNode.filename, "{path.extname('foo/bar.zip')}")
    )
  ).toBe(".zip")

  // dateTime functions
  expect(
    result.interpolator(
      testUtil.createNode(
        scriptNode.filename,
        "{dateTime.asLocal('2020-02-09T00:28:31.710Z')}"
      )
    )
  ).toBe(new Date("2020-02-09T00:28:31.710Z").toString())
  expect(
    result.interpolator(
      testUtil.createNode(scriptNode.filename, "{dateTime.asLocal()}")
    )
  ).not.toBeNull()
  expect(
    result.interpolator(
      testUtil.createNode(
        scriptNode.filename,
        "{dateTime.asISO('Sat Feb 08 2020 16:28:31 GMT-0800 (Pacific Standard Time)')}"
      )
    )
  ).toBe("2020-02-09T00:28:31.000Z")
  expect(
    result.interpolator(
      testUtil.createNode(scriptNode.filename, "{dateTime.asISO()}")
    )
  ).not.toBeNull()

  // moustache
  expect(
    result.interpolator(
      testUtil.createNode(
        scriptNode.filename,
        "{util.moustache('Is it that {{1 + 2}} === 3?')}"
      )
    )
  ).toBe("Is it that 3 === 3?")
  expect(() =>
    result.interpolator(
      testUtil.createNode(scriptNode.filename, "{util.moustache('{{_}}')}")
    )
  ).toThrow(ScriptError)

  // results
  expect(
    result.interpolator(
      testUtil.createNode(scriptNode.filename, "{results.last()}")
    )
  ).toEqual({ a: 1, b: 2 })

  // Interpolation with vars
  result = await tool.createRunContext(scriptNode)

  expect(result).toMatchObject({
    runContext: {},
  })
  expect(
    result.interpolator(testUtil.createNode(scriptNode.filename, "test"))
  ).toBe("test")
  expect(() =>
    result.interpolator(testUtil.createNode(scriptNode.filename, 1))
  ).toThrow(Error)
  expect(() =>
    result.interpolator(testUtil.createNode(scriptNode.filename, "{noFunc()}"))
  ).toThrow(ScriptError)
})

test("updateRunContext", async () => {
  const tool = new ShovelTool(container)
  const interpolator = (n) =>
    typeof n.type === "string" &&
    n.value.startsWith("{") &&
    n.value.endsWith("}")
      ? n.value.substring(1, n.value.length - 1)
      : n.value
  const runContext = {
    sys: {},
    vars: {},
  }
  const scriptNode = testUtil.createScriptNode("a.shovel")
  const testVars = {
    s: "{2}",
    n: 1,
    x: null,
    b: true,
    a: [1, 2, 3],
    b: [{}, { x: 10 }, { x: 11 }],
    c: ["1", "2", "{3}"],
    d: [[1, 2], [3], [4]],
    o: { s: "a", n: 2 },
    local: { s: "{1}" },
  }

  // Interpolation with vars
  scriptNode.value.vars = testUtil.createNode(scriptNode.filename, testVars)

  expect(
    tool.updateRunContext(runContext, interpolator, scriptNode, {
      interpolateOnlyLocalVars: true,
    })
  ).toBeUndefined()
  expect(runContext.vars).toEqual({
    s: "{2}",
    n: 1,
    x: null,
    b: true,
    a: [1, 2, 3],
    b: [{}, { x: 10 }, { x: 11 }],
    c: ["1", "2", "{3}"],
    d: [[1, 2], [3], [4]],
    o: { s: "a", n: 2 },
    local: { s: "1" },
  })

  scriptNode.value.vars = testUtil.createNode(scriptNode.filename, testVars)
  expect(
    tool.updateRunContext(runContext, interpolator, scriptNode)
  ).toBeUndefined()
  expect(runContext.vars).toEqual({
    s: "2",
    n: 1,
    x: null,
    b: true,
    a: [1, 2, 3],
    b: [{}, { x: 10 }, { x: 11 }],
    c: ["1", "2", "3"],
    d: [[1, 2], [3], [4]],
    o: { s: "a", n: 2 },
    local: { s: "1" },
  })
})

test("runScriptLocally", async () => {
  Object.assign(container, {
    debug: true,
    assertions: {
      TestAssert: class TestAssert {
        constructor() {}
        async assert(node) {
          const withNode = node.value.with

          return withNode && withNode.value.assert
        }
        async rectify() {}
        result() {}
      },
    },
    util: { runningAsRoot: () => true },
    process: {
      seteuid: () => undefined,
      setegid: () => undefined,
      env: {
        SUDO_UID: "1",
        SUDO_GID: "1",
      },
    },
    fs: {
      readFile: async (path) => {
        switch (path) {
          case "/x/a.shovel":
            return `{
              metadata: {
                description: "test",
              },
              statements: [
                {
                  description: "test",
                  assert: "TestAssert",
                  with: {},
                  become: "root",
                  when: "",
                },
                {
                  assert: "TestAssert",
                  with: {},
                  become: "root",
                  when: false,
                },
                {
                  assert: "TestAssert",
                  with: {
                    assert: true,
                  },
                },
              ],
            }`
          case "/x/b.shovel":
            return `{
              metadata: {
                description: "test",
              },
              statements: [
                {
                  assert: "TestAssert",
                  with: {}
                }
              ]
            }`
          case "/x/c.shovel":
            return `{
              statements: [
                {
                  assert: "UnknownAsert",
                  with: {}
                }
              ]
            }`
          default:
            throw new Error()
        }
      },
    },
  })

  const tool = new ShovelTool(container)

  tool.createRunContext = jest.fn(async () => ({
    runContext: { vars: { a: 1 }, results: [] },
    interpolator: (s) => s,
  }))
  tool.updateRunContext = jest.fn()

  // Has becomes
  await expect(
    tool.runScriptLocally("/x/a.shovel", {
      noSpinner: true,
    })
  ).resolves.toBeUndefined()

  // Has becomes and not running as root
  container.util.runningAsRoot = () => false
  await expect(tool.runScriptLocally("/x/a.shovel")).rejects.toThrow(
    "not running as root"
  )

  // No becomes and only asserts
  tool.debug = false
  await expect(
    tool.runScriptLocally("/x/b.shovel", { assertOnly: true })
  ).resolves.toBeUndefined()

  // Bad assertion
  await expect(tool.runScriptLocally("/x/c.shovel")).rejects.toThrow(
    ScriptError
  )
})

test("runScriptRemotely", async () => {
  Object.assign(container, {
    debug: true,
    createSsh: () => ({
      connect: async () => undefined,
      run: async (command, options) => ({
        exitCode: 0,
        output: "/tmp/1234",
      }),
      close: () => undefined,
    }),
    createSftp: () => ({
      connect: async () => undefined,
      putContent: async () => undefined,
      close: () => undefined,
    }),
    fs: {
      readFile: async (path) => {
        switch (path) {
          case "/x/a.shovel":
            return `{
              includes: [
                "b.shovel",
              ],
              statements: [
                {
                  assert: "Something",
                  with: {},
                  become: "root",
                }
              ],
            }`
          case "/x/b.shovel":
            return `{
              statements: [],
            }`
          default:
            throw new Error()
        }
      },
    },
  })
  const tool = new ShovelTool(container)

  tool.assertHasNode = () => true
  tool.assertHasShovel = () => true
  tool.createRunContext = async () => ({
    runContext: { sys: {}, vars: {} },
    interpolator: (s) => s,
  })

  // Happy path
  await tool.runScriptRemotely("/x/a.shovel", {
    user: "test",
    password: "test",
    host: "somehost",
  })
  await expect(
    tool.runScriptRemotely("/x/b.shovel", {
      user: "test",
      password: "test",
      host: "somehost",
    })
  ).resolves.toBeUndefined()

  // Without Node or Shovel
  tool.debug = false
  tool.assertHasNode = () => false
  tool.assertHasShovel = () => false
  tool.rectifyHasNode = async () => undefined
  tool.rectifyHasShovel = async () => undefined
  await expect(
    tool.runScriptRemotely("/x/a.shovel", {
      user: "test",
      password: "test",
      host: "somehost",
      noSpinner: true,
      assertOnly: true,
    })
  ).resolves.toBeUndefined()

  // SSH creation throws
  tool.createSsh = () => ({
    connect: async () => {
      throw new Error("bad ssh connect")
    },
    close: () => undefined,
  })
  await expect(
    tool.runScriptRemotely("/x/b.shovel", {
      user: "test",
      password: "test",
      host: "somehost",
    })
  ).rejects.toThrow("bad ssh connect")
})

test("run", async () => {
  container.util = {
    parsePort: () => 0,
  }
  container.fs = {
    readFile: async () =>
      '[{ host: "foo", port: 22, user: "fred", identity: "bar" }]',
  }

  const tool = new ShovelTool(container)

  tool.runScriptLocally = async () => undefined
  tool.runScriptRemotely = async () => undefined

  // Help
  await expect(tool.run(["--help"])).resolves.toBeUndefined()

  expect(container.log.info.mock.calls[0][0]).toEqual(
    expect.stringContaining("--help")
  )

  container.log.info.mockClear()

  // Version
  await expect(tool.run(["--version"])).resolves.toBeUndefined()
  expect(container.log.info.mock.calls[0][0]).toEqual(
    expect.stringMatching(/\d\.\d\.\d/)
  )

  // Happy path
  await expect(tool.run(["somescript.shovel"])).resolves.toBeUndefined()

  // No scripts and unknown argument
  await expect(tool.run(["-unknown"])).rejects.toThrow("script file")
  expect(container.log.warning.mock.calls[0][0]).toEqual(
    expect.stringMatching("not recognized")
  )

  // Too many scripts
  await expect(
    tool.run(["somescript.shovel", "otherscript.shovel"])
  ).rejects.toThrow(Error)

  // Missing host/hosts-file
  await expect(
    tool.run(["--identity", "id_rsa", "otherscript.shovel"])
  ).rejects.toThrow(Error)

  // Running script
  await expect(
    tool.run(["somescript.shovel", "--host", "somehost"])
  ).resolves.toBeUndefined()

  // Hosts file
  await tool.run(["somescript.shovel", "--hostFile", "hostfile.shovel"])

  // Running remote script that fails
  tool.runScriptRemotely = async () => {
    throw new Error()
  }
  await expect(
    tool.run(["somescript.shovel", "--debug", "--host", "somehost"])
  ).rejects.toThrow("hosts")

  // Running remote script that fails (no debug)
  await expect(
    tool.run(["somescript.shovel", "--host", "somehost"])
  ).rejects.toThrow(Error)
})
