const fs = require("fs-extra")

/*
Checks and ensures that a file exists.

Example:

{
  assert: "fileExists",
  with: {
    path: "/path/to/file"
  }
}
*/

class FileExistsAsserter {
  async assert(args) {
    try {
      return (await fs.lstat(args.path)).isFile()
    } catch (error) {
      return false
    }
  }

  async actualize(args) {
    try {
      await this.fs.writeFile(args.path, "a test")

      return true
    } catch (error) {
      return false
    }
  }
}

module.exports = FileExistsAsserter
