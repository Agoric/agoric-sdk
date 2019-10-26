# Second-price auction

In a second-price auction, the winner is the participant with the
highest bid, but the winner only pays the price corresponding to the
second highest bid. Second-price auctions must have sealed (i.e.
private) bids to have the right economic incentives, so this version
which is entirely public should not be used in production for real
items.

## Public second-price auction

In this particular "public" second-price auction, anyone who has
access to the auction instance can make a bid by making an offer.

Alice can create an auction by doing:

```js
const installationHandle = zoe.install(publicAuctionSrcs);
const { instance: aliceAuction, instanceHandle } = await zoe.makeInstance(
  installationHandle,
  {
    assays,
    numBidsAllowed: 3
  },
);
```

She can put up something at auction by escrowing it with Zoe and
calling `makeOffer` on the auction instance with her escrow receipt.

```js
const alicePayoutRules = harden([
  {
    kind: 'offerExactly',
    assetDesc: moolaAssay.makeAssetDesc(1),
  },
  {
    kind: 'wantAtLeast',
    assetDesc: simoleanAssay.makeAssetDesc(3),
  },
]);
const alicePayments = [aliceMoolaPayment, undefined];
const {
  escrowReceipt: allegedAliceEscrowReceipt,
  payout: alicePayoutP,
} = await zoe.escrow(alicePayoutRules, alicePayments);

const aliceOfferResult = await aliceAuction.makeOffer(aliceEscrowReceipt);
```

Note that in this implementation, the item that will be auctioned is
described at index 0, and Alice's minimum bid assetDesc is at index 1 in
the offer description. 

Now Alice can spread her auction `instanceHandle` far and wide and see if
there are any bidders. Let's say that Bob gets the instanceHandle and
wants to see if it is the kind of contract that he wants to join. He
can check that the installationHandle installed is the auction he is expecting.

```js
const {
  instance: bobAuction,
  installationHandle: bobInstallationId,
  terms,
} = zoe.getInstance(instanceHandle);
```
He can also check that the item up for sale is the kind that he wants,
as well as checking what Alice wants in return. (In this
implementation, Alice will have to tell Bob out of band what the
minimum bid in simoleans is.)

```js
insist(sameStructure(terms.assays, assays))`assays are not the same`;
```

Bob decides to join the contract and
makes an offer:

```js
const bobPayoutRules = harden([
  {
    kind: 'wantExactly',
    assetDesc: moolaAssay.makeAssetDesc(1),
  },
  {
    kind: 'offerAtMost',
    assetDesc: simoleanAssay.makeAssetDesc(11),
  },
]);
const bobPayments = [undefined, bobSimoleanPayment];
const {
  escrowReceipt: allegedBobEscrowReceipt,
  payout: bobPayoutP,
} = await zoe.escrow(bobPayoutRules, bobPayments);

const bobOfferResult = await bobAuction.makeOffer(bobEscrowReceipt);
```

And let's say that Carol and Dave also decide to bid in the same way
as Bob, Carol bidding 7 simoleans, and Dave bidding 5 simoleans.

Bob wins, and pays the second-highest price, which is Carol's bid of 7
simoleans. Thus, when Alice claims her winnings, she gets 7 simoleans.
Bob gets the 1 moola that was up for auction as well as a refund of 4
simoleans (11-7), and Carol and Dave get a full refund.
