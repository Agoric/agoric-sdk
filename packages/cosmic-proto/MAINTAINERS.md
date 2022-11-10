This package is updated rarely and so the build is checked into SCM. That is, part of `dist` is copied to root so they can be imported in consumers that don't yet support ESM. We also have symlink `./swingset` to the `dist/agoric/swingset` for local requires. (Note [NPM won't publish symlinks](https://github.com/npm/npm/issues/3310)).

 We used to check in `gen` but they're redundant with `dist` output and include `.ts` which creates problems for downstream consumers using TypeScript ([ref](https://github.com/microsoft/TypeScript/issues/47387#issuecomment-1168711813)).

To rebuild the generated artifacts, install `protoc` [1] and run `yarn rebuild` in
this package. Then force the `dist` changes over the gitignore,
```
git add -f dist/{agoric,cosmos}
```

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

[1] http://google.github.io/proto-lens/installing-protoc.html

