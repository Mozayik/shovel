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

  const asserter = new ServiceEnabled(container)

  // Bad args
  await expect(asserter.assert(createAssertNode(asserter, {}))).rejects.toThrow(
    ScriptError
  )
  await expect(
    asserter.assert(createAssertNode(asserter, { service: 1 }))
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    asserter.assert(createAssertNode(asserter, { service: "service" }))
  ).resolves.toBe(true)

  // With service disabled
  await expect(
    asserter.assert(createAssertNode(asserter, { service: "otherService" }))
  ).resolves.toBe(false)

  // With service disabled and not root
  container.util.runningAsRoot = () => false
  await expect(
    asserter.assert(createAssertNode(asserter, { service: "otherService" }))
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
  const asserter = new ServiceEnabled(container)

  asserter.expandedServiceName = "service"

  await expect(asserter.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const asserter = new ServiceEnabled({})

  asserter.expandedServiceName = "otherService"

  expect(asserter.result()).toEqual({
    service: asserter.expandedServiceName,
    enabled: true,
  })
})
