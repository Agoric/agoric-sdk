# Maintainer Hints

Review the [next release](
https://github.com/Agoric/agoric-sdk/labels/next%20release
) label for additional tasks particular to this release.

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
prior=$(git tag -l | sed -ne 's!^@agoric/sdk@\([0-9]*\).*!\1!p' | sort -n | tail -1)
SDKVER=$(( prior + 1 ))
git tag @agoric/sdk@$SDKVER
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
yarn lerna publish from-package
```

Merge the release PR into master.  DO NOT REBASE OR SQUASH OR YOU WILL LOSE
REFERENCES TO YOUR TAGS.

```sh
# Publish the released package tags.
./scripts/get-released-tags git push origin
```

If you want to update an NPM dist-tag for the current checked-out Agoric SDK's
packages (to enable `agoric install <TAG>`), use:

```sh
# Use "beta" for <TAG> for example.
./scripts/npm-dist-tag.sh lerna add <TAG>
```

To make validators' lives easier, create a Git tag for the chain-id:

```sh
CHAIN_ID=agoricstage-27 # Change this as necessary
git tag -s -m "release $CHAIN_ID" $CHAIN_ID @agoric/sdk@$SDKVER^{}
git push origin $CHAIN_ID
./scripts/docker-tag.sh $SDKVER $CHAIN_ID
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

## Syncing Endo dependency versions

Assuming that the most recent release of the Endo repository has been checked
out in your home directory:

```sh
ENDO=~/endo
```

Use a helper script from the Endo repository to update the dependency versions
in all packages in Agoric SDK.

```sh
"$ENDO/scripts/sync-versions.sh" "$ENDO"
git add -u
git commit -m 'chore: Sync Endo versions'
```

Changing anything in Endo usually frustrates the SwingSet kernel hashes,
so predictably frustrates the kernel hash golden test.
Update the test snapshots.

```sh
cd packages/SwingSet
yarn test test/test-xsnap-store.js --update-snapshots
git add test/snapshots/test-xsnap-store.*
git commit -m 'chore(swingset-vat): Update xsnap store test snapshots'
cd ../..
```

It is safe to assume that any change to Endo will invalidate assumptions about
guest application meters.
Increment the meter type in `packages/xsnap/api.js`.

```js
export const METER_TYPE = 'xs-meter-0';
```

```sh
cd packages/xsnap
git add api.js
git commit -am 'chore: Bump xsnap meter type'
cd ../..
```



