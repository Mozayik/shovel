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
    const { node: fromFileNode, value: fromFilePath } = util.parseNode({
      withNode,
      name: "fromFile",
      type: "string",
      interpolator: this.interpolator,
    })
    const { node: toFileNode, value: toFilePath } = util.parseNode({
      withNode,
      name: "toFile",
      type: "string",
      interpolator: this.interpolator,
    })

    this.fromFilePath = fromFilePath
    this.toFilePath = toFilePath

    const fromPathInfo = await this.util.pathInfo(fromFilePath)

    if (!fromPathInfo.isFile()) {
      throw new ScriptError(
        `File '${fromFilePath}' does not exist`,
        fromFileNode
      )
    }

    if (!fromPathInfo.getAccess().isReadable()) {
      throw new ScriptError(
        `File ${fromFilePath} is not readable`,
        fromFileNode
      )
    }

    const toPathInfo = await this.util.pathInfo(toFilePath)

    if (!toPathInfo.isFile()) {
      const parentDir = path.dirname(toFilePath)

      if (!(await this.util.pathInfo(parentDir)).getAccess().isWriteable()) {
        throw new ScriptError(
          `Cannot write to directory '${parentDir}'`,
          toFileNode
        )
      }

      return false
    }

    const fromFileDigest = await this.util.generateDigestFromFile(fromFilePath)
    const toFileDigest = await this.util.generateDigestFromFile(toFilePath)

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
