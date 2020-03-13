import { SFTP } from "./sftp"
import EventEmitter from "events"

class PsuedoTerm extends EventEmitter {
  write() {}
  destroy() {
    this.emit("exit", null)
  }
  onData(cb) {
    this.on("data", cb)
    return { dispose: () => this.off("data", cb) }
  }
  onExit(cb) {
    this.on("exit", cb)
    return { dispose: () => this.off("exit", cb) }
  }
}

test("constructor", async () => {
  const sftp = new SFTP()
})

test("parseLines", async () => {
  const sftp = new SFTP({
    console: { log: () => null },
  })
  let result = sftp.parseLines(
    "\nerror:\nerror:\nfred@localhost's password:\ndrwxrwxrwx \ndrwxrwxrwx \nfred@localhost: Permission denied\nsftp>"
  )

  expect(result).toEqual({
    errorLines: ["error:", "error:"],
    infoLines: null,
    ready: true,
    notFound: false,
    permissionDenied: true,
    loginPasswordPrompt: "fred@localhost's password:",
    infoLines: ["drwxrwxrwx", "drwxrwxrwx"],
  })

  sftp.debug = true
  result = sftp.parseLines("sftp>")
  expect(result).toEqual({
    errorLines: null,
    infoLines: null,
    ready: true,
    notFound: false,
    permissionDenied: false,
    loginPasswordPrompt: null,
    infoLines: null,
  })
})

test("connect", async () => {
  const pty = new PsuedoTerm()
  const container = {
    process: { stdin: {}, stdout: {}, exit: () => null },
    console: { log: () => null },
    nodePty: {
      spawn: () => pty,
      destroy: () => {
        undefined
      },
    },
    readlinePassword: {
      createInstance: () => {
        const Instance = class extends EventEmitter {
          async passwordAsync() {
            return "abc"
          }
          close() {}
        }

        return new Instance()
      },
    },
  }
  let sftp = new SFTP(container)

  // No host
  await expect(sftp.connect()).rejects.toThrow("Host must")

  // Success with password
  setImmediate(() => {
    pty.emit("data", "warning: x\n\n")
    pty.emit("data", "x@y's password:")
    setImmediate(() => {
      pty.emit("data", "sftp>")
    })
  })
  await expect(sftp.connect({ host: "host" })).resolves.toBeUndefined()

  // Permission denied
  sftp.close()
  setImmediate(() => {
    pty.emit("data", "x@y: Permission denied")
  })
  await expect(sftp.connect({ host: "host" })).rejects.toThrow(
    "Unable to connect"
  )

  // All options
  sftp.close()
  setImmediate(() => {
    pty.emit("data", "sftp>")
  })
  await expect(
    sftp.connect({
      host: "host",
      port: 22,
      identity: "~/.ssh/id_rsa",
      user: "fred",
    })
  ).resolves.toBeUndefined()

  // // Already connected
  await expect(sftp.connect({ host: "xyz" })).rejects.toThrow(
    "Already connected"
  )

  // // No prompts allowed
  sftp.close()
  setImmediate(() => {
    pty.emit("data", "x@y's password:")
  })
  await expect(sftp.connect({ host: "host", noPrompts: true })).rejects.toThrow(
    "displayed a login"
  )

  // Bad ssh spawn
  container.nodePty.spawn = () => {
    throw new Error()
  }
  await expect(sftp.connect({ host: "xyz" })).rejects.toThrow(Error)
})

test("showPrompt", async () => {
  const rlp = new EventEmitter()
  const sftp = new SFTP({
    process: {
      stdin: {},
      stdout: {},
      exit: () => null,
    },
    console: { log: () => null },
    nodePty: {},
    readlinePassword: { createInstance: () => rlp },
  })

  // Success
  rlp.passwordAsync = async () => "abc"
  rlp.close = () => undefined
  await expect(sftp.showPrompt("xyz")).resolves.toBe("abc")

  // Ctrl+C
  rlp.passwordAsync = () =>
    new Promise((resolve, reject) => {
      setImmediate(() => {
        rlp.emit("SIGINT")
        resolve()
      })
    })
  await expect(sftp.showPrompt("xyz")).resolves.toBeUndefined()
})

test("putFile", async () => {
  const pty = new PsuedoTerm()
  const container = {
    process: { stdin: {}, stdout: {}, exit: () => null, cwd: () => "/" },
    console: { log: () => null },
    fs: {
      remove: async () => undefined,
    },
  }
  let sftp = new SFTP(container)

  // No terminal
  await expect(sftp.putFile()).rejects.toThrow("No terminal")

  // Success
  sftp.pty = pty
  setImmediate(() => {
    pty.emit("data", "some output\n")
    pty.emit("data", "sftp>")
  })
  await expect(
    sftp.putFile("/a/b", "/x/y", {
      timeout: 10000,
    })
  ).resolves.toBeUndefined()

  // No timeout
  setImmediate(() => {
    pty.emit("data", "sftp>")
  })
  await expect(sftp.putFile("/a/b", "/x/y")).resolves.toBeUndefined()

  // Failed upload
  setImmediate(() => {
    pty.emit("data", "error: xyz\nsftp>")
  })
  await expect(
    sftp.putFile("/a/b", "/x/y", { logError: () => undefined })
  ).rejects.toThrow("Unable to upload")

  // Failed upload, no logging
  setImmediate(() => {
    pty.emit("data", "error: xyz\nsftp>")
  })
  await expect(sftp.putFile("/a/b", "/x/y")).rejects.toThrow("Unable to upload")
})

test("putContent", async () => {
  const pty = new PsuedoTerm()
  const container = {
    process: { stdin: {}, stdout: {}, exit: () => null, cwd: () => "/" },
    console: { log: () => null },
    fs: {
      writeFile: async () => undefined,
      remove: async () => undefined,
    },
  }
  let sftp = new SFTP(container)

  // No terminal
  await expect(sftp.putContent()).rejects.toThrow("No terminal")

  // Happy path
  sftp.pty = pty
  setImmediate(() => {
    pty.emit("data", "some output\n")
    pty.emit("data", "sftp>")
  })
  await expect(sftp.putContent("content", "/x/y")).resolves.toBeUndefined()
})

test("getInfo", async () => {
  class PsuedoTerm extends EventEmitter {
    write() {}
    destroy() {
      this.emit("exit", null)
    }
    onData(cb) {
      this.on("data", cb)
      return { dispose: () => undefined }
    }
  }

  const pty = new PsuedoTerm()
  const container = {
    process: { stdin: {}, stdout: {}, exit: () => null },
  }
  let sftp = new SFTP(container)

  // No terminal
  await expect(sftp.getInfo()).rejects.toThrow("No terminal")

  // Happy path
  sftp.pty = pty
  setImmediate(() => {
    pty.emit("data", "-rwxrwxrwx  ? 1000  1000  9999\n")
    pty.emit("data", "sftp>")
  })
  await expect(
    sftp.getInfo("/x/y", {
      timeout: 10000,
    })
  ).resolves.toEqual({ gid: 1000, mode: 511, size: 9999, uid: 1000 })

  // Happy, but different perms
  sftp.pty = pty
  setImmediate(() => {
    pty.emit("data", "----------  ? 1000  1000  9999\n")
    pty.emit("data", "sftp>")
  })
  await expect(
    sftp.getInfo("/x/y", {
      timeout: 10000,
    })
  ).resolves.toEqual({ gid: 1000, mode: 0, size: 9999, uid: 1000 })

  // Not found
  sftp.pty = pty
  setImmediate(() => {
    pty.emit("data", "/x/y was not found\n")
    pty.emit("data", "sftp>")
  })
  await expect(
    sftp.getInfo("/x/y", {
      timeout: 10000,
    })
  ).rejects.toThrow("not found")

  // No timeout and bad output
  sftp.pty = pty
  setImmediate(() => {
    pty.emit("data", "-rwxrwxrwx something unexpected\n")
    pty.emit("data", "sftp>")
  })
  await expect(sftp.getInfo("/x/y")).rejects.toThrow("Unexpected")
})

test("close", () => {
  const sftp = new SFTP()

  sftp.pty = { destroy: () => undefined }

  expect(sftp.close()).toBeUndefined()
})
