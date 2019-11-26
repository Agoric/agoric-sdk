# Agoric Platform SDK

This repository contains most of the packages that make up the Agoric
platform. If you want to build on top of this platform, you don't need this
repository: instead you should `npm install -g agoric` and run `agoric init`,
following the instructions (TODO: write those instructions).

But if you are improving the platform itself, this is the repository to use.

## Pre-requisites

* Git
* Node.js (version 11 or higher)
* Golang (1.12 or higher)
* Yarn (`npm install -g yarn`)

## Build

From a new checkout of this repository, run:

* `yarn install`
* `yarn build`

When the `yarn install` is done, the top-level `node_modules/` will contain
all the shared dependencies, and each subproject's `node_modules/` should
contain only the dependencies that are unique to that subproject (e.g. when
the version installed at the top level does not meet the subproject's
constraints). Our goal is to remove all the unique-to-a-subproject deps.

When one subproject depends upon another, `node_modules/` will contain a
symlink to the subproject (e.g. `ERTP` depends upon `marshal`, so
`node_modules/@agoric/marshal` is a symlink to `packages/marshal`).

Run `yarn workspaces info` to get a report on which subprojects (aka
"workspaces") depend upon which others. The `mismatchedWorkspaceDependencies`
section tells us when symlinks could not be used (generally because e.g.
`ERTP` wants `marshal@0.1.0`, but `packages/marshal/package.json` says it's
actually `0.2.0`). We want to get rid of all mismatched dependencies.

The `yarn build` step generates kernel bundles, and compiles the Go code in
cosmic-swingset.

## Test

To run all unit tests (in all packages):

* `yarn test` (from the top-level)

To run the unit tests of just a single package (e.g. `eventual-send`):

* `cd eventual-send`
* `yarn test`

## Run the larger demo

* `cd cosmic-swingset`
* `make scenario2-setup`
* `make scenario2-run-chain` (in one shell)
* `make scenario2-run-client` (in a second shell)

## Edit Loop

* modify something in e.g. `SwingSet/`
* run `yarn build` (at the top level or in `SwingSet/`
* re-run tests or setup/run-chain/run-client
* repeat

Doing a `yarn build` in `SwingSet` creates the "kernel bundle", a single file
that rolls up all the kernel sources. This bundle file is needed by callers
(like `cosmic-swingset`) before they can invoke `buildVatController`. If you
don't run `yarn build`, then changes to the SwingSet kernel code will be
ignored.

