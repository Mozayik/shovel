import util from "../util"
import fs from "fs-extra"
import { ScriptError } from "../ScriptError"
import path from "path"

export class FilesDeleted {
  constructor(container) {
    this.util = container.util || util
    this.fs = container.fs || fs
    this.interpolator = container.interpolator
    this.stat = null
  }

  async assert(assertNode) {
    const withNode = assertNode.value.with
    const { files: filesNode } = withNode.value

    if (!filesNode || filesNode.type !== "array") {
      throw new ScriptError(
        "'files' must be supplied and be an array",
        filesNode || withNode
      )
    }

    this.unlinkFilePaths = []
    this.filePaths = []

    for (const fileNode of filesNode.value) {
      if (fileNode.type !== "string") {
        throw new ScriptError("All 'files' must be strings", fileNode)
      }

      const filePath = this.interpolator(fileNode)
      const pathInfo = await this.util.pathInfo(filePath)

      this.filePaths.push(filePath)

      if (pathInfo.isMissing()) {
        continue
      }

      if (!pathInfo.isFile()) {
        throw new ScriptError(
          `Not removing non-file with the name '${filePath}'`,
          fileNode
        )
      }

      const parentPath = path.dirname(filePath)

      if (!(await this.util.pathInfo(parentPath)).getAccess().isWriteable()) {
        throw new ScriptError(
          `Cannot write to directory '${parentPath}'`,
          fileNode
        )
      }

      this.unlinkFilePaths.push(filePath)
      // Keep going to get all files
    }

    return this.unlinkFilePaths.length === 0
  }

  async rectify() {
    for (const filePath of this.unlinkFilePaths) {
      await this.fs.unlink(filePath)
    }
  }

  result() {
    return {
      files:
        this.unlinkFilePaths.length === 0
          ? this.filePaths
          : this.unlinkFilePaths,
    }
  }
}
