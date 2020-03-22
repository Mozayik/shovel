import { IsTrue } from "./IsTrue"
import { createAssertNode, ScriptError } from "../utility"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
  }
  const assertion = new IsTrue(container)

  // Happy path
  await expect(
    assertion.assert(
      createAssertNode(assertion, { value: true, message: "the thing is true" })
    )
  ).resolves.toBe(true)

  // Unhappy path
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        value: false,
        message: "the thing is true",
      })
    )
  ).rejects.toThrow("thing")
})

test("rectify", async () => {
  const assertion = new IsTrue({})

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", async () => {
  const assertion = new IsTrue({})
  const result = {
    message: "the thing is true",
  }
  assertion.message = result.message

  await expect(assertion.result()).toEqual(result)
})
