# FileCopiedToRemote

Asserts that a file is copied from the local to a remote host.  The remote must have the `sshd` installed and running.  Password prompts are not supported and will generate an error.  Ensure that the user you are connecting as can connect using key based authentication on the remote host.  It is recommended that you use the `~/.ssh/config` file to configure the remote connection settings, such as the location of the private key identity file. See [Ubuntu ssh_config](http://manpages.ubuntu.com/manpages/xenial/en/man5/ssh_config.5.html).

## Arguments

| Name       | Type     | Default        | Description                                                            |
| ---------- | -------- | -------------- | ---------------------------------------------------------------------- |
| `fromFile` | `string` |                | The file to copy from on the local host                                |
| `toFile`   | `string` |                | The file to copy to on the remote host                                 |
| `host`     | `string` |                | An fully qualified host name, or a host name listed in `~/.ssh/config` |
| `port`     | `string` | `22`           | Port number of the remote host.                                        |
| `user`     | `string` | `$USER`        | User to connect to on remote host                                      |
| `identity` | `string` | `~/.ssh/idrsa` | Private key file to use for connection.                                |

## Example

```json5
{
  assert: "FileCopied",
  with: {
    fromFile: "/path/somefile.txt",
    toFile: "/path/someother.txt",
    host: "some-host",
    port: 22,
    user: "some-user",
    identity: "~/.ssh/idrsa"
  }
}
```
