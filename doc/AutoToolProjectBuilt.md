# AutoToolProjectMade

Runs the `make` command on an [AutoTool](https://www.gnu.org/software/automake/manual/html_node/Autotools-Introduction.html).

## Arguments

| Name        | Type     | Default | Description                                    |
| ----------- | -------- | ------- | ---------------------------------------------- |
| `directory` | `string` |         | The path to the project root directory.        |
| `args`      | `string` | `""`    | Additional arguments for building the project. |

## Notes

Will fail if there is not `Makefile` in the directory specified, meaning you probably did not do a [`AutoToolProjectConfigured`](./AutoToolProjectConfigured.md) assertion first.

## Example

```json5
{
  action: "AutoToolProjectMade",
  with: {
    directory: "/path/to/project",
    args: "-D ARG=xyz",
  }
}
```
