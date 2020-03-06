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

  const assertion = new DirectoryDeleted(container)

  // Bad arguments
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { directory: 1 }))
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    assertion.assert(createAssertNode(assertion, { directory: "/notthere" }))
  ).resolves.toBe(true)

  // Directory exists
  await expect(
    assertion.assert(createAssertNode(assertion, { directory: "/somedir" }))
  ).resolves.toBe(false)

  // Directory is file
  await expect(
    assertion.assert(createAssertNode(assertion, { directory: "/somefile" }))
  ).rejects.toThrow(ScriptError)

  // Directory exists and parent not writeable
  await expect(
    assertion.assert(
      createAssertNode(assertion, { directory: "/noaccess/somedir" })
    )
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    fs: {
      remove: jest.fn(async () => null),
    },
  }
  const assertion = new DirectoryDeleted(container)

  assertion.expandedDirectory = "blah"

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new DirectoryDeleted({})

  assertion.expandedDirectory = "blah"

  expect(assertion.result()).toEqual({ directory: assertion.expandedDirectory })
})
