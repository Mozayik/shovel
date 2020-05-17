import fs from "fs-extra"
import util, { ScriptError, StatementBase } from "../utility"

export class FileContains extends StatementBase {
  constructor(container) {
    super(container.interpolator)

    this.util = container.util || util
    this.fs = container.fs || fs
  }

  async assert(assertionNode) {
    const {
      fileNode,
      positionNode,
      regexNode,
      contentsNode,
    } = this.parseWithArgsNode(assertionNode, [
      { name: "file", type: "string", as: "filePath" },
      { name: "position", type: "string", default: "all" },
      { name: "regex", type: "string", default: "" },
      { name: "contents", type: "string" },
    ])

    this.filePath = this.interpolator(fileNode)

    let re = null

    if (regexNode) {
      try {
        re = new RegExp(this.regex, "gm")
      } catch (e) {
        throw new ScriptError(
          `Unable to parse regular expression. ${e.message}`,
          regexNode
        )
      }
    }

    if (positionNode) {
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
      case "after":
      case "over":
        if (
          this.position === "over" &&
          this.fileContents.includes(this.contents)
        ) {
          // Desired content is in file
          return true
        }

        match = re.exec(this.fileContents)

        if (!match) {
          throw new ScriptError(
            `Match not found for '${regexNode.value}'`,
            regexNode
          )
        }

        if (
          (this.position === "before" &&
            this.fileContents.substring(
              match.index - this.contents.length,
              match.index
            ) === this.contents) ||
          (this.position === "after" &&
            this.fileContents.substring(
              re.lastIndex,
              re.lastIndex + this.contents.length
            ) === this.contents)
        ) {
          // Desired content is before or after the regex
          return true
        }

        this.firstIndex = match.index
        this.lastIndex = re.lastIndex
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
