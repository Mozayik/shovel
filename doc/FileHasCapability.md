# FileHasCapability

Sets a Linux file capability using the `setcap` tool.  Must be run as root.

## Arguments

| Name         | Type     | Default | Description                                                                                                                                   |
| ------------ | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `file`       | `string` |         | Path to the file                                                                                                                              |
| `capability` | `string` |         | A specific capabalitiy, case insensitive. See [Ubuntu capabilities list](http://manpages.ubuntu.com/manpages/bionic/man7/capabilities.7.html) |

## Example

```json5
{
  assert: "FileHasCapability",
  with: {
    file: "/bin/somefile",
    capability: "cap_net_bind_service"
  },
  become: "root",
}
```
