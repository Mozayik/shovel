# FileDeleted

Asserts that a file is deleted from the host.

## Arguments

| Name   | Type     | Default | Description         |
| ------ | -------- | ------- | ------------------- |
| `file` | `string` |         | The file to delete. |

## Example

```json5
{
  assert: "FileDeleted",
  with: {
    file: "/path/somefile.txt",
  }
}
```
