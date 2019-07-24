import { FileContains } from "./FileContains"
import stream from "stream"

let container = null
const testString = "The quick brown fox jumps over the lazy dog\n"

beforeEach(() => {
  container = {
    newScriptError: (message, node) => {
      expect(typeof message).toBe("string")
      expect(typeof node).toBe("string")
      return new Error(message)
    },
    expandStringNode: (node) => node.value,
    withNode: { line: 0, column: 0 },
    assertNode: { line: 0, column: 0 },
    fs: {
      outputFile: jest.fn(async (fileName, data) => {
        expect(typeof fileName).toBe("string")
        expect(typeof data).toBe("string")
      }),
    },
  }
})

test("FileContains with same contents", async () => {
  const asserter = new FileContains(container)

  await expect(
    asserter.assert({
      path: {
        type: "string",
        value: "/somefile",
      },
      contents: { type: "string", value: testString },
    })
  ).resolves.toBe(true)
})

test("FileContains with different contents", async () => {
  const asserter = new FileContains(container)

  await expect(
    asserter.assert({
      path: { type: "string", value: "/somefile" },
      contents: { type: "string", value: "anything but the test string" },
    })
  ).resolves.toBe(false)
  await expect(asserter.rectify()).resolves.toBeUndefined()
})
