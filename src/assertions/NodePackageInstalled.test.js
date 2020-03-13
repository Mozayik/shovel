import { NodePackageInstalled } from "./NodePackageInstalled"
import { createAssertNode, ScriptError } from "../utility"

let container = null

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    childProcess: {
      exec: async (command) => {
        if (command.endsWith("package")) {
          return {
            stdout: "",
            stderr: "",
          }
        } else if (command.endsWith("notthere")) {
          throw new Error()
        }
      },
    },
    util: {
      runningAsRoot: jest.fn(() => true),
    },
  }
  const assertion = new NodePackageInstalled(container)

  // Missing package
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)

  // Bad package type
  await expect(
    assertion.assert(createAssertNode(assertion, { package: 1 }))
  ).rejects.toThrow(ScriptError)

  // Package present
  await expect(
    assertion.assert(createAssertNode(assertion, { package: "package" }))
  ).resolves.toBe(true)

  // Package not present
  await expect(
    assertion.assert(createAssertNode(assertion, { package: "notthere" }))
  ).resolves.toBe(false)

  // Package not present and not running as root
  container.util.runningAsRoot = jest.fn(() => false)
  await expect(
    assertion.assert(createAssertNode(assertion, { package: "notthere" }))
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    childProcess: {
      exec: jest.fn(async (command) => ({
        stdout: "",
        stderr: "",
      })),
    },
  }

  const assertion = new NodePackageInstalled(container)

  assertion.expandedPackageName = "package"

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new NodePackageInstalled({})

  assertion.expandedPackageName = "some-package"

  expect(assertion.result()).toEqual({ package: assertion.expandedPackageName })
})
