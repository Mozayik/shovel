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

  const assertion = new FileCopiedToRemote(container)

  // Bad args
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { localFile: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { localFile: "" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, { localFile: "", remoteFile: 1 })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, { localFile: "", remoteFile: "" })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, { localFile: "", remoteFile: "", host: 1 })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        localFile: "",
        remoteFile: "",
        host: "",
        user: 1,
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        localFile: "",
        remoteFile: "",
        host: "",
        port: "",
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        localFile: "",
        remoteFile: "",
        host: "",
        identity: 1,
      })
    )
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        localFile: "/somefile",
        remoteFile: "/somefile",
        host: "hostname",
      })
    )
  ).resolves.toBe(true)

  // Happy path, no defaults
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
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
    assertion.assert(
      createAssertNode(assertion, {
        localFile: "/notthere",
        remoteFile: "/otherfile",
        host: "hostname",
      })
    )
  ).rejects.toThrow(ScriptError)

  // With localFile not readable
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        localFile: "/notreadable",
        remoteFile: "/otherfile",
        host: "hostname",
      })
    )
  ).rejects.toThrow(ScriptError)

  // Copied with remoteFile file non-existent
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        localFile: "/somefile",
        remoteFile: "/notthere",
        host: "hostname",
      })
    )
  ).resolves.toBe(false)

  // Copied with different files
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        localFile: "/somefile",
        remoteFile: "/badfile",
        host: "hostname",
      })
    )
  ).resolves.toBe(false)
})

test("rectify", async () => {
  const assertion = new FileCopiedToRemote({
    fs: {
      copy: async () => undefined,
    },
  })

  const SFTP = class {
    async putFile() {}
    close() {}
  }

  assertion.localFilePath = "/blah"
  assertion.remoteFilePath = "/blurp"
  assertion.sftp = new SFTP()

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", async () => {
  const assertion = new FileCopiedToRemote({})

  assertion.localFilePath = "/blah"
  assertion.remoteFilePath = "/blurp"
  assertion.host = "hostname"

  expect(assertion.result()).toEqual({
    localFile: assertion.localFilePath,
    remoteFile: assertion.remoteFilePath,
    host: assertion.host,
  })

  assertion.port = 22
  assertion.user = "user"
  assertion.identity = "~/.ssh/idrsa"

  expect(assertion.result()).toEqual({
    localFile: assertion.localFilePath,
    remoteFile: assertion.remoteFilePath,
    host: assertion.host,
    port: assertion.port,
    user: assertion.user,
    identity: assertion.identity,
  })
})
