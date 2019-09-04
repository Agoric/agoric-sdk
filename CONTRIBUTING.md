# Contributing

Thank you!

## Contact

We use github issues for all bug reports: https://github.com/Agoric/cosmic-swingset/issues

## Installing, Testing

You'll need Node.js version 11 or higher. There is a unit test to
double-check that you have a suitable version.

* git clone https://github.com/Agoric/cosmic-swingset/
* npm install
* npm run build
* npm test

See README.md for how to use.

## Pull Requests

Before submitting a pull request, please:

* run `npm test` and make sure all the unit tests pass

## Making a Release

* edit NEWS.md enumerating any user-visible changes
* `npm version patch` (or `major` or `minor`)
  * that changes `package.json` and `package-lock.json`
  * and does a `git commit` and `git tag` by default
  * to do `git commit` and `git tag` manually, use `--no-git-tag-version`
  * to get signed tags, start with `npm config set sign-git-tag true`
* `npm run build`
* `npm test`
* `make docker-build`
* Test the Docker build on your private network:
```sh
NETWORK_NAME=testtestnet ./docker/ag-setup-cosmos bootstrap --bump
SOLO_NAME=testtestnet ./docker/ag-setup-solo
```
* visit http://localhost:8000/ and interact with your network
* `npm publish`
* `make docker-push`
* `npm version prerelease --preid=dev`
* `git push origin master vX.Y.Z`

## Versioning

While between releases, we use a version of "X.Y.Z-dev", where "X.Y.(Z-1)"
was the previous release tag. This helps avoid confusion if/when people work
from a git checkout, so bug reports to not make it look like they were using
the previous tagged release.

To achieve this, after doing a release, we run `npm version prerelease
--preid=dev` to modify the `package.json` and `package-lock.json` with
the new in-between version string.
