

To test communication between a (local, one-validator) chain machine and a
solo machine, follow these steps:

```
$ ag-chain-cosmos init --chain-id agoric
$ bin/ag-solo init t1
$ ag-chain-cosmos add-genesis-account `cat t1/ag-cosmos-helper-address` 1000agtoken

# Now edit demo1/bootstrap.js and replace the 'solo' on line 18 with the
# contents of t1/ag-cosmos-helper-address (without the newline)

$ ag-chain-cosmos start

# Now swith to a different shell, since 'start' doesn't daemonize. And wait
# about 5 seconds for the chain to produce its first block before starting
# the solo machine.

$ make set-local-gci-ingress
$ (cd t1 && ../bin/ag-solo start)

# Now point a browser at http://localhost:8000/ and enter the following into
# the text box:
#
# E(home.chain).getBalance()
#
# and press the "eval" button
```

The `add-genesis-account` step gives 1000 tokens to the solo machine. The
quantity isn't significant right now, but having any tokens at all means the
solo machine's address is in the accounts table, which enables it to sign and
send messages to the chain. Without this step, there will be no account
entry, which means no sequence number for the account, so signed messges will
be rejected.

Editing `lib/bootstrap.js` causes the chain-side vats to provide an exported
object (an "egress") to the solo vats. Without this, the inbound VatTP
messages will meet an empty C-list and they won't be able to access any
objects.

The `make set-local-gci-ingress` step copies the chain's access data (the GCI
identifier and the RPC host/port connection hints) into the solo machine's
`connections.json`, which allows the solo-side VatTP to route messages to the
chain (by invoking the `ag-cosmos-helper` process to sign and broadcast
transactions). It also writes the GCI into a file where the solo bootstrap
function can read it, which adds the chain-side object as an import (i.e.
"ingress"), giving the solo vats access to that chain-side object.

After starting both vats and evaluating the `getBalance()` line, the solo
machine will send a message to the chain. The chain will see the transaction,
route it to the swingset machine, which (since this is the first transaction)
will take a few seconds to spin up the kernel and vats. The balance is
returned as the resolution of a promise, which causes the chain to send a
message to the solo machine (by adding it to the outbound mailbox for the
solo machine's public-key/address).

A moment later, the solo machine should notice that a new block has been
published, and it will use the helper tool to read the contents of the
mailbox. It notices the mailbox has a new message, and parses it for
`deliverInbound()`. The delivery causes a solo-side promise to be resolved
with the Purse's balance (100 units), which makes the solo machine send a
message to the browser to update the `history[0]` line, replacing it with
`history[0] = 100`.
