import fs from "fs-extra"
import util, { ScriptError } from "../utility"

export class FileContains {
  constructor(container) {
    this.fs = container.fs || fs
    this.util = container.util || util
    this.interpolator = container.interpolator
  }

  async assert(assertNode) {
    const withNode = assertNode.value.with
    const {
      file: fileNode,
      position: positionNode,
      regex: regexNode,
      contents: contentsNode,
    } = withNode.value

    if (!fileNode || fileNode.type !== "string") {
      throw new ScriptError(
        "'file' must be supplied and be a string",
        fileNode || withNode
      )
    }

    this.filePath = this.interpolator(fileNode)

    if (regexNode) {
      if (regexNode.type !== "string") {
        throw new ScriptError("'regex' must be a string", regexNode)
      }

      try {
        this.regExp = new RegExp(this.interpolator(regexNode), "gm")
      } catch (e) {
        throw new ScriptError(
          `Unable to parse regular expression. ${e.message}`,
          regexNode
        )
      }
    }

    if (positionNode) {
      if (positionNode.type !== "string") {
        throw new ScriptError("'position' node must be a string", positionNode)
      }

      this.position = positionNode.value

      if (
        this.position !== "over" &&
        this.position !== "before" &&
        this.position !== "after" &&
        this.position !== "all"
      ) {
        throw new ScriptError(
          "'position' must be 'before', 'after', 'over' or 'all'",
          positionNode
        )
      }

      if (
        (this.position === "before" ||
          this.position === "after" ||
          this.position === "over") &&
        !regexNode
      ) {
        throw new ScriptError(
          "A 'regex' node must be provided with 'before', 'after' and 'over'",
          positionNode
        )
      }
    } else {
      this.position = "all"
    }

    if (!contentsNode || contentsNode.type !== "string") {
      throw new ScriptError(
        "'contents' must be supplied and be a string",
        contentsNode || withNode
      )
    }

    this.contents = this.interpolator(contentsNode)

    if (!(await this.util.pathInfo(this.filePath)).getAccess().isReadWrite()) {
      throw new ScriptError(
        `${this.filePath} does not exist or is not readable & writable`,
        fileNode
      )
    }

    this.fileContents = await this.fs.readFile(this.filePath, {
      encoding: "utf8",
    })

    let match = null

    switch (this.position) {
      case "before":
        match = this.regExp.exec(this.fileContents)

        if (!match) {
          throw new ScriptError(
            `Match not found for '${regexNode.value}'`,
            regexNode
          )
        }

        if (
          this.fileContents.substring(
            match.index - this.contents.length,
            match.index
          ) === this.contents
        ) {
          // Desired content is after the before regex
          return true
        }

        this.firstIndex = match.index
        this.lastIndex = this.regExp.lastIndex
        break
      case "after":
        match = this.regExp.exec(this.fileContents)

        if (!match) {
          throw new ScriptError(
            `Match not found for '${regexNode.value}'`,
            regexNode
          )
        }

        if (
          this.fileContents.substring(
            this.regExp.lastIndex,
            this.regExp.lastIndex + this.contents.length
          ) === this.contents
        ) {
          // Desired content is before the regex
          return true
        }

        this.firstIndex = match.index
        this.lastIndex = this.regExp.lastIndex
        break
      case "over":
        if (this.fileContents.includes(this.contents)) {
          // Desired content is in file
          return true
        }

        match = this.regExp.exec(this.fileContents)

        if (match) {
          this.firstIndex = match.index
          this.lastIndex = this.regExp.lastIndex
        } else {
          this.firstIndex = this.lastIndex = this.fileContents.length
        }

        break
      case "all":
        if (this.fileContents === this.contents) {
          return true
        }
        break
    }

    return false
  }

  async rectify() {
    let contents = null

    switch (this.position) {
      case "before":
        contents =
          this.fileContents.substring(0, this.firstIndex) +
          this.contents +
          this.fileContents.substring(this.firstIndex)
        break
      case "after":
        contents =
          this.fileContents.substring(0, this.lastIndex) +
          this.contents +
          this.fileContents.substring(this.lastIndex)
        break
      case "over":
        contents =
          this.fileContents.substring(0, this.firstIndex) +
          this.contents +
          this.fileContents.substring(this.lastIndex)
        break
      case "all":
      default:
        contents = this.contents
        break
    }

    await this.fs.outputFile(this.filePath, contents)
  }

  result() {
    return {
      file: this.filePath,
      contents: this.contents,
      position: this.position,
      regex: this.regex ?? "",
    }
  }
}
