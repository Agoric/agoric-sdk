We check-in and publish the `gen` generated artifacts to npm.
To rebuild the generated artifacts, install `protoc` and run `yarn rebuild` in
this package.

Generating artifacts requires a `protoc` system dependency that we
do not require for general development, so we do not regenerate artifacts with
the `build` script.
Otherwise, `yarn build` at the top level would fail on all developer
workstations.
If we decide to require `protoc` generally, we will also need to add `protoc`
to our Github Continuous Integration workflows.

The home for our IDL sources in the workspace is `golang/cosmos/proto`, which
is a source of truth for both `cosmic-swingset` (the server) and clients,
including `agoric-cli`, which we encourage to use these published stubs.

To prepare this package, we created an IDL tree under the directory `proto`
that includes our transitive dependencies.

```console
mkdir -p proto
cd proto
ln -s ../../../golang/cosmos/proto/agoric .
ln -s ../../../golang/cosmos/third_party/proto/gogoproto .
ln -s ../node_modules/protobufjs/google .
```

New stubs may require additional Protobuf dependencies.
Please be sure to maintain the script above in the face of evolution.

To surface additional stubs:

1. Add the stub to the `protoc` arguments in the `build:js` script in
   `package.json`.
2. `yarn rebuild` to regenerate artifacts in `gen`.
3. Check the updated `gen` into Git.
4. Add a symbolic link from the API location to the generated artifact.
   For example, there is a relative symlink from `swingset/msgs.{js,ts}` to
   `gen/agoric/swingset/msgs.{js,ts}`.
5. Add entries to the `exports` property in `package.json` to reveal the
   JavaScript and TypeScript modules to the public API.
   The `exports` property all modules by default in engines that support it
   including Node.js and Endo.
   Although these engines allow for aliasing, others do not, so we use the same
   paths for the keys and values of `exports`, and use the aforementioned
   symbolic links for aliasing when necessary.
