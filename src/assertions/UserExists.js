import fs from "fs-extra"
import childProcess from "child-process-es6-promise"
import util, { ScriptError, StatementBase } from "../utility"

export class UserExists extends StatementBase {
  constructor(container) {
    super(container.interpolator)

    this.fs = container.fs || fs
    this.util = container.util || util
    this.childProcess = container.childProcess || childProcess
  }

  async assert(assertNode) {
    const {
      withNode,
      uidNode,
      gidNode,
      systemNode,
      groupNode,
    } = this.parseWithArgsNode(assertNode, [
      { name: "user", type: "string", as: "userName" },
      { name: "uid", type: "number", default: undefined },
      { name: "gid", type: "number", default: undefined },
      { name: "group", type: "string", as: "groupName", default: undefined },
      { name: "system", type: "boolean", default: undefined },
      { name: "shell", type: "string", default: undefined },
      { name: "homeDir", type: "string", default: undefined },
      { name: "comment", type: "string", default: undefined },
      { name: "passwordDisabled", type: "boolean", default: undefined },
    ])

    if (uidNode && systemNode) {
      throw new ScriptError(
        "You cannot specify both 'uid' and 'system'",
        withNode
      )
    }

    if (groupNode && gidNode) {
      throw new ScriptError(
        "You cannot specify both 'gid' and 'group'",
        withNode
      )
    }

    if (this.groupName) {
      const groups = await this.util.getGroups()
      const group = groups.find((group) => group.name === this.groupName)

      if (!group) {
        throw new ScriptError(
          `Group '${this.groupName}' does not exist`,
          groupNode
        )
      }

      this.gid = group.gid
    }

    const user = (await this.util.getUsers(this.fs)).find(
      (user) => user.name === this.userName
    )
    const runningAsRoot = this.util.runningAsRoot()
    const loginDefs = await this.util.getLoginDefs()
    const uidRange = [
      loginDefs["SYS_UID_MIN"] ?? 100,
      loginDefs["SYS_UID_MAX"] ?? 999,
    ]

    if (user) {
      if (this.system && (user.uid < uidRange[0] || user.uid > uidRange[1])) {
        throw new ScriptError(
          `Existing UID is outside system range ${uidRange[0]} to ${uidRange[1]}`,
          assertNode
        )
      }

      if (this.uid === undefined) {
        this.uid = user.uid
      }

      if (
        (this.uid !== undefined && this.uid !== user.uid) ||
        (this.gid !== undefined && this.gid !== user.gid) ||
        (this.shell !== undefined && this.shell !== user.shell) ||
        (this.homeDir !== undefined && this.homeDir !== user.homeDir) ||
        (this.comment !== undefined && this.comment !== user.comment) ||
        (this.passwordDisabled !== undefined &&
          user.passwordDisabled !== undefined &&
          this.passwordDisabled !== user.passwordDisabled)
      ) {
        if (!runningAsRoot) {
          throw new ScriptError("Only root user can modify users", assertNode)
        }

        this.modify = true
        return false
      } else {
        return true
      }
    } else {
      if (!runningAsRoot) {
        throw new ScriptError("Only root user can add users", assertNode)
      }

      return false
    }
  }

  async rectify() {
    let command = this.modify ? "usermod" : "useradd"

    command += util.addArg("-u", this.uid)
    command += util.addArg("--system", !!this.system)
    command += util.addArg("-g", this.gid)
    command += util.addArg("-s", this.shell)
    command += util.addArg("-h", this.homeDir)
    command += util.addArg("-c", this.comment)

    if (this.modify) {
      command += util.addArg("-L", this.passwordDisabled)
    }

    command += util.addArg(this.userName)

    await this.childProcess.exec(command)

    if (!this.modify && this.passwordDisabled !== undefined) {
      if (this.passwordDisabled) {
        await this.childProcess.exec(`passwd --lock ${this.userName}`)
      } else {
        await this.childProcess.exec(`passwd --unlock ${this.userName}`)
      }
    }

    const user = (await this.util.getUsers()).find(
      (user) => user.name === this.userName
    )

    if (!user) {
      throw new Error(
        `User ${this.userName} not present in /etc/passwd after update`
      )
    }

    Object.assign(this, user)
  }

  result() {
    const { userName: user, uid, gid, shell, homeDir, comment } = this

    return {
      user,
      uid,
      gid,
      shell,
      homeDir,
      comment,
    }
  }
}
