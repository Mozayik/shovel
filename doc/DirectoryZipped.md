# DirectoryZipped

Asserts that a directory has been zipped by comparing the sizes of the files in `fromDirectory` with the files in `zipFile`.

## Arguments

| Name        | Type     | Default | Description                                                                                                                                                                                            |
| ----------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `directory` | `string` |         | The directory from which to recursively zip files.                                                                                                                                                     |
| `zipFile`   | `string` |         | The location of the zip file.                                                                                                                                                                          |
| `globs`     | `string` |         | Array of glob strings which defines the files to include or exclude. See [readdirp](https://www.npmjs.com/package/readdirp) and [picomatch](https://github.com/micromatch/picomatch) for glob details. |

## Example

```json5
{
  assert: "DirectoryZipped",
  with: {
    directory: "/some/dir",
    zipFile: "zipfile.gz",
    glob: ["*.js"]
  }
}
```
