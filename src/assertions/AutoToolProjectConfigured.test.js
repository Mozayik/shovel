import { AutoToolProjectConfigured } from "./AutoToolProjectConfigured"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    childProcess: {},
    util: {
      pathInfo: async (path) => {
        switch (path) {
          case "/xyz/configure":
            return {
              getAccess: () => ({
                isReadable: () => true,
              }),
            }
          case "/xyz/config.status":
            return {
              isFile: () => true,
            }
          case "/abc/configure":
            return {
              getAccess: () => ({
                isReadable: () => false,
              }),
            }
        }
      },
      runningAsRoot: jest.fn(() => true),
    },
  }

  const assertion = new AutoToolProjectConfigured(container)

  // Bad args
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { directory: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { directory: "", args: 1 }))
  ).rejects.toThrow(ScriptError)

  // All configured
  await expect(
    assertion.assert(
      createAssertNode(assertion, { directory: "/xyz", args: "" })
    )
  ).resolves.toBe(true)

  // config not found
  await expect(
    assertion.assert(createAssertNode(assertion, { directory: "/abc" }))
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
  const assertion = new AutoToolProjectConfigured(container)

  assertion.expandedDirectory = "/xyz"

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new AutoToolProjectConfigured({})

  assertion.expandedDirectory = "blah"
  assertion.expandedArgs = "blah"

  expect(assertion.result()).toEqual({
    directory: assertion.expandedDirectory,
    args: assertion.expandedArgs,
  })
})
