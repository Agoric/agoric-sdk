# An Attacker's guide to Zoe

This is an incomplete list of potential weak points that an attacker might want to focus
on when looking for ways to violate Zoe's integrity. It's here to help defenders, as
"attacker's mindset" is a good way to focus attention for the defender. The list should
correspond pretty closely to the set of assurances that Zoe aims to support.

The main focus of most threats would be a breach of one of Zoe's core invariants

 * reallocations ordered by contracts must not violate
   * offer safety
   * exit rules, or
   * rights conservation
 * invitations are needed in order to exercise offers
 * each instance of a contract is isolated from others and can only communicate through
    capabilities that have been explicitly shared


## Reallocation

The current approach (incrementBy/decrementBy and the fact that all seats must be included
in realloc) has led to a few bugs. It's probably worth looking for other cases that
create new stagings or presume there are none outstanding.

Notice that `reallocateForZcfMint()` is allowed to violate rights conservation since its
minting new value. Can it be confused into including other reallocations with the new
issuance?

reallocate in `zcfSeat.js` is not atomic. It starts by calculating the reallocations for
every seat, then updates them one at a time (replaceAllocations in
`startInstance.js`). There's a try-catch around the loop, so an outright failure to
reallocate any seat would cause the vat to be terminated. Are there any failures of an
individual reallocation that would violate the consistency rules for the overall
reallocation?


## Asynchrony

Zoe has to manage some complex interactions to achieve its ends, so finding gaps in the
handling of asynchrony between Zoe and ZCF is a possible avenue of attack.

## Issuers

We intend to make issuers less interdependent. Can you break zoe's escrow with a misbehaving issuer?

## feeMintAccess

When zoe starts up, the creator gets feeMintAccess and initialFeeFunds. Those are powerful
caps. Can they be extracted from bootstrap?

When starting zoe, the caller can supply a feeIssuerConfig. If they could specify a higher
initialFunds than needed, and squirrel away the excess, no one else would know.

## Non-responsive contracts

Someone should demonstrate a subtle way of causing a non-responsive contract that would
surprise clients. If it's too obvious, no one will use the contract.

## Test support

`zcf.setTestJig()` is undocumented, and intended for testing. Can contracts exploit it?

## Zoe Helpers

do the zoe helpers use undocumented APIs? 


## Bundle Source

Someone should look at bundle-source. This is the place where user-supplied code is
evaluated. Can you break things by importing stuff you shouldn't? Can you get access to
objects you shouldn't be able to?


## Empty Seats

Can anything be tickled because emptySeats don't have a serious proposal?


## createZcfVat

setupCreateZcfVat uses the vatAdminSvc capability to create new vats. If the careful setup
can be breached, vatAdminSvc could be mis-used.

## startInstance

startInstance is complex.  does it successfully
 * isolate seats and their assets from one another?
 * ensure exit can only be called by the seat holder?
 * update allocations?
 * protect handleOfferObj from zcfZygote through startInstance.  How about the resulting exitObj and offerResult

## getAmountAllocated

Can `getAmountAllocated()` be out of date with Zoe's values?

## Objects holding many powerful capabilities

`zoe.js` holds a lot of powerful capabilities. Is there anything there that isn't as careful
as it ought to be?

`zoeStorageManager.js`, likewise.


## Use of platform tools

Is anything not FAR or hardened that should be?

Do we leak any info inappropriately with assertions that don't use X``, or over-broad use
of `q()` in messages?


## Fee Purse

These potential areas of attack were closed off by removing metering code and charging of fees within Zoe. Did we miss anything?

If you can get the zoe fee purse without the token you win big.

exploiting fees-- can you escape from commitments by running out of money?


`bindDefaultFeePurse()` in `feePurse.js` builds a new copy of Zoe by overriding several
methods, with the comment

```javascript
 // The functions from zoe not overridden below have no
 // impact on state within Zoe
 ```
 
Most of the methods that are not overridden are `getFoo()`, which seems safe, but I also
see `makeFeePurse()` and `bindDefaultFeePurse()`, which seem suspicious.  Can you get
`makeFeePurse()` from a bound zoeService? Is there anything you can do with it?


## ZcfZygote

SwingSet doesn't support zygotes yet.  (This is planned to be a mechanism that would allow
rapid startup of new vats by storing the partial evaluation state to reduce work when
making a new instance. Zoe has code that is intended to eventually take advantage of that support.

Doe it leave any openings for an attack?


The following is what an attacker's guide might say when zygotes are in use:

```text
zcfZygote evaluates any contract once when creating the
installation, and then calls the `start()` function separately each
time a new instance is started.
 * Is there any way to leak info between instances?
 * could `start()` be constructed in a way that makes its behavior different in different
    instances?
```
	
