import { NodePackageInstalled } from "./NodePackageInstalled"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"

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
  const asserter = new NodePackageInstalled(container)

  // Missing package
  await expect(asserter.assert(createAssertNode(asserter, {}))).rejects.toThrow(
    ScriptError
  )

  // Bad package type
  await expect(
    asserter.assert(createAssertNode(asserter, { package: 1 }))
  ).rejects.toThrow(ScriptError)

  // Package present
  await expect(
    asserter.assert(createAssertNode(asserter, { package: "package" }))
  ).resolves.toBe(true)

  // Package not present
  await expect(
    asserter.assert(createAssertNode(asserter, { package: "notthere" }))
  ).resolves.toBe(false)

  // Package not present and not running as root
  container.util.runningAsRoot = jest.fn(() => false)
  await expect(
    asserter.assert(createAssertNode(asserter, { package: "notthere" }))
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

  const asserter = new NodePackageInstalled(container)

  asserter.expandedPackageName = "package"

  await expect(asserter.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const asserter = new NodePackageInstalled({})

  asserter.expandedPackageName = "some-package"

  expect(asserter.result()).toEqual({ package: asserter.expandedPackageName })
})
