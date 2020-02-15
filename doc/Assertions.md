# Assertions

The `assertions` section is an array of assertions to make about the target host.  It is run in order from top to bottom.

## Arguments

| Name          | Type                  | Description                                                                                |
| ------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| `description` | `string`              | An optional description explaining the purpose of the assertion                            |
| `assert`      | `string`              | The asserter to run.  See the section below                                                |
| `with`        | `object`              | Arguments to be passed to the asserter.                                                    |
| `become`      | `string`              | Name of a user to become before running the asserter.  Currently only `root` is supported. |
| `when`        | `boolean` or `string` | A boolean or an expression that is evaluated to see if the assertion should be run at all  |

## Built-in Asserters

Here is an alphabetical list of the current built-in asserters:

- [`AutoToolProjectConfigured`](./AutoToolProjectConfigured.md)
- [`AutoToolProjectMade`](./AutoToolProjectMade.md)
- [`CupsPrintQueueExists`](./CupsPrintQueueExists.md)
- [`DirectoryDeleted`](./DirectoryDeleted.md)
- [`DirectoryExists`](./DirectoryExists.md)
- [`DirectoryZipped`](./DirectoryZipped.md)
- [`FileDeleted`](./FileDeleted.md)
- [`FileContains`](./FileContains.md)
- [`FileCopied`](./FileCopied.md)
- [`FileCopiedToRemote`](./FileCopiedToRemote.md)
- [`FileExists`](./FileExists.md)
- [`FileDeleted`](./FileDeleted.md)
- [`FilesDeleted`](./FilesDeleted.md)
- [`FileHasCapability`](./FileHasCapability.md)
- [`GroupDeleted`](./GroupDeleted.md)
- [`GroupExists`](./GroupExists.md)
- [`IPTablesContain`](./IPTablesContain.md)
- [`NodePackageInstalled`](./NodePackageInstalled.md)
- [`SystemPackageInstalled`](./SystemPackageInstalled.md)
- [`SystemPackageRemoved`](./SystemPackageRemoved.md)
- [`ServiceDisabled`](./ServiceDisabled.md)
- [`ServiceEnabled`](./ServiceEnabled.md)
- [`ServiceRunning`](./ServiceRunning.md)
- [`ServiceStopped`](./ServiceStopped.md)
- [`TarFileExtracted`](./TarFileExtracted.md)
- [`UserDeleted`](./UserDeleted.md)
- [`UserDisabled`](./UserDisabled.md)
- [`UrlDownloaded`](./UrlDownloaded.md)
- [`UserExists`](./UserExists.md)
- [`ZipFileUnzipped`](./ZipFileUnzipped.md)
