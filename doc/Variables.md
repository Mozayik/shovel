# Variables

When a script starts running the first thing that happens after running each of the `includes` files is to evaluate the `vars` section.  Various objects are already filled in when the script starts to run and are described below.  Variables can either be strings or if the string is surrounded with `{` and `}` then they can be interpolated values.

## Interpolation

If strings are surrounded with `{...}` then they are evaluated as Javascript and the result becomes the value of the string.  The Javascript is run is a VM sandbox so it only has access to the  limited number of globals, as described in the following sections.  All Javascript expression operators are available, such as `+`, `-`, `?:`, etc..

Use single quotes (`'`) in interpolated strings to easily avoid issues with JSON5 strings, or escape double quotes.  For example:

```JSON5
{
  assert: "FileContains",
  with: {
    file: "{path.join(user.homeDir, '.gitconfig')}",
    content: "[alias]\n  ada = add -A :/\n\n"
  }
}
```

## vars

Theses are all the variables evaluated in the `vars` section of the script.  `vars` is shared by all `includes` scripts, so as each script runs it can add too or modify existing `vars`.  Variables are evaluated in the order in which they are set in the script.

### vars.local

Underneath `vars` is as special section of variables called _local variables_.  These are variables that are always evaluated locally on the originating host.  In other words, these variables will be evaluated using the local system even if the script is actually being run on one or more hosts.

For `local` interpolated variables, the `env`, `os`, `sys` and `fs` objects all relate to the local machine.  What this means is that information about the local execution environment can be gathered before the script runs on the various hosts.  One example of how this can be used is to read files from the local system and store them in variables.  The data will be encoded and transferred to the host systems without the need for a separate assertion to copy the file from the local system.  This works well for text data, but not recommended for binary data.

## dateTime

Returns date/time information strings:

| Property              | Description                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `asLocal([dateTime])` | Returns a date/time string formatted for the current locale. If `dateTime` not provided uses the current date and time. |
| `asISO([dateTime])`   | Returns a date/time string formatted in ISO 8601 format.  If `dateTime` not provided uses the current date and time.    |

## env

This are the environment variables that `shovel` was invoked with copied from `process.env`.

## sys

This contains information about the `shovel` system, most usefully the currently executing script directory and file:

| Property     | Description                          |
| ------------ | ------------------------------------ |
| `scriptDir`  | Currently executing script directory |
| `scriptFile` | Currently executing script file name |

## os

This is information about the O/S that `shovel` is running on. Values are always lowercase and separated with underscores.

| Property    | Description                              |
| ----------- | ---------------------------------------- |
| `platform`  | One of `linux`, `darwin` or `windows_nt` |
| `id`        | `fedora`, `debian`, `ubuntu`, etc.       |
| `versionId` | `18.04`, `9`, etc..                      |

## user

Information about the user that invoked `shovel`.

| Property  | Description                  |
| --------- | ---------------------------- |
| `name`    | User name                    |
| `uid`     | User ID                      |
| `gid`     | Group ID                     |
| `shell`   | User shell                   |
| `homeDir` | Path of users home directory |

## fs

File system functions.  All functions are synchronous; there is no concept of asynchronous functions in Shovel.

| Function         | Description                         |
| ---------------- | ----------------------------------- |
| `readFile(path)` | Evaluates to the contents of a file |

## path

File system path functions.

| Function                | Description                                                                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `join(...)`             | Joins all the path sections together correctly                                                                                                                                                        |
| `dirname(path)`         | Extracts the directory part of a path                                                                                                                                                                 |
| `basename(path[, ext])` | The last part of the path, typically the file name. See [path.basename](https://nodejs.org/dist/latest-v12.x/docs/api/path.html#path_path_basename_path_ext) for an explanation of the `ext` argument |
| `extname(path)`         | The extension of the last part of the path                                                                                                                                                            |

## results

An array of all the result objects from all the assertions that run.  Can be used to conditionally run assertions based on the result of a previous assertion.

| Function | Description                                   |
| -------- | --------------------------------------------- |
| `last()` | Returns the last element of the results array |

## util

An array of all the result objects from all the assertions that run.  Can be used to conditionally run assertions based on the result of a previous assertion.

| Function                        | Description                                                                                                                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `template(string, open, close)` | Takes a string, interpolates the Javascript contained in sections surrounded with the open/close strings, and inserts them into the original string.  Defaults to using "moustache" bracketing (`{{...}}`) but can be overidden. |
