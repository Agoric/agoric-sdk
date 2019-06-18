

To test communication between a (local, one-validator) chain machine and a
solo machine, follow these steps:

```
$ make
$ make install
$ npm install
$ make localdemo2-setup
```

Then, in one shell, do:

```
$ make localdemo2-run-chain
```

and wait about 5 seconds for the chain to produce its first block.

Then, in a separate shell, do:

```
$ make localdemo2-run-client
```

Then point a browser at http://localhost:8000/ and enter one of the following
into the text box (and press the "eval" button):

* `E(home.purse).getBalance()`: home.purse is the "dust" purse, which starts
  out empty and can be filled by selling pixels
* `E(home.gallery).tapFaucet()`: obtain a pixel right

See README-gallery-demo for more things to try.


## The Setup

`localdemo2-setup` creates both a chain and a solo/client, and configures
them to be able to talk to each other. Look in the Makefile for details about
how this works.

The `add-genesis-account` step gives 1000 tokens to the solo machine. The
quantity isn't significant right now, but having any tokens at all means the
solo machine's address is in the accounts table, which enables it to sign and
send messages to the chain. Without this step, there will be no account
entry, which means no sequence number for the account, so signed messges will
be rejected.

Editing `lib/ag-solo/vats/solo-key.js` causes the chain-side vats to provide
an exported object (an "egress") to the solo vats. Without this, the inbound
VatTP messages will meet an empty C-list and they won't be able to access any
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
