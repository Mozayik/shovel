import fs from "fs-extra"
import childProcess from "child-process-es6-promise"
import util from "../util"
import { ScriptError } from "../ScriptError"

export class UserExists {
  constructor(container) {
    this.fs = container.fs || fs
    this.util = container.util || util
    this.childProcess = container.childProcess || childProcess
    this.interpolator = container.interpolator
  }

  async assert(assertNode) {
    const withNode = assertNode.value.with
    const {
      user: userNode,
      uid: uidNode,
      gid: gidNode,
      system: systemNode,
      shell: shellNode,
      homeDir: homeDirNode,
      comment: commentNode,
      group: groupNode,
      passwordDisabled: passwordDisabledNode,
    } = withNode.value

    if (!userNode || userNode.type !== "string") {
      throw new ScriptError(
        "'user' must be supplied and be a string",
        userNode || withNode
      )
    }

    if (uidNode && systemNode) {
      throw new ScriptError(
        "You cannot specify both 'uid' and 'system'",
        withNode
      )
    }

    if (uidNode) {
      if (uidNode.type !== "number") {
        throw new ScriptError("'uid' must be a number", uidNode)
      }

      this.uid = uidNode.value
    }

    if (systemNode) {
      if (systemNode.type !== "boolean") {
        throw new ScriptError("'system' must be a boolean", systemNode)
      }

      this.system = systemNode.value
    }

    if (gidNode) {
      if (gidNode.type !== "number") {
        throw new ScriptError("'gid' must be a number", gidNode)
      }

      this.gid = gidNode.value
    }

    if (groupNode) {
      if (groupNode.type !== "string") {
        throw new ScriptError("'group' must be a string", groupNode)
      }

      const name = groupNode.value
      const groups = await this.util.getGroups()
      const group = groups.find((group) => group.name === name)

      if (!group) {
        throw new ScriptError(`Group '${name}' does not exist`, groupNode)
      }

      this.gid = group.gid
    }

    if (shellNode) {
      if (shellNode.type !== "string") {
        throw new ScriptError("'shell' must be a string", shellNode)
      }

      this.shell = this.interpolator(shellNode)
    }

    if (homeDirNode) {
      if (homeDirNode.type !== "string") {
        throw new ScriptError("'homeDir' must be a string", homeDirNode)
      }

      this.homeDir = this.interpolator(homeDirNode)
    }

    if (commentNode) {
      if (commentNode.type !== "string") {
        throw new ScriptError("'comment' must be a string", commentNode)
      }

      this.comment = this.interpolator(commentNode)
    }

    if (passwordDisabledNode) {
      if (passwordDisabledNode.type !== "boolean") {
        throw new ScriptError(
          "'passwordDisabled' must be a boolean",
          passwordDisabledNode
        )
      }

      this.passwordDisabled = passwordDisabledNode.value
    }

    this.name = this.interpolator(userNode)

    const user = (await this.util.getUsers(this.fs)).find(
      (user) => user.name === this.name
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
      }
    }
    const command =
      (this.modify ? "usermod" : "useradd") +
      addArg("-u", this.uid) +
      addArg("--system", !!this.system) +
      addArg("-g", this.gid) +
      addArg("-s", this.shell) +
      addArg("-h", this.homeDir) +
      addArg("-c", this.comment) +
      // TODO: Handle the --disable-password when adding
      " " +
      this.name

    await this.childProcess.exec(command)

    // TODO: Handle password lock when modifying

    const user = (await this.util.getUsers()).find(
      (user) => user.name === this.name
    )

    if (!user) {
      throw new Error(
        `User ${this.name} not present in /etc/passwd after update`
      )
    }

    Object.assign(this, user)
  }

  result() {
    const { name, uid, gid, shell, homeDir, comment } = this

    return {
      name,
      uid,
      gid,
      shell,
      homeDir,
      comment,
    }
  }
}
