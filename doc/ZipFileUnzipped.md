# ZipFileUnzipped

Asserts that a `.gz` or `.zip` file has been unzipped by comparing the sizes of the files in `zipFile` with the files in `toDirectory`.

## Arguments

| Name          | Type     | Default | Description                                                        |
| ------------- | -------- | ------- | ------------------------------------------------------------------ |
| `file`        | `string` |         | The file to unzip.                                                 |
| `toDirectory` | `string` |         | The directory in which to place the unzipped files. It must exist. |

## Example

```json5
{
  assert: "ZipFileUnzipped",
  with: {
    file: "zipfile.gz",
    toDirectory: "/some/dir",
  }
}
```
