import { GroupDeleted } from "./GroupDeleted"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"
import { Script } from "vm"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    util: {
      runningAsRoot: () => true,
      getGroups: async (fs) => [{ name: "news", gid: 10, users: [] }],
    },
    childProcess: {
      exec: jest.fn(async (path) => {
        expect(typeof path).toBe("string")
        return 0
      }),
    },
  }

  const assertion = new GroupDeleted(container)

  // Bad args
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { group: 1 }))
  ).rejects.toThrow(ScriptError)

  // With group absent
  await expect(
    assertion.assert(createAssertNode(assertion, { group: "notthere" }))
  ).resolves.toBe(true)

  // With group present
  await expect(
    assertion.assert(createAssertNode(assertion, { group: "news" }))
  ).resolves.toBe(false)

  // With group absent and not root
  container.util.runningAsRoot = () => false
  await expect(
    assertion.assert(createAssertNode(assertion, { group: "news" }))
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    childProcess: {
      exec: async () => undefined,
    },
  }
  const assertion = new GroupDeleted(container)

  assertion.expandedGroupName = "blah"

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new GroupDeleted({})

  assertion.expandedGroupName = "news"

  expect(assertion.result()).toEqual({ group: assertion.expandedGroupName })
})
