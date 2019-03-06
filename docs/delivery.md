
A walkthrough of how messages are passed from one Vat to another.

## Descriptive Conventions

Numbers are suffixed in this description to indicate which numberspace they
live in, but these suffixes never appear in the implementation.

We use non-overlapping number ranges to avoid confusion. In the actual
implementation, each numberspace is independent (so "1" will be allocated in
each space, with different meanings). Allocations will probably be tightly
packed, beginning at 0 or 1 and always allocating the smallest available
index, to enable constant-time lookup.

* argSlots index values: 0-9i
* A's imports: negative 10-19a
* A's exports: positive 20-29a
* B's imports: negative 30-39b
* B's exports: positive 40-49b
* C's imports: negative 50-59b
* C's exports: positive 60-69b


From A's point of view, negative numbers are imports, positive numbers are
exports. We use this polarity so that the deliver(facetID) calls into Vats
can use positive facetID values.

## Kernel Slot Table

Each Vat has a table that maps from their slots to other Vat's slots. This
table maps in both directions:

`kernelSlots[fromVatID] -> ( fromSlotID <-> { toVatID, toSlotID } )`

We call the mapping from `fromSlotID` to `{ toVatID, toSlotID }` as
"forward", and the one from `{ toVatId, toSlotID }` to `fromSlotID` as
"backward".

`fromSlotID` is always negative (an import for `fromVat`), `toSlotID` is
always positive (an export of `toVat`). Positive numbers are exports,
negative numbers are imports.

From the kernel's point of view, the `fromSlotID` column matches the sending
Vat ("hi sending vat, I'm the kernel, when you talk about slot -1a, I'm going
to map that to something else").

(If the toVatID/toSlotID pair were linked to a single object, that could be
used for refcounting to notify toVat when its export is no longer referenced,
for GC.)

When a vat does `send` syscall, the target is always to one of that vat's
imports, and the targetSlotID must be mapped to a toVatID/toSlotID pair, so
we can use toSlotID as facetID in the subsequent `deliver` invocation.

When a send cites an export, we must find (or add) an entry in the receiving
Vat's table, allocating an import slotID if necessary. To make sure the same
export is delivered a second time with the same slotID, we must be able to
look up the reverse direction
(`slots[rxVatID].backward[{senderVatID,senderSlotID}]`).

When a send cites an import, we must map it to toVatID/toSlotID. If this is
an export of toVatID (arg being sent back home), we just cite the matching
toSlotID in the deliver(). If it is an export of some other vat, we do a
three-party link, which adds an import to toVatID.

## Vat import/export table

Each Vat, in its comms library, maintains an internal table which maps two
sets of objects:

* imports have negative numbers and map to/from proxies which support method
  invocations, which are sent to the external Vat for execution
* exports have positive numbers and map to/from local objects that can be
  invoked

Both types of objects might show up in the arguments of a method call. Only
imports can be used as the target of execution (since invoking an exported
object is just a local invocation, and doesn't involve the kernel) (but TODO
serializing a Vat with a queued call to an internal object may require
treating everything as external).

We can use a single table for both, since they use different signs for their
index values. This allows incoming messages to refer to either type with the
same values.

`vatSlots[negativeIndex] <-> proxy`

`vatSlots[positiveIndex] <-> localObject`


## Initial state

A has a (magically created) reference to B's `bob` object and to C's `carol`
object. No other references.

A has a proxy named `bob` which remembers `slot=-10a`, and `carol` with
`slot=-11a`

`vatSlotsA`:

| index | target     |
|------:|------------|
|  -10a | proxyBob   |
|  -11a | proxyCarol |


`vatSlotsB`:

| index | target |
|------:|--------|
|   40b | bob    |


`kernelSlots`:

| fromVatID | fromSlotID | toVatID | toSlotID |
|----------:|-----------:|--------:|---------:|
|         A |       -10a |       B |      40b |
|           |       -11a |       C |      50c |


## First Message: no arguments

A invokes `bob.foo()` to B, no arguments, no result promise.

A does `syscall.send(targetSlot=-10a, method='foo', argsString='[]', slots=[])`.

That uncurries to `baseSend(fromVatID=A, targetSlot=-10a, method='foo', argsString='[]', slots=[])`.

Kernel translates target slot (`[A, -10a]`) into `[B, 40b]`. No argument
slots to translate.

Kernel queues message `{ vatID=B, slotID=40b, method='foo', argsString='[]', vatSlots=[] }`.

Message gets to front of queue, kernel dispatches it.

Kernel invokes `B.deliver(slotID=40b, method='foo', argsString='[]', argSlots=[])`.

All slot tables remain the same.


## Second Message: multiple arguments, including reference to self

A has a local pass-by-proxy object `alice`.

A invokes `bob.foo(alice, bob)`. Sending `bob` to `bob` is not very useful,
but illustrates the stability of table lookups.

A's `bob` proxy and/or the comms library in A, as it serializes the argument
graph `[alice, bob]`, notices that `alice` is referenced by the graph, but is
not currently being exported (it maintains an internal table `obj <->
exportID`). It thus adds `20a -> alice` to its internal exports table. The
export ID "20a" is appended to the `argSlots` list (which is currently empty,
since this is the first time the serializer has encountered a pass-by-proxy
argument for this call). The argument is replaced with a reference to the
first entry in the `argSlots` list (i.e. "0i" since `argSlots` is 0-indexed).

The same library notices `bob` is referenced, and is present in the internal
`obj <-> importID` import table (proxies are always already present in this
table, since they were added when the reference was first received). The
matching importID "-10a" is appended to the `argSlots` list, and the index
(the second entry, "1i") is used in the serialization.

`vatSlots(A)`:

| index | target     |
|------:|------------|
|   20a | alice      |
|  -10a | proxyBob   |
|  -11a | proxyCarol |

A does:

```
syscall.send(targetSlot=-10a,
             method='foo',
             argsString='[{@qclass: "ref", index: 0i},
                          {@qclass: "ref", index: 1i},
                         ]',
             argSlots=[20a, -10a])
```

Kernel translates target slot (`[A, -10a]`) into `[B, 40b]`. It leaves
`argsString` alone (the kernel never tries to parse that string). But it
walks `argSlots` to translate the A-output values into B-input ones.

The first slot ("20a") is positive, so it is an export, and thus does not
need to appear in `kernelSlots[A].forward`. However we do need something in
`kernelSlots[B].forward` which maps to `[A, 20a]`. It checks
`kernelSlots[B].backward.has([A, 20a])` and sees that it is not yet present,
so it allocates a new import for B ("-30b" is the next available value). Both
directions are added: `kernelSlots[B].forward.set(-30b, [A, 20a])` and
`kernelSlots[B].backward.set([A, 20a], -30b)`. The first value of argSlots is
replaced with "-30b".

The second slot ("-10a") is negative, so it is an import, and must therefore
already be present in `kernelSlots[A].forward]`. It maps to `[B, 40b]`, which
is owned by the same vat as the message is targetting, so `argSlots` can just
use "40b" directly.

`kernelSlots`:

| fromVatID | fromSlotID | toVatID | toSlotID |
|----------:|-----------:|--------:|---------:|
|         A |       -10a |       B |      40b |
|           |       -11a |       C |      50c |
|         B |       -30b |       A |      20a |

The kernel then queues a message:

```
{ vatID=B,
  slotID=40b,
  method='foo',
  argsString='[{@qclass: "ref", index: 0i},
               {@qclass: "ref", index: 1i},
              ]',
  argSlots=[-30b, 40b])
}
```

When this message gets to the front of the queue, the kernel invokes:

```
B.deliver(
  slotID=40b,
  method='foo',
  argsString='[{@qclass: "ref", index: 0i},
               {@qclass: "ref", index: 1i},
              ]',
  argSlots=[-30b, 40b])
}
```

B's comms library deserializes argsStrings, replacing "refs" with other
objects. The first one encountered looks up `index=0` in `argSlots` and sees
"-30b", which is negative, so it is an import. This is not yet present in B's
table (`!vatSlotsB.has(-30b)`), so a new proxy is created (which remembers
"-30b" internally), and this proxy is inserted into the slowly-forming
argument graph.

The second `ref` encountered cites `index=1`, which maps to "40b". This is
positive, so it must be a previously-exported object. This object (i.e.
`bob`) is looked up in `vatSlotsB[40b]` and inserted into the argument graph.

The comms library finishes creating the object graph: `[proxyAlice, bob]`. It
then invokes `bob.foo([proxyAlice, bob])`.

`vatSlotsB`:

| index | target     |
|------:|------------|
|   40b | bob        |
|  -30b | proxyAlice |


If A were to invoke `bob.foo(alice, bob)` again, none of the tables would
need updating, and object identity would be retained. A's comms library
notices that `alice` is already present in `vatSlotsA`, so it gets mapped to
"20a" without modifying the table. The kernel sees that `[A, 20a]` is already
present in `kernelSlots[B].backward`, so it can translate that to `-30b`
without modifying the table. B's comms library sees that `-30b` is already
present in `vatSlotsB` so it re-uses `proxyAlice` from the previous delivery.

If A were to invoke `bob.foo(alice, alice)`, the `argsString` would have
multiple copies of a `{@qclass: "ref", index: 0i}` node, but `argsSlots`
would have just one copy of `-30b`.


## Third Message: Three-Party Introduction

A invokes `bob.bar(carol)`.

A's comms library serializes the object graph as before, producing a
reference to carol ("-11a") in the arguments:

```
syscall.send(targetSlot=-10a,
             method='bar,
             argsString='[{@qclass: "ref", index: 0i},
                          {@qclass: "ref", index: 1i},
                         ]',
             argSlots=[-11a])
```

The kernel translates the target slot into B's "40b" as before, but when it
translates the `argSlots` it sees `kernelSlots[A].forward(-11a)` maps to `[C,
50c]`, which lives on a Vat (C) that differs from the target of the message
(B). This is not a reference being sent back home, so we must make sure B has
an import of this reference (just as if the value had been negative, which
would have made it an export of A, which is certainly going to become an
import of B). So we check `kernelSlots[B].backward.has([C, 50c])` and come up
empty. This provokes an allocation of a new import for B, and "-31b" is the
next available value.

`kernelSlots`:

| fromVatID | fromSlotID | toVatID | toSlotID |
|----------:|-----------:|--------:|---------:|
|         A |       -10a |       B |      40b |
|           |       -11a |       C |      50c |
|         B |       -30b |       A |      20a |
|           |       -31b |       C |      50c |

The kernel then queues:

```
{ vatID=B,
  slotID=40b,
  method='bar',
  argsString='[{@qclass: "ref", index: 0i}]',
  argSlots=[-31b])
}
```

When this message gets to the front of the queue, the kernel invokes:

```
B.deliver(
  slotID=40b,
  method='bar',
  argsString='[{@qclass: "ref", index: 0i}]',
  argSlots=[-31b])
}
```

B's deserialization sees "-31b", which isn't present in `vatSlotsB`, so it
allocates a new proxy:

`vatSlotsB`:

| index | target     |
|------:|------------|
|   40b | bob        |
|  -30b | proxyAlice |
|  -31b | proxyCarol |
