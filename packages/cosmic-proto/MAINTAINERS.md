# Maintaining cosmic-proto

The built package is a product of `yarn build` from `src`.

The `src` directory is a mix of manual code at the top level and generated code within `src/codegen`.

The generated code is determined by the contents of `protos` and the config of `scripts/codegen.cjs`.

## Maintaining protos

The `protos` are held in this source tree.

To update existing definitions, simply run `yarn codegen`.

To add new protobuf definitions:

1. Copy them to the `protos` directory.
2. `yarn codegen` to verify they build
3. Optionally add entries to the `exports` property in `package.json` to reveal the
   JavaScript and TypeScript modules to the public API.
4. Check in the changes above.
