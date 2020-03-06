import { UserDeleted } from "./UserDeleted"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    util: {
      runningAsRoot: () => true,
      getUsers: async () => [{ user: "games" }],
    },
  }

  const assertion = new UserDeleted(container)

  // Bad args
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { user: 1 }))
  ).rejects.toThrow(ScriptError)

  // With user absent
  await expect(
    assertion.assert(createAssertNode(assertion, { user: "notthere" }))
  ).resolves.toBe(true)

  // With user present
  await expect(
    assertion.assert(createAssertNode(assertion, { user: "games" }))
  ).resolves.toBe(false)

  // With user present and not running as root
  container.util.runningAsRoot = () => false
  await expect(
    assertion.assert(createAssertNode(assertion, { user: "games" }))
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    childProcess: {
      exec: async () => undefined,
    },
  }
  const assertion = new UserDeleted(container)

  assertion.expandedName = "blah"

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new UserDeleted({})

  assertion.expandedName = "user"

  expect(assertion.result()).toEqual({ user: assertion.expandedName })
})
