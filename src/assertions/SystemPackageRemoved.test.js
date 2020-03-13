import { SystemPackageRemoved } from "./SystemPackageRemoved"
import { createAssertNode, ScriptError } from "../utility"

let container = null

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    childProcess: {},
    util: {
      runningAsRoot: jest.fn(() => true),
    },
  }
  const assertion = new SystemPackageRemoved(container)

  // Not supported OS
  container.util.osInfo = jest.fn(async () => ({ platform: "windows" }))
  await expect(
    assertion.assert(createAssertNode(assertion, { package: "test" }))
  ).rejects.toThrow(ScriptError)

  // Missing package
  container.util.osInfo = jest.fn(async () => ({
    platform: "linux",
    id: "ubuntu",
  }))
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)

  // Bad package
  await expect(
    assertion.assert(createAssertNode(assertion, { package: 1 }))
  ).rejects.toThrow(ScriptError)

  // Package not present on Ubuntu
  container.childProcess.exec = jest.fn(async (command) => {
    throw new Error()
  })
  await expect(
    assertion.assert(createAssertNode(assertion, { package: "there" }))
  ).resolves.toBe(true)

  // Package not present on CentOS
  container.util.osInfo = jest.fn(async () => ({
    platform: "linux",
    id: "centos",
  }))
  await expect(
    assertion.assert(createAssertNode(assertion, { package: "there" }))
  ).resolves.toBe(true)

  // Package present and running as root
  container.childProcess.exec = jest.fn(async (command) => ({
    stdout: "",
    stderr: "",
  }))
  await expect(
    assertion.assert(createAssertNode(assertion, { package: "notthere" }))
  ).resolves.toBe(false)

  // Package present and not running as root
  container.util.runningAsRoot = jest.fn(() => false)
  await expect(
    assertion.assert(createAssertNode(assertion, { package: "there" }))
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    interpolator: (node) => node.value,
    childProcess: {
      exec: jest.fn(async (command) => ({
        stdout: "",
        stderr: "",
      })),
    },
    util: {
      runningAsRoot: jest.fn(() => true),
    },
  }
  const assertion = new SystemPackageRemoved(container)

  assertion.expandedPackageName = "somepackage"

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new SystemPackageRemoved({})

  assertion.expandedPackageName = "somepackage"

  expect(assertion.result()).toEqual({ package: assertion.expandedPackageName })
})
