import fs from "fs-extra"
import path from "path"
import util, { ScriptError, StatementBase } from "../utility"

export class DirectoryDeleted extends StatementBase {
  constructor(container) {
    super(container.interpolator)

    this.util = container.util || util
    this.fs = container.fs || fs
  }

  async assert(assertionNode) {
    const { directoryNode } = this.parseWithArgsNode(assertionNode, [
      { name: "directory", type: "string", as: "directoryPath" },
    ])

    const pathInfo = await this.util.pathInfo(this.directoryPath)

    if (!pathInfo.isMissing()) {
      if (!pathInfo.isDirectory()) {
        throw new ScriptError(
          `Non-directory exists with the name '${this.directoryPath}'`,
          directoryNode
        )
      }

      const parentDir = path.dirname(this.directoryPath)
      const parentDirInfo = await this.util.pathInfo(parentDir)

      if (!parentDirInfo.getAccess().isWriteable()) {
        throw new ScriptError(
          `Parent directory '${parentDir}' is not writable`,
          directoryNode
        )
      }

      return false
    }

    return true
  }

  async rectify() {
    await this.fs.remove(this.directoryPath)
  }

  result() {
    return { directory: this.directoryPath }
  }
}
