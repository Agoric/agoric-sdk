<!--
order: 2
-->

# Messages

This documents the messages sent across the bridge to the Javascript swingset.

## From Javascript to Golang

### LIEN_SET_LIENED

* type: "LIEN_SET_LIENED"
* address: string, bech32-encoded
* denom: string
* amount: string encoding nonnegative integer

Response: boolean indicating whether the total lien for the account
successfully set to the new total. The following rules are used:

* The total liened amount can always be decreased.
* When increasing the total liened amount, the new total must be less than
  or equal to the bonded amount.

### LIEN_GET_ACCOUNT_STATE

* type: "LIEN_GET_ACCOUNT_STATE"
* address: string, bech32-encoded
* denom: string

Response:

* currentTime: string timestamp
* total: string encoding nonnegativeinteger
* bonded: string encoding nonnegative integer
* unbonding: string encoding nonnegative integer
* locked: string encoding nonnegative integer
* liened: string encoding nonnegative integer

See [Concepts](01_concepts.md) for the meaning of the amounts.

### LIEN_GET_STAKING

* type: "LIEN_GET_STAKING"
* validators: array of strings of bech32-encoded operator addresses
* delegators: array of strings of bech32-encoded account addresses

Response:

* epoch_tag: string encoding the staking epoch.
If it is the same in two different responses, the results can be
safely aggregated.
* denom: string giving the name of the staking token
* validator_values: array of the same length as the request `validators`,
where each entry is a string encoding nonnegative integer
giving the tokens delegated to the corresponding validator, or `null`
if that validator address is malformed.
* delegator_states: array of the same length as the request `delegators`,
holding `null` if the address is malformed, otherwise an object containing:
    * val_idx: array of nonnegative integers referring to the index of
    a validator in the request. If the same validator address is
    given multiple times in the request, the index of the last one is used.
    * values: array of strings of the same size as `val_idx` encoding
    nonnegative integers for the amount this delegator has delegated
    to the referenced validator.
    * other: string encoding nonnegative integer of the total amount
    this delegator has delegated to validators not mentioned in the request.

This call obtains a partial snapshot of staking data in a compact
representation. It is intended for use in tallying votes of delegated tokens,
with proxying of votes based on delegation. It has nothing to do with liens
per se, but the lien module has the necessary connectivity to implement it.
This call may be moved to another module in the future if appropriate.

## From Golang to Javascript

None.

## Design Notes

The LIEN_SET_TOTAL operation checks the Golang-side state and might reject
the operation. It has the power to do so to avoid a race between checking
the account state and updating the liened amount, vs other cosmos-sdk
operations which might change the account state.
