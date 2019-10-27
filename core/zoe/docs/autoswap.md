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
rule with the associated payments of moola and simoleans and
escrows them:

```js
const aliceOfferRules = harden({
  payoutRules: [
    {
      kind: 'offerExactly',
      assetDesc: moolaAssay.makeAssetDesc(10),
    },
    {
      kind: 'offerExactly',
      assetDesc: simoleanAssay.makeAssetDesc(5),
    },
    {
      kind: 'wantAtLeast',
      assetDesc: liquidityAssay.makeAssetDesc(10),
    },
  ],
  exitRule: {
    kind: 'onDemand',
  },
]);
const alicePayments = [aliceMoolaPayment, aliceSimoleanPayment, undefined];

const {
  escrowReceipt,
  payout,
} = await zoe.escrow(aliceOfferRules, alicePayments);

```
She is able to ensure that she will get a minimum number of liquidity
tokens back by specifying a rule for the liquidity token slot with
`wantAtLeast`. In this case, Alice is stating that she wants at least
10 liquidity tokens back. 

## Making a swap offer

Let's say that Bob wants to se the moola<->simolean autoswap
to exchange 2 moola. First he will check the price:

```js
const simoleanAssetDesc = autoswap.getPrice([
  assetDesc2Moola,
  undefined,
  undefined,
]);
```
By using `getPrice`, he learns that the current price for 2 moola is 1
simolean. Because other people may make offers before Bob does, he
can't rely on this price. However, he can make his offer conditional
on getting at least 1 simolean back. If the price has moved, he will
get a refund:

```js
 const bobMoolaForSimOfferRules = harden({
   payoutRules: [
    {
      kind: 'offerExactly',
      assetDesc: moolaAssay.makeAssetDesc(2),
    },
    {
      kind: 'wantAtLeast',
      assetDesc: simoleanAssay.makeAssetDesc(1),
    },
    {
      kind: 'wantAtLeast',
      assetDesc: liquidityAssay.makeAssetDesc(0),
    },
  ],
  exitRule: {
    kind: 'onDemand',
  },
);
```
He escrows 2 moola with Zoe and
receives an escrow receipt.

```js
const bobMoolaForSimPayments = [bobMoolaPayment, undefined, undefined];

const {
  escrowReceipt,
  payout,
} = await zoe.escrow(
  bobMoolaForSimOfferRules,
  bobMoolaForSimPayments,
);
```

Then Bob uses this escrow receipt to make an offer.

```js
autoswap.makeOffer(escrowReceipt);
```

Now Bob can get his payout:

```js
const [bobMoolaPayment, bobSimoleanPayment ] = await bobPayoutP;
```

## Removing Liquidity

If Alice wants to remove liquidity and get moola and simoleans back,
she can do that by making new offerRules and escrowing a payment of
liquidity tokens:

```js
const aliceRemoveLiquidityOfferRules = harden({
  payoutRules: [
    {
      kind: 'wantAtLeast',
      assetDesc: allAssays[0].makeAssetDesc(0),
    },
    {
      kind: 'wantAtLeast',
      assetDesc: allAssays[1].makeAssetDesc(0),
    },
    {
      kind: 'offerExactly',
      assetDesc: allAssays[2].makeAssetDesc(10),
    },
  ],
  exitRule: {
    kind: 'onDemand',
  },
});

const {
  escrowReceipt,
  payout,
} = await zoe.escrow(
  aliceRemoveLiquidityOfferRules,
  harden([undefined, undefined, liquidityPayment]),
);

aliceAutoswap.removeLiquidity(
  aliceRemoveLiquidityEscrowReceipt,
);
```
