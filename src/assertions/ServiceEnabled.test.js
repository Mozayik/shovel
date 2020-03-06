import { ServiceEnabled } from "./ServiceEnabled"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"

let container = null

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    childProcess: {
      exec: async (command) => {
        switch (command) {
          case "systemctl is-enabled service":
            return { stdout: "enabled" }
          case "systemctl is-enabled otherService":
            throw new Error()
        }
      },
    },
    util: {
      runningAsRoot: jest.fn(() => true),
    },
  }

  const assertion = new ServiceEnabled(container)

  // Bad args
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { service: 1 }))
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    assertion.assert(createAssertNode(assertion, { service: "service" }))
  ).resolves.toBe(true)

  // With service disabled
  await expect(
    assertion.assert(createAssertNode(assertion, { service: "otherService" }))
  ).resolves.toBe(false)

  // With service disabled and not root
  container.util.runningAsRoot = () => false
  await expect(
    assertion.assert(createAssertNode(assertion, { service: "otherService" }))
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    childProcess: {
      exec: async (command) => {
        switch (command) {
          case "systemctl is-enabled service":
            return { stdout: "enabled" }
        }
      },
    },
  }
  const assertion = new ServiceEnabled(container)

  assertion.expandedServiceName = "service"

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new ServiceEnabled({})

  assertion.expandedServiceName = "otherService"

  expect(assertion.result()).toEqual({
    service: assertion.expandedServiceName,
    enabled: true,
  })
})
