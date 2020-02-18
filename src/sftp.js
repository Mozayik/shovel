import * as nodePty from "node-pty"
import autobind from "autobind-decorator"
import Timeout from "await-timeout"
import readlinePassword from "@johnls/readline-password"
import { ansiEscapeRegex } from "./util"
import tempy from "tempy"
import fs from "fs-extra"
import path from "path"

const ps1 = "sftp>"

@autobind
export class SFTP {
  constructor(container = {}) {
    this.nodePty = container.nodePty || nodePty
    this.readlinePassword = container.readlinePassword || readlinePassword
    this.Timeout = container.Timeout || Timeout
    this.process = container.process || process
    this.console = container.console || console
    this.fs = container.fs || fs
    this.debug = container.debug
    this.pty = null
  }

  static parseLines(data) {
    const stripAnsiEscapes = (s) => s.replace(ansiEscapeRegex, "")
    let errorLines = undefined
    let ready = false
    let loginPasswordPrompt = undefined
    let lines = stripAnsiEscapes(data.toString()).match(/^.*((\r\n|\n|\r)|$)/gm)
    let permissionDenied = false
    let notFound = false
    let infoLines = undefined

    lines = lines.map((line) => line.trim())

    // NOTE: Keep for debugging
    // console.log(lines)

    for (const line of lines) {
      if (!line) {
        continue
      } else if (line.startsWith("error:") || line.startsWith("warning:")) {
        if (errorLines === undefined) {
          errorLines = [line]
        } else {
          errorLines.push(line)
        }
      } else if (/^.+@.+'s password:/.test(line)) {
        loginPasswordPrompt = line
      } else if (/^.+@.+: Permission denied/.test(line)) {
        permissionDenied = true
      } else if (line.endsWith("not found")) {
        notFound = true
      } else if (/^[dl-]{1}[rwx-]{9}/.test(line)) {
        if (infoLines === undefined) {
          infoLines = [line]
        } else {
          infoLines.push(line)
        }
      }
    }

    const lastLine = lines[lines.length - 1]

    if (lastLine.endsWith(ps1)) {
      ready = true
    }

    return {
      infoLines,
      errorLines,
      ready,
      loginPasswordPrompt,
      permissionDenied,
      notFound,
    }
  }

  async connect(options = {}) {
    if (this.pty) {
      throw new Error("Already connected")
    }

    let args = []

    if (!options.host) {
      throw new Error("Host must be specified")
    }

    if (options.user) {
      args.push(`${options.user}@${options.host}`)
    } else {
      args.push(options.host)
    }

    if (options.port) {
      args = args.concat(["-p", options.port.toString()])
    }

    if (options.identity) {
      args = args.concat(["-i", options.identity])
    }

    let pty = this.nodePty.spawn("sftp", args, {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env,
    })

    this.promptDisplayed = false

    return new Promise((resolve, reject) => {
      let loginPasswordPrompts = new Map(options.loginPasswordPrompts)
      const dataHandler = ({
        ready,
        permissionDenied,
        loginPasswordPrompt,
      }) => {
        if (ready) {
          // Successful connection, PTY stays open
          this.pty = pty
          this.loginPasswordPrompts = loginPasswordPrompts
          dataEvent.dispose()
          resolve()
        } else if (permissionDenied) {
          dataEvent.dispose()
          reject(
            new Error(
              `Unable to connect to ${options.host}; bad password or key`
            )
          )
        } else if (loginPasswordPrompt) {
          if (options.noPrompts) {
            dataEvent.dispose()
            reject(new Error("Remote displayed a login prompt"))
          } else if (loginPasswordPrompts.has(loginPasswordPrompt)) {
            pty.write(loginPasswordPrompts.get(loginPasswordPrompt))
          } else {
            this.showPrompt(loginPasswordPrompt).then((password) => {
              loginPasswordPrompts.set(loginPasswordPrompt, password + "\n")
              setImmediate(() => dataHandler({ loginPasswordPrompt }))
            })
          }
        }
      }
      const dataEvent = pty.onData((data) => {
        dataHandler(SFTP.parseLines(data))
      })
      const exitEvent = pty.onExit((e) => {
        if (this.promptDisplayed) {
          process.stdin.unref() // To free the Node event loop
        }

        exitEvent.dispose()
      })
    })
  }

  async showPrompt(prompt) {
    const rlp = this.readlinePassword.createInstance(
      this.process.stdin,
      this.process.stdout
    )

    this.promptDisplayed = true

    rlp.on("SIGINT", () => {
      this.console.log("^C")
      this.process.exit()
    })

    const response = await rlp.passwordAsync(prompt)

    rlp.close()

    return response
  }

  async putFile(localFile, remoteFile, options = {}) {
    if (!this.pty) {
      throw new Error("No terminal is connected")
    }

    const promises = [
      new Promise((resolve, reject) => {
        const dataHandler = ({ errorLines, ready }) => {
          if (errorLines && errorLines.length > 0) {
            if (options.logError) {
              errorLines.forEach((line) => options.logError(line))
            }
            dataEvent.dispose()
            reject(new Error(`Unable to upload ${remoteFile}`))
          } else if (ready) {
            dataEvent.dispose()
            resolve()
          }
        }
        const dataEvent = this.pty.onData((data) => {
          dataHandler(SFTP.parseLines(data))
        })
      }),
    ]

    let timer = null

    if (options.timeout) {
      timer = new this.Timeout()
      promises.push(timer.set(options.timeout))
    }

    // Ensure fully qualified local name
    localFile = path.resolve(this.process.cwd(), localFile)

    this.pty.write(`put ${localFile} ${remoteFile}\n`)

    try {
      await Promise.race(promises)
    } finally {
      if (timer) {
        timer.clear()
      }
    }
  }

  async putContent(contents, remoteFile, options = {}) {
    if (!this.pty) {
      throw new Error("No terminal is connected")
    }

    const localFile = tempy.file()

    try {
      await this.fs.writeFile(localFile, contents)
      await this.putFile(localFile, remoteFile, options)
    } finally {
      await this.fs.remove(localFile)
    }
  }

  async getInfo(remoteFile, options = {}) {
    if (!this.pty) {
      throw new Error("No terminal is connected")
    }

    const parsePerms = (s) => {
      return (
        (s[1] === "r" ? 0o400 : 0) |
        (s[2] === "w" ? 0o200 : 0) |
        (s[3] === "x" ? 0o100 : 0) |
        (s[4] === "r" ? 0o40 : 0) |
        (s[5] === "w" ? 0o20 : 0) |
        (s[6] === "x" ? 0o10 : 0) |
        (s[7] === "r" ? 0o4 : 0) |
        (s[8] === "w" ? 0o2 : 0) |
        (s[9] === "x" ? 0o1 : 0)
      )
    }

    const promises = [
      new Promise((resolve, reject) => {
        let info = null

        const dataHandler = ({ infoLines, notFound, ready }) => {
          if (notFound) {
            dataEvent.dispose()
            reject(new Error(`File '${remoteFile}' not found on remote`))
          }
          if (infoLines) {
            const match = infoLines[0].match(
              /^([dl-]{1}[rwx-]{9})\s+\?\s+(\d+)\s+(\d+)\s+(\d+)/
            )

            if (match !== null) {
              info = {
                mode: parsePerms(match[1]),
                uid: parseInt(match[2]),
                gid: parseInt(match[3]),
                size: parseInt(match[4]),
              }
            }
          }
          if (ready) {
            dataEvent.dispose()

            if (info === null) {
              reject(new Error("Unexpected remote output"))
            } else {
              resolve(info)
            }
          }
        }
        const dataEvent = this.pty.onData((data) => {
          dataHandler(SFTP.parseLines(data))
        })
      }),
    ]

    let timer = null

    if (options.timeout) {
      timer = new this.Timeout()
      promises.push(timer.set(options.timeout))
    }

    this.pty.write(`ls -l ${remoteFile}\n`)

    let info = null

    try {
      info = await Promise.race(promises)
    } finally {
      if (timer) {
        timer.clear()
      }
    }

    return info
  }

  close() {
    if (this.pty) {
      this.pty.destroy()
      this.pty = null
    }
  }
}
