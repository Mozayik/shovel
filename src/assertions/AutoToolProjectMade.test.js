import { AutoToolProjectMade } from "./AutoToolProjectMade"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"
import { PathInfo } from "../util"

test("assert", async () => {
  const container = {
    process: {
      geteuid: () => 1,
      getgroups: () => [1, 2],
    },
    interpolator: (node) => node.value,
    childProcess: {
      exec: async (command) => {
        if (command === "make") {
          return {}
        } else if (command.endsWith("bar")) {
          const error = new Error()

          error.code = 2
          throw error
        }
      },
    },
    util: {
      pathInfo: async (path) => {
        switch (path) {
          case "/xyz/Makefile":
            return new PathInfo(
              {
                isFile: () => true,
                uid: 1,
                gid: 1,
                mode: 0o777,
              },
              container
            )
          case "/notthere/Makefile":
            return new PathInfo(null, container)
        }
      },
    },
  }

  const assertion = new AutoToolProjectMade(container)

  // Bad command
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { directory: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { directory: "", args: 1 }))
  ).rejects.toThrow(ScriptError)

  // All made
  await expect(
    assertion.assert(createAssertNode(assertion, { directory: "/xyz" }))
  ).resolves.toBe(true)

  // All not made
  await expect(
    assertion.assert(
      createAssertNode(assertion, { directory: "/xyz", args: "bar" })
    )
  ).resolves.toBe(false)

  // No Makefile found
  await expect(
    assertion.assert(createAssertNode(assertion, { directory: "/notthere" }))
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = { childProcess: {} }
  const assertion = new AutoToolProjectMade(container)

  // Good config
  container.childProcess.exec = async () => ({})
  assertion.expandedArgs = "bar"
  await expect(assertion.rectify()).resolves.toBeUndefined()

  // Bad config
  assertion.assertNode = createAssertNode(assertion, {})
  assertion.expandedArgs = ""
  container.childProcess.exec = async () => {
    throw new Error("unknown")
  }
  await expect(assertion.rectify()).rejects.toThrow(ScriptError)
})

test("result", () => {
  const assertion = new AutoToolProjectMade({})

  assertion.expandedDirectory = "blah"
  assertion.expandedArgs = "blah"

  expect(assertion.result()).toEqual({
    directory: assertion.expandedDirectory,
    args: assertion.expandedArgs,
  })
})
