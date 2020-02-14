import { FileCopiedToRemote } from "./FileCopiedToRemote"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"
import { PathInfo, PathAccess } from "../util"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    SFTP: class {
      async connect() {}
      async getInfo(remoteFile) {
        if (remoteFile === "/notthere") {
          throw new Error()
        } else if (remoteFile === "/badfile") {
          return {
            size: 50,
          }
        } else {
          return {
            size: 100,
          }
        }
      }
      close() {}
    },
    util: {
      pathInfo: async (path) => {
        if (path === "/notthere") {
          return new PathInfo()
        } else if (path === "/notreadable") {
          return new PathInfo({
            isFile: () => true,
            getAccess: () => new PathAccess(0),
          })
        } else {
          return new PathInfo({
            isFile: () => true,
            isDirectory: () => false,
            mode: 0o777,
            size: 100,
          })
        }
      },
    },
  }

  const asserter = new FileCopiedToRemote(container)

  // Bad args
  await expect(asserter.assert(createAssertNode(asserter, {}))).rejects.toThrow(
    ScriptError
  )
  await expect(
    asserter.assert(createAssertNode(asserter, { fromFile: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { fromFile: "" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { fromFile: "", toFile: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { fromFile: "", toFile: "" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(
      createAssertNode(asserter, { fromFile: "", toFile: "", host: 1 })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        fromFile: "",
        toFile: "",
        host: "",
        user: 1,
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        fromFile: "",
        toFile: "",
        host: "",
        port: "",
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        fromFile: "",
        toFile: "",
        host: "",
        identity: 1,
      })
    )
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        fromFile: "/somefile",
        toFile: "/somefile",
        host: "hostname",
      })
    )
  ).resolves.toBe(true)

  // Happy path, no defaults
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        fromFile: "/somefile",
        toFile: "/somefile",
        host: "hostname",
        port: 22,
        user: "username",
        identity: "identity",
      })
    )
  ).resolves.toBe(true)

  // With fromFile file non-existent
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        fromFile: "/notthere",
        toFile: "/otherfile",
        host: "hostname",
      })
    )
  ).rejects.toThrow(ScriptError)

  // With fromFile not readable
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        fromFile: "/notreadable",
        toFile: "/otherfile",
        host: "hostname",
      })
    )
  ).rejects.toThrow(ScriptError)

  // Copied with toFile file non-existent
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        fromFile: "/somefile",
        toFile: "/notthere",
        host: "hostname",
      })
    )
  ).resolves.toBe(false)

  // Copied with different files
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        fromFile: "/somefile",
        toFile: "/badfile",
        host: "hostname",
      })
    )
  ).resolves.toBe(false)
})

test("rectify", async () => {
  const asserter = new FileCopiedToRemote({
    fs: {
      copy: async () => undefined,
    },
  })

  const SFTP = class {
    async putContent() {}
    close() {}
  }

  asserter.expandedFromFile = "/blah"
  asserter.expandedToFile = "/blurp"
  asserter.sftp = new SFTP()

  await expect(asserter.rectify()).resolves.toBeUndefined()
})

test("result", async () => {
  const asserter = new FileCopiedToRemote({})

  asserter.expandedFromFile = "/blah"
  asserter.expandedToFile = "/blurp"
  asserter.expandedHost = "hostname"

  expect(asserter.result()).toEqual({
    fromFile: asserter.expandedFromFile,
    toFile: asserter.expandedToFile,
    host: asserter.expandedHost,
    port: 22,
    user: process.env.USER,
    identity: "~/.ssh/idrsa",
  })

  asserter.port = 22
  asserter.user = "user"
  asserter.identity = "~/.ssh/idrsa"

  expect(asserter.result()).toEqual({
    fromFile: asserter.expandedFromFile,
    toFile: asserter.expandedToFile,
    host: asserter.expandedHost,
    port: asserter.port,
    user: asserter.user,
    identity: asserter.identity,
  })
})
