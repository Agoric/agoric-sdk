## inbound messages

Messages arriving from distant machines will appear as a string on a
transport device, will will invoke the inbound handler with the JSON encoding
of the following data structure:

```
{
  target: { type: 'your-egress', id: N1 },
  methodName: 'foo',
  args: [ arg1,
          {'@qclass': 'slot', index: 0},
          {'@qclass': 'slot', index: 1},
          ],
  slots: [ { type: 'your-egress', id: N2 },
           { type: 'your-ingress', id: N3 },
           ],
  resultSlot: { type: 'your-resolver', id: N4 },
}
```

In this example, the sending machine has access to some object exported by
(i.e. an egress of) our receiving machine, so the sending machine describes
it as "your egress" in the message. The sending machine uses index `N1` to
identify the particular egress, which wil be looked up in the
sending-machine-specific c-list and mapped to one of the comms vat's kernel
imports (which of course is really an export of some other local vat, which
is where the message will eventually be delivered).

The sender is trying to invoke a method named `foo` on this exported object.
They are going to invoke it with three arguments. The first is some plain
data (a string, `"arg1"`). The other two are slots, for which the description
is included in the `slots` field rather than getting baked into the `args`
string.

The first of these slots (`N2`) is one of the receiving machine's exported
objects, coming back home, so it is described as `your-egress` just like the
target of the message itself. The exported object lives somewhere on the
receiving machine, but it doesn't necessarily live in the same vat as the
target: it might live on some other local vat.

The other slot (`N3`) describes an object that lives on the *sender*'s
machine. It is a `your-ingress`, which means "hey receiving machine, guess
what, you're now importing something from me, and you should use `N3` (which
I just made up) if you ever want to send it a message or talk to me about
it".

Message targets must always be `your-egress` or `your-resolver`(?), but the
arguments can be either ingress or egress.

The last field, `resultSlot`, tells the receiving machine what it should do
with the results of the message invocation. This should either be `undefined`
(which means "sendOnly", where the sender doesn't care when or even if the
message is delivered, and doesn't need the return value at all), or a
`your-resolver` slot. The `your-resolver` slot means the sender has allocated
an index (`N4`) and the receiver should remember that N4 refers to the
promise for the results of invoking `foo()`. The sender might refer to this
promise later (in an argument), or might send messages at it (in `target)`.

## promise resolution messages

The sender also implicitly wants to know when the promise resolves: when that
happens, the receiver should send back a message that references the promise
ID. There are three possibilities: fulfill to data, fulfill to presence, and
rejection.

To fulfill to data, the inbound handler should get the JSON encoding of:

```
{
  event: 'notifyFulfillToData',
  args: ...,
  slots: [ ... ],
}
```

In this case, `args` refers to a single object (whereas for inbound messages
`args` must always be an array, since functions are invoked with a list of
positional arguments, but return a single value). These `args` can refer to
an arbitrary number of slots, just like inbound messages.

To fulfill to a single callable presence slot, we use:

```
{
  event: 'notifyFulfillToPresence'
  target: { type, id },
}
```

The `target` field must have a type of `your-egress` or `your-ingress`,
depending upon whether the promise is being fulfilled to something on the
receiver's side or on the sender's side.

It cannot be a promise, since resolving a promise to another promise is not
fulfilling (it is resolving, but not fulfilling). This case is called
"forwarding", and is not implemented yet (and will use a different kind of
message when it is implemented).

Note that `notifyFulfillToData` can return an object which *contains* a
promise (an array, or a pass-by-copy object in which one property is a
promise). The only restriction is that the top-level object itself must not
be a promise.

`notifyFulfillToPresence` is special because it is the one case that allows
pipelined messages to be delivered to the new target.

To reject the promise (e.g. when the method creating it raised an exception
instead of returning a value), use:

```
{
  event: 'notifyReject'
  args: ...,
  slots: [ ... ],
}
```

