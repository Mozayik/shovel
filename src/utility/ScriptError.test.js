import { ScriptError } from "./ScriptError"

test("constructor", async () => {
  const error = new ScriptError("message", "/somefile.js")

  expect(error.toString()).toBe(error.message)
})
