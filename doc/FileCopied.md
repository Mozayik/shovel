# FileCopied

Asserts that a file is copied from one location to another.

## Arguments

| Name       | Type     | Default | Description            |
| ---------- | -------- | ------- | ---------------------- |
| `fromFile` | `string` |         | The file to copy from. |
| `toFile`   | `string` |         | The file to copy to.   |

## Example

```json5
{
  assert: "FileCopied",
  with: {
    fromFile: "/path/somefile.txt",
    toFile: "/path/someother.txt",
  }
}
```
