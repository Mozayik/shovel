# Shovel

## Upgrading v2 to v3

The primary breaking changes are:

- `assertions` was renamed to `statements`
- `settings` was renamed to `metadata`
- The `when` clause in `settings` was removed and will be replaced by an action that can stop the script early.

## Writing Scripts

Shovel scripts are comprised of four sections; `metadata`, `includes`, `vars`, `assertions`.  Each section is described in the following pages:

- [`metadata`](./Metadata.md)
- [`includes`](./Includes.md)
- [`vars`](./Variables.md)
- [`statements`](./Statements.md)

## Writing Assertions and Actions

Assertions and Actions are Javascript classes.

The `constructor` will be called with a `container` object, which at a minimum contains:

- `interpolator` used to interpolate string arguments containing Javascript
- `runContext` the current run context

Each script assertions runs with a new instance of the specified asserter. `assert` will always be called. `rectify` will only be called if the assertion condition has not been met.

```js
{
  // Expand a string by treating it as a Javascript template and running it in a VM
  interpolator: (string) => {...},
  // The assertion node in the JSON5
  assertNode: {...},
}
```

The `constructor` should:

1. Save desired `container` object references to `this`.
2. Grab any global modules that are needed by the asserter if they are not passed in in the `container`.  In this way mock modules can be injected for testing. See existing assertions for examples of making assertions testable.
3. Do any required setup for the asserter (not common)

The goals for the `assert` method are:

1. Ensure the asserter can run on the current platform given by `this.util.osInfo()`. Throw `ScriptError` on the `assertNode` if not.
2. Validate the passed in `assertNode` in the `assertNode.value.with` node.  Throw a `ScriptError` if the arguments are invalid passing the error message and the node causing the error.
3. Call `this.interpolator()` on any `with` arguments that can be expanded.
4. Cache any values that may be needed by `rectify` in `this`, including the passed in `assertNode`.
5. Check to see if the asserted condition is already met. If it *cannot be met* for whatever reason, throw a `ScriptError` on the `assertNode`.  If the condition has already been met, return `true`.
6. Return `false` if the assertion condition can be met but has not been yet.

The method `rectify()` is called to modify the host state:

1. Make it so the condition that `assert` checks for will succeed next time.
2. Throw a `ScriptError` on `this.assertNode` if the condition cannot be satisfied.
3. Make use of any values cached in `this` from the `assert` method.

Finally, the `result()` method will *always* be called to output the result of the asserter, with a `rectified` flag:

1. Return an object with information that helps the user understand what the assert checked or modified.
2. Do not `throw` from this method

The assertion class naming should generally follow these conventions:

- The name should be a noun and a verb
- Use a noun that describes the thing being asserted on as closely as possible, e.g. File, ZipFile, Package, etc..
- Where the asserter does a from/to operation, the noun should be be the from item, e.g. from a URL to a file.
- The verb should describe the desired state of the thing being asserted in the present tense, e.g. Running, Deleted, Exists, Made, etc..
- Use a verb that is commonly associated with the noun, e.g. running for services, unzipped for zip files, etc..
- The naming should hint at what the asserter does internally as an aid to helping people find the right asserter for a given situation.

Assertion argument naming should generally follow these conventions:

- The argument should include a noun for the thing it pertains too, e.g. `user`, `directory`, `file`, `group`, etc..
- If there are multiple arguments with the same noun, add a pronoun to differentiate, e.g. `fromFile` and `toFile`

## JSON5 Nodes

Shovel uses an enhanced fork of the [JSON5](https://www.npmjs.com/package/@johnls/json5) library that returns `Node` objects instead of simple Javascript values for each value, array or object in the JSON5. A node object has `type` and `value` fields, plus `line` and `column` fields showing where in the JSON5 file the node comes from.  This allows error messages that contain location information to help the Shovel user to find and fix errors in their script.
