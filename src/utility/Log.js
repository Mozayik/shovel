import readline from "readline"
import chalk from "chalk"
import autobind from "autobind-decorator"
import os from "os"

@autobind
export class Log {
  static spinnerChars = "⠄⠆⠇⠋⠙⠸⠰⠠⠰⠸⠙⠋⠇⠆"

  constructor(container = {}) {
    this.readline = container.readline ?? readline
    this.stdout = container.stdout ?? process.stdout
    this.stderr = container.stderr ?? process.stderr
    this.setInterval = container.setInterval ?? setInterval
    this.clearInterval = container.setInterval ?? clearInterval
    this.spinnerDelay = container.spinnerDelay ?? 250
    this.spinnerEnabled = false
    this.spinnerHandle = null
  }

  info(...args) {
    this.stopSpinner()
    this.stderr.write(args.join(" ") + os.EOL)
  }

  output(line) {
    this.stopSpinner()
    if (
      line.startsWith("{rectified") ||
      line.startsWith("{\n  rectified") ||
      line.startsWith("{wouldRectify") ||
      line.startsWith("{\n  wouldRectify") ||
      line.startsWith("{performed") ||
      line.startsWith("{\n  performed")
    ) {
      this.stdout.write(chalk.yellow(line) + os.EOL)
    } else if (
      line.startsWith("{asserted") ||
      line.startsWith("{\n  asserted")
    ) {
      this.stdout.write(chalk.green(line) + os.EOL)
    } else {
      this.stdout.write(chalk.blueBright(line) + os.EOL)
    }
  }

  outputError(line) {
    this.stopSpinner()
    this.stdout.write(chalk.red("remote-" + line + os.EOL))
  }

  warning(...args) {
    this.stopSpinner()
    this.stderr.write(chalk.yellow("warning:", args.join(" ")) + os.EOL)
  }

  debug(line) {
    this.stopSpinner()
    this.stdout.write(chalk.gray(line) + os.EOL)
  }

  error(...args) {
    this.stopSpinner()
    this.stderr.write(chalk.red("error:", args.join(" ")) + os.EOL)
  }

  enableSpinner() {
    this.spinnerEnabled = true
  }

  startSpinner(line) {
    if (!this.spinnerEnabled) {
      this.info(`> ${line}`)
      return
    }

    if (this.spinnerHandle !== null) {
      this.stopSpinner()
    }

    let index = 0

    const spinnerTick = () => {
      this.readline.clearLine(this.stdout, 0)
      this.readline.cursorTo(this.stdout, 0)
      this.stdout.write(Log.spinnerChars[index] + " " + this.spinnerTitle)

      index = (index + 1) % Log.spinnerChars.length
    }

    this.spinnerTitle = line.startsWith("> ") ? line.substring(2) : line
    this.spinnerHandle = this.setInterval(spinnerTick, this.spinnerDelay)

    spinnerTick()
  }

  stopSpinner() {
    if (this.spinnerHandle !== null) {
      this.clearInterval(this.spinnerHandle)
      this.spinnerHandle = null
      this.readline.clearLine(this.stdout, 0)
      this.readline.cursorTo(this.stdout, 0)
    }
  }
}
