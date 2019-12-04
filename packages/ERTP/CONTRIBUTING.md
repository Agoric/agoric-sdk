# Contributing

Thank you!

## Contact

We use github issues for all bug reports:
https://github.com/Agoric/agoric-sdk/issues Please add an [ERTP]
prefix to the title and ERTP tag to ERTP-related issues.

## Installing, Testing

You'll need Node.js version 11 or higher. 

* git clone https://github.com/Agoric/agoric-sdk/
* cd packages/ERTP
* yarn install
* yarn test

## Pull Requests

Before submitting a pull request, please:

* run `yarn test` and make sure all the unit tests pass
* run `yarn run lint-fix` to reformat the code according to our
  `eslint` profile, and fix any complaints that it can't automatically
  correct
* Add a file to the `changelogs` directory named $ISSUENUMBER.txt , and
  describe any downstream-visible changes in it (one per line). See
  [README-changelogs.md](/packages/ERTP/changelogs/README-changelogs.md) for more information.

## Making a Release

* edit NEWS.md enumerating any user-visible changes (this will be done
  automatically in the future?)
* `yarn version` (interactive) or `yarn version --major` or `yarn version --minor`
  * that changes `package.json`
  * and does a `git commit` and `git tag` by default
  * to do `git commit` and `git tag` manually, use `yarn config set version-git-tag false`
  * to get signed tags, start with `yarn config set version-sign-git-tag true`
* `npm publish --access public`
* `git push`
* `git push --tags`
