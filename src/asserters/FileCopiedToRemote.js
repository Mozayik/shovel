import fs from "fs-extra"
import util from "../util"
import { SFTP } from "../sftp"
import { ScriptError } from "../ScriptError"

export class FileCopiedToRemote {
  constructor(container) {
    this.fs = container.fs || fs
    this.util = container.util || util
    this.SFTP = container.SFTP || SFTP
    this.interpolator = container.interpolator
  }

  async assert(assertNode) {
    const withNode = assertNode.value.with
    const {
      fromFile: fromFileNode,
      toFile: toFileNode,
      host: hostNode,
      port: portNode,
      user: userNode,
      identity: identityNode,
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

    if (!hostNode || hostNode.type !== "string") {
      throw new ScriptError(
        `'host' must be supplied and be a string`,
        hostNode || withNode
      )
    }

    this.expandedToFile = this.interpolator(toFileNode)
    this.expandedFromFile = this.interpolator(fromFileNode)
    this.expandedHost = this.interpolator(hostNode)

    if (portNode) {
      if (portNode.type !== "number") {
        throw new ScriptError(`'port' must be a number`, portNode)
      }

      this.port = portNode.value
    }

    if (userNode) {
      if (userNode.type !== "string") {
        throw new ScriptError(`'user' must be a string`, userNode)
      }

      this.user = this.interpolator(userNode)
    }

    if (identityNode) {
      if (identityNode.type !== "string") {
        throw new ScriptError(`'identity' must be a string`, identityNode)
      }

      this.identity = this.interpolator(identityNode)
    }

    let fromFileInfo = await this.util.pathInfo(this.expandedFromFile)

    if (!fromFileInfo.isFile()) {
      throw new ScriptError(
        `File ${this.expandedFromFile} does not exist`,
        fromFileNode
      )
    }

    if (!fromFileInfo.getAccess().isReadable()) {
      throw new ScriptError(
        `File ${this.expandedFromFile} is not readable`,
        fromFileNode
      )
    }

    this.sftp = new this.SFTP()
    this.sftp.connect({
      noPrompts: true,
    })

    let toFileInfo = null

    try {
      toFileInfo = await this.sftp.getInfo(this.expandedToFile, {
        timeout: 3000,
      })
    } catch {
      return false
    }

    const ok = toFileInfo.size === fromFileInfo.size

    if (ok) {
      this.sftp.close()
      this.sftp = null
    }

    return ok
  }

  async rectify() {
    try {
      this.sftp.putContent(this.expandedToFile, this.expandedFromFile)
    } finally {
      this.sftp.close()
      this.sftp = null
    }
  }

  result() {
    return {
      fromFile: this.expandedFromFile,
      toFile: this.expandedToFile,
      host: this.expandedHost,
      port: this.port ?? 22,
      user: this.user ?? process.env.USER,
      identity: this.identity ?? "~/.ssh/idrsa",
    }
  }
}
