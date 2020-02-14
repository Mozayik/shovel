import fs from "fs-extra"
import util from "../util"
import path from "path"
import { ScriptError } from "../ScriptError"

export class FileCopied {
  constructor(container) {
    this.fs = container.fs || fs
    this.util = container.util || util
    this.interpolator = container.interpolator
    this.getLocalFileDigest = container.getLocalFileDigest
    this.uploadLocalFile = container.uploadLocalFile
  }

  async assert(assertNode) {
    const withNode = assertNode.value.with
    const {
      fromFile: fromFileNode,
      toFile: toFileNode,
      fromLocal: fromLocalNode,
    } = withNode.value

    if (!fromFileNode || fromFileNode.type !== "string") {
      throw new ScriptError(
        "'fromFile' must be supplied and be a string",
        fromFileNode || withNode
      )
    }

    if (!toFileNode || toFileNode.type !== "string") {
      throw new ScriptError(
        "'toFile' must be supplied and be a string",
        toFileNode || withNode
      )
    }

    this.expandedToFile = this.interpolator(toFileNode)
    this.expandedFromFile = this.interpolator(fromFileNode)

    if (fromLocalNode) {
      if (fromLocalNode.type !== "boolean") {
        throw new ScriptError("'fromLocal' must be a boolean", fromLocalNode)
      }

      this.fromLocal = fromLocalNode.value
    } else {
      this.fromLocal = false
    }

    if (!(await this.util.pathInfo(this.expandedToFile)).isFile()) {
      if (
        !(await this.util.pathInfo(path.dirname(this.expandedToFile)))
          .getAccess()
          .isWriteable()
      ) {
        throw new ScriptError(
          `Cannot write to parent directory of ${this.expandedToFile}`,
          toFileNode
        )
      }

      return false
    }

    let fromFileDigest

    if (this.fromLocal) {
      // TODO: Get the file digest from the local file system
      fromFileDigest = this.getLocalFileDigest(this.expandedFromFile)
    } else {
      if (
        !(await this.util.pathInfo(this.expandedFromFile))
          .getAccess()
          .isReadable()
      ) {
        throw new ScriptError(
          `File ${this.expandedFromFile} does not exist or is not readable`,
          fromFileNode
        )
      }

      fromFileDigest = await this.util.generateDigestFromFile(
        this.expandedFromFile
      )
    }

    const toFileDigest = await this.util.generateDigestFromFile(
      this.expandedToFile
    )

    return fromFileDigest === toFileDigest
  }

  async rectify() {
    if (this.fromLocal) {
      await this.uploadLocalFile(this.expandedFromFile, this.expandedToFile)
    } else {
      await this.fs.copy(this.expandedFromFile, this.expandedToFile)
    }
  }

  result() {
    return {
      fromFile: this.expandedFromFile,
      fromLocal: this.fromLocal,
      toFile: this.expandedToFile,
    }
  }
}
