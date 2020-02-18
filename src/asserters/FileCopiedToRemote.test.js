import { FileCopiedToRemote } from "./FileCopiedToRemote"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"
import { PathInfo, PathAccess } from "../util"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    process: {
      cwd: () => "/",
    },
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
    asserter.assert(createAssertNode(asserter, { localFile: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(createAssertNode(asserter, { localFile: "" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(
      createAssertNode(asserter, { localFile: "", remoteFile: 1 })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(
      createAssertNode(asserter, { localFile: "", remoteFile: "" })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(
      createAssertNode(asserter, { localFile: "", remoteFile: "", host: 1 })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        localFile: "",
        remoteFile: "",
        host: "",
        user: 1,
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        localFile: "",
        remoteFile: "",
        host: "",
        port: "",
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        localFile: "",
        remoteFile: "",
        host: "",
        identity: 1,
      })
    )
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        localFile: "/somefile",
        remoteFile: "/somefile",
        host: "hostname",
      })
    )
  ).resolves.toBe(true)

  // Happy path, no defaults
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        localFile: "/somefile",
        remoteFile: "/somefile",
        host: "hostname",
        port: 22,
        user: "username",
        identity: "identity",
      })
    )
  ).resolves.toBe(true)

  // With localFile file non-existent
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        localFile: "/notthere",
        remoteFile: "/otherfile",
        host: "hostname",
      })
    )
  ).rejects.toThrow(ScriptError)

  // With localFile not readable
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        localFile: "/notreadable",
        remoteFile: "/otherfile",
        host: "hostname",
      })
    )
  ).rejects.toThrow(ScriptError)

  // Copied with remoteFile file non-existent
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        localFile: "/somefile",
        remoteFile: "/notthere",
        host: "hostname",
      })
    )
  ).resolves.toBe(false)

  // Copied with different files
  await expect(
    asserter.assert(
      createAssertNode(asserter, {
        localFile: "/somefile",
        remoteFile: "/badfile",
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
    async putFile() {}
    close() {}
  }

  asserter.localFilePath = "/blah"
  asserter.remoteFilePath = "/blurp"
  asserter.sftp = new SFTP()

  await expect(asserter.rectify()).resolves.toBeUndefined()
})

test("result", async () => {
  const asserter = new FileCopiedToRemote({})

  asserter.localFilePath = "/blah"
  asserter.remoteFilePath = "/blurp"
  asserter.host = "hostname"

  expect(asserter.result()).toEqual({
    localFile: asserter.localFilePath,
    remoteFile: asserter.remoteFilePath,
    host: asserter.host,
  })

  asserter.port = 22
  asserter.user = "user"
  asserter.identity = "~/.ssh/idrsa"

  expect(asserter.result()).toEqual({
    localFile: asserter.localFilePath,
    remoteFile: asserter.remoteFilePath,
    host: asserter.host,
    port: asserter.port,
    user: asserter.user,
    identity: asserter.identity,
  })
})
