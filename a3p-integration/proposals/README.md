# Draft proposals

## How to publish a proposal once approved

`a3p-integration` holds draft proposals to test in agoric-sdk that they perform
as expected. Once a proposal has been approved by BLD stakers it executes on
chain and the proposal is no longer a draft. That requires moving it to the
agoric-3-proposals repo to become part of the `latest` image.

Steps:
1. Get the upgrade branch
2. Build the submissions
3. Migrate the proposal
4. Update the `latest` image

### Get the proposal's branch

We need the actual proposal that was sent to stakers. In the case of upgrades
(chain-halting) it will be a dedicated release branch. (E.g.
https://github.com/Agoric/agoric-sdk/tree/dev-upgrade-16/). If you're
publishing an "upgrade" proposal and it's called `n:upgrade-next`, keep looking;
that is only a draft.

### Build the submissions

The proposals use `sdk-generate` to ensure that CI is always testing the latest
version. But to publish we need a fixed version, to match the software upgrade
that the BLD stakers decided on.

To build that artifact,
```
cd a3p-integration
scripts/build-all-submissions.sh
```

It's best practice for each output directory to end in `-submission` to make the
migration simpler. For example,
```
    "sdk-generate": [
      "vats/probe-zcf-bundle.js probe-submission",
      "vats/test-localchain.js localchaintest-submission"
    ],
```

### Migrate the proposal

Figure out the serial number of the proposal that was voted on. Keep a link to
it to reference. 

In agoric-3-proposals, make a new `proposals/NN:PROPOSAL_NAME` directory where
NN is the proposal's serial number. If the proposal is a chain-halting upgrade
then it would be `NN:upgrade-KK` where KK is the agoric-sdk upgrade handler
serial number.

Copy the contents of the agoric-sdk proposal to this new directory.

Verify that `planName` references the go upgrade handler.

Remove `sdk-generate` from package.json (because the files are already generated
and will be checked in with the PR).

Change `releaseNotes` to reference that actual release notes. [For example](https://github.com/Agoric/agoric-3-proposals/blob/c70cf299b0efc3758991639a03b92cc33867a5bf/proposals/65%3Aupgrade-13/package.json#L3),
```
    "releaseNotes": "https://github.com/Agoric/agoric-sdk/releases/tag/agoric-upgrade-13",
```

Change `sdkImageTag` to the number mentioned in the release notes (search for
`ghcr.io/agoric/agoric-sdk:`) [For example](https://github.com/Agoric/agoric-3-proposals/blob/c70cf299b0efc3758991639a03b92cc33867a5bf/proposals/65%3Aupgrade-13/package.json#L3C1-L4C1),
```
    "sdkImageTag": "39",
```

# Update the `latest` image

Once you have the new proposal in agoric-3-propals, send a PR to merge it into
the repo. The PR's CI will test it and once the PR is merged it will update the
`latest` image.

## How to revise this directory after 

Once a new proposal is merged into agoric-3-proposals, take the proposal name
(the part after the colon) and use it in the fromTag value in a3p-integration's
package.json. For example, `a:my-proposal` becomes `"fromTag": "use-my-proposal"`.

The `agoricSyntheticChain.fromTag` should generally work with a value of 'latest',
but that causes problems whenever agoric-3-proposals publishes a new image with changes
that a3p-integration doesn't yet expect.

So we specify a particular *use* image. E.g. `use-upgrade-16`.
See https://ghcr.io/agoric/agoric-3-proposals for the available tags.

If you're changing the fromTag to a a new SDK version (e.g. a new chain-halting
upgrade) then you also need to revise the `upgrade-next` proposal to be able to
apply on top of that upgrade. In master it should already have these values,
which should be maintained:
```
    "releaseNotes": false,
    "sdkImageTag": "unreleased",
    "planName": "UNRELEASED_A3P_INTEGRATION",
```

But you will have to remove from [upgrade.go](/golang/cosmos/app/upgrade.go) whatever proposals were already executed.
