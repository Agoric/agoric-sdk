# Passables: Store  *vs* Marshal levels of abstraction

We have three very distinct abstraction levels in our system in which to describe the passable data types and the operations on them. On the left is the higher *Store* level, containing the passable data types and operations of concern to the normal application programmer. A document intended for those application programmers would explain the Store level in a self contained manner. This is not that document.

In the middle is the lower *Marshal* level of abstraction, which defines the semantics of the language-independent protocol. The Marshal level provides the data types and operations used to implement the Store level. The Marshal layer provides interoperability both between endpoints of different languages, and between endpoints defining higher layers instead of or in addition to the Store layer.

On the right is the *JS* level, explaining how these map onto JavaScript language. This mapping determines how JavaScript values round trip or not through the protocol. Only hardened JavaScript values can be passable. The mapping of protocol concepts to JavaScript should serve as an example of how to map the protocol onto the concepts of other languages.

|                | Store Level        | Marshal level                       | JS                                                    |
| -------------- | ------------------ | ----------------------------------- | ----------------------------------------------------- |
| Classification | `keyStyleOf(p)`<br>`patternStyleOf(p)` | `passStyleOf(p)`<br>`getInterfaceOf(j)` | `typeof j`                    |
| Type Testing   | `isKey(p)`         | `isOnlyData(p)`<br>`isStructure(p)` | `isPrimitive(j)`<br>`Array.isArray(j)`                |
| Equivalence    | `sameKey(k,k)`     | `sameStructure(s,s)`                | `j === j`<br>`Object.is(j,j)`<br>`sameValueZero(j,j)` |
| Ordering       | `compareKeys(k,k)` | `compareRank(p,p)`                  | `j <= j`<br>`[...js].sort(compare(j,j))`              |

Where the parameter
   * `j` is for any JavaScript value.
   * `p` is for any `Passable`, a subset of JavaScript values.
   * `s` is for any `Structure`, a subset of passables.
   * `k` is for any `Key`, a subset of structures.


|            | `keyStyleOf`            | `passStyleOf`          | `typeof`                                                     |
| ---------- | ----------------------- | ---------------------- | ------------------------------------------------------------ |
| Primitives | js primitives + `null`  | js primitives + `null` | `undefined` `boolean` `bigint`<br>`number` `string` `symbol` |
| Containers | `copyArray` `copyRecord`<br>`copySet` `copyMap`  | `copyArray` `copyRecord`<br>`copyTagged` | `object`          |
| Behavior   | `remotable`             | `remotable`            | `function`                                                   |
| Others     | No keys<br>See patterns | `error` `promise`<br>`metaTagged` |                                                   |



## The Marshal level organized by `passStyleOf`

We organize according to the classification from<br>
**`passStyleOf(p: Passable) => PassStyle`**<br>
where the returned `PassStyle` is one of a fixed enumeration of strings, similar to the strings returned by JavaScript's `typeof`.

`PassStyle` groupings:
- **Primitive styles**: `"undefined"`, `"null"`, `"boolean"`, `"bigint"`, `"number"`, `"string"`, `"symbol"`
- **Container styles**: `"copyArray"`, `"copyRecord"`, `"copyTagged"`
- **Behavior style**: `"remotable"`
- **Other styles**: `"error"`, `"promise"`, `"metaTagged"`

Full `PassStyle` taxonomy:
   * **The `PassStyle` styles**: The structure styles + the other styles
     * **The structure styles**: The data styles + the behavior style
         * **The data styles**: The primitive styles + the container styles
           * **The primitive styles**: `"undefined"`, `"null"`, `"boolean"`, `"bigint"`, `"number"`, `"string"`, `"symbol"`
           * **The container styles**: `"copyArray"`, `"copyRecord"`, `"copyTagged"`
         * **The behavior style**: `"remotable"`
     * **The other styles**: `"error"`, `"promise"`, `"metaTagged"`


The **primitive styles** identify the *passable primitives*. The passable primitives have the expected mapping down to the JavaScript primitives. However, the passable primitives do not include JavaScript's `-0` or anonymous symbols. The included JavaScript primitives will all round-trip through the protocol.

The **data styles** tag data-like containers. If a data-like container contains only data, then it is only data, passing the `isOnlyData` type test.
  * A *copyArray* is a simple JavaScript array containing only passables.
  * A *copyRecord* is a simple JavaScript record-like object, with only string-named own data properties containing only passables.
  * A *copyTagged* is the extensibility point used by the Store level to implement *copySets* and *copyMaps*.

The **structure styles** introduce the *remotable*, which is a potentially remote behavioral object with a unique unforgeable identity and a primary location. At that primary location is the remotable's *Primary Remotable*, often referred to as a *far object*. At all other locations, the remotable is represented by a *remote*, implemented as a JavaScript handled-promise *presence*. Any message sent to a remotable is delivered to its primary remotable, invoking one of its methods. A remotable is a *structure*. A data-like container containing only structures, i.e., data and remotables, is itself a structure.

Each remaining **passable** is either
  * An *error* carrying diagnostic information.
  * A *promise*, providing the eventual distributed access that JavaScript's promises were designed to provide.
  * A *metaTagged*, like the copyTagged, is the extension point used by the Store level to implement
 *patternNodes*. The distinction is that a metaTagged is necessarily *not* a structure or a key. Thus, a patternNode, encoded into a metaTagged, can be applied to a structure or key specimen, knowing that the specimen cannot itself contain a patternNode. This avoids a tricky source of ambiguity and confusion.

**`sameStructure(s: Structure, t: Structure) => boolean`**<br>
 implements the most precise equivalence class meaningful at the Marshal layer. However, it is narrow, admitting only structures.

**`compareRank(left: Passable, right :Passable) => -1 | 0 | 1`**<br>
implements a full order over *all* passables, suitable for sorting with `Array.prototype.sort`. However, it is a very imprecise full order. For example, for any two remotables `r` and `q`, `compareRank(r,q) === 0`. All remotables are therefore equivalent in this order. Likewise for all errors, all promises, and all metaTaggeds. Thus, `comparePassable`'s zero answer provides an equivalence class over all passables, but an imprecise one.

 ## The Store level organized by `keyStyleOf`

**`keyStyleOf(p: Passable) => KeyStyle`**<br>
 where `KeyStyle` is an enumeration quite similar to `PassStyle`

`KeyStyle`:
   * The Store's **primitive styles** are identical to Marshal's.
   * The Store's **data styles** styles preserves the `"copyArray"` and `"copyRecord"` classification from Marshal's data styles, omits `"copyTagged"`, but uses it to implement the `"copySet"` and `"copyMap"` that it introduces. The store level must also recognize whether a copyTagged that claims to be a copySet or copyMap has a valid representation. A copyTagged that does not validate is not a key.
   * Store's **"remotable"** is identical to Marshal's. Every remotable is a key. On two remotables `p` and `q`, `sameKey(p,q)` compares using the remotable's unique unforgeable identity. Thus, for two remotables, `sameKey(p,q)` iff `sameStructure(p,q)` iff `p === q` iff `Object.is(p,q)` iff `sameValueZero(p,q)`.
   * The remaining passables: errors, promises, and metaTaggeds, are not keys. `keyStyleOf` applied to any of them throws.

Primitives and remotables are keys. copyArrays, copyRecords, copySets, and copyMaps are key-like containers. If a key-like container contains only keys, then it is a key.
  * A *copySet* can only contain keys, and so each copySet is necessarily a key.
  * A *copyMap* entry can use only use a key as a key, but can use any passable as a value including unrecognized copyTaggeds. But a copyMap is a key only of all of its values are keys.

**`sameKey(k1 :Key, k2: Key) => boolean`**<br>
defines an equivalence class of keys. `sameKey` is less precise than `sameStructure`. For example, a copySet is encoded into a copyTagged in sorted order according to `compareRank`. Because remotables are distinct but cannot be canonically ordered, two copySets `s` and `t` representing the same logical set may be encoded into different copyTagged representations. In that case, `sameKey(s,t)` would be true but `sameStructure(s,t)` would be false. `sameKey` is also narrower than `sameStructure`. copyTaggeds that are not recognized as copySets or copyMaps are not keys and would be rejected by `sameKey` but are still accepted by `sameStructure`.

**`compareKeys(left :Key, right: Key) => -1 | 0 | 1 | undefined`**<br>
defines a partial order over all keys, comparing magnitudes. `compareKeys` returns `undefined` to indicate that the two keys are incommensurate, that their magnitudes cannot meaningfully be compared. Some example of how this differs from `compareStructures`:
   * `compareStructures`, in order to sort all passables, compares passables of different pass styles according to the order of those
     pass styles listed above. `compareKeys`, applied to keys of different key styles will always return `undefined`.
   * `compareStructures` orders `NaN` after all other numbers. Which is an arbitrary choice, but some choice was necessary. In order to preserve reflexivity, in violation of IEEE floating point recommendations both `compareStructures(NaN,NaN) === 0` and `compareKeys(NaN,NaN) === 0`. But comparing `NaN` and anything else using `compareKeys` will produce `undefined`.
   * Applied to two copySets `s` and `t`, `compareStructures(s,t)` will do a lexicographic comparison of their copyTagged representation. `compareKeys(s,t)` will check if either is a subset of the other. If each contains elements the other lacks, then `compareKeys` will return `undefined`.
   * Given two distinct remotables `r` and `q`, `compareStructures(r,q) === 0` but `compareKeys(r,q)` === undefined.

## The copySet example

The best example to understand this layering is how the Store layer implements its copySets out of the copyTagged provided by the Marshal layer. As a set, it must store each element only once. This _only once_ requirement means we must limit sets to contain only objects we can compare according to some equivalence. It would be appealing to be able to use `sameStructure` for this purpose, as it is the most precise equivalence class among passables. But remotables are included in _structures_ and compare only based on their unique unforgeable identity. Due to the constraints of permissionless loosely-coupled decentralized systems, remotables _cannot_ be canonically ordered.

Thus, a copySet containing remotables cannot be canonically sorted. Instead, a copySet is implemented as a copyTagged containing a copyArray sorted according to `compareStructures`. Because remotables cannot be canonically ordered, `sameKey(r,s)` of two remotables `r` and `s` will always return `0`, meaning that they sort as equivalent. Thus two copySets that contain the same set of remotables might represent that with two different orders among those remotable. `sameStructure` will distinguish these. `sameKey` will do an order independent comparison of the copySets, but still taking advantage of the fact that the `copyTagged` representation is still as sorted as it can be according to `compareKeys` applied to the copySet's elements.
