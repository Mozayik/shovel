# GroupDeleted

Asserts that a Unix security group is deleted from the host.

## Arguments

| Name    | Type     | Default | Description                     |
| ------- | -------- | ------- | ------------------------------- |
| `group` | `string` |         | The name of the group to delete |

## Example

```json5
{
  assert: "GroupDeleted",
  with: {
    group: "group-name",
  }
}
```
