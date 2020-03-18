import * as nodePty from "node-pty"
import autobind from "autobind-decorator"
import readlinePassword from "@johnls/readline-password"
import Timeout from "await-timeout"
import { ansiEscapeRegex } from "./util"

const ps1 = "PS1>"
const ps2 = "PS2>"

@autobind
export class SSH {
  constructor(container = {}) {
    this.nodePty = container.nodePty || nodePty
    this.readlinePassword = container.readlinePassword || readlinePassword
    this.Timeout = container.Timeout || Timeout
    this.process = container.process || process
    this.console = container.console || console
    this.debug = container.debug
    this.pty = null
    this.partialJsonLine = null
  }

  parseLines(data) {
    const stripAnsiEscapes = (s) => s.replace(ansiEscapeRegex, "")
    const outputLines = []
    const errorLines = []
    const jsonLines = []
    let startLine = null
    let exitCode = null
    let ready = false
    let permissionDenied = false
    let connectionRefused = false
    let passphraseRequired = false
    let loginPasswordPrompt = null
    let sudoPasswordPrompt = null
    let verificationPrompt = null
    let lines = stripAnsiEscapes(data.toString()).match(/^.*((\r\n|\n|\r)|$)/gm)
    const hasBalancedBraces = (s) =>
      s
        .split("")
        .reduce((a, c) => a + (c === "{" ? 1 : c === "}" ? -1 : 0), 0) === 0

    lines = lines.map((line) => line.trim())

    if (this.debug) {
      this.console.log(lines)
    }

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]

      if (!line) {
        continue
      } else if (this.partialJsonLine || line.startsWith("{")) {
        if (this.partialJsonLine) {
          line = this.partialJsonLine + line
        }

        if (hasBalancedBraces(line)) {
          jsonLines.push(line)
          this.partialJsonLine = null
        } else {
          this.partialJsonLine = line
        }
      } else if (line.endsWith(": Connection refused")) {
        connectionRefused = true
      } else if (line.startsWith("error:") || line.startsWith("warning:")) {
        errorLines.push(line)
      } else if (/^\d+$/.test(line)) {
        exitCode = parseInt(line)
      } else if (/^v?\d+\.\d+\.\d+/.test(line)) {
        outputLines.push(line)
      } else if (line.startsWith("/")) {
        outputLines.push(line)
      } else if (line.startsWith(">")) {
        startLine = line
      } else if (line.startsWith("[sudo] password for")) {
        sudoPasswordPrompt = line
      } else if (/^.+@.+'s password:/.test(line)) {
        loginPasswordPrompt = line
      } else if (/^.+@.+: Permission denied/.test(line)) {
        permissionDenied = true
      } else if (line.startsWith("Verification code:")) {
        verificationPrompt = line
      } else if (line.startsWith("Enter passphrase for")) {
        passphraseRequired = true
      }
    }

    const lastLine = lines[lines.length - 1]

    if (lastLine.endsWith(ps1) || lastLine.endsWith(ps2)) {
      ready = true
    }

    const result = {
      outputLines,
      errorLines,
      jsonLines,
      startLine,
      exitCode,
      ready,
      permissionDenied,
      connectionRefused,
      passphraseRequired,
      loginPasswordPrompt,
      sudoPasswordPrompt,
      verificationPrompt,
    }

    return result
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

    args = args.concat(["-o", "NumberOfPasswordPrompts=1"])

    this.pty = this.nodePty.spawn("ssh", args, {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env,
    })

    this.promptDisplayed = false

    return new Promise((resolve, reject) => {
      let promptChanged = false
      let loginPasswordPrompts = new Map(options.loginPasswordPrompts)
      const dataHandler = ({
        ready,
        permissionDenied,
        connectionRefused,
        passphraseRequired,
        loginPasswordPrompt,
        verificationPrompt,
      }) => {
        if (ready) {
          // Successful connection, PTY stays open
          this.loginPasswordPrompts = loginPasswordPrompts
          dataEvent.dispose()
          resolve()
        } else if (permissionDenied) {
          reject(
            new Error(
              `Unable to connect to ${options.host}; bad password or key`
            )
          )
        } else if (connectionRefused) {
          reject(new Error(`Connection was refused by ${options.host}`))
        } else if (passphraseRequired) {
          dataEvent.dispose()
          reject(new Error("Use of SSH key requires a passphrase"))
        } else if (loginPasswordPrompt) {
          if (options.noPrompts) {
            dataEvent.dispose()
            reject(new Error("Remote displayed a login prompt"))
          } else if (loginPasswordPrompts.has(loginPasswordPrompt)) {
            this.pty.write(loginPasswordPrompts.get(loginPasswordPrompt))
          } else {
            this.showPrompt(loginPasswordPrompt).then((password) => {
              loginPasswordPrompts.set(loginPasswordPrompt, password + "\n")
              setImmediate(() => dataHandler({ loginPasswordPrompt }))
            })
          }
        } else if (verificationPrompt) {
          this.showPrompt(verificationPrompt).then((code) => {
            this.pty.write(code + "\n")
          })
        } else if (!promptChanged) {
          this.pty.write(`PROMPT_COMMAND=\nPS1='${ps1}'\nPS2='${ps2}'\n`)
          promptChanged = true
        }
      }
      const dataEvent = this.pty.onData((data) => {
        dataHandler(this.parseLines(data))
      })
      const exitEvent = this.pty.onExit(() => {
        if (this.promptDisplayed) {
          this.process.stdin.unref() // To free the Node event loop
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

  async run(command, options = {}) {
    if (!this.pty) {
      throw new Error("No terminal is connected")
    }

    const promises = []
    let output = []
    let savedExitCode = null

    promises.push(
      new Promise((resolve, reject) => {
        const dataHandler = ({
          ready,
          exitCode,
          jsonLines,
          errorLines,
          outputLines,
          startLine,
          sudoPasswordPrompt,
        }) => {
          if (exitCode !== null) {
            savedExitCode = exitCode
          }

          if (outputLines) {
            output = output.concat(outputLines)
          }

          if (sudoPasswordPrompt) {
            if (this.sudoPassword) {
              this.pty.write(this.sudoPassword)
            } else {
              this.showPrompt(sudoPasswordPrompt).then((password) => {
                this.sudoPassword = password + "\n"
                setImmediate(() => dataHandler({ sudoPasswordPrompt }))
              })
            }
          }

          // Start animation first
          if (options.startSpinner && startLine) {
            options.startSpinner(startLine)
          }

          // Show output next
          if (options.logOutput && jsonLines) {
            jsonLines.forEach((line) => options.logOutput(line))
          }

          // Show error lines last
          if (options.logError && errorLines) {
            errorLines.forEach((line) => options.logError(line))
          }

          if (ready) {
            if (options.stopSpinner) {
              options.stopSpinner()
            }
            dataEvent.dispose()
            return resolve()
          }
        }
        const dataEvent = this.pty.onData((data) => {
          dataHandler(this.parseLines(data))
        })
      })
    )

    let timer = null

    if (options.timeout) {
      timer = new this.Timeout()
      promises.push(timer.set(options.timeout))
    }

    const commandLine =
      (options.cwd ? `cd ${options.cwd} 1> /dev/null 2> /dev/null;` : "") +
      (options.sudo ? "sudo -E " : "") +
      command +
      "; echo $?\n"

    this.pty.write(commandLine)

    try {
      await Promise.race(promises)
    } finally {
      if (timer) {
        timer.clear()
      }
    }

    if (!options.noThrow && savedExitCode) {
      throw new Error(
        `Command '${command}' returned exit code ${savedExitCode}`
      )
    }

    return { exitCode: savedExitCode, output }
  }

  close() {
    if (this.pty) {
      this.pty.destroy()
      this.pty = null
    }
  }
}
