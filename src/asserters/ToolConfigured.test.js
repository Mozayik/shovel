import { ToolConfigured } from "./ToolConfigured"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"

test("assert", async () => {
  const container = {
    expandStringNode: (node) => node.value,
    childProcess: {},
    util: {
      runningAsRoot: jest.fn(() => true),
    },
  }

  const asserter = new ToolConfigured(container)

  // Bad args
  await expect(asserter.assert(createAssertNode(asserter, {}))).rejects.toThrow(
    ScriptError
  )
  await expect(
    asserter.assert(createAssertNode(asserter, { directory: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { directory: "", args: 1 }))
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    childProcess: {
      exec: async () => ({
        stdout: "failed",
      }),
    },
  }
  const asserter = new ToolConfigured(container)

  await expect(asserter.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const asserter = new ToolConfigured({})

  asserter.expandedDirectory = "blah"
  asserter.expandedArgs = "blah"

  expect(asserter.result()).toEqual({
    directory: asserter.expandedDirectory,
    args: asserter.expandedArgs,
  })
})