# Maintainer Hints

## Background

`agoric-sdk` is a monorepo containing multiple components which are currently not released at the same time. Roughly there are 2 main categories of code:
- Code running on chain inside a worker managed by swingset, with orthogonal persistence. This code has to be upgraded through a "vat upgrade" mechanism driven by explicit inputs to swingset: a bundle + publish + core-eval (which can be combined as a core-proposal).
- Everything else, including chain software a.k.a. the swingset host (golang/cosmos, cosmic-swingset and related kernel packages) as well as tools and repo testing infrastructure (agoric-cli, deploy-script-support, .github, etc.). This code is simply executed whenever a new version of `agoric-sdk` is checked out, without any further steps beyond the action that caused the new version of `agoric-sdk` to be used.

We would like to have similar behavior regardless of whether a chain launched from a release upgrades a predecessor or starts clean. Since we are currently not in a position where we can upgrade all vats, our release must not include behavioral changes to code running in any vat that it is not explicitly upgrading. The easiest way to accomplish that is by avoiding any changes to code included in vats, however this is not always feasible.

We previously maintained `release-*` branches which represented a fork of the `master` dev branch at a given point:
- `release-pismo` is the original/archived release branch used before the "bulldozer" upgrade which threw away all JavaScript state.
- `release-mainnet1B` was our previous release branch up until `agoric-upgrade-15`. Despite its name, it lived beyond the "mainnet-1" phase of the agoric-3 chain.

We don't expect these previous release branches to ever be updated again.

Starting with `agoric-upgrade-16`, we try to release directly from `master` by creating a `dev-release-*` release branch. These branches allow us to work on the release concurrently with other engineering efforts, and are not currently merged back once the release is complete.

Releases are tagged commits from the above release branches, with a corresponding entry in https://github.com/Agoric/agoric-sdk/releases .

To ease the maintenance process, we want to avoid any commit original to the release branch that has no direct equivalent on the `master` branch, except when needed to generate or test a specific release. To satisfy that, we usually directly cherry-pick commits and PRs from the `master` branch. We do not expect to merge the release branches back into `master`.


## Preparing for a Release

### Assign Release Parameters

The Release Owner and other appropriate stakeholders must agree on:

- _**base branch**_: This should be `master`, but might need to vary for a patch release.

- _**release label**_: This is used for the git tags, and is currently expected to follow a
  sequential pattern (example: `agoric-upgrade-8`).
  The mainnet release label is preceded by release candidates numbered from zero
  (example: `agoric-upgrade-8-rc0`), and shares its commit with the final release candidate.

- _**release short label**_: This is used for release artifacts, and is currently expected to be a
  simplified substring of _**release label**_ including the number (examples: `upgrade-8`,
  `upgrade-8-rc0`).

- _**upgrade name**_: This is used to coordinate with the cosmos-sdk UpgradeKeeper.
  The primary name is currently expected to match the _**release label**_, but test networks may require extra names if multiple rounds of upgrade validation are necessary to test a release.
  (examples: `agoric-upgrade-8-2`).

### Create the "dev release" branch

- [ ] When a new release is planned, create a new branch from the [_**base branch**_](#assign-release-parameters) (`master`) with a name like `dev-$releaseShortLabel` (example: `dev-upgrade-8`). This can be done from the command line or the [GitHub Branches UI](https://github.com/Agoric/agoric-sdk/branches).
- [ ] Initialize the new branch for the planned upgrade:
  - [ ] In **golang/cosmos/app/upgrade.go**
    - [ ] Update the `upgradeNamesOfThisVersion` constant to list all the [_**upgrade name**_](#assign-release-parameters) used by this release.
    - [ ] Update the `isPrimaryUpgradeName` function to reflect the updated [_**upgrade name**_](#assign-release-parameters) list.
    - [ ] Rename the upgrade handler function to match the release, example: `upgrade8Handler`.
    - [ ] Verify that the upgrade handler function has no logic specific to the previous upgrade (e.g., core proposals).
  - [ ] In **golang/cosmos/app/app.go**, make sure that the call to `SetUpgradeHandler` uses the renamed upgrade handler function above.
  - [ ] Verify that **a3p-integration/package.json** has an object-valued `agoricSyntheticChain` property with `fromTag` set to the [agoric-3-proposals Docker images](https://github.com/Agoric/agoric-3-proposals/pkgs/container/agoric-3-proposals) tag associated with the previous release
    (example: `use-upgrade-7`) or latest core-eval passed on chain (example: `use-vaults-auction`).
  - [ ] Ensure that the first subdirectory in **a3p-integration/proposals** has the following characteristics. This is commonly created by renaming the `n:upgrade-next` directory after verifying no other proposals exist before that, and updating the **package.json** file in it.
    - named like "$prefix:[_**release short label**_](#assign-release-parameters)" per [agoric-3-proposals: Naming](https://github.com/Agoric/agoric-3-proposals#naming) (conventionally using "a" for the unreleased $prefix, e.g. `a:upgrade-8`).
    - containing a **package.json** having an object-valued `agoricProposal` property with `sdkImageTag` set to "unreleased" and `planName` set to the [_**upgrade name**_](#assign-release-parameters)
    - containing other files appropriate for the upgrade per [agoric-3-proposals: Files](https://github.com/Agoric/agoric-3-proposals#files)

    For example, see the [upgrade-17 PR](https://github.com/Agoric/agoric-sdk/pull/10088).

### Populate the "dev release" branch

For each set of changes to include after the base branch point:
- [ ] Create a work branch from the "dev release" branch.
- [ ] Cherry-pick approved changes from `master` onto this work branch, or revert any changes that were included before the base branch point but that are not meant to be released.
  - Avoid any changes that has side-effects on code you do not wish to be upgraded. For example, a change impacting deployed vat code that is not meant to be part of the upgrade (comment/types only changes are usually considered acceptable, even though they will result in new bundles that should be behaviorally equivalent). Chain software code is usually safe to upgrade as long as integration with code running inside vats doesn't change. For example, the host side of any bridge and the set of swingset syscalls must remain backwards compatible.
  - For integrating a single PR (best suited to vat code changes which often require manual adaptation):
    - [ ] Cherry-pick the commits of the `master` PR onto the work branch with minimal/mechanical conflict resolutions.
      It's acceptable to author the changes on the "dev release" based work branch and then rebase them to a master PR, as long as the PRs lands at "about the same time" (`master` PR **MUST** be merged before a release is cut).
    - [ ] As needed, author any extra commits required for compatibility on the "dev release" work branch.
    - [ ] Create a PR with the "dev release" branch as target.
    - [ ] Reviewer must check that changes are narrowly focused, and do not affect unrelated components.
      - For vat code PRs, changes to other packages tests, tools, or scripts may be acceptable.
      - Compare the resulting code of the changed component with its code on master, and highlight any unexpected differences.
  - For integrating a set of PRs (best suited to PRs that do not affect vat code and can be cherry-picked somewhat cleanly):
    - [ ] Optional: Ensure [git rerere](https://git-scm.com/book/en/v2/Git-Tools-Rerere) ("reuse recorded resolution") is locally enabled:
      ```sh
      git config rerere.enabled true
      ```
    - [ ] Author a `rebase-todo` by selecting relevant changes from the `master` branch rebase log (see below).
      - For a convenient starting point, use `scripts/gen-rebase-todo.sh $since` to get a todo list reflecting all merge-inclusive changes from $since to the current HEAD (but note that on a fresh clone, branch names will be generated from commit titles rather than corresponding with those of the primary fork).
      - Comment out any commit that should be excluded from a multi-commit PR.
      - If a small change from an unrelated PR is needed (rider commits), either:
        - Outside of a label/merge section, `pick` the commit, and indicate with a comment on the previous line the origin PR of the picked commit.
        - Take the larger section of the rebase log related to the PR containing the commit, remove unneeded commits, and use `merge -c` (lower case instead of upper case `c`) to reword the merge commit's message indicating it's a merge of a partial pull request.
    - [ ] Initiate an interactive rebase, and use the authored `rebase-todo`
      ```sh
      git rebase -i HEAD
      ```
      And replace the `noop` content with the authored `rebase-todo`.
    - If encountering a commit with conflicts that have a straightforward resolution (such as 3-way combine with strategy "theirs" or "ours"), prefix with an explanatory `##` comment in the `rebase-todo`.
    - If encountering a commit with conflicts that do not have a straightforward resolution, check if picking any prior commit would help resolve the conflicts.
      - Abort the rebase, update the authored `rebase-todo`, and restart the interactive rebase.
      - Avoid authoring manual changes unless absolutely necessary. If authoring changes, keep them as separate commits and indicate them as such on the authored rebase todo (insert either a `pick` instruction with the id of the commit you just authored or an `exec` instruction that makes the modifications and ends with `git commit -m $message`, in either case prefixing with an explanatory `##` comment).
        - For `exec`, make portable in-place edits with either `ed` or `alias sed-i="sed -i $(sed --help 2>&1 | sed 2q | grep -qe '-i ' && echo "''")"`, e.g. `printf 'H\n/\( *\)foo/ s##\\1// prettier-ignore\\\n&#\nw\n' | ed -s packages/path/to/file'` or `sed-i -E "$(printf 's#( *)foo#\\1// prettier-ignore\\\n&#')" packages/path/to/file`.
      - If a commit is empty, skip it and comment it out in the rebase todo.
    - [ ] Verify that tests pass. In particular:
      - Linting locally can catch incompatibilities in the cherry-pick, often requiring some changes to be reverted or more commits from `master` to be included. In those cases, update the authored `rebase-todo`, and redo the interactive rebase as necessary.
      - Linting errors should not happen, unless a conflict resolution introduced formatting issues. In those cases, redo the interactive rebase and make sure to format the file before marking the conflict as resolved. Do not put formatting changes in unrelated commits.
    - [ ] Create a PR with the "dev release" branch as target.
      - [ ] In the description of the PR, include the authored `rebase-todo` used to construct the branch.
    - Reviewer must check that changes accomplish the goal, and do not affect unrelated components:
      - [ ] Verify that the `rebase-todo` is constructed from the `master` history in merge order, and note any deviations.
      - [ ] Verify that all PRs necessary to accomplish the goal were selected.
      - [ ] Verify that the description explains the presence of any extra commits not obviously necessary to accomplish the goal.
      - [ ] If the goal is to catch up a specific component, compare the resulting code with the master code, and highlight any behavioral differences, or non-behavioral differences that may make future rebase work more complicated.
      - [ ] Verify that unrelated components are not affected by picked changes. In particular, a chain software upgrade or tooling changes should not affect vat code. Changes to other components tests, tools, or scripts may be acceptable.
  - In both cases:
    - [ ] Apply the `force:integration` GitHub label to the PR.
    - [ ] Merge the PR using the GitHub UI, using the "merge" strategy once all tests have passed.
      - Use of auto-merge or the merge queue is not currently supported for a "dev release" branch.
        - Integration tests are required on a "dev release" branch, and are triggered by adding the `force:integration` GitHub label to the PR.
      - If the PR branch is no longer up to date with the "dev release" branch, do not use GitHub UI to update the branch. Instead rebase it locally with the `--rebase-merges` option (or re-apply the authored `rebase-todo`), and force push.
      - The "squash" merge strategy is acceptable if the PR is straight pick of a single commit / squashed `master` PR, and no extra commits were required.
      - As usual, never use the "rebase" GitHub merge strategy.

## Creating a Release

These are the steps for a Release Manager to create and publish a
new release of the Agoric SDK. This combines the process of
GitHub-based release management and publication together with NPM-based
publication of the SDK and its individual packages.

### Prerequisites

#### Prepare the Build Environment

Follow the instructions at the [getting started
guide](https://docs.agoric.com/guides/getting-started/) to install
the correct versions of `node`, `yarn`, and `git`. Also install the
latest version of the [Go development tools](https://go.dev/doc/install).

#### Authenticate your NPM Account

Sign up for an [NPM account](https://www.npmjs.com/signup) with
some form of 2FA. Then request that an administrator add your NPM
user ID to the `@agoric` organization and the `agoric` package.

### Describe the Release

The Release Owner and other appropriate stakeholders must agree on:

- _**development history oriented description**_: a short description
of the major changes in the release from the perspective of source code changes
and tracked issues addressed.

- _**validator oriented release description**_: a short description of the
release from the perspective of a validator to understand why the
release should be installed and important operational changes.

### Generate the Release

Until we reach the next section ["Publish the release"](#publish-the-release),
the release process can be aborted.

**Note: If there is an error or problem following the steps below, after debugging, please restart from this step to ensure there's no accidental contamination.**

- [ ] Add the [_**development history oriented description**_](#describe-the-release)
  to the top-level CHANGELOG.md on the [_**base branch**_](#assign-release-parameters).

- [ ] Review the [next release](https://github.com/Agoric/agoric-sdk/labels/next%20release)
  GitHub label for additional tasks particular to this release.

- [ ] Create a fresh, clean clone of the repository.

  This avoids accidental contamination from untracked or ignored
  changes in one's usual development repository.
  ```sh
  # Fresh checkout under ~/release or any other preferred directory without agoric-sdk
  mkdir ~/release
  cd ~/release
  git clone https://github.com/Agoric/agoric-sdk.git
  cd agoric-sdk
  ```

- [ ] `git switch` to the ["dev release" branch](#create-the-dev-release-branch).

- [ ] <a id="release-branch"></a>Create a timestamped release branch for hosting the commit to be tagged as the release.

  Unlike release tag names, the release branch name does not need to be human-meaningful.
  ```sh
  # Create a release branch.
  now=`date -u +%Y%m%dT%H%M%S`
  git checkout -b prepare-release-$now
  ```

- [ ] Do a `yarn install` to generate tooling needed for the release.
  ```sh
  # yarn install to build release tools
  yarn install --force
  ```

- [ ] <a id="generate-sdk-version"></a>Generate new SDK version and per-package CHANGELOG.md files.

  To generate a `$VERSION-$PRE.$N` dev release that will not be accidentally selected by downstream package.json files, replace `--conventional-graduate` below with `--conventional-prerelease --preid "$PRE"` (example: `--conventional-prerelease --preid u14`).

  These instructions will:
  - modify the `package.json` (to bump the version) of every package
    which saw changes since the previous release, or whose dependencies
    change because of other packages being bumped (in practice this
    means pretty much every package in the monorepo);
  - update all dependencies in the monorepo to match the bumped versions;
  - create `CHANGELOG.md` files for each package with a summary of
    the git commit history;
  - make a Git commit with those changes and push its branch;
  - create a `$package@$version` git tag for every package that changed,
    including a special `@agoric/sdk@$n` "SDK version" tag that (among other
    things) CI will use for tagging a Docker image;
  - create a special `v$version` git tag derived from the `@agoric/cosmos@$version`
    tag for
    [Go's opinionated reference scheme](https://go.dev/ref/mod#version-queries)
    as used in e.g. `go get github.com/Agoric/agoric-sdk@$version`.

  ```sh
  # Create the final release CHANGELOGs.
  yarn lerna version --no-push --conventional-graduate
  prior=$(git tag -l | sed -ne 's!^@agoric/sdk@\([0-9]*\).*!\1!p' | sort -n | tail -1)
  SDKVER=$(( prior + 1 ))
  git tag @agoric/sdk@$SDKVER
  goTag="v$(git tag -l --contains HEAD | sed -n 's!^@agoric/cosmos@!!p' | head -1)"
  git tag -f "$goTag"
  # Push the branch.
  git push -u origin HEAD
  # Tell which packages have actual news.
  scripts/have-news HEAD^ > have-news.md
  ```

- [ ] Create the release PR:
  - Source branch: the [timestamped release branch](#user-content-release-branch)
  - Target branch: the [_**base branch**_](#assign-release-parameters)
  - Title: "chore(release): publish [_**release short label**_](#assign-release-parameters)"
  - Description: the contents of `have-news.md` from the previous step
  - Labels
    - `force:integration`

  Follow the example of previous releases for any other details of the PR.

  Creating this PR will initiate the CI tests.

- [ ] Build the NPM-installed SDK packages.

  While the previous step's CI tests run, build the SDK:
  ```sh
  # Build all package generated files.
  yarn install --force
  yarn build
  ```

- [ ] Wait for the release PR's CI tests to pass.

### Publish the Release

These steps cannot be undone, so be sure that you are ready to proceed.
In particular, be sure that you have waited for the release PR's CI tests
to pass and for reviewer approval.

- [ ] Publish to NPM
  ```sh
  # Publish to NPM. NOTE: You may have to repeat this several times if there are failures.
  # without concurrency until https://github.com/Agoric/agoric-sdk/issues/8091
  yarn lerna publish --concurrency 1 from-package
  ```

- [ ] Merge the release PR into the base branch.

  **DO NOT REBASE OR SQUASH OR YOU WILL LOSE REFERENCES TO YOUR TAGS.**

  You may use the GitHub "Merge" button directly instead of automerge.

- [ ] **DO NOT** change your local git environment to the base branch - keep
  it on the release branch for the following steps.

- [ ] <a id="publish-tags"></a>Publish the released package tags
  ```sh
  # Publish the released package tags.
  ./scripts/get-released-tags git push origin
  ```

  This will push all the tags created in the above
  ["Generate new SDK version" step](#user-content-generate-sdk-version).

- [ ] (Optional) Publish an NPM distribution tag

  If you want to update an
  [NPM dist-tag](https://docs.npmjs.com/cli/v6/commands/npm-dist-tag) for the
  current checked-out Agoric SDK's packages (enabling e.g.
  `agoric install agoric-upgrade-42` to use the version for that dist-tag),
  choose a \<TAG> and run:
  ```sh
  ./scripts/npm-dist-tag.sh --dry-run lerna add <TAG>
  ```
  If you're happy with the corresponding commands, execute them:
  ```sh
  ./scripts/npm-dist-tag.sh lerna add <TAG>
  ```

  As a special case, by supplying a pre-release suffix argument, you can do
  something like publish a `community-dev` dist-tag for an existing version:

  ```sh
  rev=$(git rev-parse --short=7 community-dev)
  ./scripts/npm-dist-tag.sh lerna add community-dev -dev-${rev}.0
  ```

- [ ] Push release labels as tags

  Perform the following for each [_**release label**_](#assign-release-parameters):
  ```sh
  git tag <release-label>
  git push origin <release-label>
  ```

- [ ] Confirm that a Docker image for SDK version [$SDKVER](#user-content-generate-sdk-version)
  has been published to the
  [agoric-sdk Container registry](https://github.com/Agoric/agoric-sdk/pkgs/container/agoric-sdk).

  Note that this is triggered by pushing the `@agoric/sdk@$n` tag in the
  ["Publish the released package tags" step](#user-content-publish-tags) and may take a while.
  You can observe workflow initiation and progress at
  [Build release Docker Images](https://github.com/Agoric/agoric-sdk/actions/workflows/docker.yml).

- [ ] Create a GitHub release

  Generate a template:
  ```sh
  ./scripts/gen-github-release.sh {prerelease | latest} <release-label> > release.md
  ```
  Then replace the remaining `$`-prefixed placeholders, filling in
  the [_**validator oriented release description**_](#describe-the-release) and using
  [previous releases](https://github.com/Agoric/agoric-sdk/releases)
  as a guide.
  When complete, contents can be pasted into the
  [new release form](https://github.com/Agoric/agoric-sdk/releases/new)
  along with the just-pushed tag and an identically-named title.

  For more information, refer to
  [GitHub instructions](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository).

### Cleanup

- [ ] Remove the repository clone you created for this release, so you don't accidentally reuse it.

- [ ] Open an [agoric-3-proposals](https://github.com/Agoric/agoric-3-proposals) PR to represent
  the mainnet proposal corresponding with the upgrade.
  Include in the proposal files tests copied from this release's **a3p-integration/proposals**,
  with the proposal directory's **package.json** `agoricProposal` updated to include `releaseNotes`
  and `upgradeInfo` matching the mainnet proposal.

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
git checkout -b "$USER-sync-endo-$NOW"
git rebase origin/integration-endo-master
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

```sh
cd packages/xsnap
git add api.js
git commit -am 'chore: Bump xsnap meter type'
cd ../..
```

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
yarn test test/xsnap-store.test.js --update-snapshots
git add test/snapshots/xsnap-store.*
git commit -m 'chore(swingset-vat): Update xsnap store test snapshots'
cd ../..
```

Push this branch and create a pull request.

```sh
git push origin "$USER-sync-endo-$NOW"
```

At this time, syncing Endo versions will break the optional `documentation`
`test-dapp` test, and that cannot be fixed until after the Endo sync merges.
When the above steps lead to changes merged into this repository,
in `agoric-sdk/documentation`:

```sh
# in agoric/documentation
git checkout --branch "$USER-sync-endo-$NOW"
$ENDO/scripts/sync-verions.sh ~/endo
git commit -am 'chore: Sync Endo versions'
yarn
git commit -am 'chore: Update yarn.lock'
git push origin "$USER-sync-endo-$NOW"
```

Create a pull request from that branch.

To verify that the changes to `documentation` are sufficient to settle CI for
this repository, return to `agoric-sdk`, create a branch off of the current
head, create an empty commit, push that change to Github, and create a draft
pull request with `#documentation-branch: $USER-sync-docs-$NOW` in the
description.

```sh
# in agoric/agoric-sdk
git checkout origin/master
git commit --allow-empty -m 'Poke CI for documentation integration testing'
git checkout -b "$USER-sync-docs-$NOW"
# Capture description in clipboard (Mac) for reference on Github.
echo "#documentation-branch: $USER-sync-docs-$NOW" | pbcopy # Linux: xclip -i
```
