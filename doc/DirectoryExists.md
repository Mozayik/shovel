# DirectoryExists

Asserts that a directory is exists and has the specific owners and permissions. The parent directory must exist and be accessible by the user.

## Arguments

| Name        | Type     | Default                                       | Description                                                                         |
| ----------- | -------- | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `directory` | `string` |                                               | The directory.                                                                      |
| `owner`     | `object` | `{ uid: $UID, gid: $GID }`                    | The user and group owners for the directory. Defaults to current user and group.    |
| `mode`      | `string` | `{ user: "rwx", group: "rwx", other: "rwx" }` | The permissions flags for the directory. See [Permission Flags](PermissionFlags.md) |

## Example

```json5
{
  assert: "DirectoryExists",
  with: {
    directory: "/path/to/dir",
    owner: {
      user: "joe",
      group: "admins",
    },
    mode: {
      user: "rwx",
      group: "rwx",
      other: "r--",
    }
  }
}
```
