![banner-1500x500](https://user-images.githubusercontent.com/273868/115044279-34983d80-9e8a-11eb-81dc-474764b0ed5b.png)

# Agoric Platform SDK

This repository contains most of the packages that make up the upper
layers of the Agoric platform, with
[the endo repository](https://github.com/endojs/endo)
providing the lower layers.
If you want to build on top of this platform, you don't need these
repositories: instead you should
[follow our instructions for getting started](https://agoric.com/documentation/getting-started/)
with the Agoric SDK.

But if you are improving the platform itself, these are the repositories
to use.

## Prerequisites

* Git
* Node.js LTS (version 14.15.0 or higher)
  * we generally support the latest LTS release: use [nvm](https://github.com/nvm-sh/nvm) to keep your local system up-to-date
* Yarn (`npm install -g yarn`)

Any version of Yarn will do: the `.yarnrc` file should ensure that all
commands use the specific checked-in version of Yarn (stored in
`.yarn/releases/`), which we can update later with PRs in conjunction with
any necessary compatibility fixes to our `package.json` files.

### Building on Apple Silicon and Newer Architectures

Some dependencies may not be prebuilt for Apple Silicon and other newer 
architectures, so it may be necessary to build these dependencies from source 
and install that package’s native dependencies with your package manager (e.g. Homebrew).

Currently these dependencies are:

* [Canvas](https://github.com/Automattic/node-canvas#compiling)

Additionally, if your package manager utilizes a non-standard include path, you may 
also need to export the following environment variable before running the commands 
in the Build section.

```sh
export CPLUS_INCLUDE_PATH=/opt/homebrew/include
```

Finally, you will need the native build toolchain installed to build these items from source.

```sh
xcode-select --install
```

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
`node_modules/@endo/marshal` is a symlink to `packages/marshal`).

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

Visit [https://agoric.com/documentation/](https://agoric.com/documentation/getting-started/before-using-agoric.html) for getting started instructions.

TL;DR:

* `yarn link-cli ~/bin/agoric`
* `cd ~`
* `agoric init foo`
* `cd foo`
* `agoric install`
* `agoric start`

Then browse to http://localhost:8000

## Edit Loop

* modify something in e.g. `zoe/`
* run `yarn build` (at the top level or in `zoe/`)
* re-run tests or `agoric start --reset`
* repeat

Doing a `yarn build` in `zoe` creates the "contract facet bundle", a single file
that rolls up all the Zoe contract vat sources. This bundle file is needed by all zoe contracts before they can invoke `zoe~.install(...)`. If you don't run `yarn build`, then changes to the Zoe contract facet will be ignored.

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
* Releases should be made as according to [MAINTAINERS.md](MAINTAINERS.md).

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
