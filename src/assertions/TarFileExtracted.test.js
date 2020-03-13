import { TarFileExtracted } from "./TarFileExtracted"
import { Readable, Writable } from "stream"
import { createAssertNode, ScriptError } from "../utility"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    fs: {
      createReadStream: jest.fn((path) => {
        switch (path) {
          case "/xyz/some.tar":
            return new Readable({
              read(size) {
                this.push("entry1")
                this.push(null)
              },
            })
          case "/xyz/other.tar":
            return new Readable({
              read(size) {
                this.push("entry2")
                this.push(null)
              },
            })
        }
      }),
    },
    util: {
      pathInfo: async (path) => {
        switch (path) {
          case "/xyz/file1.txt":
          case "/xyz/file2.txt":
            return {
              size: 100,
            }
          case "/xyz":
          case "/xyz/some.tar":
          case "/xyz/other.tar":
            return {
              getAccess: () => ({
                isReadWrite: () => true,
                isReadable: () => true,
              }),
            }
          case "/unreadable":
          case "/xyz/unreadable.tar":
            return {
              getAccess: () => ({
                isReadWrite: () => false,
                isReadable: () => false,
              }),
            }
        }
      },
    },
    tar: {
      Parse: class extends Writable {
        _write(chunk, encoding, callback) {
          const entry = chunk.toString()

          switch (entry) {
            case "entry1":
              this.emit("entry", { path: "file1.txt", size: 100 }) // Same as disk
              break
            case "entry2":
              this.emit("entry", { path: "file2.txt", size: 50 }) // Different from disk
              break
          }

          callback()
        }
      },
    },
  }
  const assertion = new TarFileExtracted(container)

  // Bad arguments
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { file: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, { file: "/xyz/some.tar", toDirectory: 1 })
    )
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    assertion.assert(createAssertNode(assertion, { file: "/xyz/some.tar" }))
  ).resolves.toBe(true)

  // With a file different
  await expect(
    assertion.assert(createAssertNode(assertion, { file: "/xyz/other.tar" }))
  ).resolves.toBe(false)

  // Unreadable tar
  await expect(
    assertion.assert(
      createAssertNode(assertion, { file: "/xyz/unreadable.tar" })
    )
  ).rejects.toThrow(ScriptError)

  // Unreadable directory
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/xyz/some.tar",
        toDirectory: "/unreadable",
      })
    )
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    tar: {
      x: async () => undefined,
    },
  }
  const assertion = new TarFileExtracted(container)

  assertion.expandedFile = ""
  assertion.expandedDirectory = ""

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new TarFileExtracted({})

  assertion.expandedFile = "some.tar"
  assertion.expandedDirectory = ""

  expect(assertion.result()).toEqual({
    file: assertion.expandedFile,
    toDirectory: assertion.expandedDirectory,
  })
})
