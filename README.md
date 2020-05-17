# Shovel: An SSH and Node.js based IT automation tool

Shovel is a tool for performing IT automation tasks.  It's written in Javascript using [NodeJS](https://nodejs.org).  Script files are created in [JSON5](https://json5.org/) format and consist of a sequence of statements about the target system.  Statements fall into two categories:

- **Assertions** check that a certain system state is valid. If it is, nothing happens, otherwise the system state is rectified.
- **Actions** perform some action where checking existing system state is not possible or does not make sense.

## Installation

Install the package globally:

```sh
npm install -g @kingstonsoftware/shovel
shovel --help
```

Or use `npx` to run the latest version:

```sh
npx @kingstonsoftware/shovel --help
```

## Example

Here is an example Shovel script that creates some directories and files on a remote system:

```json5
{
  // Global metadata for the script go here
  metadata: {
    description: "A basic script",
  },
  // Global variables go here
  vars: {
    testDir1: "shvl-dir-1",
    testFile1: "shvl-file-1",
  },
  // Every script must have a list of assertions
  assertions: [
    {
      description: "Ensure a test directory",
      // Each assertion specifies an asserter
      assert: "DirectoryExists",
      // And arguments
      with: {
        // Arguments can include Javascript
        directory: "{var.testDir1}",
      },
    },
    {
      assert: "FileExists",
      with: {
        file: "{path.join(var.testDir1, var.testFile1)}",
      },
    },
  ],
}
```

## Overview

Shovel has the following key features:

- Bootstraps itself on a remote system, installing Node.js and itself as needed
- Cross platform (macOS/Linux) by leveraging NodeJS's inherent cross platform capabilities
- Comes with a wide range of built-in assertions and actions
- Able to set script variables and safely use Javascript for calculated values
- Uses an easy-to-read JSON5 script format, allowing multi-line strings and comments

### Design

Not surprisingly, Shovel borrows from the design of [Ansible](https://www.ansible.com/). It uses SSH to avoid having remote agents. Ansible's *plays* are similar to Shovel's *assertions* and *actions*.

The *design goals* of Shovel are:

- Be written in and use Javascript and Node.js for platform independence
- Bootstrap the remote system with Node.js and Shovel if not present
- Leverage SSH as the remote transport and for agentless scripting
- Use JSON5 instead of YAML as the script format
- Use plain old Javascript as the string template language
- Be fast and very low footprint
- Use idempotency to avoid unnecessary changes to systems
- Have an easy to parse output format
- Be easily extensible

### Scripts

Shovel scripts can have a `.json5` extension, but a `.shovel` extension is recommended. Shovel scripts are made up of metadata, includes, variables and statements.

Statements are a sequence of assertions or actions executed sequentially. The order of the statements is important. Later statements can expect that assertions and actions higher up in the script to have run and set the system state appropriately.

Assertions assert that particular state of the host machine is true.  If that assertion is not true, then the asserter tries to rectify the situation and make the assertion be true for next time.  There are assertions for files, directories, users, groups, file downsloads, file contents, and so on.

Actions perform an action that cannot be easily checked, e.g. running an autotools build which checks it's own dependencies, or where state does not make sense, e.g. a system reboot.

See the full list of built-in [assertions](doc/Statements.md#Asserters) and [actions](doc/Statements.md#Actions) in the documentation directory.

### SSH

Shovel uses SSH to run scripts on one or more remote hosts. When run without a host, Shovel just runs the script directly on your local system without SSH.

### Documentation

The [Shovel documentation](doc/README.md) contains more information on writing scripts and using the tool.
