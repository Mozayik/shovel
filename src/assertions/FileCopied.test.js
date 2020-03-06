import { FileCopied } from "./FileCopied"
import { createAssertNode } from "../testUtil"
import { ScriptError } from "../ScriptError"
import { PathInfo } from "../util"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    util: {
      pathInfo: async (path) => {
        if (path === "/notthere" || path === "/noaccess/file") {
          return new PathInfo()
        } else if (path === "/noaccess") {
          return new PathInfo({
            isFile: () => false,
            isDirectory: () => true,
            mode: 0o555,
          })
        } else {
          return new PathInfo({
            isFile: () => true,
            isDirectory: () => false,
            mode: 0o777,
          })
        }
      },
      generateDigestFromFile: async (path) => {
        if (path === "/badfile") {
          return "0987654321"
        } else {
          return "1234567890"
        }
      },
    },
  }

  const assertion = new FileCopied(container)

  // Bad args
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { fromFile: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { fromFile: "" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { fromFile: "", toFile: 1 }))
  ).rejects.toThrow(ScriptError)

  // With files the same
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        fromFile: "/somefile",
        toFile: "/otherfile",
      })
    )
  ).resolves.toBe(true)

  // With fromFile file non-existent
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        fromFile: "/notthere",
        toFile: "/otherfile",
      })
    )
  ).rejects.toThrow(ScriptError)

  // With toFile file non-existent
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        fromFile: "/somefile",
        toFile: "/notthere",
      })
    )
  ).resolves.toBe(false)

  // With different files
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        fromFile: "/somefile",
        toFile: "/badfile",
      })
    )
  ).resolves.toBe(false)

  // With toPath directory not writable
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        fromFile: "/somefile",
        toFile: "/noaccess/file",
      })
    )
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const assertion = new FileCopied({
    fs: {
      copy: async () => undefined,
    },
  })

  assertion.fromFilePath = "/blah"
  assertion.toFilePath = "/blurp"

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", async () => {
  const assertion = new FileCopied({})

  assertion.fromFilePath = "/blah"
  assertion.toFilePath = "/blurp"

  expect(assertion.result()).toEqual({
    fromFile: assertion.fromFilePath,
    toFile: assertion.toFilePath,
  })
})
