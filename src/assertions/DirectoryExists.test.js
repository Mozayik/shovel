import { DirectoryExists } from "./DirectoryExists"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"
import util, { PathInfo } from "../util"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    process: {
      geteuid: () => 1,
      getgroups: () => [1, 2],
    },
    os: {
      userInfo: jest.fn(() => ({
        uid: 0,
        gid: 0,
      })),
    },
    util: {
      pathInfo: async (path) => {
        if (path === "/somedir") {
          return new PathInfo({
            isFile: () => false,
            isDirectory: () => true,
            mode: 0o754,
            uid: 10,
            gid: 10,
          })
        } else if (path === "/filethere") {
          return new PathInfo({
            isFile: jest.fn(() => true),
            isDirectory: jest.fn(() => false),
          })
        } else if (path === "/") {
          return new PathInfo({
            isDirectory: () => true,
            isFile: () => false,
            mode: 0o777,
            uid: 10,
            gid: 10,
          })
        } else if (path === "/noaccess") {
          return new PathInfo({
            isDirectory: () => false,
            isFile: () => true,
            mode: 0o555,
          })
        } else {
          return new PathInfo()
        }
      },
      getUsers: jest.fn(async () => [
        { uid: 0, gid: 0, name: "root" },
        { uid: 10, gid: 10, name: "user1" },
        { uid: 20, gid: 10, name: "user2" },
      ]),
      getGroups: jest.fn(async () => [
        { gid: 0, name: "root" },
        { gid: 10, name: "group1" },
        { gid: 20, name: "group2" },
      ]),
      parseOwnerNode: util.parseOwnerNode,
      parseModeNode: util.parseModeNode,
    },
  }

  const assertion = new DirectoryExists(container)

  // Bad arguments
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { directory: 1 }))
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        directory: "/somedir",
        owner: { user: "user1", group: "group1" },
        mode: { user: "rwx", group: "r-x", other: "r--" },
      })
    )
  ).resolves.toBe(true)
  expect(assertion.result()).toEqual({ directory: "/somedir" })

  // Different owners
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        directory: "/somedir",
        owner: { user: 0, group: "root" },
        mode: { user: "rwx", group: "r-x", other: "r--" },
      })
    )
  ).resolves.toBe(false)

  // Different modes
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        directory: "/somedir",
        owner: { user: "user1", group: "group1" },
        mode: { user: "rw-", group: "r--", other: "---" },
      })
    )
  ).resolves.toBe(false)

  // Different owner, not root or owner
  container.os.userInfo = jest.fn(() => ({
    uid: 20,
    gid: 20,
  }))
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        directory: "/somedir",
        owner: { user: "root", group: "root" },
        mode: { user: "rwx", group: "r-x", other: "r--" },
      })
    )
  ).rejects.toThrow(ScriptError)

  // Different mode, not root but owner
  container.os.userInfo = jest.fn(() => ({
    uid: 10,
    gid: 10,
  }))
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        directory: "/somedir",
        owner: { user: "user1", group: "group1" },
        mode: { user: "rw-", group: "r--", other: "---" },
      })
    )
  ).resolves.toBe(false)

  // Different mode, not root or owner
  container.os.userInfo = jest.fn(() => ({
    uid: 20,
    gid: 20,
  }))
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        directory: "/somedir",
        owner: { user: "user1", group: "group1" },
        mode: { user: "rw-", group: "r--", other: "---" },
      })
    )
  ).rejects.toThrow(ScriptError)

  // Directory not there
  container.os.userInfo = jest.fn(() => ({
    uid: 0,
    gid: 0,
  }))
  await expect(
    assertion.assert(createAssertNode(assertion, { directory: "/notthere" }))
  ).resolves.toBe(false)

  // File with same name
  await expect(
    assertion.assert(createAssertNode(assertion, { directory: "/filethere" }))
  ).rejects.toThrow(ScriptError)

  // Parent directory not accessible
  await expect(
    assertion.assert(
      createAssertNode(assertion, { directory: "/noaccess/file" })
    )
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    fs: {
      ensureDir: jest.fn(async (directory, options) => null),
      chown: jest.fn(async (directory, uid, gid) => null),
      chmod: jest.fn(async (directory, mode) => null),
    },
  }

  const assertion = new DirectoryExists(container)

  assertion.dirPath = "/somefile"
  assertion.mode = 0o777
  assertion.owner = { uid: 10, gid: 20 }

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new DirectoryExists({})

  assertion.dirPath = "/somefile"
  assertion.mode = 0o777
  assertion.owner = { uid: 10, gid: 20 }

  expect(assertion.result(true)).toEqual({ directory: "/somefile" })
  expect(assertion.result(false)).toEqual({ directory: "/somefile" })
})
