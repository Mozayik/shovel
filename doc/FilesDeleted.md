# FilesDeleted

Asserts that one or more files are deleted from the host. If any of the files are present they are deleted.

## Arguments

| Name    | Type       | Default | Description                  |
| ------- | ---------- | ------- | ---------------------------- |
| `files` | `[string]` |         | An array of files to delete. |

## Example

```json5
{
  assert: "FilesDeleted",
  with: {
    files: ["a.txt", "b.txt"]
  }
}
```
