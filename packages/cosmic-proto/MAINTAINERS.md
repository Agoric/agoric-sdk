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
