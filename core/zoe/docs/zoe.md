# Zoe: Offer-Safety Enforcement

Note: Zoe is currently at the pre-alpha stage. It has not yet been
formally tested or hardened.

This guide assumes some knowledge of the [ERTP fundamentals](./README.md).

## What is Zoe? 

__For users__: Zoe guarantees that as a user of a smart contract, you
will either get back what you wanted or get back a full refund, even if the
smart contract is buggy or malicious. (In fact, the smart contract
never has access to your digital assets.)

__For developers__: Zoe provides a safety net so you can focus on what
your smart contract does best, without worrying about your users
losing their assets due to a bug in the code that you wrote. Writing a
smart contract on Zoe is easy: all of the Zoe smart contracts are
written in the familiar language of JavaScript. 

## Sounds like magic. How does it actually work?

To use Zoe, we put things in terms of "offers". An offer is a
statement about what you want and what you're willing to offer. It
turns out, many smart contracts (apart from gifts and one-way
payments) involve an exchange of digital assets that can be put in
terms of offers. 

In this version of Zoe, our offers are simple (see [our roadmap](TODO) for
more complex offer types and their expected release). We can say
things like, "I'll give you [three
wood for two bricks](https://en.wikipedia.org/wiki/Catan)." We can
also say something like, "I want three wood, and *the most* I'm
willing to pay is two bricks." Or even: "I can pay you two bricks and
I expect *at least* three wood back." [Learn more about the particulars
of structuring an offer here](TODO). 

Offers are a structured way of describing user intent. To a certain
extent, an offer's rules are the user's *contractual understanding*
of the agreement they are entering into. You might have noticed that
the offer doesn't specify the mechanism by which the exchange happens.
The offer doesn't say whether the item you want is up for auction, in
an exchange, or part of a private trade. The offer doesn't mention the
particular mechanism because an important part of the design of Zoe is
a __separation of concerns__. Zoe is responsible for enforcing what we
call "offer safety", and the smart contract that runs on top of Zoe is
responsible for figuring out a proposed reallocation of resources. To
use an auction as an example, the smart contract is responsible for
figuring out who wins the auction and how much they pay, but Zoe
handles the escrowing of the bids and the payments. You can think of
this as similar to e-commerce websites using a separate
payment-processor so that they don't have to handle the credit cards
themselves.

### What is "offer safety"?

Zoe guarantees offer safety, meaning that when a user makes an offer
that is escrowed with Zoe, Zoe guarantees that the user will either
get back why they said they wanted, or the user will get back what they
originally offered. 

When a user escrows with Zoe, they get two things back immediately: an escrow
receipt, and a JavaScript promise for a future payout. This escrow
receipt is what the user can send to smart contracts, as proof that they
have escrowed the underlying digital assets with Zoe, without the
smart contract ever having access to the underlying digital assets.
Let's look a particular example to see how this works.

## An example: A swap

I want to trade my three bricks for five wool. You realize you have
five wool and agree to the deal. Without Zoe, though, you might send
me the five wool, and I might disappear without ever giving you the
three bricks in return. With Zoe, we can safely trade with each other,
even if we don't trust one another. We are assured that at worst, if
the swap contract behaves badly, we will both get a refund, and at
best, we'll get what we each wanted.

Let's look at the basic `publicSwap` contract ([full text of
the real contract](/core/zoe/contracts/publicSwap.js)). 

Here's a high-level overview of what would happen:
1. I make an instance of the swap contract.
2. I escrow my three bricks with Zoe and get an escrow receipt and a
   promise for a payout in return.
3. I send my escrow receipt to the swap as the first offer.
4. I tell you the swap's `instanceHandle`
5. Using the `instanceHandle`, you look up the swap with Zoe.
6. You verify that it's using the `publicSwap` contract
   code you expect, and can ask the swap about the offers made so far.
7. You escrow your offer (offering five wool for three bricks) with
   Zoe, getting an escrow receipt and a promise for a payout in
   return.
8. You send your escrow receipt to the swap as a matching offer.
9. The offer matches and both of our payout promises resolve to [ERTP
   payments](TODO), mine to the five wool that I wanted, and yours to
   the three bricks that you wanted. Success!


## How to write smart contracts

Writing smart contracts that run on Zoe is easy, but let's look
at a simple contract. This contract only does one thing, and
it's pretty useless - it gives you back what you put in. Let's call it
`automaticRefund`. Let's say the code of `automaticRefund` looks like this (see
the [real contract code here](/core/zoe/contracts/automaticRefund.js)):

```js
export const makeContract = (zoe, terms) => {
  return {
    instance: {
      makeOffer: async escrowReceipt => {
        const { offerHandle } = await zoe.burnEscrowReceipt(escrowReceipt);
        zoe.complete([offerHandle]);
      },
    },
    assays: terms.assays,
  };
};
```
(In a real contract, whenever we create a new object or array, we recursively
deep-freeze it with `@agoric/harden`. You can [learn more about `harden` here](https://github.com/Agoric/harden).)

`automaticRefund` has one method exposed to the user: `makeOffer`.
`makeOffer` takes in a `escrowReceipt`, and after burning the
`escrowReceipt` (and thus verifying it as well), it tells Zoe to
complete the offer and send the user their payout. 

A smart contract on Zoe must export a function `makeContract` that
takes two parameters: `zoe`, which is the contract-specific API for Zoe, and
`terms`, which are the contract terms that a contract instance is made
with. `Terms` must include a property called `assays`, which is an
array of assays, the public API of mints. For instance, in our
bricks-for-wool example above, the contract terms would include the
brick assay and the wool assay. `Terms` would also include any other
contract-specific parameters that the author specified.

The smart contract must return an object with two properties:
`instance`, which is the user-facing API of the
contract, and `assays`, which is what the contract has decided is the
canonical list of assays for the contract. If no change is necessary,
`assays` may just be the assays in the terms. 

## Diving Deeper

To get a better idea of the usual control flow, let's look at a more
complex smart contract, such as the `publicSwap` contract that we
mentioned earlier. Someone needs to make the first offer, so let's
make sure our user-facing API has a method for that:

```js
const makeFirstOffer = async escrowReceipt => {
  const {
    offerHandle,
    offerRules: { payoutRules },
  } = await zoe.burnEscrowReceipt(escrowReceipt);

  const ruleKinds = ['offerExactly', 'wantExactly']
  if (!hasValidPayoutRules(ruleKinds, terms.assays, payoutRules))
    return rejectOffer(zoe, offerHandle);
  }

  // The offer is valid, so save information about the first offer
  firstOfferHandle = offerHandle;
  firstPayoutRules = offerMadeDesc;
  return defaultAcceptanceMsg;
};
```

This is pretty similar in format to the `automaticRefund`, but there
are a few changes. First, in this contract, we actually check what was
escrowed with Zoe to see if it's the kind of offer that we want to
accept. In this case, we only want to accept offers that have an
`payoutRules` of the
form: 
```js 
[{ kind: 'offerExactly', assetDesc: x}, { kind: 'wantExactly', assetDesc: y}]
```
where `x` and `y` are asset descriptions with the correct assays. 

Also, this is a swap, so we can't immediately return a payout to the
user who puts in the first offer; we have to wait for a valid matching
offer. So, if we get a valid first offer, the only thing we can do is
save the offer information.

Lastly, in this contract, we return a message saying that we accepted
the valid offer.

So, how does the matching happen? We can look at another user-facing
method, `matchOffer`:

```js
const matchOffer = async escrowReceipt => {
  const {
    offerHandle: matchingOfferHandle,
    offerRules: { payoutRules },
  } = await zoe.burnEscrowReceipt(escrowReceipt);

  if (!firstOfferHandle) {
    return rejectOffer(zoe, matchingOfferHandle, `no offer to match`);
  }

  if (!isExactlyMatchingPayoutRules(zoe, firstPayoutRules, offerMadeDesc)) {
    return rejectOffer(zoe, matchingOfferHandle);
  }
  const [firstOfferExtents, matchingOfferExtents] = zoe.getExtentsFor(
    harden([firstOfferHandle, matchingOfferHandle]),
  );
  // reallocate by switching the extents of the firstOffer and matchingOffer
  zoe.reallocate(
    harden([firstOfferHandle, matchingOfferHandle]),
    harden([matchingOfferExtents, firstOfferExtents]),
  );
  zoe.complete(harden([firstOfferHandle, matchingOfferHandle]));
  return defaultAcceptanceMsg;
};
```

In this method, we do a couple more things. First, we want to check if
there has already been a first offer. If not, we reject the offer at
hand. Second, if the offer at hand isn't a match for the first offer,
we want to reject it for that reason as well. 

Once we're sure that we *do* have a matching offer, we can do the most
exciting part, the reallocation. 

Smart contracts on Zoe have no access to the underlying
digital assets, but they can ask Zoe for information on what was
escrowed for each offer. That information is in the form of an
`extent`, which can be thought of as the answer to `how much` or `how
many` ([see more about ERTP fundamentals here](TODO)). In "3 bricks"
the "3" is the extent. 

Because this is a swap, we want to literally swap the extents for the
first offer and the matching offer. That is, the user who put in the
first offer will get what the second user put in and vice versa. Our
contract makes a call to `zoe.reallocate` in order to tell Zoe about
this reallocation for the two offers. 

Zoe checks two invariants before changing its bookkeeping. First, Zoe
checks that offer safety holds for these offers. In other words, does
this reallocation either give a refund or give the user what they
wanted? Second, Zoe checks that asset supply is conserved. This means
that we haven't lost or added any digital assets on the whole as a
result of this reallocation. 

If the reallocation passes, we can tell Zoe to complete the offers and
send out payouts with a call to `zoe.complete`. Note that we can
reallocate without completing offers, or complete without
reallocating, depending on the logic of the contract.


More:

* [How do I write a smart contract on Zoe and upload and install it?](TODO)

* [How can I build an application with my Zoe smart contract?](TODO)

* [What is the API of the contract facet for Zoe?](TODO)

* [What is the API of the user-facing facet for Zoe](TODO)
