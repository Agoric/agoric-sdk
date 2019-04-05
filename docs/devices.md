# "Device" Access

Most Vats communicate only in terms of object references, method calls,
promises, and resolution. Everything outside the Vat is accessed through an
eventual send, which can deliver pure data and references, but nothing else.

For a Vat to have any influence on the outside world, *something* must go
beyond this limitation. Some Vat, somewhere, must have a "device": some
access to authority outside the Vat model.

The SwingSet architecture, despite being implemented in Javascript, is
patterned after lower-level OS kernel layout, hence the distinction between
"userspace" and "kernelspace", with a "syscall" API from one to the other.
Following that pattern, we say that certain Vats have extraordinary access to
a "device object", which allows commands to be sent to a "device driver" that
has privileged access to functions or data that is outside the Vat model.

The simplest such device might just be synchronous access to a shared data
structure. Since Vats are normally confined to communicating through object
messages (and even then only through asynchronous access), even a basic
key-value store must be presented as a "device" if shared with the kernel.

## Initial Device Types

### TCP Device

To extend our Vat network across multiple computers, we need a "comms vat"
which will be given the ability to send and receive data over the internet.
This vat will be responsible for encryption, the VatTP protocol, managing
three-party handoff, and distributed garbage collection. It will get a device
that lets it initiate outbound connections (perhaps through `libp2p`), send
messages through a connection, and register a callback that will get
notification of inbound connections and messages.

### Ledger Device

To integrate SwingSet into blockchain hosts (e.g. the application end of a
Cosmos ABCI connection), inbound signed transactions must be verified and
turned into entries on the run-queue. These transactions come from relayer
nodes, who must provide a deposit with each message (to prevent abuse). Their
deposit is refunded, plus a commission, once the message is validated and
added to the "escalator" scheduler queues.

To check and manipulate these balances, the kernel state includes a "ledger",
which maps a public verifier key (used to check the transaction signatures)
with a balance. Transactions which arrive under a key with insufficient
balance to meet the deposit will be ignored: this minimizes the work we do in
response to completely bogus input. If the message has a valid relayer
signature but the inner contents are invalid, the deposit is forfeit, which
discourages a solvent relayer from forwarding bad messages.

Since we want to use ERTP protocols to transfer these balances too, we need
an Issuer. This must live in a Vat with access to the ledger, so that
object-reference access (Purses) can interact with public-key access. This
Vat will have access to the "ledger device", where it can get and set balance
entries.

### Inbound Message Device

The Vat which manages the ledger will (probably) also receive inbound signed
messages, via a callback registered with the Inbound Message Device. These
messages won't be delivered through the normal run-queue, since
higher-priority messages should be delivered earlier, and we won't know the
priority (e.g. escalator price/bid data) until this vat gets a chance to
examine it. We need the messages to be delivered to this code immediately.

This Vat will also hold the C-list tables that map (pubkey, index) to an
object reference. It must also know how to verify the per-machine VatTP layer
on each message: cryptographic signatures of the sending SoloVat (not just
the relayer's signature), or chain-specific proofs from vats hosted inside a
foreign blockchain (i.e. IBC).

## Device Drivers

Devices consist of a kernel-realm wrapper function, which closes over any
host-realm authorities that it needs. The wrapper function is responsible for
preventing confinement breaches: it must prevent kernel-realm callers from
accessing host-realm objects, even under adversarial use. In particular, any
exceptions raised by the host-realm functions must be caught and wrapped with
kernel-realm replacements. Callbacks must be intercepted too. The wrapper
function must act as a limited Membrane between the two worlds.

`controller.addVat()` takes an `options` argument. `options.devices` contains
the definitions of any devices that should be made available to this
particular vat. The property names on `devices` are device names, and their
values should follow the same format as SES's `makeRequire`: an object with
both `attenuatorSource` and the authorities that should be made available to
it. Unlike `makeRequire`, the `attenuatorSource` used by devices will be
evaluated with a `require` endowment that provides access to `@agoric/harden`,
`@agoric/nat`, and `@agoric/evaluate`.

The kernel-realm device object will properties that match the names on
`devices`, each of which will be the kernel-realm object resulting from the
evaluation and invocation of `attenuatorSource`.
