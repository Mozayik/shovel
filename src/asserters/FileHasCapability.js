import childProcess from "child-process-es6-promise"
import util from "../util"
import { ScriptError } from "../ScriptError"

export const capabilities = [
  "cap_audit_control",
  "cap_audit_write",
  "cap_block_suspend",
  "cap_chown",
  "cap_dac_override",
  "cap_dac_read_search",
  "cap_fowner",
  "cap_fsetid",
  "cap_ipc_lock",
  "cap_ipc_owner",
  "cap_kill",
  "cap_lease",
  "cap_linux_immutable",
  "cap_mac_admin",
  "cap_mac_override",
  "cap_mknod",
  "cap_net_admin",
  "cap_net_bind_service",
  "cap_net_broadcast",
  "cap_net_raw",
  "cap_setgid",
  "cap_setfcap",
  "cap_setpcap",
  "cap_setuid",
  "cap_sys_admin",
  "cap_sys_boot",
  "cap_sys_chroot",
  "cap_sys_module",
  "cap_sys_nice",
  "cap_sys_pacct",
  "cap_sys_ptrace",
  "cap_sys_rawio",
  "cap_sys_resource",
  "cap_sys_time",
  "cap_sys_tty_config",
  "cap_syslog",
  "cap_wake_alarm",
]

export class FileHasCapability {
  constructor(container) {
    this.util = container.util || util
    this.childProcess = container.childProcess || childProcess
    this.interpolator = container.interpolator
    this.stat = null
  }

  async assert(assertNode) {
    const withNode = assertNode.value.with
    const { file: fileNode, capability: capabilityNode } = withNode.value

    if (!fileNode || fileNode.type !== "string") {
      throw new ScriptError(
        "'file' must be supplied and be a string",
        fileNode || withNode
      )
    }

    this.expandedFile = this.interpolator(fileNode)

    if (!capabilityNode || capabilityNode.type !== "string") {
      throw new ScriptError(
        "'capability' must be supplied and be a string",
        capabilityNode || withNode
      )
    }

    this.expandedCapability = this.interpolator(capabilityNode).toLowerCase()

    if (!capabilities.includes(this.expandedCapability)) {
      throw new ScriptError(
        `Invalid capability ${this.expandedCapability}`,
        capabilityNode
      )
    }

    if (!this.util.runningAsRoot()) {
      throw new ScriptError(
        "Must be running as root to change file capabilities",
        assertNode
      )
    }

    const pathInfo = await this.util.pathInfo(this.expandedFile)

    if (pathInfo.isMissing()) {
      throw new ScriptError(
        `File '${this.expandedFile}' does not exist`,
        fileNode
      )
    }

    if (!pathInfo.isFile()) {
      throw new ScriptError(`'${this.expandedFile}' is not a file`, fileNode)
    }

    const command = `setcap -v ${this.expandedCapability} ${this.expandedFile}`

    try {
      await this.childProcess.exec(command)
    } catch {
      return false
    }

    return true
  }

  async rectify() {
    const command = `setcap ${this.expandedCapability} ${this.expandedFile}`

    await this.childProcess.exec(command)
  }

  result() {
    return {
      file: this.expandedFile,
      capability: this.expandedCapability,
    }
  }
}
