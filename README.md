# Agoric Platform SDK

This repository contains most of the packages that make up the Agoric
platform. If you want to build on top of this platform, you don't need this
repository: instead you should [follow our instructions for getting started](https://agoric.com/documentation/getting-started/) with the Agoric SDK.

But if you are improving the platform itself, this is the repository to use.

## Prerequisites

* Git
* Node.js (version 11 or higher)
* Yarn (`npm install -g yarn`)

You don't need Golang if you just want to test contracts and run the
"scenario3" simulator.  Golang (1.13 or higher) is needed only if you
want to build/debug Cosmos SDK support.  (The `1.12` release will work, but
it will modify `packages/cosmic-swingset/go.mod` upon each build (by adding
a dependency upon `appengine`). The `1.13` release will leave the `go.mod`
file correctly unmodified.

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

The `yarn build` step generates kernel bundles.

## Test

To run all unit tests (in all packages):

* `yarn test` (from the top-level)

To run the unit tests of just a single package (e.g. `eventual-send`):

* `cd packages/eventual-send`
* `yarn test`

## Run the larger demo

* `cd packages/cosmic-swingset`
* `make scenario2-setup`
* `make scenario2-run-chain` (in one shell)
* `make scenario2-run-client` (in a second shell)

## Edit Loop

* modify something in e.g. `SwingSet/`
* run `yarn build` (at the top level or in `SwingSet/`)
* re-run tests or setup/run-chain/run-client
* repeat

Doing a `yarn build` in `SwingSet` creates the "kernel bundle", a single file
that rolls up all the kernel sources. This bundle file is needed by callers
(like `cosmic-swingset`) before they can invoke `buildVatController`. If you
don't run `yarn build`, then changes to the SwingSet kernel code will be
ignored.

## Development Standards

* All work should happen on branches. Single-commit branches can land on
  trunk without a separate merge, but multi-commit branches should have a
  separate merge commit. The merge commit subject should mention which
  packages were modified (e.g. `(SwingSet,cosmic-swingset) merge
  123-fix-persistence`)
* Keep the history tidy. Avoid overlapping branches. Rebase when necessary.
* All work should have an Issue. All branches names should include the issue
  number as a prefix (e.g. `123-description`). Use "Labels" on the Issues to
  mark which packages are affected.
* Add user-visible changes to a new file in the `changelogs/` directory,
  named after the Issue number. See the README in those directories for
  instructions.
* Unless the issue spans multiple packages, each branch should only modify
  a single package.
* Releases should be made from the package subdirectories, with a tag like
  `SwingSet-v0.3.0` or `eventual-send-v0.4.5`. Retain mutual compatibility
  between all packages in the monorepo (run `yarn workspaces info` and make
  sure there are no `mismatchedWorkspaceDependencies`). Do not use
  post-release `-dev.0` suffixes. Merge all the `changelogs/*` fragment files
  together and add to the `NEWS.md` file, then delete the fragments.

## Adding a new package

To create a new (empty) package (e.g. spinning Zoe out from ERTP):

* mkdir `packages/zoe`
* add your sources/tests/etc to `packages/zoe/src/` etc
* populate a new `packages/zoe/package.json`, using other packages as a template
* edit the top-level `package.json` to add `packages/zoe` to `"workspaces"`
* run `yarn install`, and commit the resulting changes to `yarn.lock`
* check the output of `yarn workspaces info` to make sure there are no
  `mismatchedWorkspaceDependencies`, adjust the new package's dependencies
  until they are correctly satisfied by the other local packages
* edit `.github/workflows/test-all-packages.yml` to add a clause that tests
  the new package
* commit everything to a new branch, push, check the GitHub `Actions` tab to
  make sure CI tested everything properly
* merge with a PR
