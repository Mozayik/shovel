import { FileContains } from "./FileContains"
import { PathInfo, ScriptError, createAssertNode } from "../utility"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    fs: {
      readFile: jest.fn(async (path) => {
        if (path === "/somefile") {
          return "#start\ncontent\n#end"
        }
      }),
      outputFile: jest.fn(async (path, content) => undefined),
    },
    process: {
      geteuid: () => 1,
      getgroups: () => [1, 2],
    },
    util: {
      pathInfo: async (path) => {
        if (path === "/somefile") {
          return new PathInfo(
            { isFile: () => true, uid: 1, mode: 0o777 },
            container
          )
        } else if (path === "/missing") {
          return new PathInfo(null, container)
        }
      },
    },
  }

  const assertion = new FileContains(container)

  // Bad position
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "",
        contents: "xyz",
        position: "other",
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "abc.txt",
        contents: "xyz",
        position: "after",
        // Missing contents
      })
    )
  ).rejects.toThrow(ScriptError)

  // Bad validation
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "",
        contents: "xyz",
        position: "all",
        validation: "bad",
      })
    )
  ).rejects.toThrow(ScriptError)

  // Bad regex
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "",
        contents: "",
        position: "over",
        regex: "[x",
      })
    )
  ).rejects.toThrow(ScriptError)

  // File missing or inaccessible
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/missing",
        contents: "xyz",
      })
    )
  ).rejects.toThrow(ScriptError)

  // Everything the same
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/somefile",
        contents: "#start\ncontent\n#end",
      })
    )
  ).resolves.toBe(true)

  // Contents different
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/somefile",
        contents: "#different",
      })
    )
  ).resolves.toBe(false)

  // With 'over' content included
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/somefile",
        position: "over",
        regex: "^content$",
        contents: "content\n",
      })
    )
  ).resolves.toBe(true)

  // With 'over' and regexp match
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/somefile",
        position: "over",
        regex: "^content$",
        contents: "Setting=yes\n",
      })
    )
  ).resolves.toBe(false)

  // With over and no regex match
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/somefile",
        position: "over",
        regex: "^#foobar\n",
        contents: "foobar\n",
      })
    )
  ).rejects.toThrow("not found")

  // With 'before', regex match and content before
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/somefile",
        position: "before",
        regex: "^#end",
        contents: "content\n",
      })
    )
  ).resolves.toBe(true)

  // With 'before', regex match and content not before
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/somefile",
        position: "before",
        regex: "^#end",
        contents: "other\n",
      })
    )
  ).resolves.toBe(false)

  // With 'before' and no regex match
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/somefile",
        position: "before",
        regex: "^#foobar",
        contents: "other\n",
      })
    )
  ).rejects.toThrow(ScriptError)

  // With 'after', regex match and content after
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/somefile",
        position: "after",
        regex: "^#start\n",
        contents: "content\n",
      })
    )
  ).resolves.toBe(true)

  // With 'after', regex match and no content after
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/somefile",
        position: "after",
        regex: "^#start$",
        contents: "other\n",
      })
    )
  ).resolves.toBe(false)

  // With 'after' and no regex match
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        file: "/somefile",
        position: "after",
        regex: "^#foobar",
        contents: "other\n",
      })
    )
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    fs: {
      outputFile: jest.fn(async () => undefined),
    },
    tempy: {
      write: async () => "/tmp/tempfile",
    },
    childProcess: {
      exec: async () => undefined,
    },
  }
  const assertion = new FileContains(container)

  assertion.validation = "none"
  assertion.filePath = "/somefile.txt"
  assertion.contents = "xyz\n"
  assertion.fileContents = "#start\ncontent\n#end"

  // Before
  assertion.position = "before"
  assertion.firstIndex = assertion.fileContents.indexOf("#end")
  assertion.lastIndex = assertion.fileContents.length
  container.fs.outputFile = async (fileName, data) => {
    expect(data).toBe("#start\ncontent\nxyz\n#end")
  }
  await expect(assertion.rectify()).resolves.toBeUndefined()

  // After
  assertion.position = "after"
  assertion.firstIndex = assertion.fileContents.indexOf("#start")
  assertion.lastIndex = assertion.fileContents.indexOf("content")
  container.fs.outputFile = async (fileName, data) => {
    expect(data).toBe("#start\nxyz\ncontent\n#end")
  }
  await expect(assertion.rectify()).resolves.toBeUndefined()

  // Over
  assertion.position = "over"
  assertion.firstIndex = assertion.fileContents.indexOf("content\n")
  assertion.lastIndex = assertion.fileContents.indexOf("#end")
  container.fs.outputFile = async (fileName, data) => {
    expect(data).toBe("#start\nxyz\n#end")
  }
  await assertion.rectify()
  await expect(assertion.rectify()).resolves.toBeUndefined()

  // All
  assertion.position = "all"
  container.fs.outputFile = async (fileName, data) => {
    expect(data).toBe("xyz\n")
  }
  await expect(assertion.rectify()).resolves.toBeUndefined()

  // All with good validation
  assertion.validation = "sudoers"
  await expect(assertion.rectify()).resolves.toBeUndefined()

  // All bad good validation
  container.childProcess.exec = async () => {
    throw new Error()
  }
  await expect(assertion.rectify()).rejects.toThrow(Error)
})

test("result", () => {
  const assertion = new FileContains({})

  assertion.filePath = "/somefile.txt"
  assertion.contents = "some contents"
  assertion.position = "all"

  expect(assertion.result()).toEqual({
    file: assertion.filePath,
    contents: assertion.contents,
    position: assertion.position,
    regex: "",
  })

  assertion.regex = "abc"

  expect(assertion.result()).toEqual({
    file: assertion.filePath,
    contents: assertion.contents,
    position: assertion.position,
    regex: "abc",
  })
})
