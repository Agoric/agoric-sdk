# Swaps

If I want to trade one kind of asset for another kind, I could send
you the asset and ask you to send me the other kind back. But, you
could choose to behave opportunistically: receive my asset and give
nothing back. To solve this problem, swap contracts allow users to
securely trade one kind of eright for another kind, leveraging Zoe for
escrow and offer-safety. At no time does any user have the ability to
behave opportunistically.

## Public Swap

In the "public swap", anyone who has access to the swap instance can
make an offer, no invites necessary.

Let's say that Alice wants to create a swap that anyone can be the
counter-party for. She creates a swap instance:

```js
const installationHandle = zoe.install(publicSwapSrcs);
const { instance: aliceSwap, instanceHandle } = await zoe.makeInstance(
  installationHandle,
  { assays },
);
```

Then escrows her offer with Zoe and gets an escrowReceipt
and a promise that resolves to her payout:

```js
const alicePayoutRules = harden([
  {
    kind: 'offerExactly',
    assetDesc: moolaAssay.makeAssetDesc(3),
  },
  {
    kind: 'wantExactly',
    assetDesc: simoleanAssay.makeAssetDesc(7),
  },
]);
const alicePayments = [aliceMoolaPayment, undefined];
const {
  escrowReceipt: allegedAliceEscrowReceipt,
  payout: alicePayoutP,
} = await zoe.escrow(alicePayoutRules, alicePayments);
```

And then makes an offer using the escrowReceipt and tries to collect her winnings:

```js
const aliceOfferResultP = aliceSwap.makeOffer(aliceEscrowReceipt);

```

She then spreads the `instanceHandle` widely. Bob hears about Alice's
contract and he decides to look up the `instanceHandle` to see if it
matches Alice's claims.

```js
const {
  instance: bobSwap,
  installationHandle: bobInstallationHandle,
  terms,
} = zoe.getInstance(instanceHandle);

insist(bobInstallationHandle === installationHandle)`wrong installation`;
insist(sameStructure(terms.assays, assays)`wrong assays`;
```

Bob decides to be the counter-party. He also escrows his payment and
makes an offer in the same way as Alice, but his offer description is
the opposite of Alice's:

```js
const bobPayoutRules = harden([
  {
    kind: 'wantExactly',
    assetDesc: bobAssays[0].makeAssetDesc(3),
  },
  {
    kind: 'offerExactly',
    assetDesc: bobAssays[1].makeAssetDesc(7),
  },
]);
const bobPayments = [undefined, bobSimoleanPayment];

const {
  escrowReceipt: bobEscrowReceipt,
  payout: bobPayoutP,
} = await zoe.escrow(bobPayoutRules, bobPayments);

const bobOfferResult = await bobSwap.makeOffer(bobEscrowReceipt);
```

Now that Bob has made his offer, `alicePayoutP` resolves to an array
of ERTP payments `[moolaPayment, simoleanPayment]` where the
moolaPayment is empty, and the simoleanPayment has a balance of 7. 

The same is true for Bob, but for his specific winnings.
