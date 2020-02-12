import fs from "fs-extra"
import childProcess from "child-process-es6-promise"
import util from "../util"
import os from "os"
import { ScriptError } from "../ScriptError"

export class GroupExists {
  constructor(container) {
    this.fs = container.fs || fs
    this.util = container.util || util
    this.childProcess = container.childProcess || childProcess
    this.os = container.os || os
    this.interpolator = container.interpolator
  }

  async assert(assertNode) {
    const withNode = assertNode.value.with
    const {
      group: groupNode,
      gid: gidNode,
      system: systemNode,
    } = withNode.value

    if (!groupNode || groupNode.type !== "string") {
      throw new ScriptError(
        "'group' must be supplied and be a string",
        groupNode || withNode
      )
    }

    if (gidNode && systemNode) {
      throw new ScriptError(
        "You cannot specify both 'gid' and 'system'",
        withNode
      )
    }

    if (gidNode) {
      if (gidNode.type !== "number") {
        throw new ScriptError("'gid' must be a number", gidNode)
      }

      this.gid = gidNode.value
    }

    if (systemNode) {
      if (systemNode.type !== "boolean") {
        throw new ScriptError("'system' must be a boolean", systemNode)
      }

      this.system = systemNode.value
    }

    this.expandedGroupName = this.interpolator(groupNode)

    const group = (await this.util.getGroups()).find(
      (group) => group.name === this.expandedGroupName
    )
    const runningAsRoot = this.util.runningAsRoot()
    const loginDefs = await this.util.getLoginDefs()
    const gidRange = [
      loginDefs["SYS_GID_MIN"] ?? 100,
      loginDefs["SYS_GID_MAX"] ?? 999,
    ]

    this.modify = false

    if (group) {
      if (this.system && (group.gid < gidRange[0] || group.gid > gidRange[1])) {
        throw new ScriptError(
          `Existing GID is outside system range ${gidRange[0]} to ${gidRange[1]}`,
          assertNode
        )
      }

      if (this.gid === undefined) {
        this.gid = group.gid
      }

      if (this.gid !== group.gid) {
        if (!runningAsRoot) {
          throw new ScriptError("Only root user can modify groups", assertNode)
        }

        this.modify = true
        return false
      } else {
        return true
      }
    } else {
      // This group does not exist
      if (!runningAsRoot) {
        throw new ScriptError("Only root user can add groups", assertNode)
      }

      return false
    }
  }

  async rectify() {
    const addArg = (arg, value) => {
      switch (typeof value) {
        case "undefined":
          return ""
        case "boolean":
          return value ? arg : ""
        case "string":
          return value.includes(" ") ? "'" + value + "'" : value
        case "number":
          return value.toString()
        default:
          return ""
      }
    }
    const command =
      (this.modify ? "groupmod" : "groupadd") +
      addArg("-g", this.gid) +
      addArg("--system", !!this.system) +
      " " +
      this.expandedGroupName

    await this.childProcess.exec(command)

    const group = (await this.util.getGroups()).find(
      (group) => group.name === this.expandedGroupName
    )

    if (!group) {
      throw new Error(
        `Group ${this.expandedGroupName} not present in /etc/groups after update`
      )
    }

    this.gid = group.gid
  }

  result(rectified) {
    return { group: this.expandedGroupName, gid: this.gid }
  }
}
