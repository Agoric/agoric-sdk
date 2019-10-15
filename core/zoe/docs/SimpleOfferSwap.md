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
counter-party for. She creates a swap instance:

```js
const { instance: aliceSwap, instanceId } = await zoe.makeInstance(
  'simpleOfferSwap',
  assays,
);
```

Then escrows her offer with Zoe and gets an escrowReceipt
and a promise that resolves to her payoff:

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
const alicePayments = [aliceMoolaPayment, undefined];
const {
  escrowReceipt: allegedAliceEscrowReceipt,
  payoff: alicePayoffP,
} = await zoe.escrow(aliceOfferDesc, alicePayments);
```

And then makes an offer using the escrowReceipt and tries to collect her winnings:

```js
const aliceOfferResultP = aliceSwap.makeOffer(aliceEscrowReceipt);

```

She then spreads the `instanceId` widely. Bob hears about Alice's
contract and he decides to look up the `instanceId` to see if it
matches Alice's claims.

```js
const { instance: bobSwap, libraryName } = zoe.getInstance(instanceId);
t.equals(libraryName, 'simpleOfferSwap');
const bobAssays = zoe.getAssaysForInstance(instanceId);
t.deepEquals(bobAssays, assays);
```

Bob decides to be the counter-party. He also escrows his payment and
makes an offer in the same way as Alice, but his offer description is
the opposite of Alice's:

```js
const bobOfferDesc = harden([
  {
    rule: 'wantExactly',
    assetDesc: bobAssays[0].makeAssetDesc(3),
  },
  {
    rule: 'offerExactly',
    assetDesc: bobAssays[1].makeAssetDesc(7),
  },
]);
const bobPayments = [undefined, bobSimoleanPayment];

const {
  escrowReceipt: bobEscrowReceipt,
  payoff: bobPayoffP,
} = await zoe.escrow(bobOfferDesc, bobPayments);

const bobOfferResult = await bobSwap.makeOffer(bobEscrowReceipt);
```

Now that Bob has made his offer, `alicePayoffP` resolves to an array
of ERTP payments `[moolaPayment, simoleanPayment]` where the
moolaPayment is empty, and the simoleanPayment has a balance of 7. 

The same is true for Bob, but for his specific winnings.
