# NPM packages

This path has all the packages in the repo. Not all are published (some are `private: true`).

## Adding a new package

To create a new package:

* mkdir `packages/foo`
* add your sources/tests/etc to `packages/foo/src/` etc
* populate a new `packages/foo/package.json`, using other packages as a template
* update `agoric-cli/src/sdk-package-names.js`
* run `yarn install`, and commit the resulting changes to `yarn.lock`
* check the output of `yarn workspaces info` to make sure there are no
  `mismatchedWorkspaceDependencies`, adjust the new package's dependencies
  until they are correctly satisfied by the other local packages
* edit `.github/workflows/test-all-packages.yml` to add a clause that tests
  the new package
* commit everything to a new branch, push, check the GitHub `Actions` tab to
  make sure CI tested everything properly
* merge with a PR
