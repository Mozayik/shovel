import fs from "fs-extra"
import util from "../util"
import path from "path"
import { ScriptError } from "../ScriptError"

export class FileCopied {
  constructor(container) {
    this.fs = container.fs || fs
    this.util = container.util || util
    this.interpolator = container.interpolator
  }

  async assert(assertNode) {
    const withNode = assertNode.value.with
    const { fromFile: fromFileNode, toFile: toFileNode } = withNode.value

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

    this.toFilePath = this.interpolator(toFileNode)
    this.fromFilePath = this.interpolator(fromFileNode)

    if (
      !(await this.util.pathInfo(this.fromFilePath)).getAccess().isReadable()
    ) {
      throw new ScriptError(
        `File ${this.fromFilePath} does not exist or is not readable`,
        fromFileNode
      )
    }

    if (!(await this.util.pathInfo(this.toFilePath)).isFile()) {
      if (
        !(await this.util.pathInfo(path.dirname(this.toFilePath)))
          .getAccess()
          .isWriteable()
      ) {
        throw new ScriptError(
          `Cannot write to parent directory of ${this.toFilePath}`,
          toFileNode
        )
      }

      return false
    }

    const fromFileDigest = await this.util.generateDigestFromFile(
      this.fromFilePath
    )

    const toFileDigest = await this.util.generateDigestFromFile(this.toFilePath)

    return fromFileDigest === toFileDigest
  }

  async rectify() {
    await this.fs.copy(this.fromFilePath, this.toFilePath)
  }

  result() {
    return {
      fromFile: this.fromFilePath,
      toFile: this.toFilePath,
    }
  }
}
