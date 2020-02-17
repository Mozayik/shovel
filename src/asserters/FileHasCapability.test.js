import { FileHasCapability } from "./FileHasCapability"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"
import { PathInfo } from "../util"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    util: {
      runningAsRoot: () => true,
      pathInfo: (pathName) => {
        switch (pathName) {
          case "/file1":
            return new PathInfo({
              isFile: () => true,
              size: 100,
            })
          case "/file2":
            return new PathInfo()
          case "/file3":
            return new PathInfo({
              isFile: () => false,
              isDirectory: () => true,
              size: 0,
            })
        }
      },
    },
    childProcess: {
      exec: async () => undefined,
    },
  }

  const asserter = new FileHasCapability(container)

  // Bad args
  await expect(asserter.assert(createAssertNode(asserter, {}))).rejects.toThrow(
    ScriptError
  )
  await expect(
    asserter.assert(createAssertNode(asserter, { file: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { file: "file" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { file: "file", capability: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(
      createAssertNode(asserter, { file: "file1", capability: "CAP_NOT_REAL" })
    )
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        file: "/file1",
        capability: "CAP_NET_BIND_SERVICE",
      })
    )
  ).resolves.toBe(true)

  // File does not exist
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        file: "/file2",
        capability: "cap_audit_control",
      })
    )
  ).rejects.toThrow(ScriptError)

  // File not file
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        file: "/file3",
        capability: "cap_audit_control",
      })
    )
  ).rejects.toThrow(ScriptError)

  // Exec fails
  container.childProcess.exec = async () => {
    throw new Error()
  }
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        file: "/file1",
        capability: "cap_audit_control",
      })
    )
  ).resolves.toBe(false)

  // Not running as root
  container.util.runningAsRoot = () => false
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        file: "/file1",
        capability: "cap_audit_control",
      })
    )
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    childProcess: {
      exec: jest.fn(async () => undefined),
    },
  }
  const asserter = new FileHasCapability(container)

  asserter.filePath = "/notthere"
  asserter.capability = "cap_net_bind_service"

  await expect(asserter.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const asserter = new FileHasCapability({})

  asserter.filePath = "/notthere"
  asserter.capability = "cap_net_bind_service"

  expect(asserter.result()).toEqual({
    file: asserter.filePath,
    capability: asserter.capability,
  })
})
