#!/usr/bin/env node
import { ShovelTool } from "./ShovelTool"
import chalk from "chalk"
import path from "path"
import { Spinner } from "cli-spinner"
import autobind from "autobind-decorator"

@autobind
class Log {
  constructor(container = {}) {
    this.Spinner = container.Spinner || Spinner
    this.spinnerEnabled = false
  }

  info() {
    this.stopSpinner()
    console.error([...arguments].join(" "))
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
      console.log(chalk.yellow(line))
    } else if (
      line.startsWith("{asserted") ||
      line.startsWith("{\n  asserted")
    ) {
      console.log(chalk.green(line))
    } else {
      console.log(chalk.blueBright(line))
    }
  }

  outputError(line) {
    this.stopSpinner()
    console.log(chalk.red("remote-" + line))
  }

  warning() {
    this.stopSpinner()
    console.error(chalk.yellow("warning:", [...arguments].join(" ")))
  }

  debug(line) {
    this.stopSpinner()
    console.log(chalk.gray(line))
  }

  error() {
    this.stopSpinner()
    console.error(chalk.red("error:", [...arguments].join(" ")))
  }

  enableSpinner() {
    this.spinnerEnabled = true
  }

  startSpinner(line) {
    if (this.spinnerEnabled) {
      this.spinner = new this.Spinner(
        line.startsWith("> ") ? line.substring(2) : line
      )
      this.spinner.setSpinnerString(20)
      this.spinner.setSpinnerDelay(250)
      this.spinner.start()
    } else {
      this.info(`> ${line}`)
    }
  }

  stopSpinner() {
    if (this.spinner) {
      this.spinner.stop(true)
      this.spinner = null
    }
  }
}

const log = new Log()
const tool = new ShovelTool({
  toolName: path.basename(process.argv[1], ".js"),
  log,
})

tool
  .run(process.argv.slice(2))
  .then((exitCode) => {
    process.exitCode = exitCode
  })
  .catch((error) => {
    process.exitCode = 200

    if (error) {
      log.error(error.message || error)

      if (tool.debug) {
        console.error(error)
      }
    }
  })
