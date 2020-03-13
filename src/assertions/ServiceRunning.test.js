import { ServiceRunning } from "./ServiceRunning"
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

  const assertion = new ServiceRunning(container)

  // Bad args
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { service: 1 }))
  ).rejects.toThrow(ScriptError)

  // With service active
  container.childProcess.exec = async () => ({ stdout: "active" })
  await expect(
    assertion.assert(createAssertNode(assertion, { service: "service" }))
  ).resolves.toBe(true)

  // With service inactive
  container.childProcess.exec = async () => {
    throw new Error()
  }
  await expect(
    assertion.assert(createAssertNode(assertion, { service: "otherService" }))
  ).resolves.toBe(false)

  // With service inactive not root
  container.util.runningAsRoot = () => false
  await expect(
    assertion.assert(createAssertNode(assertion, { service: "otherService" }))
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    Timeout: class Timeout {
      set() {
        return Promise.resolve()
      }
    },
    childProcess: {
      exec: async (command) => {
        if (command.includes("is-active")) {
          return { stdout: "active" }
        } else {
          return { stdout: "" }
        }
      },
    },
  }
  const assertion = new ServiceRunning(container)

  assertion.expandedServiceName = "service"

  await expect(assertion.rectify()).resolves.toBeUndefined()

  // With service that doesn't start
  container.childProcess.exec = async (command) => {
    if (command.includes("is-active")) {
      throw new Error()
    } else {
      return {}
    }
  }

  await expect(assertion.rectify()).rejects.toThrow(Error)
})

test("result", () => {
  const assertion = new ServiceRunning({})

  assertion.expandedServiceName = "otherService"

  expect(assertion.result()).toEqual({ service: assertion.expandedServiceName })
})
