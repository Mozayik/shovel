import childProcess from "child-process-es6-promise"
import util from "../util"
import { ScriptError } from "../ScriptError"

export class NodePackageInstalled {
  constructor(container) {
    this.childProcess = container.childProcess || childProcess
    this.util = container.util || util
    this.interpolator = container.interpolator
  }

  async assert(assertNode) {
    const withNode = assertNode.value.with
    const { package: packageNode } = withNode.value

    if (!packageNode || packageNode.type !== "string") {
      throw new ScriptError(
        "'package' must be supplied and be a string",
        packageNode || withNode
      )
    }

    this.expandedPackageName = this.interpolator(packageNode)

    try {
      await this.childProcess.exec(
        `npm list -g --depth 0 ${this.expandedPackageName}`
      )
    } catch {
      if (!this.util.runningAsRoot()) {
        throw new ScriptError(
          "Must be running as root to install packages",
          withNode
        )
      }

      return false
    }

    return true
  }

  async rectify() {
    await this.childProcess.exec(`npm instal -g ${this.expandedPackageName}`)
  }

  result() {
    return { package: this.expandedPackageName }
  }
}
