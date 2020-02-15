# SystemPackageInstalled

Asserts that a system package is installed.

## Arguments

| Name      | Type      | Default | Description                                                                       |
| --------- | --------- | ------- | --------------------------------------------------------------------------------- |
| `package` | `string`  |         | Then name of the package to install.                                              |
| `update`  | `boolean` | `false` | Whether to update the package lists.  Only done if an install is actually needed. |

## Example

```json5
{
  assert: "SystemPackageInstalled",
  with: {
    package: "gzip",
    update: false,
  }
}
```
