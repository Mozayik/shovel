import { AutoToolProjectMade } from "./AutoToolProjectMade"
import { createAssertNode, ScriptError, PathInfo } from "../utility"

test("perform", async () => {
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
        } else if (command.endsWith("fail")) {
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

  const action = new AutoToolProjectMade(container)

  // Happy path
  await expect(
    action.perform(createAssertNode(action, { directory: "/xyz" }))
  ).resolves.toBeUndefined()

  // No Makefile found
  await expect(
    action.perform(createAssertNode(action, { directory: "/notthere" }))
  ).rejects.toThrow(ScriptError)

  // Error running
  await expect(
    action.perform(
      createAssertNode(action, { directory: "/xyz", args: "fail" })
    )
  ).rejects.toThrow(ScriptError)
})

test("result", () => {
  const action = new AutoToolProjectMade({})
  const result = {
    directory: "blah",
    args: "blah",
  }

  action.directoryPath = result.directory
  action.args = result.args

  expect(action.result()).toEqual(result)
})
