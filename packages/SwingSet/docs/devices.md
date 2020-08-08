# "Device" Access

Most Vats communicate only in terms of object references, method calls,
promises, and resolution. Everything outside the Vat is accessed through an
eventual send, which can deliver pure data and references, but nothing else.

For a Vat to have any influence on the outside world, *something* must go
beyond this limitation. Some Vat, somewhere, must have a "device": some
access to authority outside the Vat model.

The simplest such device might just be synchronous access to a shared data
structure. Since Vats are normally confined to communicating through object
messages (and even then only through asynchronous access), even a basic
key-value store must be presented as a "device" if shared with the kernel.

## Vat access to devices

The SwingSet architecture, despite being implemented in Javascript, is
patterned after lower-level OS kernel layout, hence the distinction between
"userspace" and "kernelspace", with a "syscall" API from one to the other.
Following that pattern, we say that certain Vats have extraordinary access to
one or more "device objects", which allows commands to be sent to a "device
driver" that has privileged access to functions or data that is outside the
Vat model.

These device objects are imported into vats just like anything else (such as
exports from other vats, or kernel promises). They can be included in
argument lists and delivered from one vat to another like normal objects.
However, they cannot be the target of a `syscall.send`. Instead, a special
`syscall.callNow` accepts a device reference as its first argument:

```
syscall.callNow(device, argsbytes, slots) -> { bytes, slots }
```

This `callNow` runs *synchronously*, unlike `syscall.send()`. The device
driver returns the results with the same format as the arguments are sent: a
serialized object, plus some number of slots that it can reference. All
interactions with the device are through syscalls and data values. This
preserves our ability to migrate the vat to a new machine (and forward
messages, if necessary).

The `liveSlots` wrapper provides an easier-to-use frontend to `syscall.send`,
allowing userspace code to use `E(presence).method(args) -> promise` instead
of raw syscalls. It provides a similar frontend to `callNow`, which looks
like:

```
retval = D(devicenode).method(args)
```

## Device access to Vats

Devices get access to a special message-delivery queue which is serviced
before the normal kernel run-queue. This allows e.g. a communication-channel
device to give inbound messages to a comms vat quickly, without being queued
on the normal escalators (since the comms vat might determine that the
message is higher-priority than anything already on the escalators, so it
must be given the opportunity to make this decision quickly).

We have not yet determined how this access will be expressed. It might simply
be a special escalator-id which effectively has an infinite budget, or it
might need to be a separate syscall. Until we implement the escalator
algorithm (and the associated Meters and Keepers), we simply add a
`syscall.sendOnly` interface to both vats and devices, and defer the priority
questions for later. `sendOnly` does not return anything.

The `deviceSlots` wrapper exposes `sendOnly` with a special wrapper:

```
SO(presence).method(args)
```

Unlike the `E` wrapper, this does not return a promise, since `sendOnly` does
not provide one either.

TODO: `liveSlots` does not yet provide the `SO` send-only wrapper.

## Devices Don't Promise

For simplicity, we remove the promise APIs from devices and their
interactions with Vats. Devices cannot create kernel promises, or receive
them in calls, and `syscall.sendOnly` (which is the only way for the device
to send messages to vats) does not cause a promise to be created. Vats cannot
put promises into the arguments of `syscall.callNow`.

We might change this in the future.

## Bootstrap Vat Disseminates Device Access

Initially, the bootstrap vat holds exclusive access to all devices. They are
provided as an argument to the `bootstrap()` call, in the same way it gets
the root object of all other vats. From here, the `bootstrap()` can share
device access with other vats as it sees fit. Devices can be passed as
message arguments and promise resolutions just like any other import or
export.

The function signature is `bootstrap(argv, vats, devices) -> undefined`. The
`devices` argument, like `vats`, is a plain object whose keys are the names
of the devices, with values that contain device references (i.e. `{type:
'device', id: 4}`).

## Device Configuration

There are two kinds of devices: "host devices" and "kernel devices".

The `buildVatController()` call is supplied with a `config` object that
describes the initial set of vats (including the bootstrap vat). We use
`config.devices` to define the set of host devices that will be made
available to `bootstrap()`. `config.devices` is a list (or other iterable),
in which each value is a 3-item list.
 * the device name,
 * the pathname of the device source (a file which must
   export a default function whose signature is
   `function setup(syscall, state, helpers, endowments) -> dispatch`), and
 * an object containing endowments that will be passed into the setup
   function.

"Kernel devices" do not need to be configured by the host. The only kernel
device currently envisioned is one which provides the `addVat` call, which
allows new Vats to be created at runtime.

It is an error to provide an entry in `config.devices` which collides with
the name of a kernel device, or to have two devices with the same name.

### New Vat APIs

This feature adds two API calls to Vats:

* `syscall.sendOnly(targetSlot, method, argsString, argsSlots) -> undefined`
* `syscall.callNow(deviceSlot, method, argsString, argsSlots) -> { args, slots }`

(although `sendOnly` is not used to interact with devices, and is only added
for completeness)

TODO: Vats do not yet have access to `sendOnly`.

The `liveSlots` helper for constructing Vats provides both an `E()` wrapper
(for constructing `syscall.send()` messages to Presences) and a `D()` wrapper
(for constructing `syscall.callNow` messages to device nodes).

### Device API

Devices are very much like Vats, and they way they are constructed reflects
that. The factory function for each is called with `syscall` object that
they can use to talk to the kernel, and they return a `dispatch` object
with which the kernel can invoke them. The specific methods on `syscall`
and `dispatch` are different for devices:

* `syscall.sendOnly(targetSlot, method, args) -> undefined`
* `dispatch.invoke(deviceID, method, args) -> results`

Notice that args and results are CapData structures, which look like
`{ body, slots }`.

#### Device Construction

Devices are built with `makeDeviceSlots(syscall, state, makeRootDevice, name)`.
`makeDeviceSlots` calls `makeRootDevice`, which should return an object with
methods that can be called from the kernel.

```js
// exampledevice-src.js
export default function setup(syscall, state, helpers, endowments) {
  const { stuff } = endowments;
  // use stuff
  function makeRootDeviceNode({ SO, getDeviceState, setDeviceState }) {
    return harden({
     // methods using stuff and more
    });
  }
  const dispatch =
    helpers.makeDeviceSlots(syscall, state, makeRootDeviceNode, helpers.name);
  return dispatch;
}
```

This lets the `makeRootDeviceNode` function provide the root device node with
access to the endowments, and to kernel methods to manage persistent state.
The `makeDeviceSlots` helper function behaves much like `makeLiveSlots` for
regular Vat code, except:

* It does not provide the `E()` wrapper, since devices cannot manage promises
  or eventual-sends
* Instead, it provides an `SO()` wrapper, which exposes `syscall.sendonly`.
* All pass-by-presence objects returned by device methods are passed as
  device nodes
* The dispatch object built by `makeDeviceSlots` is exposed as the root
  device node to the bootstrap function.

## Device Drivers

Host devices consist of a kernel-realm wrapper function, which closes over
any host-realm authorities that it needs. The wrapper function is responsible
for preventing confinement breaches: it must prevent kernel-realm callers
from accessing host-realm objects, even under adversarial use. In particular,
any exceptions raised by the host-realm functions must be caught and wrapped
with kernel-realm replacements. Callbacks must be intercepted too. The
wrapper function must act as a limited Membrane between the two worlds.

## Initial Device Types

### Mailbox Device

Most off-machine communication takes place through a "mailbox". This is a
special portion of the kernel state vector into which the VatTP layer can
write message bodies destined for other machines, using the `add(recipient,
msgnum, body)` method of the outbox device. The host loop is expected to
allow the kernel to quiesce, then examine this mailbox for new outbound
messages. At that point it should attempt to deliver them to the other
machine, using TCP/TLS (perhaps with `libp2p`) or other means. By deferring
message delivery until the kernel state has been checkpointed, we avoid the
"hangover inconsistency" problem.

VatTP code can remove messages from the outbox when it receives an
acknowledgment of receipt, by using the `remove(recipient, msgnum)` method.

Each mailbox is paired with a partner in some other machine. To send an
acknowledgment to that remote mailbox, VatTP can use the
`ackInbound(recipient, msgnum)` method. This ack is written into the state
vector next to the outbox where it can be delivered to the remote end by the
same host loop.

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
