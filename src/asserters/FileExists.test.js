import { FileExists } from "./FileExists"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"

let container = null

test("assert", async () => {
  const container = {
    expandStringNode: (node) => node.value,
    fs: {
      access: jest.fn(async () => undefined),
    },
    os: {
      userInfo: jest.fn(() => ({
        uid: 0,
        gid: 0,
      })),
    },
    util: {
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
      parseOwnerNode: jest.fn((userInfo, users, groups, ownerNode) => ({
        uid: 0,
        gid: 0,
      })),
      parseModeNode: jest.fn(() => 0o644),
    },
  }

  const asserter = new FileExists(container)

  // Missing args
  await expect(asserter.assert(createAssertNode(asserter, {}))).rejects.toThrow(
    ScriptError
  )

  // Bad path
  await expect(
    asserter.assert(createAssertNode(asserter, { path: 1 }))
  ).rejects.toThrow(ScriptError)

  // File exists
  container.fs.lstat = jest.fn(async (fileName) => ({
    isDirectory: jest.fn(() => false),
    isFile: jest.fn(() => true),
    mode: 0o644,
    uid: 0,
    gid: 0,
  }))
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        path: "/somefile",
        owner: { uid: 0, gid: 0 },
        mode: { user: "rw-", group: "r--", other: "r--" },
      })
    )
  ).resolves.toBe(true)

  // File exists with different group owner
  container.fs.lstat = jest.fn(async (fileName) => ({
    isDirectory: jest.fn(() => false),
    isFile: jest.fn(() => true),
    mode: 0o644,
    uid: 0,
    gid: 10,
  }))
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        path: "/somefile",
        owner: { uid: 0, gid: 0 },
        mode: { user: "rw-", group: "r--", other: "r--" },
      })
    )
  ).resolves.toBe(false)

  // File exists with different group owner and not root user
  container.os.userInfo = jest.fn(() => ({
    uid: 10,
    gid: 10,
  }))
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        path: "/somefile",
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
  container.fs.lstat = jest.fn(async () => ({
    isDirectory: jest.fn(() => false),
    isFile: jest.fn(() => true),
    mode: 0o111,
    uid: 0,
    gid: 0,
  }))
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        path: "/somefile",
        owner: { uid: 0, gid: 0 },
        mode: { user: "rw-", group: "r--", other: "r--" },
      })
    )
  ).resolves.toBe(false)

  // File exists with different mode and not root
  container.fs.lstat = jest.fn(async () => ({
    isDirectory: jest.fn(() => false),
    isFile: jest.fn(() => true),
    mode: 0o111,
    uid: 0,
    gid: 0,
  }))
  container.os.userInfo = jest.fn(() => ({
    uid: 10,
    gid: 10,
  }))
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        path: "/somefile",
        owner: { uid: 0, gid: 0 },
        mode: { user: "rw-", group: "r--", other: "r--" },
      })
    )
  ).rejects.toThrow(ScriptError)

  // File does not exist and directory in place
  container.os.userInfo = jest.fn(() => ({
    uid: 0,
    gid: 0,
  }))
  container.fs.lstat = jest.fn(async (fileName) => ({
    isDirectory: jest.fn(() => true),
    isFile: jest.fn(() => false),
  }))
  await expect(
    asserter.assert(createAssertNode(asserter, { path: "/notthere" }))
  ).rejects.toThrow(ScriptError)

  // File does not exist and root directory accessible
  container.fs.lstat = jest.fn(async (fileName) => {
    throw new Error()
  })
  container.fs.access = jest.fn(async () => undefined)
  await expect(
    asserter.assert(createAssertNode(asserter, { path: "/bar/notthere" }))
  ).resolves.toBe(false)

  // File does not exist and root directory not accessible
  container.fs.lstat = jest.fn(async () => {
    throw new Error()
  })
  container.fs.access = jest.fn(async () => {
    throw new Error()
  })
  await expect(
    asserter.assert(createAssertNode(asserter, { path: "/foo/notthere" }))
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    fs: {
      ensureFile: jest.fn(async (fileName) => {
        expect(typeof fileName).toBe("string")
      }),
      chown: jest.fn(async (path, uid, gid) => null),
      chmod: jest.fn(async (path, mode) => null),
    },
  }
  const asserter = new FileExists(container)

  asserter.expandedPath = "/notthere"
  asserter.mode = 0o777
  asserter.owner = { uid: 0, gid: 0 }

  await expect(asserter.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const asserter = new FileExists({})

  asserter.expandedPath = "/notthere"

  expect(asserter.result()).toEqual({ path: asserter.expandedPath })
})
