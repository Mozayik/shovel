import { GroupExists } from "./GroupExists"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"

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
  const asserter = new GroupExists(container)

  // Bad arguments
  await expect(asserter.assert(createAssertNode(asserter, {}))).rejects.toThrow(
    ScriptError
  )
  await expect(
    asserter.assert(createAssertNode(asserter, { group: 1, gid: 10 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(
      createAssertNode(asserter, { group: "mail", gid: 10, system: true })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { group: "mail", system: 1 }))
  ).rejects.toThrow(ScriptError)

  // Bad gid
  await expect(
    asserter.assert(createAssertNode(asserter, { group: "mail", gid: "10" }))
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    asserter.assert(createAssertNode(asserter, { group: "mail" }))
  ).resolves.toBe(true)

  // With group absent
  await expect(
    asserter.assert(createAssertNode(asserter, { group: "notthere" }))
  ).resolves.toBe(false)

  // With group existing with same name and gid
  await expect(
    asserter.assert(createAssertNode(asserter, { group: "mail", gid: 100 }))
  ).resolves.toBe(true)

  // With group existing and system flag and gid in range
  await expect(
    asserter.assert(createAssertNode(asserter, { group: "mail", system: true }))
  ).resolves.toBe(true)

  // With group existing with different gid
  await expect(
    asserter.assert(createAssertNode(asserter, { group: "mail", gid: 110 }))
  ).resolves.toBe(false)

  // With group existing with outside system range
  await expect(
    asserter.assert(
      createAssertNode(asserter, { group: "other", system: true })
    )
  ).rejects.toThrow(ScriptError)

  // With group present with different gid and not root
  container.util.runningAsRoot = jest.fn(() => false)
  await expect(
    asserter.assert(createAssertNode(asserter, { group: "mail", gid: 110 }))
  ).rejects.toThrow(ScriptError)

  // With group absent and not root, no system login.defs
  container.util.getLoginDefs = async () => ({})
  container.util.getGroups = async (fs) => []
  await expect(
    asserter.assert(createAssertNode(asserter, { group: "notthere" }))
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
  const asserter = new GroupExists(container)

  asserter.expandedGroupName = "name"
  asserter.modify = false
  asserter.gid = undefined

  // Add & system
  asserter.system = true
  await expect(asserter.rectify()).resolves.toBeUndefined()

  // Modify
  asserter.system = false
  asserter.modify = true
  await expect(asserter.rectify()).resolves.toBeUndefined()

  // Group not present after command
  container.util.getGroups = jest.fn(async () => [])
  await expect(asserter.rectify()).rejects.toThrow(Error)
})

test("result", () => {
  const asserter = new GroupExists({})

  asserter.expandedGroupName = "name"
  asserter.gid = 12

  expect(asserter.result()).toEqual({
    group: asserter.expandedGroupName,
    gid: 12,
  })
})
