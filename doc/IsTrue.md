# IsTrue

Asserts that an expression evaluates to `true`.

## Arguments

| Name         | Type                  | Default | Description                            |
| ------------ | --------------------- | ------- | -------------------------------------- |
| `expression` | `string` or `boolean` |         | An expression to evaluate              |
| `message`    | `string`              |         | A message that explains the assertions |

## Example

```json5
{
  assert: "IsTrue",
  with: {
    expression: "{env.THE_PASSWORD !== undefined}",
    message: "check for THE_PASSWORD environment var"
  }
}
```
