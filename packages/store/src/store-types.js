// eslint-disable-next-line spaced-comment
/// <reference path="extra-types.d.ts" />

/**
 * @typedef { "undefined" | "null" |
 *   "boolean" | "number" | "bigint" | "string" | "symbol" |
 *   "copyArray" | "copyRecord" | "remotable" | "copySet" | "copyMap" |
 *   "promise" | "copyError" | "patternNode"
 * } PassStyle
 *
 * TODO: We need to add a binary blob type to the PassStyles above and the
 * LeafData below, consisting of an uninterpreted sequence of octets (8 bit
 * bytes). The ideal JS representation would be a hardened `Uint8Array` except
 * that Uint8Arrays cannot be frozen. Instead the likely JS representation
 * will be a hardened ArrayBuffer.
 */

// TODO https://github.com/Agoric/agoric-sdk/pull/2909/files#r615524302
// Should we change "void" to "undefined"?
/**
 * @typedef { void | null | boolean | number | bigint | string | symbol
 * } LeafData
 * Corresponding PassStyle values are
 * "undefined", "null", "boolean", "number", "bigint", "string", "symbol".
 * A LeafData is a PassableKey and can be compared for equivalence with
 * `sameKey`.
 * LeafData can be sorted according to a yet-to-be-defined full order over all
 * LeafData.
 *    * We inherit JS's peculiar co-existence of two bottom values,
 *      `null` and `undefined`.
 *    * Following JS, `number` is an IEEE double precision floating point
 *      value which may be `NaN`, `Infinity`, or `-Infinity`.
 *    * There is only one NaN. A binary encoding therefore needs to
 *      canonicalize the NaN. The one NaN compares equivalent to itself.
 *    * There is only one 0, the IEEE non-negative zero. Negative
 *      zero must be canonicalized to non-negative zero, which must alway
 *      decode as non-negative zero. The one zero compares as equivalent to
 *      itself.
 *    * strings include all Unicode strings representable in JSON or
 *      utf8, even if they contain unpaired UTF-16 surrogates.
 *    * The `symbol` category includes only symbols which can be recreated
 *      from string data. It therefore excludes JS unregistered symbols or
 *      lisp/scheme gensyms. From JS it currently includes only
 *      `Symbol.asyncIterator` (a so-called well-known symbol). From JS
 *      it can include at most the well known symbols and the registered
 *      symbols. (Because symbol registration names can collide with
 *      well known symbol names, we will need another hilbert hotel
 *      encoding to allow well known symbols and all registered symbols.)
 *      From lisp, it can include symbols made from interned strings.
 */

/**
 * @typedef {Record<string | symbol, Function>} PrimaryRemotable
 * An object marked with `Far` consisting of methods that can be remotely
 * invoked. A PrimaryRemotable has a fresh unforgeable identity, i.e.,
 * an unforgeable identity created when the object was created.
 *
 * A PrimaryRemotable, being a kind of Remotable, is pass-by-remote. When a
 * PrimaryRemotable T is passed as an argument in a message to an object in
 * another vat, it arrives as a Remote<T>.
 */

/**
 * Note on the odd use of `{_Remote: T}` below. Suggested at
 * https://github.com/Agoric/agoric-sdk/pull/2909#discussion_r615522426 .
 * We do not expect any `_Remote` property to actually exist. Since
 * TS is structurally typed, we need some structure to make a distinct
 * structure. IOW, using a non-existent property is a way to emulate
 * nominal types in a structural type system.
 *
 * TODO We can use this pseudo-property to obtain the `PrimaryRemotable` type.
 * We can then extend the definition of `E()` to deal with `Remote<T>`s as if
 * they have the methods and properties found on `T`.
 *
 * @template {PrimaryRemotable} T
 * @typedef {{_Remote: T}} Remote
 * A `Remote<T>` is a Remotable object in one vat that represents a
 * PrimaryRemotable of type T in another vat. The Remote has an unforgeable
 * identity that is one-to-one with the unforgeable identity of its primary.
 * If there is only one comm system between the two vats, then the identity of
 * the Remote is not observably different than the identity of its primary.
 *
 * TODO https://github.com/Agoric/agoric-sdk/pull/2909/files#r624023246
 * Why might there be more than one comm system
 *
 * A Remote, being a kind of Remotable, is pass-by-remote. When a Remote<T>
 * is passed as an argument in a message to an object in another vat, it
 * arrives as either a T or a Remote<T>, depending on whether the destination
 * is the home vat of its primary.
 */

/**
 * @template {PrimaryRemotable} T
 * @typedef {T | Remote<T>} Remotable
 * Corresponding PassStyle is "remotable"
 *
 * A Remotable<T> is either the PrimaryRemotable T in its home vat, or is one
 * of its Remote<T> representatives in other vats. The primary together with
 * all of its remotes are, in aggregate, the abstact distributed Remotable<T>
 * object consisting of all these individual remotables. If there is only one
 * coherent comm system among the vats in question, then the remotable as a
 * whole effectively has the unforgeable identity of its primary, since the
 * identity of each of its remotables is not observably different than the
 * identity of its primary. (TODO explain relationship to the Unum model.)
 *
 * A Remotable is a PassableKey, which `sameKey` compares for equivalence
 * according to its unforgeable identity, which effectively compares the
 * unforgeable identities of their primaries.
 *
 * Remotables are unordered and cannot be sorted.
 *
 * TODO https://github.com/Agoric/agoric-sdk/pull/2909/files#r624025978
 * When can we do better for CopySets?
 *
 * A message eventually sent to a Remotable<T> is eventually delivered to
 * its primary T in the home vat of the primary.
 *
 * A remotable is pass-by-remote. When a (primary or remote) remotable is
 * passed as an argument in a message to an object in another vat, it arrives
 * as a (primary or remote) remotable for the same primary.
 *
 * A Remotable can be a key in a WeakStore, i.e., it can be a key in
 * a WeakMemoryMap or a WeakVirtualMap, or an element of a WeakMemorySet or
 * a WeakVirtualSet. Note that there are no passable weak stores, since it
 * doesn't make sense to pass something that cannot be enumerated.
 */

/**
 * @template T
 * @typedef {Remotable<T> | Promise<T>} LeafCap
 * The Corresponding PassStyles are "remotable" or "promise".
 *
 * Both remotables and promises may appear as the capability leaves of
 * a tree of pass-by-copy data. Ideally, a passed promise should only be a
 * promise for a passable, but we cannot know that at the time the promise is
 * passed, so we cannot enforce that.
 *
 * Promises are not PassableKeys or Comparables, and so cannot be compared for
 * equivalence. Promises are unordered and cannot be sorted.
 *
 * Promises have a lifecycle consisting of the following states
 *   * Unresolved - no decision yet about what the promise designates.
 *   * Resolved - decision made for this specific promise.
 *      * Forwarded - delegate eventual designation to another promise.
 *      * Settled - designation question permanently settled.
 *         * Rejected - will never designate anything for this *reason*.
 *         * Fulfilled - designates this non-thenable *fulfillment*.
 *
 * For local promises, this taxonomy applies without qualification. When
 * promise p is forwareded to promise q, then when q fulfills to f, p
 * is immediately identically fulfilled to f.
 *
 * A remote promise r can be modeled as a promise r in one vat that has been
 * forwarded to a promise q in another vat. Once q is settled, given eventual
 * connectivity and continued progress, r will eventually be settled. If
 * q is rejected, r will eventually be rejected, either with the same reason
 * or with a reason from the "system". If q is fulfulled, then r will
 * eventually either be fulfilled with the result of passing the fulfullment
 * (as if as an argument in a message), or r will be rejected with a reason
 * from the "system". For example, if q's fulfillment is not passable, then
 * r will be rejected with this non-passability as the reason. If q's
 * fulfullment is a PrimaryRemotable T, then r must eventually fulfill to
 * a Remote<T> with the same primary.
 *
 * If a promise is forwarded into a forwarding loop back to itself, whether
 * local or distributed, all the promises in that loop must eventually be
 * rejected.
 *
 * An eventual message sent to a promise that eventually fulfills must
 * eventually be delivered to its fulfillment.
 */

/**
 * @template {Passable} T
 * @typedef {T[]} CopyArray
 * Corresponding PassStyle is "copyArray".
 *
 * The semantics of CopyArrays are modeled on Tuples from the Records and
 * Tuples proposal. A CopyArray consists only of the sequence of its elements.
 *
 * CopyArray and CopyRecord are parameterized over various "deep" constraints
 * explained below. For example, iff all the elements of a CopyArray are
 * PassableKeys, then the CopyArray is a PassableKey that can be compared for
 * equivalence with `sameKey`. Two such CopyArrays are equivalent if their
 * elements are pairwise equivalent.
 *
 * A CopyArray as a JS object is a hardened plain array with no holes, no extra
 * properties, the normal non-enumerable `length` property, and enumerable
 * data properties from 0 to length-1.
 */

/**
 * @template {Passable} T
 * @typedef {{name: string]: T}} CopyRecord
 * Corresponding PassStyle is "copyRecord".
 *
 * The semantics of CopyRecords is modeled on Records from the Records and
 * Tuples proposal.
 * Property names can only be strings. A CopyRecord consists only of
 * a set of (property-name, value) pairs, where each property name
 * can appear at most once. It is therefore a single-valued mapping
 * from property-name to value. CopyRecords enumerate their properties
 * according to the sort order of their property names.
 *
 * CopyArray and CopyRecord are parameterized over various "deep" constraints
 * explained below. For example, iff the values of a CopyRecord are
 * PassableKeys, the CopyRecord is PassableKeys and can be compared for
 * equivalence based on the pairwise equivalence of their values.
 * Iff the values of a CopyRecord are sortable, then the CopyRecord is
 * sortable. Two sortable CopyRecords with the same property names are
 * compared by lexicographic comparison ordered by the sorted order of
 * their property names.
 */

/**
 * @template {Passable} T
 * @typedef { LeafData | CopyArray<T> | CopyRecord<T> } NestedData
 * Corresponding PassStyle values are
 * the PassStyles of LeafData, "copyArray", and "copyRecord"
 *
 * NestedData is parameterized over various "deep" constraints. See
 * the discussion in CopyArray and CopyRecord above.
 */

// TODO https://github.com/Agoric/agoric-sdk/pull/2909/files#r615531834
// To do the recursive types we need, do we need a *.d.ts file?

/**
 * @typedef {NestedData<PureData>} PureData
 * Contains no capabilities (promises, remotables)
 * Contains no sets or maps
 * Contains no proxies, or anything which can sense being examined.
 * Cannot be tested for, but only assured by construction
 * pureCopy(OnlyData) => PureData
 */

/**
 * @typedef {PureData | NestedData<OnlyData>} OnlyData
 * Tested by `isOnlyData`, `assertOnlyData`
 * Contains no capabilities (promises, remotables)
 * Contains no sets or maps
 * The objects it contains may contain proxies, and therefore
 * may cause side effects when examined.
 */

/**
 * @typedef {Remotable<any> | OnlyData | NestedData<PassableKey> } PassableKey
 *
 * PassableKeys can be compared for equivalence with `sameKey`. A
 * PassableKey can be used as a key in a StrongStore, i.e., used
 * as a key in a CopyMap, MemoryMap, or VirtualMap, and used as
 * an element of a CopySet, MemorySet, or VirtualSet.
 *
 * Note that a PassableKey cannot contain promises nor passable
 * stores.
 *
 * Passing should preserve `sameKey` equivalence. Given that PassableKeys
 * `Xa` and `Ya` in vat A, when passed to vat B, arrive as `Xb` and `Yb`, then
 * `sameKey(Xa, Ya)` in vat A must have the same answer as `sameKey(Xb, Yb)`
 * in vat B.
 */

/**
 * @template {PassableKey} K
 * @typedef {Object} CopyStore
 * @property {(key: K) => boolean} has
 * @property {() => K[]} keys
 *
 * A CopyStore may contain PassableKeys that cannot be sorted, so
 * the distributed object semantics itself does not specify a deterministic
 * enumeration order for passable stores. However, a given programming
 * language should specify a deterministic enumeration order. For JS
 * this would likely be based on insertion order.
 *
 * CopyStores are not themselves
 * PassableKeys and so cannot be compared with `sameKey` nor serve as
 * indexes in other passable stores. However, they are Comparable and
 * so may still be compared for equivalence with `sameStructure`. Two
 * CopyStores that are equivalent by `sameStructure` may have
 * different enumeration orders according to the more specific language
 * binding semantics.
 */

/**
 * @template {PassableKey} K
 * @typedef {CopyStore<K>} CopySet
 * Not yet implemented, but its PassStyle will be "copySet"
 */

/**
 * @template {PassableKey} K
 * @template {Passable} V
 * @typedef {CopyStore<K>} CopyMap
 * Not yet implemented, but its PassStyle will be "copyMap"
 *
 * @property {(key: K) => V} get
 * @property {() => V[]} values
 * @property {() => [K,V][]} entries
 */

/**
 * @template K,V
 * @typedef { PassableKey | CopySet<K> | CopyMap<K,V> } NestedComparable
 */

/**
 * @typedef { NestedComparable<Comparable>} Comparable
 */

/**
 * @typedef {Object} CopyError
 * Corresponding PassStyle is "copyError".
 *
 * Like a Promise, a CopyError is not a `PassableKey` or even a `Comparable`.
 * Thus, any composite (`CopyArray`, `CopyRecord`, `CopySet`, `CopyMap`)
 * that contains either one is itself not a `PassableKey` or even a
 * `Comparable`. However, a Promise is a capability (a LeafCap) whereas
 * a `CopyError` consists only of pure data. However, the data includes
 * information intended to help debugging and may vary in an undisciplined
 * manner. Thus, we discourage code from depending on the contents of
 * a `CopyError`.
 *
 * @property {string} name
 * @property {string} message
 * @property {string=} errorId
 */

/**
 * TODO Big open question raised as soon as we try to use these abstractions
 * on amounts. Consider an amount containing invite descritions. Each invite is a
 * non-fungible eright. An amount contains a set of invite descriptions. For now,
 * assume that each individual invite description is a PassableKey. But then
 * an amount of invites would naturally be a CopySet of these descriptions, we
 * we consider a Comparable but not a PassableKey. But an individual invite
 * description itself can contain arbitrary amounts, which forces us into the
 * fixed point of a CopySet of Comparables rather than a CopySet of PassableKeys.
 * What's worse, is we then cannot form a KeyPattern that matches amounts.
 *
 * What we're currently doing is that a non-fungible amount contains a CopyArray
 * of values representing a set, rather than using a CopySet directly. Then,
 * our prior work on amount patterns had to make a special case (the layering
 * violation below) to compare these arrays as if they were sets. Once we have
 * sets, this is unnatural.
 *
 * I think this means that we need to back off from our stratification of
 * PassableKey vs Comparable. Instead, reusing our transitive type constraint
 * logic, a CopySet containing only PassableKeys is itself a PassableKey. A
 * CopyMap containing only PassableKey keys and PassableKey values is itself
 * a CopyMap. This means that PassableKeys in general cannot be canonically
 * sorted. But we know when they're not, and we can still canonically sort them
 * into buckets for efficient indexing and iteration. Within each bucket, we
 * search by using brute force, which is what we're doing now. Or we privately
 * and separately use identity-indexed maps without exposing any sort order.
 */

/**
 * @typedef { "*" | "bind" | "rest" |
 *   "and" | "or" |
 *   "lt" | "lte" | "gte" | "gt" |
 *   "amountBrand" | "amountKind" | "amountEmpty" | "amountEqual" | "amountGTE"
 * } PatternKind
 *
 * * "*" is a wildcard. It matches anything.
 * * "bind" is a wildcard that binds the speciment to that variable name if
 *   there is a naming environment. Otherwise the appearance of "bind" is
 *   an error.
 * * "rest" matches a subset of a specimen record against the "like"
 *   CopyRecord, each of whose values can be a pattern. And it matches the
 *   rest of the specimen record against the "rest" pattern.
 * * "and", "or" take lists of sub-patterns, each of which is matched against
 *   the same specimen.
 * * "lt", "lte", "gte", "gt" compares against a LeafData right operand.
 *   The specimen must be the same type as the operant.
 *
 * In a gross violation of layering, we include some patterns specifically
 * tailored for amounts, to be used through the abstract `amountMath` API.
 * TODO The problem is that we do not yet have the knobs needed to make
 * PatternKind be user extensible.
 *
 * * "amountBrand" checks that it coerces using the stated brand.
 * * "amountKind" checks the AmountMathKind.
 * * "amountEmpty" checks that it is empty, i.e., represents to erights
 * * "amountEqual" checks that it represents the same erights.
 * * "isGTE" checks that it represents at least those erights.
 *
 * Unlike LeafData, amounts are in a set-like partial order.
 */

/**
 * @template T
 * @typedef {{ '@patternKind': T}} PatternClass
 */

/**
 * @typedef {PatternClass<'*'> |
 *   PatternClass<'bind'> & { name: string } |
 *   PatternClass<'rest'> & { like: CopyRecord, rest: KeyPattern }
 *   PatternClass<'and'> & { conjuncts: KeyPattern[] } |
 *   PatternClass<'or'> & { disjuncts: KeyPattern[] } |
 *   PatternClass<'lt'> & { rightOperand: LeafData } |
 *   PatternClass<'lte'> & { rightOperand: LeafData } |
 *   PatternClass<'gte'> & { rightOperand: LeafData } |
 *   PatternClass<'gt'> & { rightOperand: LeafData } |
 *
 *   PatternClass<'amountBrand'> & { brand:  Brand } |
 *   PatternClass<'amountKind'> & { mathKind:  AmountMathKind } |
 *   PatternClass<'amountEmpty'> |
 *   PatternClass<'amountEqual'> & { rightOperand:  Amount } |
 *   PatternClass<'amountGTE'> & { rightOperand:  Amount } |
 * } PatternNode
 */

/**
 * A KeyPattern matches some set of PassableKeys. A PassableKey used as
 * a KeyPattern uniquely matches only that PassableKey. When both `pattern`
 * and `specimen` are PassableKeys, then `match(pattern, specimen)` gives
 * the same answer as `sameKey(pattern, specimen)`.
 *
 * @typedef {PassableKey | PatternNode} KeyPattern
 */

/**
 * @typedef { Promise<any> | CopyError | PatternNode |
 *   NestedComparable<Passable>
 * } Passable
 * A Passable value that may be marshalled. It is classified as one of
 * PassStyle. A Passable must be hardened.
 *
 * A Passable has a pass-by-copy superstructure. This includes the atomic
 * pass-by-copy data primitives, the pass-by-copy composites that can
 * contain other passables (CopyArray, CopyRecord, CopySet, CopyMap),
 * and finally `CopyError`s which are purely pass-by-copy but not considered
 * Comparable.
 *
 * A Passable's pass-by-copy superstructure ends in LeafData and LeafCaps. The
 * Passable can be further classified by the nature of the LeafCaps. Since a
 * Passable is hardened, its structure and classification is stable --- its
 * structure and classification cannot change even if some of the objects are
 * proxies.
 */

// /////////////////////////////////////////////////////////////////////////////

/**
 * @template Slot
 * @callback ConvertValToSlot
 * @param {PassableCap} val
 * @returns {Slot}
 */

/**
 * @template Slot
 * @callback ConvertSlotToVal
 * @param {Slot} slot
 * @param {InterfaceSpec=} iface
 * @returns {PassableCap}
 */

/**
 * @template T
 * @typedef {{ '@qclass': T }} EncodingClass
 */

/**
 * TODO Add cases for CopySet, CopyMap, and PatternNode
 *
 * @typedef {EncodingClass<'NaN'> |
 *   EncodingClass<'undefined'> |
 *   EncodingClass<'Infinity'> |
 *   EncodingClass<'-Infinity'> |
 *   EncodingClass<'bigint'> & { digits: string } |
 *   EncodingClass<'@@asyncIterator'> |
 *   EncodingClass<'error'> & { name: string,
 *                              message: string,
 *                              errorId?: string } |
 *   EncodingClass<'slot'> & { index: number, iface?: InterfaceSpec } |
 *   EncodingClass<'hilbert'> & { original: Encoding, rest?: Encoding }
 * } EncodingUnion
 * @typedef {{ [index: string]: Encoding, '@qclass'?: undefined }
 * } EncodingRecord
 * We exclude '@qclass' as a property in encoding records.
 * @typedef {EncodingUnion | null | string | boolean | number | EncodingRecord
 * } EncodingElement
 */

/**
 * @typedef {EncodingElement | NestedArray<EncodingElement>} Encoding
 * The JSON structure that the data portion of a Passable serializes to.
 *
 * The QCLASS 'hilbert' is a reference to the Hilbert Hotel
 * of https://www.ias.edu/ideas/2016/pires-hilbert-hotel
 * If QCLASS appears as a property name in the data, we encode it instead
 * as a QCLASS record of type 'hilbert'. To do so, we must move the other
 * parts of the record into fields of the hilbert record.
 */

/**
 * @template Slot
 * @typedef CapData
 * @property {string} body A JSON.stringify of an Encoding
 * @property {Slot[]} slots
 */

/**
 * @template Slot
 * @callback Serialize
 * @param {Passable} val
 * @returns {CapData<Slot>}
 */

/**
 * @template Slot
 * @callback Unserialize
 * @param {CapData<Slot>} data
 * @returns {Passable}
 */

/**
 * @template Slot
 * @typedef Marshal
 * @property {Serialize<Slot>} serialize
 * @property {Unserialize<Slot>} unserialize
 */

/**
 * @template Slot
 * @callback MakeMarshal
 * @param {ConvertValToSlot=} convertValToSlot
 * @param {ConvertSlotToVal=} convertSlotToVal
 * @param {MakeMarshalOptions=} options
 * @returns {Marshal}
 */

/**
 * @typedef MakeMarshalOptions
 * @property {'on'|'off'=} errorTagging controls whether serialized errors
 * also carry tagging information, made from `marshalName` and numbers
 * generated (currently by counting) starting at `errorIdNum`. The
 * `errorTagging` option defaults to `'on'`. Serialized
 * errors are also logged to `marshalSaveError` only if tagging is `'on'`.
 * @property {string=} marshalName Used to identify sent errors.
 * @property {number=} errorIdNum Ascending numbers staring from here
 * identify the sending of errors relative to this marshal instance.
 * @property {(err: Error) => void=} marshalSaveError If `errorTagging` is
 * `'on'`, then errors serialized by this marshal instance are also
 * logged by calling `marshalSaveError` *after* `assert.note` associated
 * that error with its errorId. Thus, if `marshalSaveError` in turn logs
 * to the normal console, which is the default, then the console will
 * show that note showing the associated errorId.
 */

// /////////////////////////////////////////////////////////////////////////////

/**
 * @typedef {string} InterfaceSpec
 * This is an interface specification.
 * For now, it is just a string, but will eventually be any OnlyData. Either
 * way, it must remain pure, so that it can be safely shared by subgraphs that
 * are not supposed to be able to communicate.
 */

/**
 * @callback MarshalGetInterfaceOf
 * Simple semantics, just tell what interface (or undefined) a remotable has.
 *
 * @param {*} maybeRemotable the value to check
 * @returns {InterfaceSpec|undefined} the interface specification, or undefined
 * if not a deemed to be a Remotable
 */
