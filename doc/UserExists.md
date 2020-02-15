# UserExists

Asserts that a Linux user exists.

## Arguments

| Name     | Type      | Default | Description                                                                                                                                                                                                                       |
| -------- | --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user`   | `string`  |         | The name of the user.                                                                                                                                                                                                             |
| `uid`    | `number`  |         | UID for the user. Cannot be give with `system` flag.                                                                                                                                                                              |
| `system` | `boolean` |         | If supplied and the user does not exist, it will be given a user number in the system range as specified by `/etc/login.defs`. If the user exists, the assertion will will throw if the existing UID is not in the correct range. |

## Example

```json5
  {
    assert: "UserExists",
    with: {
      user: "name",
      uid: 1000,
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
