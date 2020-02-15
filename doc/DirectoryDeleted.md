# `DirectoryDeleted`

## Summary

Asserts that a directory and any sub-directories and files are deleted.

## Arguments

| Name        | Type     | Default | Description             |
| ----------- | -------- | ------- | ----------------------- |
| `directory` | `string` |         | The directory to delete |

## Example

```json5
{
  assert: "DirectoryDeleted",
  with: {
    directory: "/path/to/dir"
  }
}
```
