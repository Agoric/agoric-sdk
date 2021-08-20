<!--
order: 2
-->

# Messages

This documents the messages sent across the bridge to the Javascript swingset.

## From Javascript to Golang

### LIEN_SET_TOTAL

* type: "LIEN_SET_TOTAL"
* address: string, bech32-encoded
* denom: string
* amount: string encoding nonnegative integer

Response: boolean indicating whether the total lien for the account
successfully set to the new total. The following rules are used:

* The total liened amount can always be decreased.
* When increasing the total liened amount, the new total must be less than
  or equal to the bonded amount and less than or equal to the unlocked amount.

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

## From Golang to Javascript

### LIEN_SLASHED

* type: "LIEN_SLASHED"
* addresses: array of bech32-encoded strings, lexicographically sorted
* currentTime: string timestamp

No reply, eventual delivery.

## Design Notes

The LIEN_SET_TOTAL operation checks the Golang-side state and might reject
the operation. It has the power to do so to avoid a race between checking
the account state and updating the liened amount, vs other cosmos-sdk
operations which might change the account state.
