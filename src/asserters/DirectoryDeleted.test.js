import { DirectoryDeleted } from "./DirectoryDeleted"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"
import { PathInfo } from "../util"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    process: {
      geteuid: () => 1,
      getgroups: () => [1, 2],
    },
    util: {
      pathInfo: async (path) => {
        if (path === "/somedir" || path === "/noaccess/somedir") {
          return new PathInfo({
            isDirectory: () => true,
            isFile: () => false,
          })
        } else if (path === "/") {
          return new PathInfo({
            isDirectory: () => true,
            isFile: () => false,
            mode: 0o777,
          })
        } else if (path === "/noaccess") {
          return new PathInfo({
            isDirectory: () => true,
            isFile: () => false,
            mode: 0o555,
          })
        } else if (path === "/somefile") {
          return new PathInfo({
            isDirectory: () => false,
            isFile: () => true,
          })
        } else {
          return new PathInfo()
        }
      },
    },
  }

  const asserter = new DirectoryDeleted(container)

  // Bad arguments
  await expect(asserter.assert(createAssertNode(asserter, {}))).rejects.toThrow(
    ScriptError
  )
  await expect(
    asserter.assert(createAssertNode(asserter, { directory: 1 }))
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    asserter.assert(createAssertNode(asserter, { directory: "/notthere" }))
  ).resolves.toBe(true)

  // Directory exists
  await expect(
    asserter.assert(createAssertNode(asserter, { directory: "/somedir" }))
  ).resolves.toBe(false)

  // Directory is file
  await expect(
    asserter.assert(createAssertNode(asserter, { directory: "/somefile" }))
  ).rejects.toThrow(ScriptError)

  // Directory exists and parent not writeable
  await expect(
    asserter.assert(
      createAssertNode(asserter, { directory: "/noaccess/somedir" })
    )
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    fs: {
      remove: jest.fn(async () => null),
    },
  }
  const asserter = new DirectoryDeleted(container)

  asserter.expandedDirectory = "blah"

  await expect(asserter.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const asserter = new DirectoryDeleted({})

  asserter.expandedDirectory = "blah"

  expect(asserter.result()).toEqual({ directory: asserter.expandedDirectory })
})
