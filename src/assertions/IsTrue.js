import { StatementBase, ScriptError } from "../utility"

export class IsTrue extends StatementBase {
  constructor(container) {
    super(container.interpolator)
  }

  async assert(assertionNode) {
    const { valueNode } = this.parseWithArgsNode(assertionNode, [
      { name: "value", type: "boolean" },
      { name: "message", type: "string" },
    ])

    if (!this.value) {
      throw new ScriptError(this.message, valueNode)
    }

    return true
  }

  async rectify() {
    // This is never called
  }

  result() {
    return { message: this.message }
  }
}
