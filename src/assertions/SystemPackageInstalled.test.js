import { SystemPackageInstalled } from "./SystemPackageInstalled"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"

let container = null

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    childProcess: {},
    util: {
      runningAsRoot: jest.fn(() => true),
    },
  }
  const assertion = new SystemPackageInstalled(container)

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

  // Bad update type
  container.util.osInfo = jest.fn(async () => ({
    platform: "linux",
    id: "ubuntu",
  }))
  await expect(
    assertion.assert(
      createAssertNode(assertion, { package: "something", update: 1 })
    )
  ).rejects.toThrow(ScriptError)

  // Bad package
  await expect(
    assertion.assert(createAssertNode(assertion, { package: 1 }))
  ).rejects.toThrow(ScriptError)

  // Package present on Ubuntu
  container.childProcess.exec = jest.fn(async () => ({
    stdout: "",
    stderr: "",
  }))
  await expect(
    assertion.assert(createAssertNode(assertion, { package: "package" }))
  ).resolves.toBe(true)

  // Package not present and running as root, with update
  container.childProcess.exec = jest.fn(async (command) => {
    throw new Error()
  })
  await expect(
    assertion.assert(
      createAssertNode(assertion, { package: "notthere", update: true })
    )
  ).resolves.toBe(false)

  // Package not present and not running as root
  container.util.runningAsRoot = jest.fn(() => false)
  await expect(
    assertion.assert(createAssertNode(assertion, { package: "notthere" }))
  ).rejects.toThrow(ScriptError)

  // Package present on CentOS
  container.util.osInfo = jest.fn(async () => ({
    platform: "linux",
    id: "centos",
  }))
  container.childProcess.exec = jest.fn(async () => ({
    stdout: "",
    stderr: "",
  }))
  await expect(
    assertion.assert(createAssertNode(assertion, { package: "package" }))
  ).resolves.toBe(true)
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

  const assertion = new SystemPackageInstalled(container)

  assertion.installCommand = "something"

  await expect(assertion.rectify()).resolves.toBeUndefined()

  assertion.updateCommand = "something"

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new SystemPackageInstalled({})

  assertion.expandedPackageName = "somepackage"

  expect(assertion.result()).toEqual({ package: assertion.expandedPackageName })
})
