import { StatementBase } from "./StatementBase"
import { createAssertNode } from "./testUtil"
import { ScriptError } from "./ScriptError"

test("parseWithNode", async () => {
  const interpolator = (node) => {
    if (node.value === "{true}") {
      return true
    } else if (node.value === "{{}}") {
      return {}
    } else if (node.value === "{null}") {
      return null
    } else if (node.value === "{[]}") {
      return []
    } else {
      return node.value
    }
  }
  const assertionNode = createAssertNode("test.json5", {
    s: "abc",
    n: 2,
    c: "{true}",
    o: "{{}}",
    a: "{[]}",
    v: "{null}",
  })

  const assertion = new StatementBase(interpolator)

  // Happy path
  let result = assertion.parseWithNode(assertionNode, [
    { name: "s", type: "string" },
    { name: "t", type: "number", default: 1 },
    { name: "n", type: "number" },
    { name: "c", type: "boolean" },
    { name: "o", type: "object" },
    { name: "a", type: "array" },
    { name: "v", type: "null" },
  ])

  expect(result.sNode).not.toBe(null)
  expect(assertion.s).toEqual("abc")

  // Missing arg
  expect(() =>
    assertion.parseWithNode(assertionNode, [{ name: "u", type: "string" }])
  ).toThrow(ScriptError)

  // Bad type
  expect(() =>
    assertion.parseWithNode(assertionNode, [{ name: "s", type: "number" }])
  ).toThrow(ScriptError)
})
