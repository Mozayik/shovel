import { ServiceStopped } from "./ServiceStopped"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    childProcess: {},
    util: {
      runningAsRoot: jest.fn(() => true),
    },
  }

  const assertion = new ServiceStopped(container)

  // Bad args
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { service: 1 }))
  ).rejects.toThrow(ScriptError)

  // With service inactive
  container.childProcess.exec = async () => {
    throw new Error()
  }
  await expect(
    assertion.assert(createAssertNode(assertion, { service: "service" }))
  ).resolves.toBe(true)

  // With service active
  container.childProcess.exec = async (command) => ({ stdout: "active\n" })
  await expect(
    assertion.assert(createAssertNode(assertion, { service: "otherService" }))
  ).resolves.toBe(false)

  // With service active and not root
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
          throw new Error()
        } else {
          return { stdout: "active" }
        }
      },
    },
  }
  const assertion = new ServiceStopped(container)

  assertion.expandedServiceName = "something"

  await expect(assertion.rectify()).resolves.toBeUndefined()

  // With service that doesn't stop
  container.childProcess.exec = async (command) => {
    if (command.includes("is-active")) {
      return { stdout: "active\n" }
    } else {
      return {}
    }
  }

  await expect(assertion.rectify()).rejects.toThrow(Error)
})

test("result", () => {
  const assertion = new ServiceStopped({})

  assertion.expandedServiceName = "blah"

  expect(assertion.result()).toEqual({ service: assertion.expandedServiceName })
})
