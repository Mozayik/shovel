# CupsPrintQueueExists

Asserts that a CUPS printer queue exists on the host. Fails if CUPS is not installed.

NOTE: Requires that `DirtyCleanInterval` is set to zero (`0`) in the `/etc/cups/cupsd.conf` file or subsequent assertions will not succeed after rectification.

## Arguments

| Name          | Type      | Default        | Description                                                                                                                    |
| ------------- | --------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `queue`       | `string`  |                | The print queue name.                                                                                                          |
| `deviceUri`   | `string`  |                | The device URI for the printer, e.g. ipp://10.10.1.1:631/printer, serial:/                                                     |
| `errorPolicy` | `string`  | `stop-printer` | Printer error policy.  One of `abort-job`, `stop-printer`, `retry-job`, `retry-current-job`.                                   |
| `accepting`   | `boolean` | `true`         | If the print queue is enabled and accepting print jobs.                                                                        |
| `shared`      | `boolean` | `false`        | If the printer queue is shared on the network.                                                                                 |
| `location`    | `string`  | `""`           | The printer location.                                                                                                          |
| `info`        | `string`  | `""`           | The printer information, typically the model number and other descriptive notes.                                               |
| `ppdFile`     | `string`  | `""`           | The file name of a [PPD](https://www.cups.org/doc/postscript-driver.html) file for the printer.                                |
| `ppdOptions`  | `object`  | `{}`           | The PPD options to use for this printer.  Not valid unless `ppdFile` is also set.                                              |
| `settleTime`  | `number`  | `2`            | Number of seconds to wait for CUPS printer configuration to settle before making changes. Only applies if the assertion fails. |

## Example

```json5
{
  assert: "CupsPrintQueueExists",
  with: {
    queue: "my-printer",
    deviceUri: "socket://10.10.10.10/laserjet",
    shared: true,
    accepting: true,
    location: "Main Office",
    description: "HP LaserJet",
    errorPolicy: "retry-job",
    ppdFile: "/usr/local/drivers/HPLaserJet.ppd",
    ppdOptions: {
      PrintQuality: "Best",
    },
    settle: 5,
  }
}
```
