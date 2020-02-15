# ServiceDisabled

Asserts that a system service is disabled.

## Arguments

| Name      | Type     | Default | Description              |
| --------- | -------- | ------- | ------------------------ |
| `service` | `string` |         | The name of the service. |

## Example

```json5
{
  assert: "ServiceDisabled",
  with: {
    service: "ntp",
  }
}
```
