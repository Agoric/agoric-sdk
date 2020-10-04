# Maintainer Hints

```sh
# Create a release branch.
now=`date -u +%Y%m%dT%H%M%S`
git checkout -b release-$now
```

To generate a new final release, and CHANGELOG.md files
(use `--conventional-prerelease` instead of `--conventional-graduate` if you just want to generate a dev release):

```sh
# Create the final release CHANGELOGs and tags, and push.
yarn lerna version --no-push --conventional-graduate
# Push the branch.
git push -u origin release-$now
# Tell which packages have actual news.
scripts/have-news HEAD^ > have-news.md
```

Then, create a release PR, pasting `have-news.md` into the body.

Then, once tests pass, you can run the following:

```sh
# Build all package generated files.
yarn install
yarn build
# Publish to NPM. NOTE: You may have to repeat this several times if there are failures.
yarn lerna publish from-package
```

Merge the release PR into master.  DO NOT REBASE OR SQUASH OR YOU WILL LOSE
REFERENCES TO YOUR TAGS.

```sh
# Publish the released package tags.
./scripts/get-released-tags | xargs git push origin
```

## More subtlety

To get help for the command-line options that will affect these commands, use:

```sh
yarn lerna version --help
yarn lerna publish --help
```

Useful testing commands are:

```sh
yarn lerna version --conventional-prerelease --no-git-tag-version
```
