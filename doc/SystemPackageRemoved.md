# SystemPackageRemoved

Asserts that a system package is removed from the system.

## Arguments

| Name      | Type     | Default | Description                        |
| --------- | -------- | ------- | ---------------------------------- |
| `package` | `string` |         | The name of the package to remove. |

## Example

```json5
{
  assert: "SystemPackageRemoved",
  with: {
    package: "gzip",
  }
}
```
