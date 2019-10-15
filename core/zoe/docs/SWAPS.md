# Swaps

If I want to trade one kind of asset for another kind, I could send
you the asset and ask you to send me the other kind back. But, you
could choose to behave opportunistically: receive my asset and give
nothing back. To solve this problem, swap contracts allow users to
securely trade one kind of eright for another kind, leveraging Zoe for
escrow and offer-safety. At no time does any user have the ability to
behave opportunistically.

## Simple Offer Swap

In the "Simple Offer" swap, the governing contract is the
`simpleOffer` interface with the `swapSrcs` installed. 

Let's say that Alice wants to create a swap that anyone can be the
counter-party for. She creates the zoeInstance:

```js
const { zoeInstance, governingContract: simpleSwap } = zoe.makeInstance(
  installationId,
  assays,
);
```

Then escrows her offer with the zoeInstance and gets an escrowReceipt
and a payoff promise that resolves to an array of payments:

```js
const aliceOfferDesc = harden([
  {
    rule: 'offerExactly',
    assetDesc: moolaAssay.makeAssetDesc(3),
  },
  {
    rule: 'wantExactly',
    assetDesc: simoleanAssay.makeAssetDesc(7),
  },
]);
const alicePayments = [aliceMoolaPayment, aliceSimoleanPayment];
const {
  escrowReceipt: allegedAliceEscrowReceipt,
  payoff: alicePayoffP,
} = await zoeInstance.escrow(aliceOfferDesc, alicePayments);
```

And then makes an offer using the escrowReceipt and tries to collect her winnings:

```js
const aliceOfferResultP = simpleSwap.makeOffer(aliceEscrowReceipt);
```

She then spreads the zoe instance widely, and Bob decides to be the
counter-party. He also escrows his payment and makes an offer in the
same way as alice, but his offer description is the opposite of Alice's:

```js
const bobOfferDesc = harden([
  {
    rule: 'wantExactly',
    assetDesc: moolaAssay.makeAssetDesc(3),
  },
  {
    rule: 'offerExactly',
    assetDesc: simoleanAssay.makeAssetDesc(7),
  },
]);
```

Now that Bob has made his offer, `alicePayoffP` resolves to an array
of ERTP payments `[moolaPayment, simoleanPayment]` where the
moolaPayment is empty, and the simoleanPayment has a balance of 7. 

The same is true for Bob, but for his specific winnings.
