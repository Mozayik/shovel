# TarFileExtracted

Asserts that a `.tar`, `.tar.gz` or `.tgz` file has been extracted by comparing the sizes of the files in `tarFile` with the files in `toDirectory`.

## Arguments

| Name          | Type     | Default | Description                                                                                         |
| ------------- | -------- | ------- | --------------------------------------------------------------------------------------------------- |
| `file`        | `string` |         | The file to unzip.                                                                                  |
| `toDirectory` | `string` |         | The directory in which to place the unzipped files. Defaults to the same directory as the tar file. |

```json5
{
  assert: "TarFileExtracted",
  with: {
    file: "archive.tgz",
    toDirectory: "/some/dir",
  }
}
```
