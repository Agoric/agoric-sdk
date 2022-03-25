# How Liveslots Uses the Vatstore

Each vat gets exclusive access to a portion of the kernel's `kvStore`, implemented with a simple prefix: when vat `v6` uses `syscall.vatstoreSet('key', 'value')`, the kvStore records the value in key `v6.vs.key`.

Userspace gets an attenuated object named `vatPowers.vatstore`. When userspace calls `vatPowers.vatstore.set('key', 'value')`, liveslots performs `syscall.vatstoreSet('vvs.key', value)`, which results in a kernel kvStore entry under key `v6.vvs.key`.

The rest of the vat's keyspace is used by liveslots:

* virtual object Kind metainformation
* data for each virtual object
* virtual collection metainformation and entries
* reference counts for virtual objects (tracking references from other virtual objects)
* export status for virtual objects
* the id of the "baggage" object, delivered across vat upgrades

This file describes the layout of the vatstore keyspace.

# Virtual Object Kinds

Vats can use `VatData.defineKind()` to define categories (classes) of virtual data. The effective schema for each "Kind" contains an interface name, a set of `state` property names, and a list of facet names (which may be empty, indicating a single-facet Kind).

The standard Kind is "single-facet", meaning that each instance of the virtual object yields exactly one "Representative". However many security patterns require a collection of "Facet" Representatives which share access to common state. These Facets are all created at the same time and returned in a single record called a "cohort".

`defineKind` also specifies the runtime behavior: an `init` function called to create the initial state of each instance, a `behavior` record to provide methods for each instance, and an optional `finish` function to perform post-initialization tasks like registering the new object in a collection. `defineKind` returns a "kind constructor", typically named e.g. `makeFoo()` to make instances of the "foo kind.

Each time the kind constructor is called, a new "baseref" is allocated for the cohort, and the (one or multiple) facet Representatives are created. Each Representative/Facet gets a separate vref, all of which are extensions of the baseref.

The vref is used when interacting with the kernel (in `syscall.send` etc), and in virtualized data (inside the capdata `.slots` that point to other objects). The vatstore keys that track GC refcounts and the export status use the "baseref" instead.

The vrefs are built out of three pieces:
* Kind ID, e.g. `o+5`. These are allocated from the same numberspace as exported Remotables (JS `Object`s marked with `Far`).
* Instance ID, an integer starting with "1" for the first instance of each Kind
* Facet ID, missing for single-facet Kinds, else an integer starting with "0"

These are combined with simple delimiters: `/` between the Kind ID and the Instance ID, and `:` before the Facet ID (if any).

In a c-list or virtualized data, you may see vrefs like these:

* `o-3`: an imported Presence, pointing to some object in a different vat
* `o+4`: a plain Remotable, potentially exported from this vat
* `o+5/1`: a Representative for instance "1" of single-facet Kind "o+5"
* `o+6/2:0`: the first facet of instance "2" of a multi-facet Kind "o+6"
* `o+6/2:1`: the second facet of that same instance
* `o+6/3:0`: the first facet of a different instance

Each instance of a virtual object stores state in a vatstore key indexed by the baseref. If `o+6/2:0` and `o+6/2:1` are the facet vrefs for a cohort whose baseref is `o+6/2`, the cohort's shared state will be stored in `vs.vom.o+6/2`, as a JSON-serialized record. The keys of this record are property names: if the Kind uses `state.prop1`, the record will have a key named `prop1`. For each property, the value is a capdata structure: a record with two properties `body` and `slots`.

* `v6.vs.vom.o+6/2` : `{"prop1":{"body":"1","slots":[]}}`


In the refcounting portion of the vatstore (`vs.vom.rc.${baseref}`), you will see baserefs:

* `v6.vs.vom.rc.o+4`: number of virtualized references to a plain Remotable (held in RAM)
* `v6.vs.vom.rc.o+5/1`: refs to any member of the cohort for instance "1" of Kind "o+5"
  * this Kind might single-facet or mult-facet
  * if multi-facet, and one object points to both `o+5/1:0` and `o+5/1:1`, the refcount would be "2"

In the export-status portion of the vatstore (`vs.vom.es.${baseref}`), you will see baserefs, and any facets are tracked in the value, not the key:

* `v6.vs.vom.es.o+4`: `r`: the plain Remotable has been exported and is "reachable" by the kernel
* `v6.vs.vom.es.o+4`: `s`: the Remotable was exported, the kernel dropped it, and is still "recognizable" by the kernel
  * if the kernel can neither reach nor recognize the export, the vatstore key will be missing entirely
* `v6.vs.vom.es.o+5/1`: this records the export status for all the facets of the `o+5/1` cohort
  * if this Kind is single-facet, the value will be the same as for a plain Remotable: a single `r` or `s` character
  * if the Kind if multi-facet, the value will be a string with one letter for each facet, in the same order as their Facet ID. `n` is used to indicate neither reachable nor recognizable
  `v6.vs.vom.es.o+5/1` : `rsnr` : `o+5` is a multi-facet Kind, this describes instance "1" of this Kind, there are four facets, the first and last are reachable, the second is recognizable, and the third is neither

# Durable Kinds

Virtual objects are held on disk, not RAM, which makes them suitable for high-cardinality data: many objects, most of which are "idle" at any given time. However virtual objects do not survive a vat upgrade. For this, vats should define one or more "Durable Kinds" instead.

Durable Kinds are defined just like virtual Kinds, but they use a different constructor (`defineDurableKind` instead of `defineKind`), which requires a "handle" created by `makeKindHandle`. Durable virtual objects can only hold durable data in their `state`.

The handle is a durable virtual object of a special internal Kind.

# Virtual Collections

Liveslots provides a handful of "virtual collection" types to vats, to store high-cardinality data on disk rather than in RAM. The collection types are accessed through the `VatStore` global, which currently has the following collection constructor functions:

* `makeScalarBigMapStore`
* `makeScalarBigWeakMapStore`
* `makeScalarBigSetStore`
* `makeScalarBigWeakSetStore`

Each function accepts a `isDurable` argument, so there are currently 8 collection types.

Each collection is assigned a Kind index. These index values are stored in `vs.storeKindIDTable`, as a mapping from the collection type name (`scalarMapStore`, `scalarDurableMapStore`, `scalarWeakSetStore`, etc) to the integer of their ID. The current value is:

* `v6.vs.storeKindIDTable` : `{"scalarMapStore":1,"scalarWeakMapStore":2,"scalarSetStore":3,"scalarWeakSetStore":4,"scalarDurableMapStore":5,"scalarDurableWeakMapStore":6,"scalarDurableSetStore":7,"scalarDurableWeakSetStore":8}`

which means `o+1` is the Kind ID for `scalarMapStore`.

Each new store, regardless of type, is allocated the next available collection ID. This is an integer that starts at "1", and is independent of the numberspace used by exported Remotables and Kind IDs. `o+1/1` is allocated for the "baggage" Kind, indicating that it is a `scalarMapStore` (`o+1` is used for that collection type), and also that it is the first collection allocated in the vat. If userspace calls `makeScalarBigWeakSetStore()` and then `makeScalarSetStore()` at vat startup, it is likely to get `o+4/2` and `o+3/3` respectively.

We examine a vat which performs the following at startup:

```js
const makeFoo = VatData.defineKind('foo',
				   (arg) => ({ prop1: arg }),
				   (state) => ({ doFoo: () => state.prop1 }),
				  );
const foo = makeFoo(1);
const foo2 = makeFoo(2);
const c1 = VatData.makeScalarBigMapStore('mylabel');
c1.init('key1', foo);
c1.init('key2', foo);
c1.init('key3', foo);
c1.init('key4', foo2);
```


Each collection stores a number of metadata keys in the vatstore, all with a prefix of `vs.vc.${collectionID}.|`. The currently defined metadata keys (copied from the record for the "mylabel" Kind stored in `c1`) are:

* `v6.vs.vc.2.|entryCount`: `4`: the size of the collection (4 entries)
* `v6.vs.vc.2.|label`:  `mylabel`: a debugging label applied when the collection is created
* `v6.vs.vc.2.|nextOrdinal`: `1` : a counter used to allocate index values for Objects used as keys
* `v6.vs.vc.2.|schemata`: `{"body":"[{\"@qclass\":\"tagged\",\"tag\":\"match:scalar\",\"payload\":{\"@qclass\":\"undefined\"}}]","slots":[]}`

The `schemata` is a capdata serialization of the constraints recorded for the collection. These constraints can limit keys to be just strings, or numbers, etc.

Each entry in the collection gets put into a single vatstore entry:

* `v6.vs.vc.2.skey1`: `{"body":"{\"@qclass\":\"slot\",\"iface\":\"Alleged: foo\",\"index\":0}","slots":["o+9/1"]}`
* `v6.vs.vc.2.skey2`: `{"body":"{\"@qclass\":\"slot\",\"iface\":\"Alleged: foo\",\"index\":0}","slots":["o+9/1"]}`
* `v6.vs.vc.2.skey3`: `{"body":"{\"@qclass\":\"slot\",\"iface\":\"Alleged: foo\",\"index\":0}","slots":["o+9/1"]}`
* `v6.vs.vc.2.skey4`: `{"body":"{\"@qclass\":\"slot\",\"iface\":\"Alleged: foo\",\"index\":0}","slots":["o+9/2"]}`

The key string for the entry (e.g. `skey1` is formed by serializaing the key object. Strings get a simple `s` prefix. Other objects use more complex encodings, designed to allow numbers (floats and BigInts, separately) sort numerically despite the kvStore keys sorting lexicographically. See `packages/store/src/patterns/encodePassable.js` for details. Object references involve an additional kvStore entry or two, to manage the mapping from Object to ordinal and back.
