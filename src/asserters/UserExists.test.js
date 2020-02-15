import { UserExists } from "./UserExists"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"

let container = null

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    util: {
      runningAsRoot: () => true,
      getLoginDefs: async () => ({ SYS_UID_MIN: 100, SYS_UID_MAX: 999 }),
      getUsers: async () => [
        {
          name: "user1",
          uid: 1000,
          gid: 1000,
          shell: "/bin/sh",
          homeDir: "/users/user1",
          comment: "",
        },
      ],
    },
  }

  const asserter = new UserExists(container)

  // Bad args
  await expect(asserter.assert(createAssertNode(asserter, {}))).rejects.toThrow(
    ScriptError
  )
  await expect(
    asserter.assert(createAssertNode(asserter, { user: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { user: "x", uid: "1" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { user: "x", system: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(
      createAssertNode(asserter, { user: "x", uid: 1000, system: true })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { user: "x", gid: "1" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { user: "x", shell: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { user: "x", homeDir: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { user: "x", comment: 1 }))
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        user: "user1",
      })
    )
  ).resolves.toBe(true)

  // With user existing but with different stuff
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        user: "user1",
        gid: 2000,
      })
    )
  ).resolves.toBe(false)
  asserter.gid = undefined
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        user: "user1",
        uid: 2000,
      })
    )
  ).resolves.toBe(false)
  asserter.uid = undefined
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        user: "user1",
        shell: "/bin/bash",
      })
    )
  ).resolves.toBe(false)
  asserter.shell = undefined
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        user: "user1",
        homeDir: "/home/user1",
      })
    )
  ).resolves.toBe(false)
  asserter.homeDir = undefined
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        user: "user1",
        comment: "User1",
      })
    )
  ).resolves.toBe(false)
  asserter.comment = undefined

  // User existing outside system range
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        user: "user1",
        system: true,
      })
    )
  ).rejects.toThrow(ScriptError)
  asserter.system = undefined

  // With user absent
  container.util.getLoginDefs = async () => ({})

  await expect(
    asserter.assert(createAssertNode(asserter, { user: "notthere" }))
  ).resolves.toBe(false)

  // User absent with system flag
  await expect(
    asserter.assert(
      createAssertNode(asserter, { user: "notthere", system: true })
    )
  ).resolves.toBe(false)
  asserter.system = undefined

  // With user absent and not root
  container.util.runningAsRoot = () => false
  await expect(
    asserter.assert(createAssertNode(asserter, { user: "notthere" }))
  ).rejects.toThrow(ScriptError)

  // With user different and not root
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        user: "user1",
        gid: 2,
      })
    )
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const users = [
    {
      name: "user1",
      gid: 12,
      uid: 12,
      shell: "/bin/bash",
      homeDir: "/home/user1",
      comment: "",
    },
    {
      name: "user2",
    },
  ]
  const container = {
    childProcess: {
      exec: async () => undefined,
    },
    util: {
      getUsers: async () => users,
    },
  }
  const asserter = new UserExists(container)

  asserter.modify = false
  asserter.name = "user1"
  asserter.system = true
  asserter.user = users[0]
  await expect(asserter.rectify()).resolves.toBeUndefined()

  asserter.system = false
  asserter.comment = "Comment with spaces"
  await expect(asserter.rectify()).resolves.toBeUndefined()

  asserter.modify = true
  asserter.name = "badname"
  asserter.user = users[1]
  await expect(asserter.rectify()).rejects.toThrow(Error)
})

test("result", () => {
  const asserter = new UserExists({})
  const user = {
    name: "user1",
    gid: 12,
    uid: 12,
    shell: "/bin/bash",
    homeDir: "/home/user1",
    comment: "",
  }

  Object.assign(asserter, user)

  expect(asserter.result()).toEqual(user)
})
