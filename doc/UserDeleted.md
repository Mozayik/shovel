# UserDeleted

Asserts that a Linux user has been deleted.

## Arguments

| Name   | Type     | Default | Description           |
| ------ | -------- | ------- | --------------------- |
| `user` | `string` |         | The name of the user. |

## Example

```json5
{
  assert: "UserDeleted",
  with: {
    user: "name",
  }
}
```
