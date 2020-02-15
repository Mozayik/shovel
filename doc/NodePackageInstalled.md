# NodePackageInstalled

Asserts that a Node.js package is installed globally.

## Arguments

| Name      | Type     | Default | Description                          |
| --------- | -------- | ------- | ------------------------------------ |
| `package` | `string` |         | Then name of the package to install. |

## Example

```json5
{
  assert: "NodePackageInstalled",
  with: {
    package: "rimraf",
  }
}
```
