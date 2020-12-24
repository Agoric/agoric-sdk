# Contributing

Thank you!

## Contact

We use github issues for all bug reports:
https://github.com/Agoric/agoric-sdk/issues 

## Installing, Testing

You'll need Node.js version 11 or higher. 

* `git clone https://github.com/Agoric/agoric-sdk/`
* `cd agoric-sdk`
* `yarn install`
* `yarn build` (This *must* be done at the top level to build all of
  the packages)
* `cd packages/deploy-script-support`
* `yarn test`

## Pull Requests

Before submitting a pull request, please:

* run `yarn test` within `packages/deploy-script-support` and make sure all the unit
  tests pass (running `yarn test` at the top level will test all the
  monorepo packages, which can be a good integration test.)
* run `yarn run lint-fix` to reformat the code according to our
  `eslint` profile, and fix any complaints that it can't automatically
  correct
