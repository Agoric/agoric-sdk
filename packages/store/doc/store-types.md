# Store Taxonomy

# Store Dimensions

`Store` is the abstract supertype of a system of collection abstractions
for collections of Passable objects indexed by PassableKeys. The semantics
of Passable depends only on the CopyStores. Overall, the taxonomy of
Stores vary along the following dimensions. A `??` below on a type or
a method indicates that it may not be implemented until we find we need it.

```ts
interface Store<K extends PassableKey> extends Passable {
  // query
  has(key: K) :boolean
  without??(key: K) :Store<K>
}
```

The dimensions
   * Store Strength (Strong\*, Weak)
   * Store Mutability (Mutable\*, ReadOnly??, Copy)
   * Store Substrate (Memory\*, Copy, Virtual, Shared??)
   * Store Relation (Map\*, Set, Array??, ...)

The `*` on a type indicates that it is the default choice when speaking
about individual stores and not being explicit about that dimension. Thus,
when refering to a concrete store simply as a `Store`, we can assume a
`StrongMutableMemoryMapStore`.

# Store Strength (Strong\*, Weak)

All stores have a key. StrongStore keys can be any PassableKey. WeakStore
keys can only be Remotables.

| Strength      | explanation                                 |
|---------------|---------------------------------------------|
| StrongStore   | Retains and enumerates all its contents     |
| WeakStore     | Only Remotable keys. Non-enumerable         |

```ts
interface StrongStore<K> extends Store<K> {
  // mutability
  diverge(): MutableStore<K>;
  readOnlyView??(): ReadOnlyStore<K>;
  snapshot(): CopyStore<K>;

  // enumeration
  keys(keyPattern?: KeyPattern<K>): Iterable<K>;
}

interface WeakStore<T> extends Store<Remotable<T>> {
  // mutability
  readOnlyView??(): ReadOnlyWeakStore;
}
```

# Store Mutability (Mutable\*, ReadOnly??, Copy)

StrongStores have the following mutability subtypes, with the three StrongStore
methods to move from one subtype to another. Notice the terminological
shortcut. "Strong" is the normal case, so may be omitted when talking about
subtypes of StrongStore.

| Mutability      | explanation            |
|-----------------|------------------------|
| MutableStore    | both query and update  |
| ReadOnlyStore?? | query a read-only view |
| CopyStore       | fixed contents         |

When passed as an argument in a remote message, only CopyStore is passed by
copy.

TODO For all other stores, we need to decide if they are not
Passable at all, or if they are PrimaryRemotables. Let's start assuming they
are PrimaryRemotables.

```ts
interface MutableStore<K> extends StrongStore<K>, PrimaryRemotable {
  // update
  delete(key: K) :boolean
}

interface ReadOnlyStore<K> extends StrongStore<K>, PrimaryRemotable {
  // new guarantee but no new methods
}

interface CopyStore<K> extends ReadOnlyStore<K>, PassByCopy {
  // new guarantee but no new methods
}
```

WeakStores, being unenumerable, cannot easily support copying. Thus
we only support one mutability variation, the ReadOnlyWeakStore,
and only one method, to obtain such a read only view.

| Mutability          | explanation            |
|---------------------|------------------------|
| MutableWeakStore    | both query and update  |
| ReadOnlyWeakStore?? | query a read-only view |

```ts
interface MutableWeakStore<T> extends WeakStore<T>, PrimaryRemotable {
  // update
  delete(key: K) :boolean
}

interface ReadOnlyWeakStore<T> extends WeakStore<T>, PrimaryRemotable {
  // new guarantee but no new methods
}
```

# Store Substrate (Memory\*, Copy, Virtual, Shared??)

How is the store implemented?

| Substrate     | explanation                               |
|---------------|-------------------------------------------|
| MemoryStore   | in the per-vat language heap              |
| ---           | CopyStore on the wire between vats |
| VirtualStore  | in per-vat external storage               |
| SharedStore?? | in separately accessible external storage |

A Store as implemented on a given substrate may explicitly state which
operations it does not support.

# Store Relation (Map\*, Set, Array??, ...)

| Relation           | explanation                                            |
|--------------------|--------------------------------------------------------|
| MapStore           | A single-valued mapping from PassableKeys to Passables |
| SetStore           | Just a set of PassableKeys |
| ArrayStore??       | Just a list of Passables, with indexes as keys.        |
| ByteArrayStore??   | A binary blob is a sequence of bytes (Uint8s)          |
| BagStore??         | Each PassableKey occurs zero or more times             |
| MultiMapStore??    | A set of pairs of (PassableKey,Passable)               |
| MultiBagMapStore?? | A bag of pairs of (PassableKey,Passable)               |

```ts
// Weak or Strong
interface SetStore<K> extends Store<K> {
}

// Weak or Strong
interface MutableSetStore<K> extends SetStore<K>, MutableStore<K> {
  // update
  add(key: K) :MutableSetStore<K>
}

// Weak or Strong
interface MapStore<K,V> extends Store<K> {
  // query
  get(key: K) :V
}

// Weak or Strong
interface MutableMapStore<K,V> extends MapStore<K,V>, MutableStore<K> {
  // update
  set(key: K, value: V) :MutableMapStore<K,V>
}

interface StrongMapStore<K,V> extends MapStore<K,V>, StrongStore<K> {
  // enumeration
  values(keyPattern?: KeyPattern<K>) :Iterable<V>
  entries(keyPattern?: KeyPattern<K>) :Iterable<[K,V]>
}
```

To the extent possible, we wish to use JS arrays that fall within our rules
as ArrayStores. For example, a CopyArray is just a hardened normal JS array
with no funny properties and only Passable values. For a binary blob, we'd
like to use a Uint8Array or possibly an ArrayBuffer when possible. Of course,
the virtual form cannot actually be a JS array. But it could still overload
`[]` and seem to be an array by use of proxies. Note that the nethods on
`Array.prototype` are purposely generic, in that they can be inherited and used
by anything that implements array's base behavior.

```ts
// Necessarily strong
interface ArrayStore<V> extends StrongStore<Nat> {
  // query
  get(index: Nat) :V
  // alias for `get`, when possible
  operator [index: Nat] :V
  slice(start: Nat, bound?: Nat) :Iterable<V>

  // enumeration
  values(keyPattern?: KeyPattern<K>) :Iterable<V>
  entries(keyPattern?: KeyPattern<K>) :Iterable<[Nat,V]>
}

// Necessarily strong
interface MutableArrayStore<V> extends ArrayStore, MutableStore<Nat> {
  set(index: Nat, value: V) :MutableArrayStore<V>
  // alias for `set` but for return value, when possible
  operator ([index: Nat] = value: V) :V
  splice(start: Nat, deleteCount: Nat, ...items :V[]) :Iterable<V>
}
```
