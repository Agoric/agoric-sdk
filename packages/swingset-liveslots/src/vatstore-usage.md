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

# vref virtual/durable annotations

When vats export object references into the kernel, they create "vrefs" as reference identifiers. For non-virtual objects (ephemeral "Remotables", held in RAM rather than the DB), these take the form of `o+NN` (e.g. `o+0`, `o+12`, `o+937`). Virtual and durable exported objects get an additional `v` or `d` annotation, so their vrefs start with e.g. `o+v99` or `o+v132` for virtual objects, and `o+d3` or `o+d77` for durable objects. The kernel can use these annotations to assist in the cleanup process when a vat is upgraded, and non-durable objects are abandoned.

Kind handles are necessarily durable, as is the "baggage" object. Promises are necessarily ephemeral, so vat-allocated promise vrefs (aka "vpids") always use the `p+NN` form, and never have a `v` or `d` annotation.

# Counters

Liveslots maintains three durable counters to create the distinct vrefs that it transmits to the kernel. These counters are initialized when `startVat` is called to create the first incarnation of a vat (see `initialIDCounters` and `initializeIDCounters` in [liveslots.js](./liveslots.js)), and written to the vatstore at the end of each delivery as a JSON-serialized record at key `idCounters` (see `flushIDCounters`).

* `exportID`: an integer indicating the ID of the next exported Remotable or defined Kind and incremented upon each allocation of such a value. Technically starts at 1, but that is mostly irrelevant because the root object itself is associated with 0 and many initial values are claimed before any userspace vat code has a chance to run (described below).
* `collectionID`: an integer indicating the ID of the next collection and incremented upon each allocation of a new collection. Starts at 1, which is claimed by "[baggage](#baggage)".
* `promiseID`: an integer indicating the ID for the next exported promise (including a promise implicitly created for outbound-message results) and incremented upon each allocation. Starts at 5.

The current version of liveslots consumes the first ten exportIDs (covering `o+0` through `o+9`) during vat startup, leaving `10` as the first exportID available for userspace.

* `o+0`: root object
* `o+d1`: identifies the KindHandle Kind ID, each `o+d1/${kindHandleID}` instance of which is a KindHandle
* `o+v2` through `o+v5`: KindHandles for the built-in [virtual collections](#virtualdurable-collections-aka-stores)
* `o+d6` through `o+d9`: KindHandles for the built-in [durable collections](#virtualdurable-collections-aka-stores)
* `o+10` / `o+v10` / `o+d10`: first available for userspace Remotables or Kinds


# Virtual Object Kinds

Vats can use `VatData.defineKind()` to define categories (classes) of virtual data (see [Virtual and Durable Objects](../../SwingSet/docs/virtual-objects.md)). The effective schema for each "Kind" contains an interface name, a set of `state` property names, and a list of facet names (which may be empty, indicating a single-facet Kind).

The standard Kind is "single-facet", meaning that each instance of the virtual object yields exactly one "Representative". However many security patterns require a collection of "Facet" Representatives which share access to common state. These Facets are all created at the same time and returned in a single record called a "cohort".

`defineKind` also specifies the runtime behavior: an `init` function called to create the initial state of each instance, a `behavior` record to provide methods for each instance, and an optional `finish` function to perform post-initialization tasks like registering the new object in a collection. `defineKind` returns a "kind constructor", typically named e.g. `makeFoo()` to make instances of the "foo" kind.

Each time the kind constructor is called, a new "baseref" is allocated for the cohort, and the (one or multiple) facet Representatives are created. Each Representative/Facet gets a separate vref, all of which are extensions of the baseref.
Those vrefs are used when interacting with the kernel (in `syscall.send` etc.), and in virtualized data (inside the capdata `slots` that point to other objects), but the vatstore keys that track GC refcounts and export status use the "baseref" instead.

The baseref is built out of two pieces separated by a literal `/`:

1. Prefixed Kind ID, e.g. `o+v11` or `o+d11`. These are allocated using the same exportID [counter](#counters) as exported Remotables (JavaScript objects marked with `Far`), meaning exported objects and Kind IDs share a numberspace.
2. Instance ID, an integer. `1` for the first instance of each Kind and incremented for each subsequent instance.

The vref for a Representative of a single-facet virtual Kind is just the `o+v${kindID}/${instanceID}` baseref. The vref for a Representative of a facet of a multi-facet virtual Kind extends that to `o+v${kindID}/${instanceID}:${facetID}`, where the additional component is:

3. Facet ID, an integer. `0` for the first facet and incremented for each subsequent facet.

In a c-list or virtualized data, you may see vrefs like these:

* `o-3`: an imported Presence, pointing to some object in a different vat
* `o+0`: the root object, a plain Remotable
* `o+10`: another plain Remotable, exported from this vat or stored in virtualized data
* `o+d11/1`: a Representative for the first instance of single-facet virtual Kind `o+v11`
* `o+d11/2`: a Representative for the second instance of single-facet virtual Kind `o+v11`
* `o+d12/1:0`: the first facet of the first instance of a multi-facet durable Kind `o+d12`
* `o+d12/1:1`: the second facet of that same instance
* `o+d12/2:0`: the first facet of a different instance
* `o+d12/3:0`: the first facet of yet another different instance

Each instance of a virtual object stores state in a vatstore key indexed by the baseref. If `o+d12/1:0` and `o+d12/1:1` are the facet vrefs for a cohort whose baseref is `o+d12/1`, the cohort's shared state will be stored by the virtual object manager in `vom.o+d12/1` as a JSON-serialized record. The keys of this record are property names: if the Kind uses `state.prop1`, the record will have a key named `prop1`. For each property, the value is a `{ body: string, slots: any[] }` capdata record with string-valued slot items (and unlike the treatment of capdata in many other parts of the system, it is not serialized independently of the enclosing structure).

* `v6.vs.vom.o+d12/1` : `{"booleanProp":{"body":"true","slots":[]},"arrayProp":{"body":"[]","slots":[]}}`

In the refcounting portion of the vatstore (`vom.rc.${baseref}`), you will see baserefs:

* `v6.vs.vom.rc.o+10`: the count of virtualized references to plain Remotable `o+10` (held in RAM)
* `v6.vs.vom.rc.o+d12/1`: the count of references to any member of the cohort for the first instance of durable Kind `o+d12`
  * This Kind might be single-facet or multi-facet.
  * References to distinct facets of the same cohort are counted independently. For example, if one object references both the first and second facets (`o+d12/1:0` and `o+d12/1:1`), it accounts for two increments to this value.

In the export-status portion of the vatstore (`vom.es.${baseref}`), you will see baserefs, and any facets are tracked in the value, not the key:

* `v6.vs.vom.es.o+10` records the export status for plain Remotable `o+10`
  * value `r`: the plain Remotable has been exported and is "reachable" by the kernel
  * value `s`: the Remotable was exported, the kernel dropped it, and is still "recognizable" by the kernel ("s" for "see", refer to [Garbage Collection in SwingSet](../../SwingSet/docs/garbage-collection.md) for details)
  * If the kernel can neither reach nor recognize the export, the vatstore key will be missing entirely.
* `v6.vs.vom.es.o+d12/1` records the export status for all facets of the durable object whose vref is `o+d12/1` (i.e., the first instance of durable Kind `o+d12`)
  * If the Kind is single-facet, the value will be the same as for a plain Remotable: a single `r` or `s` character
  * If the Kind is multi-facet, the value will be a string with one letter for each facet, in the same order as their Facet ID. `n` is used to indicate neither reachable nor recognizable. For example, a value of `rsnr` means there are four facets, the first (`o+d12/1:0`) and last (`o+d12/1:3`) are reachable, the second (`o+d12/1:1`) is recognizable, and the third (`o+d12/1:2`) is neither.


# Durable Kinds

Virtual objects are held on disk, which makes them suitable for high-cardinality data that is likely too large for our vat workers' limited RAM budget: many objects, most of which are "idle" at any given time. However virtual objects do not survive a vat upgrade. For this, vats should define one or more "Durable Kinds" instead.

Durable Kinds are defined just like virtual Kinds, but they use a different constructor (`defineDurableKind` instead of `defineKind`), which requires a "handle" created by `makeKindHandle`. Durable virtual objects can only hold durable data in their `state`.

The KindHandle is a durable virtual object of a special internal Kind. This is the first Kind allocated, so usually it gets exportID 1 to use as a Kind ID, and the kind handles for virtual and durable Kinds get vrefs like `o+d1/${kindHandleID}`.


# Kind Metadata

For each virtual object kind that is defined, we store a metadata record for purposes of scanning directly through the defined kinds when a vat is stopped or upgraded. For durable kinds this record is stored in `vom.dkind.${kindID}`; for non-durable kinds it is stored in `vom.vkind.${kindID}`. Currently this metadata takes the form of a JSON-serialized record with the following properties:
* `kindID`, the kind ID as a numeric string (redundantly with the storage key)
* `tag`, the tag string as provided in the `defineKind` or `makeKindHandle` call
* `nextInstanceID`, an integer that is present only for durable kinds. It ensures that all versions share a single sequence of unique instance IDs. `nextInstanceID` is added to the metadata record upon allocation of the first instance of the kind and updated after each subsequent allocation.
* `unfaceted`, a property with boolean value `true` that is present only for single-facet durable kinds.
* `facets`, an array that is present only for multi-facet durable kinds. Its elements are the names of the kind's facets, in the same order as the assignment of facet indices within the cohort record.

`unfaceted` and `facets` are required so that kind definitions in upgraded versions of the containing vat are maintained in a backwards compatible manner over time.

# Virtual/Durable Collections (aka Stores)

Liveslots provides vats with a handful of "virtual collection" types for storing high-cardinality data on disk rather than in RAM. Each instance of one of these types is described as a "[Store](../../store/docs/store-taxonomy.md)". They provide limited range queries and offer a single fixed sort index: numbers sort as usual, BigInts sort as usual but separate from numbers, strings sort lexicographically by UTF-8 encoding, and object references sort by insertion order.

Collections are created by functions on the `VatStore` global:

* `makeScalarBigMapStore`
* `makeScalarBigWeakMapStore`
* `makeScalarBigSetStore`
* `makeScalarBigWeakSetStore`

Each function accepts a boolean `durable` option, so there are currently 8 collection types.

Each collection type is assigned a Kind index, just like the user-defined Kinds. The 8 collection types are allocated before userspace gets a chance to call `defineKind` or `defineDurableKind`, so they claim earlier exportID numbers as described [above](#counters).

These index values are stored in `storeKindIDTable`, as a mapping from the collection type name ("scalarMapStore", "scalarDurableMapStore", "scalarWeakSetStore", etc.) to the integer of their ID. The current table assignments are:

* `v6.vs.storeKindIDTable` : `{"scalarMapStore":2,"scalarWeakMapStore":3,"scalarSetStore":4,"scalarWeakSetStore":5,"scalarDurableMapStore":6,"scalarDurableWeakMapStore":7,"scalarDurableSetStore":8,"scalarDurableWeakSetStore":9}`

which means `2` is the Kind ID for non-durable merely-virtual "scalarMapStore", instances of which will have vrefs like `o+v2/${collectionID}`.

Each new store, regardless of type, is allocated the next available collectionID [counter](#counters). This is an incrementing integer that starts at 1, and forms a numberspace independent of the exportID counter used by exported Remotables and Kind IDs. The same collectionID numberspace is shared by all collection types. So unlike virtual objects (where the instanceID in `o+v${kindID}/${instanceID}` is scoped to `o+v${kindID}`), for collections the collectionID in `o+v${collectionType}/${collectionID}` is global to the entire vat. No two stores will have the same collectionID, even if they are of different types.

The interpretation of a vref therefore varies based on whether the initial "type" portion before a slash (`o+v${exportID}` or `o+d${exportID}`) identifies a collection type or a virtual object kind:

* `o+d6/1`: `6` is a collection type in the storeKindIDTable ("scalarDurableMapStore"), so `o+d6/1` refers to the first collection (of any type) in the vat
* `o+d7/1`: `7` is also a collection type in the storeKindIDTable ("scalarDurableWeakMapStore"), so `o+d7/1` is guaranteed not to coexist with `o+d6/1`
* `o+d7/2`: refers to the second collection (of any type) in the vat, which has type `7` ("scalarDurableWeakMapStore")
* `o+v5/3`: refers to the third collection (of any type) in the vat, which has type `5` ("scalarWeakSetStore")
* `o+v5/4`: refers to the fourth collection (of any type) in the vat, also a scalarWeakSetStore
* `o+v11/1`: `11` is not a collection type in the storeKindIDTable, so is instead a kind and `o+v11/1` refers to the first instance of that kind
* `o+v11/2`: refers to the second instance of that kind


# Baggage

Most collections are created by userspace code, but to support vat upgrade, liveslots creates one special collection named "baggage". This is a `scalarDurableMapStore` that is passed into the third argument of `buildRootObject`.

This object needs to be pre-generated because the second (and subsequent) versions of the vat will use it to reach all other durable objects from their predecessors, so v2 can remember things that were stored by v1. The most significant values of "baggage" are the KindHandles for durable Kinds made by v1. V2 will need these to call `defineDurableKind` and re-attach behavior for each one. Each version must re-attach behavior for *all* durable Kinds created by its predecessors.

The above rules about kindID and collectionID allocation result in the baggage being associated with vref `o+d6/1`, indicating that it is a scalarDurableMapStore (`o+d6` is used for that collection type) and also that it is the first collection of any type allocated in the vat. This value is also stored under key `baggageID` (see `provideBaggage` in [collectionManager.js](./collectionManager.js)).
* `v6.vs.baggageID` : `o+d6/1`

If userspace version 1 starts `buildRootObject` by calling `makeScalarBigWeakSetStore()` and then three `makeScalarSetStore()`s, the collections are likely to be assigned `o+v5/2`, `o+v4/3`, `o+v4/4`, and `o+v4/5` respectively. Such collectionIDs start with `2` because `1` is claimed by baggage.


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

* `v6.vs.vc.2.|entryCount`: `4` (the size of the collection as a numeric string, incremented with each call to `c1.init` and decremented with each call to `c1.delete`)
* `v6.vs.vc.2.|nextOrdinal`: `1` (a numeric string counter used to allocate index values for Objects used as keys, see `generateOrdinal` in [collectionManager.js](./collectionManager.js))
* `v6.vs.vc.2.|schemata`: `{"label":"mylabel","body":"#[{\\"#tag\\":\\"match:scalar\\",\\"payload\\":\\"#undefined\\"}]","slots":[]}`

The `schemata` is a capdata serialization of the debugging label provided in the `make*Store` call that created the collection, plus the Matcher constraints recorded for the collection. These constraints can limit keys to be just strings, or numbers, etc. (see [Patterns](https://github.com/endojs/endo/tree/master/packages/patterns)). The schemata consists of an array in which the first element is a schema for the keys and the second is a separate schema for the values.

Each entry in the collection gets put into a single vatstore entry with a capdata-serialized value:

* `v6.vs.vc.2.skey1`: `{"body":"#\"$0.Alleged: foo\"","slots":["o+d9/1"]}`
* `v6.vs.vc.2.skey2`: `{"body":"#\"$0.Alleged: foo\"","slots":["o+d9/1"]}`
* `v6.vs.vc.2.skey3`: `{"body":"#\"$0.Alleged: foo\"","slots":["o+d9/1"]}`
* `v6.vs.vc.2.skey4`: `{"body":"#\"$0.Alleged: foo\"","slots":["o+d9/2"]}`

The key string for each entry (e.g. `skey1`) is formed by serializing the key object. Strings get a simple `s` prefix. Other objects use more complex encodings, designed to allow numbers (floats and BigInts, separately) to sort numerically despite the kvStore keys sorting lexicographically. See Endo [encodePassable.js](https://github.com/endojs/endo/blob/master/packages/marshal/src/encodePassable.js) for details. Object references involve an additional kvStore entry, to manage the mapping from Object to ordinal and back.

For weak stores, the collection manager also maintains inbound-reference database keys of the form `vom.ir.${vref}|${collectionID}`, where in this case `${vref}` is the vref of a virtual object, store, import, or remotable, and `${collectionID}` is the collectionID of a weak store in which the given vref is used as a key. This enables the collection manager to locate and remove collection entries whose keys are being garbage collected. Note that mere presence or absence of such a key in the database is significant but the value associated with it is not.
