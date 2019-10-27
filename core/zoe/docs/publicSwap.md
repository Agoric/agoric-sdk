# Swaps

If I want to trade one kind of asset for another kind, I could send
you the asset and ask you to send me the other kind back. But, you
could choose to behave opportunistically: receive my asset and give
nothing back. To solve this problem, swap contracts allow users to
securely trade one kind of eright for another kind, leveraging Zoe for
escrow and offer safety. At no time does any user have the ability to
behave opportunistically.

## Public Swap

In the `publicSwap` contract, anyone who has access to the swap instance can
make an offer, with no invites necessary.

Let's say that Alice wants to create a swap that anyone can be the
counter-party for. She knows that the code for the swap has already
been installed, so she can create a swap instance from the swap
installation (`handle` is the unique, unforgeable identifier):

```js
const { instance: swap, instanceHandle } = await zoe.makeInstance(
  installationHandle,
  { assays },
);
```

Then she escrows her offer with Zoe. When she escrows, she passes in
two things, the actual ERTP payments that are part of her offer, and
an object called `offerRules`. The `offerRules` will be used by Zoe to
protect Alice from the smart contract and other participants. The
`offerRules` have two parts: `payoutRules`, which is used for
enforcing offer safety, and `exitRule,` which is used to enforce
exit safety. In this case, Alice's exit rule is `onDemand`, meaning
that she can exit at any time. Once Alice escrows, she gets an
escrowReceipt and a promise that resolves to her payout.

```js
const aliceOfferRules = harden(
  payoutRules: [
  {
    kind: 'offerExactly',
    assetDesc: moolaAssay.makeAssetDesc(3),
  },
  {
    kind: 'wantExactly',
    assetDesc: simoleanAssay.makeAssetDesc(7),
  },
  exitRule: {
    kind: 'onDemand',
  },
]);
const alicePayments = [aliceMoolaPayment, undefined];
const {
  escrowReceipt,
  payout,
} = await zoe.escrow(aliceOfferRules, alicePayments);
```

Alice then makes an offer using the escrowReceipt and tries to collect her payout:

```js
swap.makeFirstOffer(escrowReceipt);
const payments = await payout;
```

She then spreads the `instanceHandle` widely. Bob hears about Alice's
contract and he decides to look up the `instanceHandle` to see if it
matches Alice's claims.

```js
const {
  instance: swap,
  installationHandle,
  terms,
} = zoe.getInstance(instanceHandle);

// Bob does checks
insist(installationHandle === swapInstallationHandle)`wrong installation`;
insist(sameStructure(terms.assays, swapAssays)`wrong assays`;
```

Bob decides to be the counter-party. He also escrows his payments and
makes an offer in the same way as Alice, but his `offerRules` match Alice's:

```js
const bobOfferRules = harden({
  payoutRules: [
    {
      kind: 'wantExactly',
      assetDesc: bobAssays[0].makeAssetDesc(3),
    },
    {
      kind: 'offerExactly',
      assetDesc: bobAssays[1].makeAssetDesc(7),
    },
  ],
  exitRule: {
    kind: 'onDemand',
  }
);
const bobPayments = [undefined, bobSimoleanPayment];

const {
  escrowReceipt,
  payout,
} = await zoe.escrow(bobOfferRules, bobPayments);

swap.matchOffer(escrowReceipt);
payments = await payout;
```

Now that Bob has made his offer, Alice's `payout` resolves to an array
of ERTP payments `[moolaPayment, simoleanPayment]` where the
moolaPayment is empty, and the simoleanPayment has a balance of 7. 

The same is true for Bob, but for his specific payout.
