<!--
order: 4
-->

# Events

The vstore module emits the following events:

## State Change

| Type     | Attribute Key      | Attribute Value  |
| -------- | ------------------ | ---------------- |
| state_change | store_name     | {storeName}       |
| state_change | store_subkey   | {base64-subkey}  |
| state_change | unproved_value | {base64-value}   |

This state change event is only gossip (not part of consensus) to assist
followers in efficiently recognising when an update has occured.  The event
contains the `store_name` and `store_subkey` to enable applications to obtain
proven values by issuing a provable query against the KVStore.

This event also contains `state_change.unproved_value` as an optimisation to
avoid excessive querying round-trips when a state-following application does not
require proof.
