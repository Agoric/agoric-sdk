# AutoSwap

An AutoSwap is like a swap, except instead of having to find a
matching offer, an offer is always matched against the existing
liquidity pool. The AutoSwap contract checks whether your offer will
keep the [constant product
invariant](https://github.com/runtimeverification/verified-smart-contracts/blob/uniswap/uniswap/x-y-k.pdf)
before accepting. 

Based on UniSwap.

## Initialization

```js
const tokenAssays = [moolaAssay, simoleanAssay];
const installationHandle = zoe.install(autoswapSrcs);
const { instance: autoswap } = zoe.makeInstance(
  installationHandle,
  { assays },
);
```

## Adding liquidity to the pool

The moola<->simolean autoswap that we just created has a number of
methods in the API available to the user:
1. addLiquidity
2. removeLiquidity
3. getPrice
4. makeOffer

We can call `addLiquidity` with an escrow receipt from Zoe that proves
that we've escrowed moola and simoleans appropriately. For instance,
let's say that Alice decides to add liquidity. She creates an offer
description with the associated payments of moola and simoleans and
escrows them:

```js
const aliceOffer = harden([
  {
    kind: 'offerExactly',
    assetDesc: allAssays[0].makeAssetDesc(10),
  },
  {
    kind: 'offerExactly',
    assetDesc: allAssays[1].makeAssetDesc(5),
  },
  {
    kind: 'wantAtLeast',
    assetDesc: allAssays[2].makeAssetDesc(10),
  },
]);
const alicePayments = [aliceMoolaPayment, aliceSimoleanPayment, undefined];

const {
  escrowReceipt: allegedAliceEscrowReceipt,
  payout,
} = await zoe.escrow(aliceOffer, alicePayments);

```
She is able to ensure that she will get a minimum number of liquidity
tokens back by specifying a rule for the liquidity token slot with
`wantAtLeast`. In this case, Alice is stating that she wants at least
10 liquidity tokens back. 

## Making a swap offer

Let's say that Bob wants to actually use the moola<->simolean autoswap
to exchange 2 moola for 1 simolean. He escrows 2 moola with Zoe and
receives an escrow receipt.

```js
 const bobMoolaForSimPayoutRules = harden([
  {
    kind: 'offerExactly',
    assetDesc: allAssays[0].makeAssetDesc(2),
  },
  {
    kind: 'wantAtLeast',
    assetDesc: allAssays[1].makeAssetDesc(1),
  },
  {
    kind: 'wantAtLeast',
    assetDesc: allAssays[2].makeAssetDesc(0),
  },
]);
const bobMoolaForSimPayments = [bobMoolaPayment, undefined, undefined];

const {
  escrowReceipt: allegedBobEscrowReceipt,
  payout: bobPayoutP,
} = await zoe.escrow(
  bobMoolaForSimPayoutRules,
  bobMoolaForSimPayments,
);
```

Then Bob uses this escrow receipt to make an offer.

```js
const offerOk = await autoswap.makeOffer(bobEscrowReceipt);
```

Now Bob can get his payout:

```js
const [bobMoolaPayout, bobSimoleanPayout, ...] = await bobPayoutP;
```
