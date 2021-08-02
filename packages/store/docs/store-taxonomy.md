# A Taxonomy of Stores

Some dimensions on which our Stores differ. For each of these dimensions, in the headings below we indicate the dominant default choice with an asterisk (*). A given Store maker should document which non-default points in this design space it supports. The `makeScalarMapStore` function makes stores that default to all the default choices below, allowing only the non-default option to specify a schema, to create a schematized store.

All stores are Far objects (a kind of remotable) that may be snapshotted to (or restored from) a corresponding pass-by-copy objects. MapStores snapshot into CopyMaps. SetStores snapshot into CopySets.

# API Differences

## SetStores vs MapStores*

* SetStores store only keys (of type Key), where each key is key-unique, i.e., it is not keyEQ to any other key in the set.
* MapStores store key value associations, where the keys are key-unique Keys, as with sets, and the associated values are Passable.

## Weak vs Strong*

* A weak store does not enable its contents to be iterated. Only with the key of a given entry will a weak store reveal anything about the entry. This sometimes enables gc of entries that the collector knows can never be mentioned. But, unlike JavaScript WeakSets and WeakMaps, a weak store *may* allow other values as keys, such as numbers, that can be synthesized at will. Entries indexed by such synthesizable keys can never be collected.
* A strong store does enable iteration of its contents, and so must retain those contents as long as the strong store itself exists.

# Storage and Representation Differences

## Scalar Keys Only* vs Composite Keys Allowed

* Scalars are primitives or remotables, those keys that can be compared without looking inside objects. This directly reflects the semantics of JavaScript's Maps and Sets, which only index by scalar keys.
* Composite keys are things like copyArrays, copyRecords, copySets, or copyMaps, that compare by structural key equality.

## Unstructured* vs Schematized

* An unstructued store is restricted only by the representation limitations listed here. They keys must be Keys. The values must be Passable. Scalar stores allow only scalar keys. Persistent stores only allow contents that are well defined after vat death.
* A schematized store is further restricted by a pattern provided when it was created to serve as its schema. A schematized store will only allow contents that match its schema pattern.

## Long* vs Short Expected Lifetime (WeakStores only)

The expected lifetime of a weak store helps us optimize its representation.
* If we expect a weak store to outlive most of its keys, we may internally use a JavaScript WeakMap.
* If we expect the keys in a weak store to outlive the store, we may internally use a JavaScript Map, to avoid the costs often associated indexing a key for JavaScript WeakMaps that are no longer alive. Though keep in mind that this representation denies the garbage collector the opportinity to collect those keys while these expected-to-be-short-lived stores are still alive.

## Heap* vs Virtual

* Like JavaScript Maps and Sets, heap stores live in the JavaScript language heap, limited by the size of heap memory and occupying room in vat snapshots.
* Virtual collections potentially live outside the heap. A virtual store serializes (marshals) its contents to store it, and unserializes (unmarshals) its contents to retrieve it. Virtual objects (a kind of far object) that are accessible *only* from virtual stores can completely disappear from the heap, to be restored if any serialized reference to it is restored. A virtual store is itself a virtual object.

## Ephemeral* vs Persistent (Heap is always Ephemeral)

Stores only exist in one vat at a time, giving us free transactional integrity. All heap stores are ephemeral. Virtual stores can be ephemeral or persistent.
* Ephemeral stores only exist in the vat that initially created them, dying when that vat dies. The content of virtual ephemeral stores, can contain references to ephemeral non-virtual remotables or promises.
* A persistent store can be part of a vat's "estate", to be transfered to that vat's heir/successor on the death of its current vat. A persistent store can only contain keys and values that are still meaningful across such traumas, such as
    * persistent objects (a kind of virtual object)
    * Remotes, a kind of remotable designating a far object in another vat
    * Promises, perhaps. These are tempting because they can be restored into a well-defined severed state, the rejected promise.

    A persistent store may not store a reference to a local non-persistent far object. A persistent store is itself a persistent object.

# Iteration Differences

## Rank Order* vs Altered Rank Order Iteration

* Our stores iterate in rank-sorted order of keys. Although rank-order is normally a lower-level implementation concept, the invariants between key-order (a meaningful partial order) and rank-order (an implementation-oriented full order) make this potentially useful, even for code that is only aware of key-order:
    * If X key== Y, then X rank== Y.
    * If X key< Y, then X rank<= Y.

* Altered Rank Order is not yet implemented, and may not be for a while. This is a placeholder for a declarative description of a bidirectional 1-to-1 transform of schematized store content from the form seen through the API (the API form) vs the store content as it is actually stored (the storage form).

  In altered rank order, the contents will be organized and iterated according to the rank order of the storage form, but retrieved as transformed back to the API form. In order to preserve the internal rankCover optimization, for indexing into rankStores to find pattern matches, the patterns themselves need to be transformed through the bijection. Fortunately, this pattern transformation need not be bidirectional. The purpose of altered rank order is more to enable better rankCover optimizations for certain patterns, rather than any interest in alternate iteration orders.

  For example, if we want to organize keys like `{foo,bar}` so that they are sorted with `bar` as more significant, we may transform these to `makeTagged('{bar,foo}',[bar,foo])`. Tagged objects of the same tag sort according to the rank order of their payload, which is lexicographic for arrays. If we reserve such tag names for this purpose, we might be able to universally untransform the storage form back into the original API form. If we coalesce the storage for identical tag names, then this resembles a "hidden class" representational technique.

  We expect the expression of bijections to be intimately related to the expression of schema.
