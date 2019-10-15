# AutoSwap

An AutoSwap is like a swap, except instead of having to find a
matching offer, an offer is always matched against the existing
liquidity pool. The AutoSwap contract checks whether your offer will
keep the [constant product
invariant](https://github.com/runtimeverification/verified-smart-contracts/blob/uniswap/uniswap/x-y-k.pdf)
before accepting. 

Based on UniSwap.

## Initialization

First, we initialize the `autoSwapMaker` so that we have access to the
liquidity assay for this particular autoswap. We then pass the
liquidity assay in as part of the assays array. 

```js
const { liquidityAssay, makeAutoSwap } = makeAutoSwapMaker();
const allAssays = [moolaAssay, simoleanAssay, liquidityAssay];

const { zoeInstance, governingContract: autoswap } = zoe.makeInstance(
  makeAutoSwap,
  allAssays,
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
    rule: 'offerExactly',
    assetDesc: allAssays[0].makeAssetDesc(10),
  },
  {
    rule: 'offerExactly',
    assetDesc: allAssays[1].makeAssetDesc(5),
  },
  {
    rule: 'wantAtLeast',
    assetDesc: allAssays[2].makeAssetDesc(10),
  },
]);
const alicePayments = [aliceMoolaPayment, aliceSimoleanPayment, undefined];

const {
  escrowReceipt: allegedAliceEscrowReceipt,
  payoff,
} = await zoeInstance.escrow(aliceOffer, alicePayments);

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
 const bobMoolaForSimOfferDesc = harden([
  {
    rule: 'offerExactly',
    assetDesc: allAssays[0].makeAssetDesc(2),
  },
  {
    rule: 'wantAtLeast',
    assetDesc: allAssays[1].makeAssetDesc(1),
  },
  {
    rule: 'wantAtLeast',
    assetDesc: allAssays[2].makeAssetDesc(0),
  },
]);
const bobMoolaForSimPayments = [bobMoolaPayment, undefined, undefined];

const {
  escrowReceipt: allegedBobEscrowReceipt,
  payoff: bobPayoffP,
} = await zoeInstance.escrow(
  bobMoolaForSimOfferDesc,
  bobMoolaForSimPayments,
);
```

Then Bob uses this escrow receipt to make an offer.

```js
const offerOk = await autoswap.makeOffer(bobEscrowReceipt);
```

Now Bob can get his payoff:

```js
const [bobMoolaPayoff, bobSimoleanPayoff, ...] = await bobPayoffP;
```
