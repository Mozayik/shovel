# FileExists

Asserts that a file exists.  If not, the file is created. The directory can have contents.

## Arguments

| Name    | Type     | Default                                       | Description                                                                                    |
| ------- | -------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `file`  | `string` |                                               | The file to check or create.                                                                   |
| `owner` | `object` | `{ uid: $UID, gid: $GID }`                    | The user and group owners for the file.                                                        |
| `mode`  | `object` | `{ user: "rwx", group: "r--", other: "r--" }` | The permissions flags for the file.  Defaults to .  See [Permission Flags](PermissionFlags.md) |

## Possible Errors

- The `path` points to a file instead of a directory.
- The user does not have permission to remove the directory

## Example

```json5
{
  assert: "FileExists",
  with: {
    path: "/path/to/file"
    owner: {
      user: "user",
      group: "group",
    }
    mode: {
      user: "rwx",
      group: "rwx",
      other: "rwx",
    }
  }
}
```
