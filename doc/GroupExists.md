# GroupExists

Asserts that a Linux security group exists.

## Arguments

| Name     | Type      | Default | Description                                                                                                                                                                                                                          |
| -------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `group`  | `string`  |         | The name of the group to create.                                                                                                                                                                                                     |
| `gid`    | `number`  |         | The desired group id number. Cannot be specified if `system` flag is given.                                                                                                                                                          |
| `system` | `boolean` |         | If supplied and the group does not exist, it will be given a group number in the system range as specified by `/etc/login.defs`. If the group exists, the assertion will will throw if the existing GID is not in the correct range. |

## Example

```json5
{
  assert: "GroupExists",
  with: {
    group: "user-group",
    gid: 1000,
  },
  {
    assert: "GroupExists",
    with: {
      group: "system-group",
      system: true,
    }
  }
```
