# Virtual Purses

Virtual purses connect Cosmos-level bank module accounts with Agoric-level ERTP purses and payments. A "virtual" purse is created at the ERTP level which be observed and manipulated as other purses, but modification to it are sent over the bridge to act upon the bank account. Updates to the bank account balance are sent over the bridge to update the virtual purse, whose balance can be queried entirely at the ERTP level.

## State

The Vpurse module maintains no significant state, but will access stored state through the bank module.

## Protocol

Purse operations which change the balance result in a downcall to this module to update the underlying account. A downcall is also made to query the account balance.

Upon an `EndBlock()` call, the module will scan the block for all `MsgSend` and `MsgMultiSend` events (see `cosmos-sdk/x/bank/spec/04_events.md`) and perform a `VPURSE_BALANCE_UPDATE` upcall for all denominations held in all mentioned accounts.

The following fields are common to the Vpurse messages:
- `"address"`, '`"recipient"`, `"sender"`: account address as a bech32-encoded string
- `"amount"`: either amount to transfer or account balance, as an integer string
- `"denom"`: denomination as a string
- `"nonce"`: unique integer, as a number
- `"type"`: string of the type of message (enumerated below)
- `"updated"`: list of objects with the fields `"address"`, `"denom"`, `"amount"`.

Downcalls from JS to Cosmos (by `type`):
- `VPURSE_GET_BALANCE (type, address, denom)`: gets the account balance in the given denomination from the bank. Returns the amount as a string.
- `VPURSE_GRAB (type, sender, denom, amount)`: burns amount of denomination from account balance to reflect withdrawal from virtual purse. Returns a `VPURSE_BALANCE_UPDATE` message restricted to the sender account and denomination.
- `VPURSE_GIVE (type, recipeient, denom, amount)`: adds amount of denomination to account balance to reflect a deposit to the virtual purse. Returns a `VPURSE_BALANCE_UPDATE` message restricted to the recipient account and denomination.

Upcalls from Cosmos to JS: (by `type`)
- `VPURSE_BALANCE_UPDATE (type, nonce, updated)`: inform virtual purse of change to the account balance (including a change initiated by VPURSE_GRAB or VPURSE_GIVE).

## Testing

Test the following transfer scenarios:
- Purse-to-vpurse
- Vpurse-to-purse
- Vpurse-to-vpurse

The initial BLD and RUN purses are virtual, but newly-created purses will be non-virtual.