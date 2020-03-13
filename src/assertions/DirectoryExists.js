import fs from "fs-extra"
import os from "os"
import util, { ScriptError, StatementBase } from "../utility"
import path from "path"

export class DirectoryExists extends StatementBase {
  constructor(container) {
    super(container.interpolator)

    this.util = container.util || util
    this.fs = container.fs || fs
    this.os = container.os || os
    this.util = container.util || util
  }

  async assert(assertNode) {
    const { directoryNode, ownerNode, modeNode } = this.parseWithArgsNode(
      assertNode,
      [
        { name: "directory", type: "string", as: "dirPath" },
        { name: "mode", type: "object", default: undefined },
        { name: "owner", type: "object", default: undefined },
      ]
    )

    const userInfo = this.os.userInfo()
    const users = await this.util.getUsers(this.fs)
    const groups = await this.util.getGroups(this.fs)

    this.owner = Object.assign(
      { uid: userInfo.uid, gid: userInfo.gid },
      this.util.parseOwnerNode(ownerNode, users, groups)
    )
    this.mode = this.util.parseModeNode(modeNode, 0o777)

    let pathInfo = await this.util.pathInfo(this.dirPath)

    if (pathInfo.isMissing()) {
      const parentDirPath = path.dirname(this.dirPath)

      if (
        !(await this.util.pathInfo(parentDirPath)).getAccess().isWriteable()
      ) {
        throw new ScriptError(
          `Cannot write to directory '${parentDirPath}'`,
          directoryNode
        )
      }

      return false
    }

    if (!pathInfo.isDirectory()) {
      throw new ScriptError(
        `A non-directory with the name '${this.dirPath}' exists`,
        directoryNode
      )
    }

    if (pathInfo.uid !== this.owner.uid || pathInfo.gid !== this.owner.gid) {
      if (userInfo.uid !== 0) {
        throw new ScriptError(
          "User does not have permission to modify existing directory owner",
          assertNode
        )
      }

      return false
    } else if ((pathInfo.mode & 0o777) !== this.mode) {
      if (
        userInfo.uid !== 0 &&
        userInfo.uid !== pathInfo.uid &&
        userInfo.gid !== pathInfo.gid
      ) {
        throw new ScriptError(
          "User does not have permission to modify existing directory mode",
          assertNode
        )
      }

      return false
    }

    return true
  }

  async rectify() {
    await this.fs.ensureDir(this.dirPath)
    await this.fs.chmod(this.dirPath, this.mode)
    await this.fs.chown(this.dirPath, this.owner.uid, this.owner.gid)
  }

  result() {
    return { directory: this.dirPath }
  }
}
