import fs from "fs-extra"
import childProcess from "child-process-es6-promise"
import os from "os"
import util, { ScriptError, StatementBase } from "../utility"

export class GroupExists extends StatementBase {
  constructor(container) {
    super(container.interpolator)

    this.fs = container.fs || fs
    this.util = container.util || util
    this.childProcess = container.childProcess || childProcess
    this.os = container.os || os
  }

  async assert(assertionNode) {
    const { withNode, gidNode, systemNode } = this.parseWithArgsNode(
      assertionNode,
      [
        { name: "group", type: "string", as: "groupName" },
        { name: "gid", type: "number", default: undefined },
        { name: "system", type: "boolean", default: undefined },
      ]
    )

    if (gidNode && systemNode) {
      throw new ScriptError(
        "You cannot specify both 'gid' and 'system'",
        withNode
      )
    }

    const group = (await this.util.getGroups()).find(
      (group) => group.name === this.groupName
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
          assertionNode
        )
      }

      if (this.gid === undefined) {
        this.gid = group.gid
      }

      if (this.gid !== group.gid) {
        if (!runningAsRoot) {
          throw new ScriptError(
            "Only root user can modify groups",
            assertionNode
          )
        }

        this.modify = true
        return false
      } else {
        return true
      }
    } else {
      // This group does not exist
      if (!runningAsRoot) {
        throw new ScriptError("Only root user can add groups", assertionNode)
      }

      return false
    }
  }

  async rectify() {
    let command = this.modify ? "groupmod" : "groupadd"

    command += util.addArg("-g", this.gid)
    command += util.addArg("--system", !!this.system)
    command += util.addArg(this.groupName)

    await this.childProcess.exec(command)

    const group = (await this.util.getGroups()).find(
      (group) => group.name === this.groupName
    )

    if (!group) {
      throw new Error(
        `Group ${this.groupName} not present in /etc/groups after update`
      )
    }

    this.gid = group.gid
  }

  result() {
    return { group: this.groupName, gid: this.gid }
  }
}
