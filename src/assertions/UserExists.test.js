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
        {
          name: "service1",
          uid: 100,
          gid: 100,
          shell: "/sbin/nologin",
          homeDir: "/var/service",
          comment: "",
          passwordDisabled: true,
        },
      ],
      getGroups: async () => [
        {
          name: "group1",
          gid: 1000,
        },
        {
          name: "service1",
          gid: 100,
        },
      ],
    },
  }

  const assertion = new UserExists(container)

  // Bad args
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { user: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { user: "x", uid: "1" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { user: "x", system: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, { user: "x", uid: 1000, system: true })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { user: "x", gid: "1" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { user: "x", group: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, { user: "user1", group: "notthere" })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { user: "x", shell: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { user: "x", homeDir: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { user: "x", comment: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, { user: "x", passwordDisabled: 1 })
    )
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        user: "user1",
        group: "group1",
        passwordDisabled: false,
      })
    )
  ).resolves.toBe(true)

  assertion.uid = undefined

  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        user: "service1",
        group: "service1",
        passwordDisabled: true,
      })
    )
  ).resolves.toBe(true)

  // With user existing but with different stuff
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        user: "user1",
        gid: 2000,
      })
    )
  ).resolves.toBe(false)
  assertion.gid = undefined
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        user: "user1",
        uid: 2000,
      })
    )
  ).resolves.toBe(false)
  assertion.uid = undefined
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        user: "user1",
        shell: "/bin/bash",
      })
    )
  ).resolves.toBe(false)
  assertion.shell = undefined
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        user: "user1",
        homeDir: "/home/user1",
      })
    )
  ).resolves.toBe(false)
  assertion.homeDir = undefined
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        user: "user1",
        comment: "User1",
      })
    )
  ).resolves.toBe(false)
  assertion.comment = undefined

  // User existing outside system range
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        user: "user1",
        system: true,
      })
    )
  ).rejects.toThrow(ScriptError)
  assertion.system = undefined

  // With user absent
  container.util.getLoginDefs = async () => ({})

  await expect(
    assertion.assert(createAssertNode(assertion, { user: "notthere" }))
  ).resolves.toBe(false)

  // User absent with system flag
  await expect(
    assertion.assert(
      createAssertNode(assertion, { user: "notthere", system: true })
    )
  ).resolves.toBe(false)
  assertion.system = undefined

  // With user absent and not root
  container.util.runningAsRoot = () => false
  await expect(
    assertion.assert(createAssertNode(assertion, { user: "notthere" }))
  ).rejects.toThrow(ScriptError)

  // With user different and not root
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
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
  const assertion = new UserExists(container)

  assertion.modify = false
  assertion.name = "user1"
  assertion.system = true
  assertion.user = users[0]
  assertion.passwordDisabled = false
  await expect(assertion.rectify()).resolves.toBeUndefined()

  assertion.system = false
  assertion.comment = "Comment with spaces"
  assertion.passwordDisabled = true
  await expect(assertion.rectify()).resolves.toBeUndefined()

  assertion.modify = true
  assertion.name = "badname"
  assertion.user = users[1]
  assertion.passwordDisabled = false
  await expect(assertion.rectify()).rejects.toThrow(Error)

  assertion.user = users[1]
  assertion.passwordDisabled = true
  await expect(assertion.rectify()).rejects.toThrow(Error)
})

test("result", () => {
  const assertion = new UserExists({})
  const user = {
    name: "user1",
    gid: 12,
    uid: 12,
    shell: "/bin/bash",
    homeDir: "/home/user1",
    comment: "",
  }

  Object.assign(assertion, user)

  expect(assertion.result()).toEqual(user)
})
