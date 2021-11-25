# Maintainer Hints

```sh
# Create a release branch.
now=`date -u +%Y%m%dT%H%M%S`
git checkout -b release-$now
```

To generate a new final release, and CHANGELOG.md files
(use `--conventional-prerelease` instead of `--conventional-graduate` if you just want to generate a dev release):

```sh
# Create the final release CHANGELOGs.
yarn lerna version --no-push --conventional-graduate
# Push the branch.
git push -u origin release-$now
# Tell which packages have actual news.
scripts/have-news HEAD^ > have-news.md
```

Create a release PR, pasting `have-news.md` into the body.  Then build the SDK:

```sh
# Build all package generated files.
yarn install
yarn build
```

Once tests pass, you can publish to NPM with the following:

```sh
# Publish to NPM. NOTE: You may have to repeat this several times if there are failures.
# Specify the --dist-tag if you're publishing a new beta release.
yarn lerna publish from-package # --dist-tag=beta
```

Merge the release PR into master.  DO NOT REBASE OR SQUASH OR YOU WILL LOSE
REFERENCES TO YOUR TAGS.

```sh
# Publish the released package tags.
./scripts/get-released-tags git push origin
```

To make validators' lives easier, create a tag for the chain-id:

```sh
CHAIN_ID=agoricstage-8 # Change this as necessary
SDK_VERSION=$(jq -r .version package.json)
git tag -s -m "release $CHAIN_ID" $CHAIN_ID @agoric/sdk@$SDK_VERSION^{}
git push origin $CHAIN_ID
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
