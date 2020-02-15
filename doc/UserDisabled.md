# UserDisabled

Asserts that a Linux user has been disabled.

## Arguments

| Name   | Type     | Default | Description           |
| ------ | -------- | ------- | --------------------- |
| `user` | `string` |         | The name of the user. |

## Example

```json5
{
  assert: "UserDisabled",
  with: {
    user: "name",
  }
}
```
