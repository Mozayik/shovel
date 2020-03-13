import fs from "fs-extra"
import path from "path"
import util, { ScriptError, StatementBase } from "../utility"

export class FileCopied extends StatementBase {
  constructor(container) {
    super(container.interpolator)

    this.fs = container.fs || fs
    this.util = container.util || util
  }

  async assert(assertionNode) {
    const { fromFileNode, toFileNode } = this.parseWithArgsNode(assertionNode, [
      {
        name: "fromFile",
        type: "string",
        as: "fromFilePath",
      },
      {
        name: "toFile",
        type: "string",
        as: "toFilePath",
      },
    ])

    const fromPathInfo = await this.util.pathInfo(this.fromFilePath)

    if (!fromPathInfo.isFile()) {
      throw new ScriptError(
        `File '${this.fromFilePath}' does not exist`,
        fromFileNode
      )
    }

    if (!fromPathInfo.getAccess().isReadable()) {
      throw new ScriptError(
        `File ${this.fromFilePath} is not readable`,
        fromFileNode
      )
    }

    const toPathInfo = await this.util.pathInfo(this.toFilePath)

    if (!toPathInfo.isFile()) {
      const parentDir = path.dirname(this.toFilePath)

      if (!(await this.util.pathInfo(parentDir)).getAccess().isWriteable()) {
        throw new ScriptError(
          `Cannot write to directory '${parentDir}'`,
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
