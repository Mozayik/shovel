# IPTablesContain

Asserts that the system `iptables` contain the given contents.  The contents can include comments, spacing and queue counts. Only the rules will be compared. Additionally, a list of regular expressions can be supplied to ignore specific rules in the target that are the result of dynamic rules added by processes such as `fail2ban` and `strongswan`.

## Arguments

| Name       | Type     | Default | Description                                                                              |
| ---------- | -------- | ------- | ---------------------------------------------------------------------------------------- |
| `contents` | `string` |         | The rule content to place in the file.                                                   |
| `filter`   | `object` | `{}`    | An object containing `name: [regex, ...]` for rules to ignore in the existing `iptables` |

## Example

```json5
{
  assert: "FileContains",
  with: {
    contents: "# New rules\\n*filter\\n-A INPUT -j DROP\\n-A OUTPUT -j DROP\\nCOMMIT",
    ignore: {
      filter: ["^-A INPUT.*-j f2b-sshd$", "^-A f2b-sshd.*$"]
    }
  }
}
```
