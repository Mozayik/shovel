import { ServiceDisabled } from "./ServiceDisabled"
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

  const asserter = new ServiceDisabled(container)

  // Bad args
  await expect(asserter.assert(createAssertNode(asserter, {}))).rejects.toThrow(
    ScriptError
  )
  await expect(
    asserter.assert(createAssertNode(asserter, { service: 1 }))
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    asserter.assert(createAssertNode(asserter, { service: "otherService" }))
  ).resolves.toBe(true)

  // With service enabled
  await expect(
    asserter.assert(createAssertNode(asserter, { service: "service" }))
  ).resolves.toBe(false)

  // With service enabled and not root
  container.util.runningAsRoot = () => false
  await expect(
    asserter.assert(createAssertNode(asserter, { service: "service" }))
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
  const asserter = new ServiceDisabled(container)

  asserter.expandedServiceName = "otherService"

  await expect(asserter.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const asserter = new ServiceDisabled({})

  asserter.expandedServiceName = "otherService"

  expect(asserter.result()).toEqual({
    service: asserter.expandedServiceName,
    enabled: false,
  })
})
