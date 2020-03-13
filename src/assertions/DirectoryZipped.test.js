import { DirectoryZipped } from "./DirectoryZipped"
import stream from "stream"
import { ScriptError, PathInfo, createAssertNode } from "../utility"

test("assert", async () => {
  let container = {
    interpolator: (node) => node.value,
    readdirp: (path, options) => {
      const generateEntries = async function*(entries) {
        for (const entry of entries) {
          yield entry
        }
      }

      return generateEntries([
        { path: "a.txt", stats: { size: 50 } },
        { path: "x/b.txt", stats: { size: 150 } },
        { path: "x/y/c.txt", stats: { size: 250 } },
      ])
    },
    util: {
      pathInfo: async (path) => {
        switch (path) {
          case "./somefile.zip":
            return new PathInfo({
              isFile: () => true,
              isDirectory: () => false,
            })
          case "./fromdir":
            return new PathInfo({
              isFile: () => false,
              isDirectory: () => true,
            })
          default:
            return new PathInfo()
        }
      },
    },
    yauzl: {
      open: jest.fn(async (path) => {
        expect(typeof path).toBe("string")

        let entries = null

        switch (path) {
          default:
          case "./somefile.zip":
            entries = [
              {
                uncompressedSize: 50,
                fileName: "a.txt",
              },
              { uncompressedSize: 0, fileName: "x/" },
              {
                uncompressedSize: 0,
                fileName: "x/",
              },
              {
                uncompressedSize: 150,
                fileName: "x/b.txt",
              },
              { uncompressedSize: 0, fileName: "x/y/" },
              {
                uncompressedSize: 250,
                fileName: "x/y/c.txt",
              },
            ]
            break
          case "./withfilemissing.zip":
            entries = [
              { uncompressedSize: 0, fileName: "x/" },
              {
                uncompressedSize: 150,
                fileName: "x/b.txt",
              },
            ]
            break
        }

        return {
          close: jest.fn(async () => null),
          walkEntries: jest.fn(async (callback) => {
            // Assuming that callback returns a Promise
            await Promise.all(entries.map(callback))
          }),
        }
      }),
    },
  }
  const assertion = new DirectoryZipped(container)

  // Bad zip arg
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { zipFile: 1 }))
  ).rejects.toThrow(ScriptError)

  // Bad from arg
  await expect(
    assertion.assert(createAssertNode(assertion, { zipFile: "" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { zipFile: "", directory: 1 }))
  ).rejects.toThrow(ScriptError)

  // Bad globs arg
  await expect(
    assertion.assert(
      createAssertNode(assertion, { zipFile: "", directory: "", globs: 1 })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, { zipFile: "", directory: "", globs: [1] })
    )
  ).rejects.toThrow(ScriptError)

  // With from directory not present or inaccessible
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        zipFile: "./somefile.zip",
        directory: "./missing",
        globs: ["*"],
      })
    )
  ).rejects.toThrowError(ScriptError)

  // With zip not present
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        zipFile: "./otherfile.zip",
        directory: "./fromdir",
        globs: ["*"],
      })
    )
  ).resolves.toBe(false)

  // With all files zipped and the same
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        zipFile: "./somefile.zip",
        directory: "./fromdir",
      })
    )
  ).resolves.toBe(true)

  // With a file missing
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        zipFile: "./withfilemissing.zip",
        directory: "./fromdir",
      })
    )
  ).resolves.toBe(false)

  // With broken zip file
  container.yauzl.open = async () => {
    throw new Error()
  }
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        zipFile: "./somefile.zip",
        directory: "./fromdir",
      })
    )
  ).resolves.toBe(false)
})

test("rectify", async () => {
  const container = {
    util: {
      pipeToPromise: async (readable, writeable) => undefined,
    },
    fs: {
      createWriteStream: jest.fn(async () => {
        return new stream.Writable({
          write(chunk, encoding, callback) {
            callback()
          },
        })
      }),
      remove: jest.fn(async () => undefined),
    },
    yazl: {
      ZipFile: class {
        constructor() {
          this.outputStream = new stream.Readable({
            read(size) {
              this.push("The quick brown fox jumps over the lazy dog\n")
              this.push(null)
            },
          })
        }
        addFile(path) {}
        end() {}
      },
    },
  }
  const assertion = new DirectoryZipped(container)

  assertion.expandedDirectory = "/from"
  assertion.expandedZipFile = "a.zip"
  assertion.zipFileExists = true
  assertion.files = ["a.txt"]

  await expect(assertion.rectify()).resolves.toBeUndefined()

  assertion.zipFileExists = false

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new DirectoryZipped({})

  assertion.expandedZipFile = "/a.zip"
  assertion.expandedDirectory = "/from"
  assertion.globs = "*"
  assertion.files = ["a.txt"]

  expect(assertion.result()).toEqual({
    zipFile: assertion.expandedZipFile,
    directory: assertion.expandedDirectory,
    globs: assertion.globs,
    files: assertion.files,
  })
})
