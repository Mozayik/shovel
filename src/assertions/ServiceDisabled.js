import childProcess from "child-process-es6-promise"
import Timeout from "await-timeout"
import util, { ScriptError } from "../utility"

export class ServiceDisabled {
  constructor(container) {
    this.childProcess = container.childProcess || childProcess
    this.util = container.util || util
    this.Timeout = container.Timeout || Timeout
    this.interpolator = container.interpolator
  }

  async assert(assertNode) {
    const withNode = assertNode.value.with
    const { service: serviceNode } = withNode.value

    if (!serviceNode || serviceNode.type !== "string") {
      throw new ScriptError(
        "'service' must be supplied and be a string",
        serviceNode || withNode
      )
    }

    this.expandedServiceName = this.interpolator(serviceNode)

    let ok = false

    try {
      await this.childProcess.exec(
        `systemctl is-enabled ${this.expandedServiceName}`
      )
    } catch {
      ok = true
    }

    if (!ok && !this.util.runningAsRoot()) {
      throw new ScriptError(
        "Must be running as root to disable services",
        withNode
      )
    }

    return ok
  }

  async rectify() {
    await this.childProcess.exec(
      `systemctl disable ${this.expandedServiceName}`
    )
  }

  result() {
    return { service: this.expandedServiceName, enabled: false }
  }
}
