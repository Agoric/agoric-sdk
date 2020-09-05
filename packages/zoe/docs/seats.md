# Seats in the Zoe Service and Zoe Contract Facet

Note: These are internal documentation notes. For how to use Zoe and
how to develop smart contracts, please see
https://agoric.com/documentation/


__UserSeat.tryExit() Flow__
![UserSeat Exit Flow](./user-seat-exit-flow.png)

__ZCFSeat.exit() Flow__
![ZCFSeat Exit Flow](./zcf-seat-exit-flow.png)

__ZCF.reallocate() Flow__
![ZCF Reallocate Flow](./zcf-reallocate-flow.png)


## UserSeat 

The `UserSeat` is what is returned when a user calls
`E(zoe).offer(invitation, proposal, payments)`. It has the following
type:

```js
/**
 * @typedef {Object} UserSeat
 * @property {() => Promise<Allocation>} getCurrentAllocation
 * @property {() => Promise<ProposalRecord>} getProposal
 * @property {() => Promise<PaymentPKeywordRecord>} getPayouts
 * @property {(keyword: Keyword) => Promise<Payment>} getPayout
 * @property {() => Promise<OfferResult>} getOfferResult
 * @property {() => void=} exit
 */
```

Note that exit is only present if an immediate `exit` is possible. The
user can use the seat to get their payout, get the result of their
offer (whatever the contract chooses to return. This varies, but
examples are a string and an invitation for another user.)

## ZCFSeat

The `ZCFSeat` is a facet of the same seat, specifically for the
contract to manipulate. It is the `ZCFSeat` that is passed as the only
parameter to `offerHandlers`:

```js
const buyItems = buyerSeat => {
  const proposal = buyerSeat.getProposal();
  const moneyGiven = buyerSeat.getAmountAllocated('Money', moneyBrand);
  ...
```
The type of the ZCFSeat is:

```js
/**
 * @typedef {Object} ZCFSeat
 * @property {() => void} exit
 * @property {(msg?: string) => never} kickOut
 * @property {() => Notifier<Allocation>} getNotifier
 * @property {() => boolean} hasExited
 * @property {() => ProposalRecord} getProposal
 * @property {(keyword: Keyword, brand: Brand) => Amount} getAmountAllocated
 * The brand is used for filling in an empty amount if the `keyword`
 * is not present in the allocation
 * @property {() => Allocation} getCurrentAllocation
 * @property {(newAllocation: Allocation) => Boolean} isOfferSafe
 * @property {(newAllocation: Allocation) => SeatStaging} stage
 */
 ```

## ZoeSeatAdmin

Internal to Zoe Service code and passed to ZCF. Never external.

The `ZoeSeatAdmin` is the administrative facet of a seat within Zoe.
When `exit()` is called on this object, the payouts accessible through
the `UserSeat` are resolved. `replaceAllocation` changes the Zoe
allocation to the `replacementAllocation`.

The type of the `ZoeSeatAdmin` is:

```js
/**
 * @typedef {Object} ZoeSeatAdmin
 * @property {() => void} exit - exit seat
 * @property {(replacementAllocation: Allocation) => void} replaceAllocation - replace the
 * currentAllocation with this allocation
 */
 ```

## ZCFSeatAdmin

Internal to ZCF code only. 

The `ZCFSeatAdmin` is used by `reallocate` within ZCF to commit the
allocation from a `seatStaging` to the corresponding `ZCFSeat`, and
to tell Zoe the allocation has changed.

The type of the ZCFSeatAdmin is:

```js
/**
 * @typedef {Object} ZCFSeatAdmin
 * @property {(seatStaging: SeatStaging) => void} commit
 */
 ```