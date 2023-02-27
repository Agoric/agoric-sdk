/// <reference types="ses"/>

/** @typedef {import('@endo/marshal').Passable} Passable */
/** @typedef {import('@endo/marshal').PassStyle} PassStyle */
/** @typedef {import('@endo/marshal').CopyTagged} CopyTagged */
/** @template T @typedef {import('@endo/marshal').CopyRecord<T>} CopyRecord */
/** @template T @typedef {import('@endo/marshal').CopyArray<T>} CopyArray */
/** @typedef {import('@endo/marshal').Checker} Checker */

/**
 * @typedef {Passable} Key
 *
 * Keys are Passable arbitrarily-nested pass-by-copy containers
 * (CopyArray, CopyRecord, CopySet, CopyBag, CopyMap) in which every
 * non-container leaf is either a Passable primitive value or a Remotable (a
 * remotely-accessible object or presence for a remote object), or such leaves
 * in isolation with no container.
 *
 * Keys are so named because they can be used as keys in CopyMaps and
 * [agoric-sdk Stores](https://github.com/Agoric/agoric-sdk/blob/master/packages/store/docs/store-taxonomy.md),
 * and as elements in CopySets and CopyBags.
 *
 * Keys cannot contain promises or errors, as these do not have useful
 * distributed equality semantics. Keys also cannot contain any CopyTagged
 * except for those recognized as CopySets, CopyBags, and CopyMaps.
 *
 * Be aware that we may recognize more CopyTaggeds over time, including
 * CopyTaggeds recognized as Keys.
 *
 * Distributed equality is location independent.
 * The same two Keys, passed to another location, will be `keyEQ` there iff
 * they are `keyEQ` here. (`keyEQ` tests equality according to the
 * key distributed equality semantics.)
 */

/**
 * @typedef {Passable} Pattern
 *
 * Patterns are Passable arbitrarily-nested pass-by-copy containers
 * (CopyArray, CopyRecord, CopySet, CopyBag, CopyMap) in which every
 * non-container leaf is either a Key or a Matcher, or such leaves in isolation
 * with no container.
 *
 * A Pattern acts as a declarative total predicate over Passables, where each
 * Passable is either matched or not matched by it. Every Key is also a Pattern
 * that matches only "itself", i.e., Keys that are `keyEQ` to it according to
 * the key distributed equality semantics.
 *
 * Patterns cannot contain promises or errors, as these do
 * not have useful distributed equality or matching semantics. Likewise,
 * no Pattern can distinguish among promises, or distinguish among errors.
 * Patterns also cannot contain any CopyTaggeds except for those recognized as
 * CopySets, CopyBags, CopyMaps, or Matchers.
 *
 * Be aware that we may recognize more CopyTaggeds over time, including
 * CopyTaggeds recognized as Patterns.
 *
 * Whether a Passable is matched by a given Pattern is location independent.
 * If a given Passable and Pattern are passed to another location,
 * the Passable will be matched by the Pattern there iff the Passable is matched
 * by the Pattern here.
 *
 * Patterns are often used in a type-like manner, to represent the category
 * of Passables that the Pattern is intended* to match. To keep this
 * distinction clear, we often use the suffix "Shape" rather than "Pattern"
 * to avoid confusion when the Pattern itself represents
 * some category of Pattern. For example, an "AmountShape" represents the
 * category of Amounts. And "AmountPatternShape" represents the
 * category of Patterns over Amounts.
 *
 * * We say "intended" above because Patterns, in order to be declarative
 * and Passable, cannot have the generality of predicates written in a
 * Turing-universal programming language. Rather, to represent the category of
 * things intended to be a Foo, a FooShape should reliably
 * accept all Foos and reject only non-Foos. However, a FooShape may also accept
 * non-Foos that "look like" or "have the same shape as" genuine Foos.
 * An accurate predicate for e.g. input validation would need to supplement the
 * Pattern check with code to detect the residual cases.
 * We hope the "Shape" metaphor helps remind us of this type-like imprecision
 * of Patterns.
 */

// TODO parameterize CopyTagged to support these refinements

/**
 * @template {Key} K
 * @typedef {CopyTagged & {
 *   [Symbol.toStringTag]: 'copySet',
 *   payload: Array<K>,
 * }} CopySet
 *
 * A Passable collection of Keys that are all mutually distinguishable
 * according to the key distributed equality semantics exposed by `keyEQ`.
 */

/**
 * @template {Key} K
 * @typedef {CopyTagged & {
 *   [Symbol.toStringTag]: 'copyBag',
 *   payload: Array<[K, bigint]>,
 * }} CopyBag
 *
 * A Passable collection of entries with Keys that are all mutually distinguishable
 * according to the key distributed equality semantics exposed by `keyEQ`,
 * each with a corresponding positive cardinality.
 */

/**
 * @template {Key} K
 * @template {Passable} V
 * @typedef {CopyTagged & {
 *   [Symbol.toStringTag]: 'copyMap',
 *   payload: { keys: Array<K>, values: Array<V> },
 * }} CopyMap
 *
 * A Passable collection of entries with Keys that are all mutually distinguishable
 * according to the key distributed equality semantics exposed by `keyEQ`,
 * each with a corresponding Passable value.
 */

// TODO: enumerate Matcher tag values?
/**
 * @typedef {CopyTagged & {
 *   [Symbol.toStringTag]: `match:${string}`,
 * }} Matcher
 *
 * A Pattern representing the predicate characterizing a category of Passables,
 * such as strings or 8-bit unsigned integer numbers or CopyArrays of Remotables.
 */

/**
 * @typedef {object} StoreOptions
 * Of the dimensions on which KeyedStores can differ, we only represent a few
 * of them as standard options. A given store maker should document which
 * options it supports, as well as its positions on dimensions for which it
 * does not support options.
 * @property {boolean} [longLived=true] Which way to optimize a weak store. True means
 * that we expect this weak store to outlive most of its keys, in which
 * case we internally may use a JavaScript `WeakMap`. Otherwise we internally
 * may use a JavaScript `Map`.
 * Defaults to true, so please mark short lived stores explicitly.
 * @property {boolean} [durable=false]  The contents of this store survive termination
 *   of its containing process, allowing for restart or upgrade but at the cost
 *   of forbidding storage of references to ephemeral data.  Defaults to false.
 * @property {boolean} [fakeDurable=false]  This store pretends to be a durable store
 *   but does not enforce that the things stored in it actually be themselves
 *   durable (whereas an actual durable store would forbid storage of such
 *   items).  This is in service of allowing incremental transition to use of
 *   durable stores, to enable normal operation and testing when some stuff
 *   intended to eventually be durable has not yet been made durable.  A store
 *   marked as fakeDurable will appear to operate normally but any attempt to
 *   upgrade its containing vat will fail with an error.
 * @property {Pattern} [keyShape]
 * @property {Pattern} [valueShape]
 */

/**
 * Most store methods are in one of three categories
 *   * lookup methods (`has`,`get`)
 *   * update methods (`add`,`init`,`set`,`delete`,`addAll`)
 *   * query methods (`snapshot`,`keys`,`values`,`entries`,`getSize`)
 *   * query-update methods (`clear`)
 *
 * WeakStores have the lookup and update methods but not the query
 * or query-update methods.
 * Non-weak Stores are like their corresponding WeakStores, but with the
 * additional query and query-update methods.
 */

/**
 * @template K
 * @typedef {object} WeakSetStore
 * @property {(key: K) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this store.
 * @property {(key: K) => void} add
 * Add the key to the set if it is not already there. Do nothing silently if
 * already there.
 * The key must be one allowed by this store. For example a scalar store only
 * allows primitives and remotables.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 * @property {(keys: CopySet<K> | Iterable<K>) => void} addAll
 */

/**
 * @template K
 * @typedef {object} SetStore
 * @property {(key: K) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this store.
 * @property {(key: K) => void} add
 * Add the key to the set if it is not already there. Do nothing silently if
 * already there.
 * The key must be one allowed by this store. For example a scalar store only
 * allows primitives and remotables.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 * @property {(keys: CopySet<K> | Iterable<K>) => void} addAll
 * @property {(keyPatt?: Pattern) => Iterable<K>} keys
 * @property {(keyPatt?: Pattern) => Iterable<K>} values
 * @property {(keyPatt?: Pattern) => CopySet<K>} snapshot
 * @property {(keyPatt?: Pattern) => number} getSize
 * @property {(keyPatt?: Pattern) => void} clear
 */

/**
 * @template K,V
 * @typedef {object} WeakMapStore
 * @property {(key: K) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this store.
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
 * @property {(key: K, value: V) => void} init
 * Initialize the key only if it doesn't already exist.
 * The key must be one allowed by this store. For example a scalar store only
 * allows primitives and remotables.
 * @property {(key: K, value: V) => void} set
 * Set the key. Throws if not found.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 * @property {(entries: CopyMap<K,V> | Iterable<[K,V]>) => void} addAll
 */

/**
 * @template K,V
 * @typedef {object} MapStore
 * @property {(key: K) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this map
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
 * @property {(key: K, value: V) => void} init
 * Initialize the key only if it doesn't already exist.
 * The key must be one allowed by this store. For example a scalar store only
 * allows primitives and remotables.
 * @property {(key: K, value: V) => void} set
 * Set the key. Throws if not found.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 * @property {(entries: CopyMap<K,V> | Iterable<[K,V]>) => void} addAll
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern) => Iterable<K>} keys
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern) => Iterable<V>} values
 * @property {(
 *   keyPatt?: Pattern,
 *   valuePatt?: Pattern
 * ) => Iterable<[K,V]>} entries
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern) => CopyMap<K,V>} snapshot
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern) => number} getSize
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern) => void} clear
 */

// ///////////////////////// Deprecated Legacy /////////////////////////////////

/**
 * @template K,V
 * @typedef {object} LegacyWeakMap
 * LegacyWeakMap is deprecated. Use WeakMapStore instead if possible.
 * @property {(key: K) => boolean} has
 * Check if a key exists
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
 * @property {(key: K, value: V) => void} init
 * Initialize the key only if it
 * doesn't already exist
 * @property {(key: K, value: V) => void} set
 * Set the key. Throws if not found.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 */

/**
 * @template K,V
 * @typedef {object} LegacyMap
 * LegacyMap is deprecated. Use MapStore instead if possible.
 * @property {(key: K) => boolean} has
 * Check if a key exists
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
 * @property {(key: K, value: V) => void} init
 * Initialize the key only if it
 * doesn't already exist
 * @property {(key: K, value: V) => void} set
 * Set the key. Throws if not found.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 * @property {() => Iterable<K>} keys
 * @property {() => Iterable<V>} values
 * @property {() => Iterable<[K,V]>} entries
 * @property {() => number} getSize
 * @property {() => void} clear
 */

// /////////////////////////////////////////////////////////////////////////////

/**
 * @typedef {-1 | 0 | 1} RankComparison
 * The result of a `RankCompare` function that defines a rank-order, i.e.,
 * a total preorder in which different elements are always comparable but
 * can be tied for the same rank. See `RankCompare`.
 */

/**
 * @callback RankCompare
 * Returns `-1`, `0`, or `1` depending on whether the rank of `left`
 * is before, tied-with, or after the rank of `right`.
 *
 * This comparison function is valid as argument to
 * `Array.prototype.sort`. This is sometimes described as a "total order"
 * but, depending on your definitions, this is technically incorrect because
 * it may return `0` to indicate that two distinguishable elements such as
 * `-0` and `0` are tied (i.e., are in the same equivalence class
 * for the purposes of this ordering). If each such equivalence class is
 * a *rank* and ranks are disjoint, then this "rank order" is a
 * true total order over these ranks. In mathematics this goes by several
 * other names such as "total preorder".
 *
 * This function establishes a total rank order over all passables.
 * To do so it makes arbitrary choices, such as that all strings
 * are after all numbers. Thus, this order is not intended to be
 * used directly as a comparison with useful semantics. However, it must be
 * closely enough related to such comparisons to aid in implementing
 * lookups based on those comparisons. For example, in order to get a total
 * order among ranks, we put `NaN` after all other JavaScript "number" values
 * (i.e., IEEE 754 floating-point values). But otherwise, we rank JavaScript
 * numbers by signed magnitude, with `0` and `-0` tied. A semantically useful
 * ordering would also compare magnitudes, and so agree with the rank ordering
 * of all values other than `NaN`. An array sorted by rank would enable range
 * queries by magnitude.
 * @param {Passable} left
 * @param {Passable} right
 * @returns {RankComparison}
 */

/**
 * @typedef {RankCompare} FullCompare
 * A `FullCompare` function satisfies all the invariants stated below for
 * `RankCompare`'s relation with KeyCompare.
 * In addition, its equality is as precise as the `KeyCompare`
 * comparison defined below, in that, for all Keys `x` and `y`,
 * `FullCompare(x, y) === 0` iff `KeyCompare(x, y) === 0`.
 *
 * For non-Key inputs, a `FullCompare` should be exactly as imprecise as
 * `RankCompare`. For example, both will treat all errors as in the same
 * equivalence class. Both will treat all promises as in the same
 * equivalence class. Both will order tagged records the same way, which is
 * admittedly weird because some (such as CopySets, CopyBags, and CopyMaps)
 * will be considered Keys while others will be considered non-Keys.
 */

/**
 * @typedef {object} RankComparatorKit
 * @property {RankCompare} comparator
 * @property {RankCompare} antiComparator
 */

/**
 * @typedef {object} FullComparatorKit
 * @property {FullCompare} comparator
 * @property {FullCompare} antiComparator
 */

/**
 * @typedef {-1 | 0 | 1 | NaN} KeyComparison
 * The result of a `KeyCompare` function that defines a meaningful
 * and meaningfully precise partial order of Key values. See `KeyCompare`.
 */

/**
 * @callback KeyCompare
 * `compareKeys` implements a partial order over keys. As with the
 * rank ordering produced by `compareRank`, -1, 0, and 1 mean
 * "less than", "equivalent to", and "greater than" respectively.
 * NaN means "incomparable" --- the first key is not less, equivalent,
 * or greater than the second. For example, subsets over sets is
 * a partial order.
 *
 * By using NaN for "incomparable", the normal equivalence for using
 * the return value in a comparison is preserved.
 * `compareKeys(left, right) >= 0` iff `left` is greater than or
 * equivalent to `right` in the partial ordering.
 *
 * Key order (a partial order) and rank order (a total preorder) are
 * co-designed so that we store Passables in rank order and index into them
 * with keys for key-based queries. To keep these distinct, when speaking
 * informally about rank, we talk about "earlier" and "later". When speaking
 * informally about keys, we talk about "smaller" and "bigger".
 *
 * In both orders, the return-0 case defines
 * an equivalence class, i.e., those that are tied for the same place in the
 * order. The global invariant that we need between the two orders is that the
 * key order equivalence class is always at least as precise as the
 * rank order equivalence class. IOW, if `compareKeys(X,Y) === 0` then
 * `compareRank(X,Y) === 0`. But not vice versa. For example, two different
 * remotables are the same rank but incomparable as keys.
 *
 * A further invariant is if `compareKeys(X,Y) < 0` then
 * `compareRank(X,Y) < 0`, i.e., if X is smaller than Y in key order, then X
 * must be earlier than Y in rank order. But not vice versa.
 * X can be equivalent to or earlier than Y in rank order and still be
 * incomparable with Y in key order. For example, the record `{b: 3, a: 5}` is
 * earlier than the record `{b: 5, a: 3}` in rank order but they are
 * incomparable as keys. And two distinct remotables such as `Far('X', {})` and
 * `Far('Y', {})` are equivalent in rank order but incomparable as Keys.
 *
 * This lets us translate a range search over the
 * partial key order into a range search over rank order followed by filtering
 * out those that don't match. To get this effect, we store the elements of
 * a set in an array sorted in reverse rank order, from later to earlier.
 * Combined with our lexicographic comparison of arrays, if set X is a subset
 * of set Y then the array representing set X will be an earlier rank that the
 * array representing set Y.
 *
 * @param {Key} left
 * @param {Key} right
 * @returns {KeyComparison}
 */

// ///////////////////// Should be internal only types /////////////////////////

/**
 * @typedef {[string, string]} RankCover
 */

/**
 * @typedef {[number, number]} IndexCover
 */

/**
 * @callback GetPassStyleCover
 * Associate with each passStyle a RankCover that may be an overestimate,
 * and whose results therefore need to be filtered down. For example, because
 * there is not a smallest or biggest bigint, bound it by `NaN` (the last place
 * number) and `''` (the empty string, which is the first place string). Thus,
 * a range query using this range may include these values, which would then
 * need to be filtered out.
 * @param {PassStyle} passStyle
 * @returns {RankCover}
 */

/**
 * @callback GetIndexCover
 * @param {Passable[]} sorted
 * @param {RankCompare} compare
 * @param {RankCover} rankCover
 * @returns {IndexCover}
 */

/**
 * @callback CoveredEntries
 * @param {Passable[]} sorted
 * @param {IndexCover} indexCover
 * @returns {Iterable<[number, Passable]>}
 */

/**
 * @callback CheckPattern
 * @param {Passable} allegedPattern
 * @param {Checker} check
 * @returns {boolean}
 */

/**
 * @callback KeyToDBKey
 * If this key can be encoded as a DBKey string which sorts correctly,
 * return that string. Else return `undefined`. For example, a scalar-only
 * encodePassable would return `undefined` for all non-scalar keys.
 * @param {Passable} key
 * @returns {string | undefined}
 */

/**
 * @callback GetRankCover
 * @param {Pattern} pattern
 * @param {KeyToDBKey} encodePassable
 * @returns {RankCover}
 */

/**
 * @typedef {object} AllLimits
 * @property {number} decimalDigitsLimit
 * @property {number} stringLengthLimit
 * @property {number} symbolNameLengthLimit
 * @property {number} numPropertiesLimit
 * @property {number} propertyNameLengthLimit
 * @property {number} arrayLengthLimit
 * @property {number} numSetElementsLimit
 * @property {number} numUniqueBagElementsLimit
 * @property {number} numMapEntriesLimit
 */

/**
 * @typedef {Partial<AllLimits>} Limits
 */

/**
 * @typedef {object} PatternMatchers
 *
 * @property {() => Matcher} any
 * Matches any Passable.
 *
 * @property {(...subPatts: Pattern[]) => Matcher} and
 * Matches against the intersection of all sub-Patterns.
 *
 * @property {(...subPatts: Pattern[]) => Matcher} or
 * Matches against the union of all sub-Patterns
 * (requiring a successful match against at least one).
 *
 * @property {(subPatt: Pattern) => Matcher} not
 * Matches against the negation of the sub-Pattern.
 *
 * @property {() => Matcher} scalar
 * Matches any Passable primitive value or Remotable.
 * All matched values are Keys.
 *
 * @property {() => Matcher} key
 * Matches any value that can be a key in a CopyMap
 * or an element in a CopySet or CopyBag.
 * All matched values are also valid Patterns that match only themselves.
 *
 * @property {() => Matcher} pattern
 * Matches any Pattern that can be used to characterize Passables.
 * A Pattern cannot contain promises or errors,
 * as these are not stable enough to usefully match.
 *
 * @property {(kind: PassStyle | string) => Matcher} kind
 * When `kind` specifies a PassStyle other than "tagged",
 * matches any value having that PassStyle.
 * Otherwise, when `kind` specifies a known tagged record tag
 * (such as 'copySet', 'copyBag', 'copyMap', or 'match:scalar'),
 * matches any CopyTagged with that tag and a valid tag-specific payload.
 * Otherwise, does not match any value.
 * TODO: Reject attempts to create a kind matcher with unknown `kind`?
 *
 * @property {() => Matcher} boolean
 * Matches `true` or `false`.
 *
 * @property {() => Matcher} number
 * Matches any floating point number,
 * including `NaN` and either signed Infinity.
 *
 * @property {(limits?: Limits) => Matcher} bigint
 * Matches any bigint, subject to limits.
 *
 * @property {(limits?: Limits) => Matcher} nat
 * Matches any non-negative bigint or
 * "safe" (no greater than 2**53 - 1) non-negative integral number,
 * subject to limits.
 *
 * @property {(limits?: Limits) => Matcher} string
 * Matches any string, subject to limits.
 *
 * @property {(limits?: Limits) => Matcher} symbol
 * Matches any registered or well-known symbol,
 * subject to limits.
 *
 * @property {(limits?: Limits) => Matcher} record
 * Matches any CopyRecord, subject to limits.
 *
 * @property {(limits?: Limits) => Matcher} array
 * Matches any CopyArray, subject to limits.
 *
 * @property {(limits?: Limits) => Matcher} set
 * Matches any CopySet, subject to limits.
 *
 * @property {(limits?: Limits) => Matcher} bag
 * Matches any CopyBag, subject to limits.
 *
 * @property {(limits?: Limits) => Matcher} map
 * Matches any CopyMap, subject to limits.
 *
 * @property {(label?: string) => Matcher} remotable
 * Matches a far object or its remote presence.
 * The optional `label` is purely for diagnostic purposes and does not
 * add any constraints.
 *
 * @property {() => Matcher} error
 * Matches any error object.
 * Error objects are Passable, but are neither Keys nor Patterns.
 * They do not have a useful identity.
 *
 * @property {() => Matcher} promise
 * Matches any promise object.
 * Promises are Passable, but are neither Keys nor Patterns.
 * They do not have a useful identity.
 *
 * @property {() => Matcher} undefined
 * Matches the exact value `undefined`.
 * All keys including `undefined` are already valid Patterns and
 * so can validly represent themselves.
 * But optional Pattern arguments `(patt = undefined) => ...`
 * treat explicit `undefined` as omission of the argument.
 * Thus, when a passed Pattern does not also need to be a Key,
 * we recommend passing `M.undefined()` rather than `undefined`.
 *
 * @property {() => null} null
 * Returns `null`, which matches only itself.
 *
 * @property {(rightOperand :Key) => Matcher} lt
 * Matches any value that compareKeys reports as less than rightOperand.
 *
 * @property {(rightOperand :Key) => Matcher} lte
 * Matches any value that compareKeys reports as less than or equal to
 * rightOperand.
 *
 * @property {(key :Key) => Matcher} eq
 * Matches any value that is equal to key.
 *
 * @property {(key :Key) => Matcher} neq
 * Matches any value that is not equal to key.
 *
 * @property {(rightOperand :Key) => Matcher} gte
 * Matches any value that compareKeys reports as greater than or equal
 * to rightOperand.
 *
 * @property {(rightOperand :Key) => Matcher} gt
 * Matches any value that compareKeys reports as greater than
 * rightOperand.
 *
 * @property {(subPatt?: Pattern, limits?: Limits) => Matcher} arrayOf
 * Matches any CopyArray whose elements are all matched by `subPatt`
 * if defined, subject to limits.
 *
 * @property {(keyPatt?: Pattern,
 *             valuePatt?: Pattern,
 *             limits?: Limits
 * ) => Matcher} recordOf
 * Matches any CopyRecord whose keys are all matched by `keyPatt`
 * if defined and values are all matched by `valuePatt` if defined,
 * subject to limits.
 *
 * @property {(keyPatt?: Pattern, limits?: Limits) => Matcher} setOf
 * Matches any CopySet whose elements are all matched by `keyPatt`
 * if defined, subject to limits.
 *
 * @property {(keyPatt?: Pattern,
 *             countPatt?: Pattern,
 *             limits?: Limits
 * ) => Matcher} bagOf
 * Matches any CopyBag whose elements are all matched by `keyPatt`
 * if defined and the cardinality of each is matched by `countPatt`
 * if defined, subject to limits.
 * `countPatt` is expected to rarely be useful,
 * but is provided to minimize surprise.
 *
 * @property {(keyPatt?: Pattern,
 *             valuePatt?: Pattern,
 *             limits?: Limits
 * ) => Matcher} mapOf
 * Matches any CopyMap whose keys are all matched by `keyPatt` if defined
 * and values are all matched by `valuePatt` if defined,
 * subject to limits.
 *
 * @property {(required: Pattern[],
 *             optional?: Pattern[],
 *             rest?: Pattern,
 * ) => Matcher} splitArray
 * Matches any array --- typically an arguments list --- consisting of
 *   - an initial portion matched by `required`, and
 *   - a middle portion of length up to the length of `optional` that is
 *     matched by the equal-length prefix of `optional` if `optional` is
 *     defined, and
 *   - a remainder that is matched by `rest` if `rest` is defined.
 * The array must be at least as long as `required`
 * but its remainder can be arbitrarily short.
 * Any array elements beyond the summed length of `required` and `optional`
 * are collected and matched against `rest`.
 *
 * @property {(required: CopyRecord<Pattern>,
 *             optional?: CopyRecord<Pattern>,
 *             rest?: Pattern,
 * ) => Matcher} splitRecord
 * Matches any CopyRecord that can be split into component CopyRecords
 * as follows:
 *   - all properties corresponding with a property of `required`
 *   - all properties corresponding with a property of `optional`
 *     but not corresponding with a property of `required`
 *   - all other properties
 * where the first component is matched by `required`,
 * the second component is matched by the subset of `optional`
 * corresponding with its properties if `optional` is defined, and
 * the third component is matched by `rest` if defined.
 * The CopyRecord must have all properties that appear on `required`,
 * but may omit properties that appear on `optional`.
 *
 * @property {(basePatt: CopyRecord<*> | CopyArray<*>,
 *             rest?: Pattern,
 * ) => Matcher} split
 * Deprecated. Use `M.splitArray` or `M.splitRecord` instead.
 * An array or record is split into the first part that is matched by
 * `basePatt`, and the remainder, which is matched against `rest` if present.
 *
 * @property {(basePatt: CopyRecord<*> | CopyArray<*>,
 *             rest?: Pattern,
 * ) => Matcher} partial
 * Deprecated. Use `M.splitArray` or `M.splitRecord` instead.
 * An array or record is split into the first part that is matched by
 * `basePatt`, and the remainder, which is matched against `rest` if present.
 * `M.partial` differs from `M.split` in the handling of data that is
 * described in `basePatt` but absent in a provided specimen:
 *   - For a CopyRecord, `M.partial` ignores properties of `basePatt`
 *     that are not present on the specimen.
 *   - For a CopyArray, `M.partial` ignores elements of `basePatt`
 *     at indices beyond the maximum index of the specimen.
 *
 * @property {(subPatt: Pattern) => Pattern} eref
 * Matches any Passable that is either matched by `subPatt` or is a promise object.
 * Note that validation is immediate, so (unlike the TypeScript ERef<T>
 * type) `M.eref` matches a promise object whose fulfillment value is
 * _not_ matched by `subPatt`.
 * For describing a top-level parameter,
 * `M.callWhen(..., M.await(p), ...)` is preferred over `M.call(..., M.eref(p), ...)`
 * because the former always checks against the sub-Pattern (awaiting fulfillment
 * if necessary) while the latter bypasses such checks when the relevant argument
 * is a promise.
 *
 * @property {(subPatt: Pattern) => Pattern} opt
 * Matches any Passable that is matched by `subPatt` or is the exact value `undefined`.
 */

/**
 * @typedef {object} GuardMakers
 * @property {<M extends Record<any, any>>(interfaceName: string,
 *             methodGuards: M,
 *             options?: {sloppy?: boolean}
 * ) => InterfaceGuard} interface Guard an interface to a far object or facet
 *
 * @property {(...argGuards: ArgGuard[]) => MethodGuardMaker} call Guard a synchronous call
 *
 * @property {(...argGuards: ArgGuard[]) => MethodGuardMaker} callWhen Guard an async call
 *
 * @property {(argGuard: ArgGuard) => ArgGuard} await Guard an await
 */

/**
 * @typedef {PatternMatchers & GuardMakers} MatcherNamespace
 */

/** @typedef {(...args: any[]) => any} Method */

// TODO parameterize this to match the behavior object it guards
/**
 * @typedef {{
 * klass: 'Interface',
 * interfaceName: string,
 * methodGuards: Record<string | symbol, MethodGuard>
 * sloppy?: boolean
 * }} InterfaceGuard
 */

/**
 * @typedef {any} MethodGuardMaker
 * a parameter list like foo(a, b, c = d, …e) => f should be guarded by
 * something like
 * foo: M.call(AShape, BShape).optional(CShape).rest(EShape).returns(FShape)
 * optional is for optional (=) params. rest is for … (varargs) params
 */

/** @typedef {{ klass: 'methodGuard', callKind: 'sync' | 'async', returnGuard: unknown }} MethodGuard */
/** @typedef {any} ArgGuard */

/**
 * @typedef {object} PatternKit
 * @property {(specimen: Passable,
 *             patt: Passable,
 *             check: Checker,
 *             label?: string|number
 * ) => boolean} checkMatches
 * @property {(specimen: Passable, patt: Pattern) => boolean} matches
 * @property {(specimen: Passable, patt: Pattern, label?: string|number) => void} mustMatch
 * @property {(patt: Pattern) => void} assertPattern
 * @property {(patt: Passable) => boolean} isPattern
 * @property {GetRankCover} getRankCover
 * @property {MatcherNamespace} M
 */

// /////////////////////////////////////////////////////////////////////////////

// TODO
// The following type should be in internal-types.js, since the
// `MatchHelper` type is purely internal to this package. However,
// in order to get the governance and solo packages both to pass lint,
// I moved the type declaration itself to types.js. See the comments in
// in internal-types.js and exports.js

/**
 * @typedef {object} MatchHelper
 * This factors out only the parts specific to each kind of Matcher. It is
 * encapsulated, and its methods can make the stated unchecker assumptions
 * enforced by the common calling logic.
 *
 * @property {(allegedPayload: Passable,
 *             check: Checker
 * ) => boolean} checkIsWellFormed
 * Reports whether `allegedPayload` is valid as the payload of a CopyTagged
 * whose tag corresponds with this MatchHelper's Matchers.
 *
 * @property {(specimen: Passable,
 *             matcherPayload: Passable,
 *             check: Checker,
 * ) => boolean} checkMatches
 * Assuming validity of `matcherPayload` as the payload of a Matcher corresponding
 * with this MatchHelper, reports whether `specimen` is matched by that Matcher.
 *
 * @property {(
 *   payload: Passable,
 *   encodePassable: KeyToDBKey
 * ) => RankCover} getRankCover
 * Assumes this is the payload of a CopyTagged with the corresponding
 * matchTag. Return a RankCover to bound from below and above,
 * in rank order, all possible Passables that would match this Matcher.
 * The left element must be before or the same rank as any possible
 * matching specimen. The right element must be after or the same
 * rank as any possible matching specimen.
 */
