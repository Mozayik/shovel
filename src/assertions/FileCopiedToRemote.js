import fs from "fs-extra"
import util, { ScriptError, SFTP } from "../utility"

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
      localFile: localFileNode,
      remoteFile: remoteFileNode,
      host: hostNode,
      port: portNode,
      user: userNode,
      identity: identityNode,
    } = withNode.value

    if (!localFileNode || localFileNode.type !== "string") {
      throw new ScriptError(
        "'localFile' must be supplied and be a string",
        localFileNode || withNode
      )
    }

    if (!remoteFileNode || remoteFileNode.type !== "string") {
      throw new ScriptError(
        "'remoteFile' must be supplied and be a string",
        remoteFileNode || withNode
      )
    }

    if (!hostNode || hostNode.type !== "string") {
      throw new ScriptError(
        `'host' must be supplied and be a string`,
        hostNode || withNode
      )
    }

    this.remoteFilePath = this.interpolator(remoteFileNode)
    this.localFilePath = this.interpolator(localFileNode)
    this.host = this.interpolator(hostNode)

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

    let localFileInfo = await this.util.pathInfo(this.localFilePath)

    if (!localFileInfo.isFile()) {
      throw new ScriptError(
        `File ${this.localFilePath} does not exist`,
        localFileNode
      )
    }

    if (!localFileInfo.getAccess().isReadable()) {
      throw new ScriptError(
        `File ${this.localFilePath} is not readable`,
        localFileNode
      )
    }

    this.sftp = new this.SFTP()

    await this.sftp.connect({
      host: this.host,
      port: this.port,
      user: this.user,
      identity: this.identity,
      noPrompts: true,
    })

    let remoteFileInfo = null

    try {
      remoteFileInfo = await this.sftp.getInfo(this.remoteFilePath, {
        timeout: 3000,
      })
    } catch (error) {
      return false
    }

    const ok = remoteFileInfo.size === localFileInfo.size

    if (ok) {
      this.sftp.close()
      this.sftp = null
    }

    return ok
  }

  async rectify() {
    try {
      await this.sftp.putFile(this.localFilePath, this.remoteFilePath)
    } finally {
      this.sftp.close()
      this.sftp = null
    }
  }

  result() {
    const result = {
      localFile: this.localFilePath,
      remoteFile: this.remoteFilePath,
      host: this.host,
    }

    if (this.user !== undefined) {
      result.user = this.user
    }

    if (this.port !== undefined) {
      result.port = this.port
    }

    if (this.identity !== undefined) {
      result.identity = this.identity
    }

    return result
  }
}
