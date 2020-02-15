# UserExists

Asserts that a Linux user exists.

## Arguments

| Name      | Type      | Default               | Description                                                                                                                                                                                                                       |
| --------- | --------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user`    | `string`  |                       | The name of the user.                                                                                                                                                                                                             |
| `uid`     | `number`  | Next available        | UID for the user. Cannot be given with `system` flag.                                                                                                                                                                             |
| `gid`     | `number`  | See `/etc/login.defs` | GID for the user.                                                                                                                                                                                                                 |
| `shell`   | `string`  | See `/etc/login.defs` | Shell for the user.                                                                                                                                                                                                               |
| `homeDir` | `string`  | See `/etc/login.defs` | Home directory for the user.                                                                                                                                                                                                      |
| `comment` | `string`  | `""`                  | Comment for the user.                                                                                                                                                                                                             |
| `system`  | `boolean` | `undefined`           | If supplied and the user does not exist, it will be given a user number in the system range as specified by `/etc/login.defs`. If the user exists, the assertion will will throw if the existing UID is not in the correct range. |

## Example

```json5
  {
    assert: "UserExists",
    with: {
      user: "name",
      uid: 1000,
      gid: 1000,
      homeDir: "/home/name",
      comment: "New user",
      shell: "/bin/bash",
    }
  },
  {
    assert: "UserExists",
    with: {
      user: "system",
      system: true,
    }
  }
```
