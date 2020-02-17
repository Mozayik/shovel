import { FilesDeleted } from "./FilesDeleted"
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
        if (path === "/somedir") {
          return new PathInfo({
            isFile: () => false,
            isDirectory: () => true,
          })
        } else if (path === "/somefile" || path === "/noaccess/file") {
          return new PathInfo({
            isFile: () => true,
            isDirectory: () => false,
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
        } else {
          return new PathInfo()
        }
      },
    },
  }

  const asserter = new FilesDeleted(container)

  // Bad args
  await expect(asserter.assert(createAssertNode(asserter, {}))).rejects.toThrow(
    ScriptError
  )
  await expect(
    asserter.assert(createAssertNode(asserter, { files: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { files: [1] }))
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        files: ["/notthere", "/alsonotthere"],
      })
    )
  ).resolves.toBe(true)

  // File exists
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        files: ["/somefile", "/notthere"],
      })
    )
  ).resolves.toBe(false)

  // Directory instead of file existing
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        files: ["/nothere", "/somedir"],
      })
    )
  ).rejects.toThrow(Error)

  // Cannot write to parent dir
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        files: ["/noaccess/file"],
      })
    )
  ).rejects.toThrow(Error)
})

test("rectify", async () => {
  const container = {
    fs: {
      unlink: jest.fn(async () => null),
    },
  }
  const asserter = new FilesDeleted(container)

  asserter.unlinkFilePaths = ["blah"]

  await expect(asserter.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const asserter = new FilesDeleted({})

  asserter.unlinkFilePaths = ["blah"]

  expect(asserter.result(true)).toEqual({ files: asserter.unlinkFilePaths })

  asserter.filePaths = ["blah"]

  expect(asserter.result(false)).toEqual({ files: asserter.filePaths })
})
