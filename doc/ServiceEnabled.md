# ServiceRunning

Asserts that a system service is enabled.

## Arguments

| Name      | Type     | Default | Description              |
| --------- | -------- | ------- | ------------------------ |
| `service` | `string` |         | The name of the service. |

## Example

```json5
{
  assert: "ServiceEnabled",
  with: {
    service: "ntp",
  }
}
```
