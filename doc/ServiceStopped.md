# ServiceStopped

Asserts that a system service is stopped.

## Arguments

| Name      | Type     | Default | Description              |
| --------- | -------- | ------- | ------------------------ |
| `service` | `string` |         | The name of the service. |

## Example

```json5
{
  assert: "ServiceStopped",
  with: {
    service: "ntp",
  }
}
```
