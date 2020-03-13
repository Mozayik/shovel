import { CupsPrintQueueExists } from "./CupsPrintQueueExists"
import { createAssertNode, ScriptError, PathInfo } from "../utility"

test("assert", async () => {
  const container = {
    interpolator: (node) => node.value,
    process: {
      geteuid: () => 1,
      getgroups: () => [1, 2],
    },
    util: {
      runningAsRoot: () => true,
      osInfo: async () => ({
        platform: "linux",
        id: "centos",
      }),
      pathInfo: async (path) => {
        if (
          path === "/etc/cups/ppd/printer1.ppd" ||
          path === "/usr/local/drivers/printer1.ppd" ||
          path === "/etc/cups/lpoptions" ||
          path === "/etc/cups/printers.conf" ||
          path === "/usr/local/drivers/other.ppd"
        ) {
          return new PathInfo(
            {
              isFile: () => true,
              size: 100,
              uid: 1,
              gid: 1,
              mode: 0o777,
            },
            container
          )
        } else {
          return new PathInfo()
        }
      },
    },
    fs: {
      readFile: async (file) => {
        if (file === "/etc/cups/printers.conf") {
          return `
<Printer printer1>
DeviceURI serial:/dev/usb/lp0
ErrorPolicy abort-job
Shared True
Accepting True
</Printer>
<Printer printer2>
DeviceURI serial:/dev/usb/lp1
ErrorPolicy abort-job
Shared False
Accepting False
Location Nowhere
Info HP Laserjet 600XL
</Printer>`
        } else if (file === "/etc/cups/lpoptions") {
          return `
Dest printer1 PrintBothSides=True Ribbon=PremiumResin
Dest printer2 OtherOption=True
Default cltx0`
        } else if (
          file === "/etc/cups/ppd/printer1.ppd" ||
          file === "/usr/local/drivers/printer1.ppd"
        ) {
          return "something"
        } else if (file === "/usr/local/drivers/other.ppd") {
          return "something else"
        } else if (file === "/etc/cups/cupsd.conf") {
          return "DirtyCleanInterval 0\n"
        }
      },
    },
  }

  const assertion = new CupsPrintQueueExists(container)

  // Bad arguments
  await expect(
    assertion.assert(createAssertNode(assertion, {}))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { queue: 1 }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { queue: "XYZ" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(createAssertNode(assertion, { queue: "valid" }))
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, { queue: "my-queue", deviceUri: true })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "my-queue",
        deviceUri: "ipp://",
        settleTime: "",
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "my-queue",
        deviceUri: "ipp://",
        shared: "",
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "my-queue",
        deviceUri: "ipp://",
        errorPolicy: 1,
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "my-queue",
        deviceUri: "ipp://",
        errorPolicy: "invalid",
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "my-queue",
        deviceUri: "ipp://",
        location: 1,
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "my-queue",
        deviceUri: "ipp://",
        info: 1,
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "my-queue",
        deviceUri: "ipp://",
        accepting: 1,
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "my-queue",
        deviceUri: "ipp://",
        ppdFile: 1,
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "my-queue",
        deviceUri: "ipp://",
        ppdFile: "/not/there.ppd",
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "my-queue",
        deviceUri: "ipp://",
        ppdOptions: 1,
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "my-queue",
        deviceUri: "ipp://",
        ppdOptions: {}, // Must have ppdFile
      })
    )
  ).rejects.toThrow(ScriptError)
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "my-queue",
        deviceUri: "ipp://",
        ppdFile: "/usr/local/drivers/printer1.ppd",
        ppdOptions: {
          Option1: 1,
        },
      })
    )
  ).rejects.toThrow(ScriptError)

  // Happy path
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "printer1",
        deviceUri: "serial:/dev/usb/lp0",
        errorPolicy: "abort-job",
        shared: true,
        ppdFile: "/usr/local/drivers/printer1.ppd",
        ppdOptions: {
          PrintBothSides: "True",
          Ribbon: "PremiumResin",
        },
        settleTime: 5,
      })
    )
  ).resolves.toBe(true)

  // Print queue does not exist
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "printer3",
        deviceUri: "ipp://",
        shared: false,
        ppdFile: "/usr/local/drivers/printer1.ppd",
        ppdOptions: {
          Ribbon: "ForSure",
        },
      })
    )
  ).resolves.toBe(false)

  // Print queue is all different
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "printer1",
        deviceUri: "ipp://",
        errorPolicy: "retry-job",
        shared: false,
        location: "Somewhere",
        info: "HP Laserjet",
        accepting: false,
        ppdFile: "/usr/local/drivers/other.ppd",
        ppdOptions: {
          Ribbon: "CheapInk",
        },
      })
    )
  ).resolves.toBe(false)

  // lpoptions not accessible
  container.util.pathInfo = (path) => {
    if (path === "/usr/local/drivers/printer1.ppd") {
      return new PathInfo(
        {
          isFile: () => true,
          size: 100,
          uid: 1,
          gid: 1,
          mode: 0o777,
        },
        container
      )
    } else {
      return new PathInfo()
    }
  }
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "printer3",
        deviceUri: "ipp://",
        ppdFile: "/usr/local/drivers/printer1.ppd",
        ppdOptions: {
          Ribbon: "ForSure",
        },
      })
    )
  ).resolves.toBe(false)

  // Not running as root
  container.util.runningAsRoot = () => false
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "printer1",
        deviceUri: "serial:/dev/usb/lp0",
      })
    )
  ).rejects.toThrow(ScriptError)

  // Bad /etc/cups/cupsd.confi
  container.fs.readFile = async () => "#Bad file\n"
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "printer1",
        deviceUri: "serial:/dev/usb/lp0",
      })
    )
  ).rejects.toThrow(ScriptError)

  // Wrong O/S
  container.util.osInfo = async () => ({
    platform: "linux",
    id: "unknown",
  })
  await expect(
    assertion.assert(
      createAssertNode(assertion, {
        queue: "printer1",
        deviceUri: "serial:/dev/usb/lp0",
      })
    )
  ).rejects.toThrow(ScriptError)
})

test("rectify", async () => {
  const container = {
    Timeout: {
      set: () => Promise.resolve(),
    },
    childProcess: {
      exec: () => undefined,
    },
  }
  const assertion = new CupsPrintQueueExists(container)

  assertion.queueName = "my-printer"

  await expect(assertion.rectify()).resolves.toBeUndefined()

  assertion.updateFlags = 0xff
  assertion.deviceUri = "ipp://"
  assertion.errorPolicy = "abort-job"
  assertion.share = true
  assertion.accepting = true
  assertion.ppdFile = "/x/y"
  assertion.ppdOptions = { a: "b" }
  assertion.settleTime = 2000

  await expect(assertion.rectify()).resolves.toBeUndefined()

  assertion.accepting = false

  await expect(assertion.rectify()).resolves.toBeUndefined()
})

test("result", () => {
  const assertion = new CupsPrintQueueExists({})

  assertion.queueName = "my-printer"
  assertion.deviceUri = "ipp://somewhere.com:631/printer"
  assertion.errorPolicy = "retry-current-job"
  assertion.shared = false
  assertion.accepting = false

  expect(assertion.result()).toEqual({
    queue: assertion.queueName,
    deviceUri: assertion.deviceUri,
    errorPolicy: assertion.errorPolicy,
    shared: assertion.shared,
    accepting: assertion.accepting,
  })

  assertion.info = "x"
  assertion.location = "y"
  assertion.ppdFile = "/x/y"
  assertion.ppdOptions = { a: "b" }
  assertion.updateFlags = 0xff

  expect(assertion.result()).toEqual({
    queue: assertion.queueName,
    deviceUri: assertion.deviceUri,
    errorPolicy: assertion.errorPolicy,
    shared: assertion.shared,
    accepting: assertion.accepting,
    info: assertion.info,
    location: assertion.location,
    ppdFile: assertion.ppdFile,
    ppdOptions: assertion.ppdOptions,
    updateFlags: assertion.updateFlags,
  })
})
