import { FileHasCapability } from "./FileHasCapability"
import { PathInfo, ScriptError, createAssertNode } from "../utility"

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

  const assertion = new FileHasCapability(container)

  // Happy path
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/file1",
        capability: "CAP_NET_BIND_SERVICE",
        flags: "epi",
      })
    )
  ).resolves.toBe(true)

  // Bad capability
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "file1",
        capability: "CAP_NOT_REAL",
        flags: "epi",
      })
    )
  ).rejects.toThrow(ScriptError)

  // Bad flags
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "file1",
        capability: "cap_audit_control",
        flags: "xyz",
      })
    )
  ).rejects.toThrow(ScriptError)

  // File does not exist
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/file2",
        capability: "cap_audit_control",
        flags: "e--",
      })
    )
  ).rejects.toThrow(ScriptError)

  // File not file
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/file3",
        capability: "cap_audit_control",
        flags: "e--",
      })
    )
  ).rejects.toThrow(ScriptError)

  // Not running as root
  container.util.runningAsRoot = () => false
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/file1",
        capability: "cap_audit_control",
        flags: "--i",
      })
    )
  ).rejects.toThrow(ScriptError)

  // Exec fails
  container.util.runningAsRoot = () => true
  container.childProcess.exec = async () => {
    throw new Error()
  }
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/file1",
        capability: "cap_audit_control",
        flags: "---",
      })
    )
  ).resolves.toBe(false)
})

test("rectify", async () => {
  const container = {
    childProcess: {
      exec: jest.fn(async () => undefined),
    },
  }
  const assertion = new FileHasCapability(container)

  assertion.filePath = "/notthere"
  assertion.capability = "cap_net_bind_service"

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new FileHasCapability({})

  assertion.filePath = "/notthere"
  assertion.capability = "cap_net_bind_service"

  expect(assertion.result()).toEqual({
    file: assertion.filePath,
    capability: assertion.capability,
  })
})
