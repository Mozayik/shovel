import { GroupExists } from "./GroupExists"
import { createAssertNode, ScriptError } from "../utility"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    util: {
      runningAsRoot: () => true,
      getLoginDefs: async () => ({ SYS_GID_MIN: 100, SYS_GID_MAX: 999 }),
      getGroups: () => [
        { name: "mail", password: "", gid: 100, users: ["mail"] },
        { name: "other", password: "", gid: 5000, users: ["other"] },
      ],
    },
  }
  const assertion = new GroupExists(container)

  // Bad arguments
  await expect(
    assertion.assert(
      createAssertNode(assertion, { group: "mail", gid: 10, system: true })
    )
  ).rejects.toThrow(ScriptError)

  // Bad gid
  await expect(
    assertion.assert(createAssertNode(assertion, { group: "mail", gid: "10" }))
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    assertion.assert(createAssertNode(assertion, { group: "mail" }))
  ).resolves.toBe(true)

  // With group absent
  await expect(
    assertion.assert(createAssertNode(assertion, { group: "notthere" }))
  ).resolves.toBe(false)

  // With group existing with same name and gid
  await expect(
    assertion.assert(createAssertNode(assertion, { group: "mail", gid: 100 }))
  ).resolves.toBe(true)

  // With group existing and system flag and gid in range
  await expect(
    assertion.assert(
      createAssertNode(assertion, { group: "mail", system: true })
    )
  ).resolves.toBe(true)

  // With group existing with different gid
  await expect(
    assertion.assert(createAssertNode(assertion, { group: "mail", gid: 110 }))
  ).resolves.toBe(false)

  // With group existing with outside system range
  await expect(
    assertion.assert(
      createAssertNode(assertion, { group: "other", system: true })
    )
  ).rejects.toThrow(ScriptError)

  // With group present with different gid and not root
  container.util.runningAsRoot = jest.fn(() => false)
  await expect(
    assertion.assert(createAssertNode(assertion, { group: "mail", gid: 110 }))
  ).rejects.toThrow(ScriptError)

  // With group absent and not root, no system login.defs
  container.util.getLoginDefs = async () => ({})
  container.util.getGroups = async (fs) => []
  await expect(
    assertion.assert(createAssertNode(assertion, { group: "notthere" }))
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    childProcess: {
      exec: jest.fn(async () => undefined),
    },
    util: {
      getGroups: jest.fn(async () => [{ name: "name", gid: 12 }]),
    },
  }
  const assertion = new GroupExists(container)

  assertion.groupName = "name"
  assertion.modify = false
  assertion.gid = undefined

  // Add & system
  assertion.system = true
  await expect(assertion.rectify()).resolves.toBeUndefined()

  // Modify
  assertion.system = false
  assertion.modify = true
  await expect(assertion.rectify()).resolves.toBeUndefined()

  // Group not present after command
  container.util.getGroups = jest.fn(async () => [])
  await expect(assertion.rectify()).rejects.toThrow(Error)
})

test("result", () => {
  const assertion = new GroupExists({})

  assertion.groupName = "name"
  assertion.gid = 12

  expect(assertion.result()).toEqual({
    group: assertion.groupName,
    gid: 12,
  })
})
