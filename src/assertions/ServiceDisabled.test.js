import { ServiceDisabled } from "./ServiceDisabled"
import { createAssertNode, ScriptError } from "../utility"

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

  const assertion = new ServiceDisabled(container)

  // Bad args
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { service: 1 }))
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    assertion.assert(createAssertNode(assertion, { service: "otherService" }))
  ).resolves.toBe(true)

  // With service enabled
  await expect(
    assertion.assert(createAssertNode(assertion, { service: "service" }))
  ).resolves.toBe(false)

  // With service enabled and not root
  container.util.runningAsRoot = () => false
  await expect(
    assertion.assert(createAssertNode(assertion, { service: "service" }))
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    childProcess: {
      exec: async (command) => {
        switch (command) {
          case "systemctl is-enabled otherService":
            throw new Error()
        }
      },
    },
  }
  const assertion = new ServiceDisabled(container)

  assertion.expandedServiceName = "otherService"

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new ServiceDisabled({})

  assertion.expandedServiceName = "otherService"

  expect(assertion.result()).toEqual({
    service: assertion.expandedServiceName,
    enabled: false,
  })
})
