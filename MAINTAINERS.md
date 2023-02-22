# Maintainer Hints

## Creating a New Release

These are the steps for a Release Manager to create and publish a
new release of the Agoric SDK. This combines the process of
GitHub-based release managment and publication together with NPM-based
publication of the SDK and its individual packages.

### Prerequisites

#### NPM Account

Sign up for an [NPM account](https://www.npmjs.com/signup) with
some form of 2FA. Then request that an administrator add your NPM
user ID to the `@agoric` organization and the `agoric` package.

### Preparation

Together with the Release Owner and other appropriate stakeholders,
ensure there is consensus on the following parameters for the
release:

- Base branch: which branch will the release be based on? The base
branch will need to be stable and may be frozen at various times,
so it is a good practice to have the base branch be a branch off
of `master`. The base branch might also be used for followon patch
releases before the next major release.

- Release labels: we currently label our releases with both a
human-meaningful label such as `pismoA` and a sequential upgrade
label like `agoric-upgrade-8`.  In the future, semantic versioning
might replace either or both label styles.

- Development history oriented release descrition: a short description
of the major changes in the release from the point of view of
understanding the source code and tracked issues addressed by the
release.

- Validator oriented release description: a short description of the
release from the perspective of a validator to understand why the
release should be installed and important operational changes.

### Staging the Release

Until we reach the next section "Publish the release", the release
process can be aborted.

- [ ] Check the development history oriented release description
into the top-level CHANGELOG.md on the base branch.

- [ ] Review the [next release](
https://github.com/Agoric/agoric-sdk/labels/next%20release
) label for additional tasks particular to this release.

- [ ] Create a fresh, clean clone of the repository.

This avoids accidental contamination from untracked or ignored
changes in one's usual development repository.

```sh
# Fresh checkout under ~/release or any other preferred directory without agoric-sdk
cd ~/release
git clone https://github.com/Agoric/agoric-sdk.git
cd agoric-sdk
```

- [ ] Check out the appropriate base branch as outlined in "Preparation" above.

- [ ] Create a release branch tagged with a timestamp. The specific commit tagged as the release will live
in this branch. The release tags will be human-meaningful, the release branch need not be.

```sh
# Create a release branch.
now=`date -u +%Y%m%dT%H%M%S`
git checkout -b release-$now
```

- [ ] Do a `yarn install` to generate tooling needed for the release.

```sh
# yarn install to build release tools
yarn install --force
```

- [ ] Generate new SDK version and per-package CHANGELOG.md files

Use `--conventional-prerelease` instead of `--conventional-graduate` if you just want to generate a dev release.

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

- [ ] Create the release PR.

The above should have pushed state to GitHub to let you create a
new PR to merge the release branch back to the main branch. The PR
name should follow the convention of previous releases, which is
currently `chore(release): publish _release_label_`.  Paste
`have-news.md` as the description of the PR.  Follow the example
of previous releases for any other details of the PR.

Creating this PR will also kick off the CI tests.

- [ ] Build the NPM-installed SDK packages.

While the above CI tests run, build the SDK:

```sh
# Build all package generated files.
yarn install --force
yarn build
```

- [ ] Wait for the release PR's CI tests to pass.

### Publish the Release

These steps cannot be undone, so be sure that you are ready to proceed.
In particular, be sure that you have waited for the release PR's CI tests
to pass.

- [ ] Publish to NPM

```sh
# Publish to NPM. NOTE: You may have to repeat this several times if there are failures.
yarn lerna publish from-package
```

- [ ] Merge the release PR into the base branch.  DO NOT REBASE OR SQUASH OR YOU WILL LOSE
REFERENCES TO YOUR TAGS. You may use the "Merge" button directly instead of automerge.

- [ ] DO NOT change your local git environment to the base branch - keep
it on the release branch for the following steps.

- [ ] Publish the released package tags

```sh
# Publish the released package tags.
./scripts/get-released-tags git push origin
```

- [ ] (Optional) Publish an NPM dist-tag

If you want to update an NPM dist-tag for the current checked-out Agoric SDK's
packages (to enable `agoric install <TAG>`), use:

```sh
# Use "beta" for <TAG> for example.
./scripts/npm-dist-tag.sh lerna add <TAG>
```

- [ ] Push release labels as tags

Perform the following for each `tag` that we will use to label this release.

```sh
git tag $tag
git push origin $tag
```

- [ ] Confirm that a Docker image for SDKVER has been published.

- [ ] Create a GitHub release

Follow the [GitHub
instructions](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository
) and use previous releases as a template. This uses the
validator-oriented release description.

### Cleanup

- [ ] Review recent changes in the base branch for anything that
should be merged into its ancestors, all the way up to master. This
should include the changes to CHANGELOG.md.

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

From `origin/master`, begin a branch for syncing Endo.

```sh
NOW=`date -u +%Y-%m-%d-%H-%M-%S`
git checkout -b "$USER-sync-endo-$NOW" origin/master
```

Use a helper script from the Endo repository to update the dependency versions
in all packages in Agoric SDK.

```sh
"$ENDO/scripts/sync-versions.sh" "$ENDO"
git add -u
git commit -m 'chore: Sync Endo versions'
```

In `patches`, there may be patch files for the previous versions of `@endo/*`
or `ses` packages.
Each of these patches will need to either be deleted or renamed to reflect the
new version number or deleted, depending on whether the patch was incorporated
in the latest release.
Create a commit for each of these changes like `chore: Updated patch version
for ses-ava 0.2.33` or `chore: Remove patch version for ses 0.15.22`

This command will tell you the version number for every package published from
Endo:

```sh
"$ENDO/scripts/get-versions.sh" "$ENDO"
```

Update `yarn.lock`.

```sh
yarn
git add yarn.lock
git commit -m 'chore: Update yarn.lock'
```

It is safe to assume that any change to Endo will invalidate assumptions about
guest application meters. 

Increment the meter type in `packages/xsnap/api.js`:
```js
export const METER_TYPE = 'xs-meter-0';
```

Be sure to also update `test/test-xs-perf.js` with the new meter version.

Changing anything in Endo usually frustrates the SwingSet kernel hashes, and if
Endo changes nothing, bumping the meter version certainly will, and so
predictably frustrates the kernel hash golden test.
Update the test snapshots.

```sh
# at the repo root
yarn build
```

```sh
cd packages/SwingSet
yarn test test/test-xsnap-store.js --update-snapshots
git add test/snapshots/test-xsnap-store.*
git commit -m 'chore(swingset-vat): Update xsnap store test snapshots'
cd ../..
```

```sh
cd packages/xsnap
git add api.js
git commit -am 'chore: Bump xsnap meter type'
cd ../..
```

Push this branch and create a pull request.

```sh
git push origin "$USER-sync-endo-$NOW"
```
