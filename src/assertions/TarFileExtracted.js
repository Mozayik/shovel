import fs from "fs-extra"
import tar from "tar"
import util from "../util"
import path from "path"
import { ScriptError } from "../ScriptError"

export class TarFileExtracted {
  constructor(container) {
    this.fs = container.fs || fs
    this.tar = container.tar || tar
    this.util = container.util || util
    this.interpolator = container.interpolator
  }

  async assert(assertNode) {
    const withNode = assertNode.value.with
    const { file: fileNode, toDirectory: toDirectoryNode } = withNode.value

    if (!fileNode || fileNode.type !== "string") {
      throw new ScriptError(
        "'file' must be supplied and be a string",
        fileNode || withNode
      )
    }

    this.expandedFile = this.interpolator(fileNode)

    if (toDirectoryNode) {
      if (toDirectoryNode.type !== "string") {
        throw new ScriptError("'toDirectory' must be a string", toDirectoryNode)
      }

      this.expandedDirectory = this.interpolator(toDirectoryNode)
    } else {
      this.expandedDirectory = path.dirname(this.expandedFile)
    }

    if (
      !(await this.util.pathInfo(this.expandedFile)).getAccess().isReadable()
    ) {
      throw new ScriptError(
        `Archive file '${this.expandedFile}' does not exist or is not readable`,
        fileNode
      )
    }

    if (
      !(await this.util.pathInfo(this.expandedDirectory))
        .getAccess()
        .isReadWrite()
    ) {
      throw new ScriptError(
        `Directory '${this.expandedDirectory}' does not exist or is not readable and writable`,
        toDirectoryNode
      )
    }

    this.differentFiles = []

    await new Promise((resolve, reject) => {
      const readable = this.fs.createReadStream(this.expandedFile)
      const writeable = new this.tar.Parse()

      writeable.on("entry", (entry) => {
        const fullPath = path.join(this.expandedDirectory, entry.path)

        this.util
          .pathInfo(fullPath)
          .then((info) => {
            if (info.size !== entry.size) {
              this.differentFiles.push(fullPath)
            }
            entry.resume()
          })
          .catch((error) => {
            reject(
              new ScriptError(
                `Error reading file ${this.expandedFile}. ${error.message}`,
                fileNode
              )
            )
          })
      })
      readable.on("end", () => {
        readable.destroy()
      })
      readable.on("close", () => resolve())
      readable.pipe(writeable)
    })

    return this.differentFiles.length === 0
  }

  async rectify() {
    await this.tar.x({ file: this.expandedFile, cwd: this.expandedDirectory })
  }

  result() {
    return {
      file: this.expandedFile,
      toDirectory: this.expandedDirectory,
      differentFiles: this.differentFiles,
    }
  }
}
