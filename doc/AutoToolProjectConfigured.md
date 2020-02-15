# AutoToolProjectConfigured

Asserts that an [AutoTool](https://www.gnu.org/software/automake/manual/html_node/Autotools-Introduction.html) based project `configure` script has been run.

## Arguments

| Name        | Type     | Default | Description                                   |
| ----------- | -------- | ------- | --------------------------------------------- |
| `directory` | `string` |         | The path to the project root directory.       |
| `args`      | `string` | `""`    | Arguments to pass to the `configure` command. |

## Example

```json5
{
  assert: "AutoToolProjectConfigured",
  with: {
    directory: "/path/to/project",
    args: "--prefix /usr/local",
  }
}
```
