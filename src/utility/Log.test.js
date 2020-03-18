import { Log } from "./Log"
import stream from "stream"

let container = {}

beforeEach(() => {
  container = {
    stdout: new stream.Writable({
      write(chunk, encoding, callback) {
        callback()
      },
    }),
    stderr: new stream.Writable({
      write(chunk, encoding, callback) {
        callback()
      },
    }),
    readline: {
      clearLine: () => undefined,
      cursorTo: () => undefined,
    },
    setInterval: () => ({}),
    clearInterval: () => undefined,
  }
})

test("constructor", () => {
  const log = new Log()

  expect(log).not.toBe(null)
})

test("info", () => {
  const log = new Log(container)

  expect(log.info("xyz")).toBeUndefined()
})

test("output", () => {
  const log = new Log(container)

  expect(log.output("{rectified")).toBeUndefined()
  expect(log.output("{asserted")).toBeUndefined()
  expect(log.output("other")).toBeUndefined()
})

test("outputError", () => {
  const log = new Log(container)

  expect(log.outputError()).toBeUndefined()
})

test("warning", () => {
  const log = new Log(container)

  expect(log.warning("xyz")).toBeUndefined()
})

test("debug", () => {
  const log = new Log(container)

  expect(log.debug("xyz")).toBeUndefined()
})

test("error", () => {
  const log = new Log(container)

  expect(log.error("xyz")).toBeUndefined()
})

test("enableSpinner", () => {
  const log = new Log(container)

  expect(log.enableSpinner()).toBeUndefined()
})

test("startSpinner", () => {
  const log = new Log(container)

  expect(log.startSpinner("message")).toBeUndefined()

  log.spinnerEnabled = true
  expect(log.startSpinner("message")).toBeUndefined()

  log.spinnerHandle = {}
  expect(log.startSpinner("> message")).toBeUndefined()
})

test("stopSpinner", () => {
  const log = new Log(container)

  expect(log.stopSpinner()).toBeUndefined()

  log.spinnerHandle = {}
  expect(log.stopSpinner()).toBeUndefined()
})
