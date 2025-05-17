# A Taxonomy of Store-making Functions

Some dimensions on which our Stores differ. For each of these dimensions, in the headings below we indicate the dominant default choice with a plus (+). A given Store maker should document which non-default points in this design space it supports. For example, the `makeScalarMapStore` function makes stores that are Strong and Ephemeral and have Scalar keys and Passable values.  The name is explicit only about the dimensions in which it differs from the defaults.

This package establishes the naming scheme, but only populates some of the choices below. It is left to higher layer packages, such as [@agoric/vat-data](../../vat-data), to provide some of the other choices explained below.

All stores are Far objects (a kind of remotable) that may be snapshotted to (or restored from) a corresponding pass-by-copy objects. MapStores snapshot into CopyMaps. SetStores snapshot into CopySets.

# API Differences

## SetStores vs MapStores

Neither MapStore nor SetStore have an unnamed default. Rather, both choices must be explicitly named. Thus, when speaking *about* stores, the term *store* refers to both SetStores and MapStores.

* ***`make*SetStore`*** <br>
SetStores store only keys (of type Key), where each key is key-unique, i.e., it is not keyEQ to any other key in the set.
* ***`make*MapStore`*** <br>
MapStores store key value associations, where the keys are key-unique Keys, as with sets, and the associated values are Passable.

## Weak vs Strong+

There is no "Strong" qualifier in the names. A non-weak store is implicitly a strong store.

* ***`make*Weak*Store`*** <br>
A weak store does not enable its contents to be iterated. Only with the key of a given entry will a weak store reveal anything about the entry. This sometimes enables gc of entries that the collector knows can never be mentioned. But, unlike JavaScript WeakSets and WeakMaps, a weak store *may* allow other values as keys, such as numbers, that can be synthesized at will. Entries indexed by such synthesizable keys can never be collected.
* ***`make*Store`*** <br>
 A strong store does enable iteration of its contents, and so must retain those contents as long as the strong store itself exists.

Methods on stores can be grouped into four categories:

* lookup -- `has`, `get`
* update -- `init`, `set`, `add`, `delete`, `addAll`
* query -- `keys`, `values`, `entries`, `getSize`
* query-update -- `clear`

Both strong and weak stores have lookup and update methods, whereas only strong stores have query and query-update methods. Weak stores do not have the query-update methods since they require iterability.

# Storage and Representation Differences

## Scalar Keys Only vs Composite Keys Allowed+

There is no qualifier for the composite case. Rather, a non-scalar store allows composite keys.

* ***`make*Scalar*Store`*** <br>
Scalars are primitives or remotables, those keys that can be compared without looking inside objects. This directly reflects the semantics of JavaScript's Maps and Sets, which only index by scalar keys.
* ***`make*Store`*** <br>
Composite keys are things like copyArrays, copyRecords, copySets, or copyMaps, that compare by structural key equality. (Composite-key stores are not yet implemented, so currently all stores are only scalar stores and so must explicitly use the `*Scalar*` qualifier.)

## Long+ vs Short Expected Lifetime (WeakStores only)

The expected lifetime of a weak store helps us optimize its representation. The default is to use the representation suitable for long lived weak maps.

* ***`make*Weak*Store(...)`*** <br>
If we expect a weak store to outlive most of its keys, we consider it long lived. The implementation may internally use a JavaScript WeakMap.
* ***`make*Weak*Store(..., { ..., longLived: false })`*** <br>
 If we expect the keys in a weak store to outlive the store, we should use the `longLived: false` option. The implementation may internally use a JavaScript Map, to avoid the costs often associated indexing a key for JavaScript WeakMaps that are no longer alive. Though keep in mind that this representation denies the garbage collector the opportunity to collect those keys while these expected-to-be-short-lived stores are still alive.

## Small+ vs Big

There is no qualifier for small. Non-big stores are always small. The [@agoric/store](../../store) package implements only small stores. Big stores are provided by the [@agoric/vat-data](../../vat-data) package.

* ***`make*Store`*** <br>
A small store is one that is expected to fit into a normal JavaScript object using JavaScript's normal heap memory and occupying room in vat snapshots.
* ***`make*Big*Store`*** <br>
A big store uses external memory, such as database tables.

A big store serializes (marshals) its contents to store it, and unserializes (unmarshals) its contents to retrieve it. Since stores in general store only Passable objects, it should be relatively painless for a refactor to switch between small stores and big stores without changing the meaning of the program.

Virtual objects (a kind of far object) that are accessible *only* from big stores can completely disappear from the heap, to be restored if any serialized reference to it is restored. A big store is itself a virtual object.

## Ephemeral+ vs Durable (Only big stores can be durable)

Durable objects are those that can survive upgrade, to be passed forward from one vat incarnation to the next. All the data needed for the successor vat to resume operation should be durable. All small stores are ephemeral. Big stores can be ephemeral or durable. Big stores are ephemeral by default, but can be made durable by explicit use of the `durable: true` option.

* ***`make*Store(...)`*** <br>
Ephemeral stores only exist in the vat that initially created them, dying when that vat dies. The content of virtual ephemeral stores can include references to ephemeral non-virtual remotables or promises.
* ***`make*Big*Store(..., { ..., durable: true })`*** <br>
A durable store can be part of a vat's "estate", to be transferred to that vat's heir/successor on the death of its current vat. A durable store can only contain keys and values that are still meaningful across upgrades, such as
    * durable objects
    * remote presences, a kind of remotable designating a far object in another vat

    A durable store may not store a reference to a local ephemeral far object. A durable store is itself a durable object.

# Origin Differences

## Make+ vs Provide (Durable only)

For durable objects to be communicated across upgrade, from one vat incarnation to the next, they must be reachable from *baggage*. Baggage is rooted in a distinct durable map store, and consists of a tree of durable map stores reachable from that root. The code of the successor vat should generally be written so that it can be a successor to a previous incarnation, restoring itself from baggage that has been filled by that predecesor, but also so that it can be instantiated directly, with empty baggage, as the first vat-incarnation of a new vat.

To write code that can be used either way, we use the *provide* pattern, supported by a small number of functions specialized for this purpose. Where a `make*` function always makes a new something each time it is called, a `provide*` function uses the one it finds, if there is one there, but otherwise creates a new one while placing it in the baggage at the same place, so that its successor will find it.

* ***`make*(...)`*** <br>
Makes a fresh new something each time it is called.
* ***`provide(baggage, key, () => make*(...))`*** <br>
The `provide` function only be called at most once for any `baggage`,`key` pair during any given vat incarnation. This is the general case for providing anything that can be made.

With specific conveniences for the following common cases:

* ***`provideDurableMapStore(baggage, key)`*** <br>
Provides (from that baggage at that key) a scalar big durable strong map store.
* ***`provideDurableWeakMapStore(baggage, key)`*** <br>
Provides (from that baggage at that key) a scalar big durable weak map store.
* ***`provideDurableSetStore(baggage, key)`*** <br>
Provides (from that baggage at that key) a scalar big durable strong set store.

We may add more such conveniences over time as we encounter the need.
