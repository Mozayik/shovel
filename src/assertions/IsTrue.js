import { StatementBase, ScriptError } from "../utility"

export class IsTrue extends StatementBase {
  constructor(container) {
    super(container.interpolator)
  }

  async assert(assertionNode) {
    const { expressionNode } = this.parseWithArgsNode(assertionNode, [
      { name: "expression", type: "boolean", as: "value" },
      { name: "message", type: "string" },
    ])

    if (!this.value) {
      throw new ScriptError(this.message, expressionNode)
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
