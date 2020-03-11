import { ScriptError } from "./ScriptError"

export class StatementBase {
  constructor(interpolator) {
    this.interpolator = interpolator
  }

  parseWithNode(assertionNode, args) {
    const nodes = {}
    const { with: withNode } = assertionNode.value

    nodes.withNode = withNode

    for (const arg of args) {
      const node = withNode.value[arg.name]

      if (!node) {
        if (arg.hasOwnProperty("default")) {
          this[arg.as ?? arg.name] = arg.default
        } else {
          throw new ScriptError(`Argument '${arg.name}' is required`, withNode)
        }
      } else {
        nodes[arg.name + "Node"] = node

        let value
        let type = node.type

        if (node.type === "string") {
          value = this.interpolator(node)
          type = typeof value

          if (type === "object") {
            if (value === null) {
              type = "null"
            } else if (Array.isArray(value)) {
              type = "array"
            }
          }
        } else {
          value = node.value
        }

        if (type !== arg.type) {
          throw new ScriptError(
            `Expected argument '${arg.name}' to be of type '${arg.type}' and was '${type}'`,
            node
          )
        }

        this[arg.as ?? arg.name] = value
      }
    }

    return nodes
  }
}
