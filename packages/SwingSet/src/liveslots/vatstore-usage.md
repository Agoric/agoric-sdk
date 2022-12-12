# How Liveslots Uses the Vatstore

Each vat gets exclusive access to a portion of the kernel's `kvStore`, implemented with a simple prefix: when vat `v6` uses `syscall.vatstoreSet('key', 'value')`, the kvStore records the value in key `v6.vs.key`.

Userspace gets an attenuated object named `vatPowers.vatstore`. When userspace calls `vatPowers.vatstore.set('key', 'value')`, liveslots performs `syscall.vatstoreSet('vvs.key', value)`, which results in a kernel kvStore entry under key `v6.vs.vvs.key`.

The rest of the vat's keyspace is used by liveslots:

* virtual object Kind metainformation
* data for each virtual object
* virtual collection metainformation and entries
* reference counts for virtual objects (tracking references from other virtual objects)
* export status for virtual objects
* the id of the "baggage" object, delivered across vat upgrades

This file describes the layout of the vatstore keyspace.


# Counters

Liveslots maintains three counters to create the distinct vrefs that it transmits to the kernel. These counters are initialized the first time `startVat` is called (in the very first version of a vat), and written to the vatstore at the end of each delivery.

* `exportID`: each exported object vref (`o+NN`) and virtual/durable Kind gets the next ID
* `collectionID`: each collection gets the next ID
* `promiseID`: each exported Promise and outbound-message `result` gets the next ID

The first ten exportIDs (`o+0` through `o+9`) are consumed by liveslots during vat startup, leaving `o+10` as the first one available for userspace.

* `o+0`: root object
* `o+1`: the KindHandle Kind ID
* `o+2 .. o+9`: KindHandles for the built-in virtual/durable collections
* `o+10`: first available for userspace Remotables or Kinds


# Virtual Object Kinds

Vats can use `VatData.defineKind()` to define categories (classes) of virtual data. The effective schema for each "Kind" contains an interface name, a set of `state` property names, and a list of facet names (which may be empty, indicating a single-facet Kind).

The standard Kind is "single-facet", meaning that each instance of the virtual object yields exactly one "Representative". However many security patterns require a collection of "Facet" Representatives which share access to common state. These Facets are all created at the same time and returned in a single record called a "cohort".

`defineKind` also specifies the runtime behavior: an `init` function called to create the initial state of each instance, a `behavior` record to provide methods for each instance, and an optional `finish` function to perform post-initialization tasks like registering the new object in a collection. `defineKind` returns a "kind constructor", typically named e.g. `makeFoo()` to make instances of the "foo" kind.

Each time the kind constructor is called, a new "baseref" is allocated for the cohort, and the (one or multiple) facet Representatives are created. Each Representative/Facet gets a separate vref, all of which are extensions of the baseref.

The vref is used when interacting with the kernel (in `syscall.send` etc.), and in virtualized data (inside the capdata `slots` that point to other objects). The vatstore keys that track GC refcounts and the export status use the "baseref" instead.

The vrefs are built out of three pieces:
* Kind ID, e.g. `o+11`. These are allocated from the same "Export ID" numberspace as exported Remotables (JavaScript objects marked with `Far`).
* Instance ID, an integer, `1` for the first instance of each Kind, incrementing thereafter
* Facet ID, missing for single-facet Kinds, else an integer starting from `0`

These are combined with simple delimiters: `/` between the Kind ID and the Instance ID, and `:` before the Facet ID (if any).

In a c-list or virtualized data, you may see vrefs like these:

* `o-3`: an imported Presence, pointing to some object in a different vat
* `o+0`: the root object, a plain Remotable
* `o+10`: another plain Remotable, exported from this vat or stored in virtualized data
* `o+11/1`: a Representative for the first instance of single-facet Kind "o+11"
* `o+11/2`: a Representative for the second instance of single-facet Kind "o+11"
* `o+12/1:0`: the first facet of the first instance of a multi-facet Kind "o+12"
* `o+12/1:1`: the second facet of that same instance
* `o+12/2:0`: the first facet of a different instance
* `o+12/3:0`: the first facet of another different instance

Each instance of a virtual object stores state in a vatstore key indexed by the baseref. If `o+12/1:0` and `o+12/1:1` are the facet vrefs for a cohort whose baseref is `o+12/1`, the cohort's shared state will be stored in `vom.o+12/1`, as a JSON-serialized record. The keys of this record are property names: if the Kind uses `state.prop1`, the record will have a key named `prop1`. For each property, the value is a capdata structure: a record with two properties `body` and `slots`.

* `v6.vs.vom.o+12/1` : `{"prop1":{"body":"1","slots":[]}}`

In the refcounting portion of the vatstore (`vom.rc.${baseref}`), you will see baserefs:

* `v6.vs.vom.rc.o+10`: the count of virtualized references to plain Remotable `o+10` (held in RAM)
* `v6.vs.vom.rc.o+12/1`: the count of references to any member of the cohort for the first instance of Kind `o+12`
  * this Kind might be single-facet or multi-facet
  * if multi-facet, and one object points to both `o+12/1:0` and `o+12/1:1`, the refcount would be "2"

In the export-status portion of the vatstore (`vom.es.${baseref}`), you will see baserefs, and any facets are tracked in the value, not the key:

* `v6.vs.vom.es.o+10`: `r`: the plain Remotable has been exported and is "reachable" by the kernel
* `v6.vs.vom.es.o+10`: `s`: the Remotable was exported, the kernel dropped it, and is still "recognizable" by the kernel ("s" for "see")
  * if the kernel can neither reach nor recognize the export, the vatstore key will be missing entirely
* `v6.vs.vom.es.o+11/1`: this records the export status for the single-facet `o+11/1` virtual object
  * since this Kind is single-facet, the value will be the same as for a plain Remotable: a single `r` or `s` character
* `v6.vs.vom.es.o+12/1`: this records the export status for all facets of the `o+12/1` cohort
  * since this Kind is multi-facet, the value will be a string with one letter for each facet, in the same order as their Facet ID. `n` is used to indicate neither reachable nor recognizable. A value of `rsnr` means there are four facets, the first (`o+12/1:0`) and last (`o+12/1:3`) are reachable, the second (`o+12/1:1`) is recognizable, and the third (`o+12/1:2`) is neither.


# Durable Kinds

Virtual objects are held on disk, which makes them suitable for high-cardinality data that may not fit in RAM: many objects, most of which are "idle" at any given time. However virtual objects do not survive a vat upgrade. For this, vats should define one or more "Durable Kinds" instead.

Durable Kinds are defined just like virtual Kinds, but they use a different constructor (`defineDurableKind` instead of `defineKind`), which requires a "handle" created by `makeKindHandle`. Durable virtual objects can only hold durable data in their `state`.

The KindHandle is a durable virtual object of a special internal Kind. This is the first Kind allocated, so usually it gets Kind ID `1` and the handles get vrefs like `o+1/${kindHandleID}`.


# Kind Metadata

For each virtual object kind that is defined we store a metadata record for purposes of scanning directly through the defined kinds when a vat is stopped or upgraded.  For durable kinds this record is stored in `vom.dkind.${kindID}`; for non-durable kinds it is stored in `vom.vkind.${kindID}`.  Currently this metadata takes the form of a JSON-serialized record `{ kindID, tag }`, where the `kindID` property is the kind ID (redundantly) and `tag` is the tag string as provided in the `defineKind` or `makeKindHandle` call.

Durable kinds need to store their `nextInstanceID` in the DB, so that subsequent versions can begin allocating new instances from a non-overlapping starting point. For durable kinds, the metadata record is initially `{ kindID, tag, nextInstanceID }`, and the `nextInstance` property is updated after every durable-object allocation.

In addition, durable kinds also need to keep track of whether they are single- or multi-faceted and, if the latter, what the names of the facets are. This information is required so that kind definitions in upgraded versions of the containing vat are maintained in a backwards compatible manner over time.  When a kind becomes defined as a single-faceted kind, a property `unfaceted` (with the value `true`) will be added to the descriptor record.  For a multi-faceted kind, the record will be given a property `facets` whose value is an array of the facet names, in the same order as the assignment of facet indices within the cohort record.

# Virtual/Durable Collections (aka Stores)

Liveslots provides a handful of "virtual collection" types to vats, to store high-cardinality data on disk rather than in RAM. These are also known as a `Store`. They provide limited range queries and offer a single fixed sort index: numbers sort as usual, BigInts sort as usual but separate from numbers, strings sort lexicographically by UTF-8 encoding, and object references sort by insertion order.

Collections are created by functions on the `VatStore` global:

* `makeScalarBigMapStore`
* `makeScalarBigWeakMapStore`
* `makeScalarBigSetStore`
* `makeScalarBigWeakSetStore`

Each function accepts an `isDurable` argument, so there are currently 8 collection types.

Each collection type is assigned a Kind index, just like the user-defined Kinds. The 8 collection types are allocated before userspace gets a chance to call `defineKind` or `defineDurableKind`, so they claim earlier ID numbers.

These index values are stored in `storeKindIDTable`, as a mapping from the collection type name ("scalarMapStore", "scalarDurableMapStore", "scalarWeakSetStore", etc.) to the integer of their ID. The current table assignments are:

* `v6.vs.storeKindIDTable` : `{"scalarMapStore":2,"scalarWeakMapStore":3,"scalarSetStore":4,"scalarWeakSetStore":5,"scalarDurableMapStore":6,"scalarDurableWeakMapStore":7,"scalarDurableSetStore":8,"scalarDurableWeakSetStore":9}`

which means `o+2` is the Kind ID for non-durable merely-virtual `scalarMapStore`.

Each new store, regardless of type, is allocated the next available Collection ID. This is an incrementing integer that starts at `1`, and is independent of the numberspace used by exported Remotables and Kind IDs. The same Collection ID numberspace is shared by all collection types. So unlike virtual objects (where `o+NN/MM` means the `MM` is scoped to `o+NN`), for collections `o+NN/MM` means the `MM` is global to the entire vat. No two stores will have the same `MM`, even if they are of different types.

The interpretation of a vref therefore varies based on whether the initial "type" portion before a slash (`o+${exportID}`) identifies a collection type or a virtual object kind:

* `o+11/1` : `o+11` is a kind, so `/1` refers to the first instance of that kind
* `o+11/2` : second instance of that kind
*
* `o+6/1` : `o+6` is a collection type (scalarDurableMapStore), so `/1` refers to the first collection in the vat
* `o+7/2` : second collection in the vat, which happens to be of type `o+7` (scalarDurableWeakMapStore)
* `o+5/3` : third collection in the vat, of type `o+5` (scalarWeakSetStore)
* `o+5/4` : fourth collection in the vat, also a scalarWeakSetStore


# Baggage

Most collections are created by userspace code, but to support vat upgrade, liveslots creates one special collection named "baggage". This is a `scalarDurableMapStore` that is passed into the third argument of `buildRootObject`.

This object needs to be pre-generated because the second (and subsequent) versions of the vat will use it to reach all other durable objects from their predecessors, so v2 can remember things that were stored by v1. The most significant values of "baggage" are the KindHandles for durable Kinds made by v1. V2 will need these to call `defineDurableKind` and re-attach behavior for each one. Each version must re-attach behavior for *all* durable Kinds created by its predecessors, to satisfy the obligations created when the older version exported durable objects of those Kinds.

`o+6/1` is allocated for the "baggage" collection, indicating that it is a scalarDurableMapStore (`o+6` is used for that collection type), and also that it is the first collection (of any type) allocated in the vat.

If userspace version 1 starts `buildRootObject` by calling `makeScalarBigWeakSetStore()` and then three `makeScalarSetStore()`s, they are likely to be assigned `o+5/2`, `o+4/3`, `o+4/4`, and `o+4/5` respectively. The collections IDs start with `2` because `1` was used for baggage.


# Collection Data Records

We examine a vat which performs the following at startup:

```js
const initFoo = arg => ({ prop1: arg });
const fooBehavior = {
  getProp1: ({ state }) => state.prop1,
};
const makeFoo = VatData.defineKind('foo', initFoo, fooBehavior);
const foo = makeFoo(1);
const foo2 = makeFoo(2);
const c1 = VatData.makeScalarBigMapStore('mylabel');
c1.init('key1', foo);
c1.init('key2', foo);
c1.init('key3', foo);
c1.init('key4', foo2);
```

Each collection stores a number of metadata keys in the vatstore, all with a prefix of `vc.${collectionID}.|` (note that the collection *type* is not a part of the key, only the collection *index*). The currently defined metadata keys (copied from the record for the "mylabel" Kind stored in `c1`) are:

* `v6.vs.vc.2.|entryCount`: `4` (the size of the collection&mdash;4 entries = 4 calls to `c1.init`)
* `v6.vs.vc.2.|label`: `mylabel` (a debugging label applied when the collection is created)
* `v6.vs.vc.2.|nextOrdinal`: `1` (a counter used to allocate index values for Objects used as keys)
* `v6.vs.vc.2.|schemata`: `{"body":"[{\"@qclass\":\"tagged\",\"tag\":\"match:scalar\",\"payload\":{\"@qclass\":\"undefined\"}}]","slots":[]}`

The `schemata` is a capdata serialization of the Matcher constraints recorded for the collection. These constraints can limit keys to be just strings, or numbers, etc. The schemata consists of one schema for the keys and a separate schema for the values.

Each entry in the collection gets put into a single vatstore entry:

* `v6.vs.vc.2.skey1`: `{"body":"{\"@qclass\":\"slot\",\"iface\":\"Alleged: foo\",\"index\":0}","slots":["o+9/1"]}`
* `v6.vs.vc.2.skey2`: `{"body":"{\"@qclass\":\"slot\",\"iface\":\"Alleged: foo\",\"index\":0}","slots":["o+9/1"]}`
* `v6.vs.vc.2.skey3`: `{"body":"{\"@qclass\":\"slot\",\"iface\":\"Alleged: foo\",\"index\":0}","slots":["o+9/1"]}`
* `v6.vs.vc.2.skey4`: `{"body":"{\"@qclass\":\"slot\",\"iface\":\"Alleged: foo\",\"index\":0}","slots":["o+9/2"]}`

The key string for each entry (e.g. `skey1`) is formed by serializing the key object. Strings get a simple `s` prefix. Other objects use more complex encodings, designed to allow numbers (floats and BigInts, separately) to sort numerically despite the kvStore keys sorting lexicographically. See `packages/store/src/patterns/encodePassable.js` for details. Object references involve an additional kvStore entry, to manage the mapping from Object to ordinal and back.

For weak stores, the collection manager also maintains database keys of the form `vom.ir.${vref}|${collectionID}`, where in this case `${vref}` is the vref of a virtual object, store, import, or remotable, and `${collectionID}` is the collection ID of a weak store in which the given vref is used as a key. This is to enable the collection manager to locate and remove collection entries whose keys are being garbage collected. Note that mere presence or absence of such a key in the database is significant but the value associated with it is not.
