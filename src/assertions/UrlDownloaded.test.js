import { UrlDownloaded } from "./UrlDownloaded"
import util, { createAssertNode, PathInfo, ScriptError } from "../utility"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    process: {
      geteuid: () => 1,
      getgroups: () => [1, 2],
    },
    os: {
      userInfo: () => ({
        uid: 0,
        gid: 0,
      }),
    },
    util: {
      getUsers: async () => [
        { uid: 0, gid: 0, name: "root" },
        { uid: 10, gid: 10, name: "user1" },
        { uid: 20, gid: 10, name: "user2" },
      ],
      getGroups: async () => [
        { gid: 0, name: "root" },
        { gid: 10, name: "group1" },
        { gid: 20, name: "group2" },
      ],
      parseOwnerNode: util.parseOwnerNode,
      parseModeNode: util.parseModeNode,
      pathInfo: async (path) => {
        if (
          path === "/dir/somefile" ||
          path === "/dir/badfile" ||
          path === "/noaccess/badfile"
        ) {
          return new PathInfo(
            {
              isFile: () => true,
              isDirectory: () => false,
              size: 100,
              uid: 1,
              gid: 1,
              mode: 0o777,
            },
            container
          )
        } else if (path === "/dir") {
          return new PathInfo(
            {
              isFile: () => false,
              isDirectory: () => true,
              size: 0,
              uid: 1,
              gid: 1,
              mode: 0o777,
            },
            container
          )
        } else if (path === "/noaccess") {
          return new PathInfo(
            {
              isFile: () => false,
              isDirectory: () => true,
              size: 0,
              uid: 1,
              gid: 1,
              mode: 0o555,
            },
            container
          )
        } else {
          return new PathInfo()
        }
      },
      generateDigestFromFile: async (path) => {
        if (path === "/dir/badfile" || path === "/noaccess/badfile") {
          return "0987654321"
        } else {
          return "1234567890"
        }
      },
    },
  }
  const testUrl = "http://localhost/somefile.txt"
  const assertion = new UrlDownloaded(container)

  // Missing/bad url
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { url: 1 }))
  ).rejects.toThrow(ScriptError)

  // Missing/bad digest
  await expect(
    assertion.assert(createAssertNode(assertion, { url: "" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { url: "", digest: 1 }))
  ).rejects.toThrow(ScriptError)

  // Missing/bad file
  await expect(
    assertion.assert(createAssertNode(assertion, { url: "", digest: "" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, { url: "", digest: "", file: 1 })
    )
  ).rejects.toThrow(ScriptError)

  // With correct file already in place
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        url: testUrl,
        digest: "1234567890",
        file: "/dir/somefile",
      })
    )
  ).resolves.toBe(true)

  // With no file in place
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        url: testUrl,
        digest: "1234567890",
        file: "/dir/missingfile",
      })
    )
  ).resolves.toBe(false)

  // Bad checksum
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        url: testUrl,
        digest: "1234567890",
        file: "/dir/badfile",
      })
    )
  ).resolves.toBe(false)

  // Bad checksum and no access to target dir
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        url: testUrl,
        digest: "1234567890",
        file: "/noaccess/badfile",
      })
    )
  ).rejects.toThrow(ScriptError)

  // With correct file, different uid, not running as root
  container.os.userInfo = () => ({
    uid: 1000,
    gid: 1000,
  })
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        url: testUrl,
        digest: "1234567890",
        file: "/dir/somefile",
        owner: {
          user: 0,
          group: 0,
        },
      })
    )
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    fs: {
      createWriteStream: jest.fn(() => ({})),
      chown: () => undefined,
    },
    fetch: jest.fn(async (url) => ({})),
    util: {
      pipeToPromise: jest.fn(async () => undefined),
    },
    runContext: {
      env: {},
    },
    HttpProxyAgent: class {},
    HttpsProxyAgent: class {},
  }
  const assertion = new UrlDownloaded(container)

  assertion.toFileExists = false
  assertion.expandedFile = "/foo/bar.txt"
  assertion.expandedUrl = "http://something.com"
  assertion.owner = { uid: 1, gid: 1 }
  await expect(assertion.rectify()).resolves.toBeUndefined()

  assertion.expandedUrl = "https://something.com"
  await expect(assertion.rectify()).resolves.toBeUndefined()

  assertion.runContext = {
    env: { http_proxy: "http://proxy", https_proxy: "http://proxy" },
  }
  assertion.expandedUrl = "http://something.com"
  await expect(assertion.rectify()).resolves.toBeUndefined()

  assertion.expandedUrl = "https://something.com"
  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new UrlDownloaded({})

  assertion.expandedFile = "/somedir/somefile.txt"
  expect(assertion.result()).toEqual({ file: assertion.expandedFile })

  assertion.proxy = "http://proxy"
  expect(assertion.result()).toEqual({
    file: assertion.expandedFile,
    proxy: assertion.proxy,
  })
})
