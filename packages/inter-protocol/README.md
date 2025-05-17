# Inter protocol

## Overview

IST is a stable token that enables the core of the Agoric economy.

By convention there is one well-known **VaultFactory**. By governance it creates a **VaultManager** for each type of asset that can serve as collateral to mint IST.

Anyone can make a **Vault** by putting up collateral with the appropriate VaultManager. Then
they can request IST that is backed by that collateral.

In any vault, when the ratio of the debt to the collateral exceeds a governed threshold, it is
deemed undercollateralized. If the result of a price check shows that a vault is
undercollateralized, the VaultManager liquidates it.
## Persistence

The above states are robust to system restarts and upgrades. This is accomplished using the Agoric (Endo?) Collections API.

## Debts

Debts are denominated in µIST. (1 million µIST = 1 IST)

Each interest charging period (say daily) the actual debts in all vaults are affected. Materializing that across all vaults would be O(n) writes. Instead, to make charging interest O(1) we virtualize the debt that a vault owes to be a function of stable vault attributes and values that change in the vault manager when it charges interest. Specifically,
- a compoundedInterest value on the manager that keeps track of interest accrual since its launch
- a debtSnapshot on the vault by which one can calculate the actual debt

To maintain that the keys of vaults to liquidate are stable requires that its keys are also time-independent so they're recorded as a "normalized collateralization ratio", with the actual collateral divided by the normalized debt.

## Reading data off-chain

VaultFactory publishes data using StoredPublishKit which tees writes to off-chain storage. These can then be followed off-chain like so,
```js
import { makeFollower } from '@agoric/casting';

  const key = `published.vaultFactory.metrics`; // or whatever the stream of interest is
  const leader = makeDefaultLeader();
  const follower = makeFollower(storeKey, leader);
  for await (const { value } of iterateLatest(follower)) {
    console.log(`here's a value`, value);
  }
```

The canonical keys (under `published`) are as follows. Non-terminal nodes could have data but don't yet. A `0` indicates the index of that child in added order. To get the actual key look it up in parent. High cardinality types get a parent key for enumeration (e.g. `vaults`.)
- `published`
    - `vaultFactory` - [snapshot of details](./test/vaultFactory/snapshots/vaultFactory.test.js.md)
        - `governance`
        - `metrics`
        - `managers`
          - `manager0`
              - `metrics`
              - `governance`
              - `vaults`
                - `vault0`
    - `auction` - [snapshot of details](./test/auction/snapshots/auctionContract.test.js.md)
        - `schedule`
        - `governance`
        - `book0`
    - `reserve` - [snapshot of details](./test/reserve/snapshots/reserve.test.js.md)
      - `governance`
      - `metrics`
    - `priceFeed` - [snapshot of details](./test/price/snapshots/fluxAggregatorKit.test.js.md)
      - `${inputBrand}-${outputBrand}_price_feed`
      - `${inputBrand}-${outputBrand}_price_feed.latestRound`
    - `psm` - [snapshot of details](./test/psm/snapshots/psm.test.js.md)
      - `<minted>`
        - `<anchor>`
          - `governance`
          - `metrics`
    - `committees` - [snapshot of details](../governance/test/unitTests/snapshots/committee.test.js.md)
        - `Economic_Committee`
          - `latestQuestion`
          - `latestOutcome`

### Demo

Start the chain in one terminal:
```sh
cd packages/cosmic-swingset
make scenario2-setup scenario2-run-chain-economy
```
Once you see a string like `block 17 commit` then the chain is available. In another terminal,
```sh
# shows keys of the vaultFactory
agd query vstorage keys 'published.vaultFactory'
# lists vaults
agd query vstorage keys 'published.vaultFactory.managers.manager0.vaults'
# follow metrics
agoric follow :published.vaultFactory.managers.manager0.metrics
```

Start a new terminal to get a prompt.
```sh
cd packages/cosmic-swingset/
make scenario2-run-client
```

In yet another,
```
cd packages/cosmic-swingset/t1
agoric open --repl
```

Connect the wallet and use its REPL as follows. Comments are for explanations and can't be parsed by REPL. The history numbers may be different for your shell. `history[-1]` means whatever number the last history output was.
```
# get an instance of the VaultFactory
vaultFactoryInstance = E(home.agoricNames).lookup('instance', 'VaultFactory')
# get its public facet
vaultFactoryPublicFacet = E(home.zoe).getPublicFacet(vaultFactoryInstance)
# get a reference to the minted brand (soon to be IST)
E(home.agoricNames).lookup('brand', 'IST');
stableBrand=history[-1]
# get a reference to the collateral brand
E(home.agoricNames).lookup('brand', 'ATOM')
atomBrand=history[-1]
# get a reference to the collateral manager, using history because the brand must be the same object
collateralManager = E(vaultFactoryPublicFacet).getCollateralManager(atomBrand)
# proposal
proposal = ({
  give: { Collateral: { brand: atomBrand, value: 1000n } },
  want: { IST: { brand: stableBrand, value: 1n } },
})
# get the ATOM purse
E(home.wallet).getPurses()
# get the "ATOM" purse
atomPurse = history[-1][0][1]
# prepare funds
E(atomPurse).withdraw(proposal.give.Collateral)
collateral = history[-1]
# make a vault invitation to the collateral manager
invitation = E(collateralManager).makeVaultInvitation()
# make the offer with invitation, proposal, payments
seat = E(home.zoe).offer(invitation, proposal, { Collateral: collateral})
# get the offer result
E(seat).getOfferResult()
```
