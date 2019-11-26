## Types of "Slots" in the CommsVat

You can think of a slot as a data object that represents either an
object or a promise, and is either a local or remote. The slot type
changes as a message passes through various parts of the system. For instance,
let's look at a specific case, where a vat `a` in Machine A is sending a
message to a vat `b` in Machine B about an object that lives on `a`. 

[ Diagram to come ]

The same object on vat `a` has the following representations:

* in vat `a`: { type: 'export', id: 1 }
* in the commsVat on Machine A: { type: 'import', id: 2}
* over the wire: { type: 'your-ingress', id: 3 }
* in the commsVat on Machine B: { type: 'export', id: 4 }
* in vat `b`: { type: 'import', id: 5 }

(The ids are not exact to our specific implementation, but were chosen
to indicate that all the ids are unrelated to each other.)

## Over the Wire Slot Types

The possible types are:
* your-egress
* your-ingress
* your-promise
* your-resolver

All types are put in the format that the receiving machine can
understand, i.e. from the receiving machine's perspective. 

A *egress* type is used to represent a local object that has a remote
reference to it. 

A *ingress* type is used to represent a remote reference to a local
object on another machine. 

A *promise* type is used to represent a remote promise which may be
settled or not (and if settled, resolved or rejected). Holding a
promise type means that you will be notified when the remote promise
settles.

A *resolver* type is used to represent a local promise that will be
represented remotely. Holding a resolver type means that you have the
ability to settle the promise. 

Ingress and egress types can appear in the slots of messages going
either way - in other words, the arguments of my message can be
referencing either things on my machine
or your machine (or a third machine!).

Egress and resolver types have agency, ingress and promise types are
passive.

Comparison to the E version of CapTP:

In the E version of CapTP, there are four tables: questions, answers, imports, and
exports. We only have ingresses and egresses

For more information about the four tables in the E version of CapTP see:
http://www.erights.org/elib/distrib/captp/4tables.html
