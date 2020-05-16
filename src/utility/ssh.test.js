import { SSH } from "./ssh"
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
  const ssh = new SSH()

  expect(ssh).not.toBeNull()
})

test("parseLines", async () => {
  const ssh = new SSH({
    console: { log: () => null },
  })
  let result = ssh.parseLines(
    "Enter passphrase for xxx\nVerification code:\nerror:\nfred@localhost's password:\nfred@localhost: Permission denied\nxyz: Connection refused\n[sudo] password for\nabc\n/x/y/z\nv1.2.3\n{}\n> start\n0\nPS1>\n"
  )

  expect(result).toEqual({
    outputLines: ["/x/y/z", "v1.2.3"],
    errorLines: ["error:"],
    jsonLines: ["{}"],
    startLine: "start",
    exitCode: 0,
    ready: false,
    permissionDenied: true,
    connectionRefused: true,
    passphraseRequired: true,
    loginPasswordPrompt: "fred@localhost's password:",
    sudoPasswordPrompt: "[sudo] password for",
    verificationPrompt: "Verification code:",
  })

  ssh.parseLines("{\n")
  ssh.debug = true
  result = ssh.parseLines("}\n")
  expect(result).toEqual({
    outputLines: [],
    errorLines: [],
    jsonLines: ["{}"],
    startLine: null,
    exitCode: null,
    ready: false,
    permissionDenied: false,
    connectionRefused: false,
    passphraseRequired: false,
    loginPasswordPrompt: null,
    sudoPasswordPrompt: null,
    verificationPrompt: null,
  })
})

test("connect", async () => {
  const pty = new PsuedoTerm()
  const container = {
    process: {
      stdin: { unref: () => undefined },
      stdout: {},
      exit: () => null,
    },
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
  let ssh = new SSH(container)

  // No host
  ssh.close()
  await expect(ssh.connect()).rejects.toThrow("Host must")

  // Success with password
  setImmediate(() => {
    pty.emit("data", "")
    pty.emit("data", "x@y's password:")
    setImmediate(() => {
      pty.emit("data", "")
      pty.emit("data", "x@y's password:") // Twice to test caching
      setImmediate(() => {
        pty.emit("data", "Verification code:")
        pty.emit("data", "PS1>")
      })
    })
  })
  await expect(ssh.connect({ host: "host" })).resolves.toBeUndefined()

  // All options
  ssh.close()
  setImmediate(() => {
    pty.emit("data", "PS1>")
  })
  await expect(
    ssh.connect({
      host: "host",
      port: 22,
      identity: "~/.ssh/id_rsa",
      user: "fred",
    })
  ).resolves.toBeUndefined()

  // Already connected
  await expect(ssh.connect({ host: "xyz" })).rejects.toThrow(
    "Already connected"
  )

  // Permission denied
  ssh.close()
  setImmediate(() => {
    pty.emit("data", "x@y: Permission denied")
  })
  await expect(ssh.connect({ host: "host" })).rejects.toThrow(
    "Unable to connect"
  )

  // Connection refused
  ssh.close()
  setImmediate(() => {
    pty.emit("data", "x@y: Connection refused")
  })
  await expect(ssh.connect({ host: "host" })).rejects.toThrow("refused")

  // Passphrase required
  ssh.close()
  setImmediate(() => {
    pty.emit("data", "Enter passphrase for xxx")
  })
  await expect(ssh.connect({ host: "host" })).rejects.toThrow("passphrase")

  // No prompts
  ssh.close()
  setImmediate(() => {
    pty.emit("data", "x@y's password:")
  })
  await expect(ssh.connect({ host: "host", noPrompts: true })).rejects.toThrow(
    "login prompt"
  )

  // Bad ssh spawn
  container.nodePty.spawn = () => {
    throw new Error()
  }
  await expect(ssh.connect({ host: "xyz" })).rejects.toThrow(Error)
})

test("showPrompt", async () => {
  const rlp = new EventEmitter()
  const ssh = new SSH({
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
  await expect(ssh.showPrompt("xyz")).resolves.toBe("abc")

  // Ctrl+C
  rlp.passwordAsync = () =>
    new Promise((resolve, reject) => {
      setImmediate(() => {
        rlp.emit("SIGINT")
        resolve()
      })
    })
  await expect(ssh.showPrompt("xyz")).resolves.toBeUndefined()
})

test("run", async () => {
  const pty = new PsuedoTerm()
  const container = {
    process: { stdin: {}, stdout: {}, exit: () => null },
    console: { log: () => null },
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
  let ssh = new SSH(container)

  // No terminal
  await expect(ssh.run("bash")).rejects.toThrow("No terminal")

  // Success
  ssh.pty = pty
  setImmediate(() => {
    pty.emit("data", "[sudo] password for x")
    setImmediate(() => {
      pty.emit("data", "> start\nerror: blah\n{x:1}\n")

      setImmediate(() => {
        pty.emit("data", "/x\n0\nPS1>")
      })
    })
  })
  await expect(
    ssh.run("something", {
      logError: () => undefined,
      logOutput: () => undefined,
      startSpinner: () => undefined,
      stopSpinner: () => undefined,
      cwd: "/x/y",
      sudo: true,
      timeout: 10000,
    })
  ).resolves.toEqual({
    exitCode: 0,
    output: ["/x"],
  })

  // Bad exit code, no timeout, no sudo
  setImmediate(() => {
    pty.emit("data", "1\nPS1>")
  })
  await expect(ssh.run("something")).rejects.toThrow(Error)
})

test("close", () => {
  const ssh = new SSH()

  ssh.pty = { destroy: () => undefined }

  expect(ssh.close()).toBeUndefined()
})
