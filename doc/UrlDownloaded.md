# UrlDownloaded

Asserts that a file has been downloaded from a URL with HTTP or HTTPS.

## Arguments

| Name     | Type     | Default                                       | Description                                                                               |
| -------- | -------- | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `url`    | `string` |                                               | The HTTP/HTTPS URL of the file to be downloaded.                                          |
| `digest` | `string` |                                               | The SHA256 digest of the file in hexadecimal.                                             |
| `file`   | `string` |                                               | The name of the downloaded file.                                                          |
| `owner`  | `object` | `{ user: $UID, group: $GID }`                 | The user and group owners for the downloaded file. Defaults to current user and group.    |
| `mode`   | `object` | `{ user: "rw-", group: "rw-", other: "r--" }` | The permissions flags for the downloaded file. See [Permission Flags](PermissionFlags.md) |

## Example

```json5
{
  assert: "UrlDownloaded",
  with: {
    url: "https://sourcehost.com/linux_amd64.zip",
    digest: "658f4f3b305cd357a9501728b8a1dc5f...",
    file: "{path.join(env.HOME, '/downloads/linux_amd64.zip'}",
  }
}
```
