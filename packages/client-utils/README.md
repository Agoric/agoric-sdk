# Client Utils

Utilities for building clients of an Agoric chain

## Overview

The Agoric chain takes mutations through signed messages and reveals state updates through vstorage. This package abstracts the calls to RPC nodes into a [CQRS](https://en.wikipedia.org/wiki/Command%E2%80%93query_separation) interface. The commands are made mostly through an on-chain Smart Wallet and the queries through vstorage.

## Design

This package will be used in several kinds of clients:
- CLI (such as the `agoric` command)
- GUI (such as dapps)
- Tests (such as a3p-integration tests)

As such the modules cannot assume they're running in Node. There are some ambient authorities in common in the above environments (e.g. `setTimeout`) but a further constraint is that these modules will not export ambient authority. Instead they will provide interfaces that are ergonomic for creating empowered objects in the client context.

### Layering

1. HTTP (fetch)
2. RPC (fetch + cosmic-proto)
3. vstorage - layer at which protobuf is involved (vstorage.js)
4. marshalling (vstorage-kit.js)
5. agoricNames / board (smart-wallet-kit.js)

## Related packages

### cli
`agoric` package has a command line UI (CLI) for working with an Agoric chain. It's in this repository at `packages/agoric-cli`.

### rpc
`@agoric/rpc` is a small library that currently just has utilities for watching vstorage. This package avoids depending on `@agoric/rpc` for now because it:
 - is in a separate repository ([ui-kit](https://github.com/Agoric/ui-kit/blob/main/packages/rpc)) so not part of agoric-sdk CI
 - depends on `axios` and `vite` which are unnecessary constraints

Some of the functionality in this package could make sense in that package, but for now it will be ignored.

### cosmic-proto

`@agoric/cosmic-proto` is a package that contains the protobuf stubs for the Agoric cosmos-sdk module. At various points it has also held generated RPC clients. Because that package is imported into contracts we've kept those out. They may end up in `@agoric/rpc` eventually.

### * / clientSupport

The `clientSupport.js` module of several packages. Some packages export this module with certain helpers that this package may abstract.

