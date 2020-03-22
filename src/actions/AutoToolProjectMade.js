import childProcess from "child-process-es6-promise"
import path from "path"
import util, { StatementBase, ScriptError } from "../utility"

export class AutoToolProjectMade extends StatementBase {
  constructor(container) {
    super(container.interpolator)

    this.childProcess = container.childProcess || childProcess
    this.util = container.util || util
  }

  async perform(actionNode) {
    const { directoryNode } = this.parseWithArgsNode(actionNode, [
      { name: "directory", type: "string", as: "directoryPath" },
      { name: "args", type: "string", default: "" },
    ])

    const makeFilePath = path.join(this.directoryPath, "Makefile")
    const pathInfo = await this.util.pathInfo(makeFilePath)

    if (!pathInfo.getAccess().isReadable()) {
      throw new ScriptError(`'${makeFilePath}' not found`, directoryNode)
    }

    const command = `make${this.args ? " " : ""}${this.args}`

    try {
      await this.childProcess.exec(command, {
        cwd: this.directoryPath,
      })
    } catch (e) {
      throw new ScriptError(`'${command}' failed. ${e.message}`, actionNode)
    }
  }

  result() {
    return { directory: this.directoryPath, args: this.args }
  }
}
