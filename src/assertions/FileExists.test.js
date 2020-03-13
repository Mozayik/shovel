import { FileExists } from "./FileExists"
import { PathInfo, ScriptError, createAssertNode } from "../utility"

let container = null

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
      pathInfo: async (path) => {
        switch (path) {
          case "/":
          case "/bar":
            return new PathInfo({
              isFile: () => false,
              isDirectory: () => true,
              mode: 0o777,
            })
          case "/file1":
            return new PathInfo({
              isFile: () => true,
              isDirectory: () => false,
              mode: 0o644,
              uid: 0,
              gid: 0,
            })
          case "/file2":
            return new PathInfo({
              isFile: () => true,
              isDirectory: () => false,
              mode: 0o644,
              uid: 0,
              gid: 10,
            })
          case "/file3":
            return new PathInfo({
              isFile: () => true,
              isDirectory: () => false,
              mode: 0o111,
              uid: 0,
              gid: 0,
            })
          case "/file4":
            return new PathInfo({
              isFile: jest.fn(() => true),
              isDirectory: jest.fn(() => false),
              mode: 0o111,
              uid: 0,
              gid: 0,
            })
          default:
            return new PathInfo()
        }
      },
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
      parseOwnerNode: (ownerNode, users, groups) => ({
        uid: 0,
        gid: 0,
      }),
      parseModeNode: () => 0o644,
    },
  }

  const assertion = new FileExists(container)

  // Missing args
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { file: 1 }))
  ).rejects.toThrow(ScriptError)

  // File exists
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/file1",
        owner: { uid: 0, gid: 0 },
        mode: { user: "rw-", group: "r--", other: "r--" },
      })
    )
  ).resolves.toBe(true)

  // File exists with different group owner
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/file2",
        owner: { uid: 0, gid: 0 },
        mode: { user: "rw-", group: "r--", other: "r--" },
      })
    )
  ).resolves.toBe(false)

  // Directory exists instead
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/bar",
      })
    )
  ).rejects.toThrow(ScriptError)

  // File exists with different group owner and not root user
  container.os.userInfo = jest.fn(() => ({
    uid: 10,
    gid: 10,
  }))
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/file2",
        owner: { uid: 0, gid: 0 },
        mode: { user: "rw-", group: "r--", other: "r--" },
      })
    )
  ).rejects.toThrow(ScriptError)

  // File exists with different mode
  container.os.userInfo = jest.fn(() => ({
    uid: 0,
    gid: 0,
  }))
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/file3",
        owner: { uid: 0, gid: 0 },
        mode: { user: "rw-", group: "r--", other: "r--" },
      })
    )
  ).resolves.toBe(false)

  // File exists with different mode and not root
  container.os.userInfo = jest.fn(() => ({
    uid: 10,
    gid: 10,
  }))
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/file4",
        owner: { uid: 0, gid: 0 },
        mode: { user: "rw-", group: "r--", other: "r--" },
      })
    )
  ).rejects.toThrow(ScriptError)
  container.os.userInfo = jest.fn(() => ({
    uid: 0,
    gid: 0,
  }))

  // File does not exist and root directory accessible
  await expect(
    assertion.assert(createAssertNode(assertion, { file: "/bar/notthere" }))
  ).resolves.toBe(false)

  // File does not exist and root directory not accessible
  container.util.canAccess = jest.fn(async () => false)
  await expect(
    assertion.assert(createAssertNode(assertion, { file: "/foo/notthere" }))
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    fs: {
      open: async () => undefined,
      close: async () => undefined,
      chown: async (path, uid, gid) => null,
      chmod: async (path, mode) => null,
    },
  }
  const assertion = new FileExists(container)

  assertion.filePath = "/notthere"
  assertion.mode = 0o777
  assertion.owner = { uid: 0, gid: 0 }

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new FileExists({})

  assertion.filePath = "/notthere"

  expect(assertion.result()).toEqual({ file: assertion.filePath })
})
