import { ScriptError } from "./ScriptError"

export class StatementBase {
  constructor(interpolator) {
    this.interpolator = interpolator
  }

  parseWithArgsNode(statementNode, argDefs) {
    const nodes = {}
    const { with: withNode } = statementNode.value
    const getTypeFromValue = (value) => {
      let type = typeof value

      if (type === "object") {
        if (value === null) {
          type = "null"
        } else if (Array.isArray(value)) {
          type = "array"
        }
      }

      return type
    }

    nodes.withNode = withNode

    for (const argDef of argDefs) {
      const node = withNode.value[argDef.name]
      let value
      let type

      if (!node) {
        if (argDef.hasOwnProperty("default")) {
          value = argDef.default
          type = getTypeFromValue(value)
        } else {
          throw new ScriptError(
            `Argument '${argDef.name}' is required`,
            withNode
          )
        }
      } else {
        nodes[argDef.name + "Node"] = node

        type = node.type

        if (node.type === "string") {
          value = this.interpolator(node)
          type = getTypeFromValue(value)
        } else {
          value = node.value
        }
      }

      if (type !== "undefined" && type !== argDef.type) {
        throw new ScriptError(
          `Expected argument '${argDef.name}' to be of type '${argDef.type}' and was '${type}'`,
          node ?? withNode
        )
      }

      if (type !== "object" && type !== "array") {
        this[argDef.as ?? argDef.name] = value
      }
    }

    return nodes
  }
}
