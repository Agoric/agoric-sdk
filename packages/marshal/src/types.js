// @ts-nocheck TODO Fix the recursive types to it checks. Will this
// require a .d.ts file? I don't know.

// eslint-disable-next-line spaced-comment
/// <reference path="extra-types.d.ts" />

/**
 * @typedef { "undefined" | "null" |
 *   "boolean" | "number" | "bigint" | "string" | "symbol"
 * } PrimitiveStyle
 */

/**
 * @typedef { PrimitiveStyle |
 *   "copyRecord" | "copyArray" | "tagged" |
 *   "remotable" |
 *   "error" | "promise"
 * } PassStyle
 *
 * Aside from "undefined", these declarations list the PassStyles in the same
 * order as the rank ordering used in `rankOrder.js`.
 * This `PassStyle` declaration should be kept in sync with the
 * `PassStyleRankAndCover` data structure in `rankOrder.js` used to implement
 * it.
 *
 * See the note there explaining why it places `undefined` at the end of the
 * ordering.
 */

// TODO declare more precise types throughout this file, so the type system
// and IDE can be more helpful.

/**
 * @typedef {*} Passable
 *
 * A Passable value that may be marshalled. It is classified as one of
 * PassStyle. A Passable must be hardened.
 *
 * A Passable has a pass-by-copy superstructure. This includes
 *    the atomic pass-by-copy primitives ("undefined" | "null" |
 *      "boolean" | "number" | "bigint" | "string" | "symbol"),
 *    the pass-by-copy containers
 *      ("copyRecord" | "copyArray" | "tagged") that
 *      contain other Passables,
 *    and the special cases ("error" | "promise").
 *
 * A Passable's pass-by-copy superstructure ends in
 * PassableCap leafs ("remotable" | "promise"). Since a
 * Passable is hardened, its structure and classification is stable --- its
 * structure and classification cannot change even if some of the objects are
 * proxies.
 */

/**
 * @callback PassStyleOf
 * @param {Passable} passable
 * @returns {PassStyle}
 */

/**
 * Two Passables can also be compared for total rank ordering,
 *    where their passStyles are ordered according to the
 *      PassStyle typedef above.
 *    Two primitives of the same PassStyle are compared by the
 *      natural ordering of that primitive, with NaN greater than
 *      all other numbers and equivalent to itself.
 *    All remotables are considered equivalent for purposes of
 *      ordering.
 *    copyArrays are lexicographically ordered
 *    copyRecords are lexicographically order according to the
 *      sorted order of their property names
 *    copySets and copyMaps may have keys (such as remotables)
 *      which are equivalent for purposes of ordering. Thus, for
 *      purposes of ordering we consider them to be multisets (bags)
 *      and multimaps, so we recursively order according to the
 *      set of values associated with each equivalence class of keys.
 */

/**
 * @typedef {Passable} OnlyData
 *
 * A Passable is OnlyData when its pass-by-copy superstructure has no
 * remotables, i.e., when all the leaves of the data structure tree are
 * primitive data types or empty composites.
 */

/**
 * @typedef {OnlyData} PureData
 *
 * An OnlyData value is PureData when it contains no hidden mutable state,
 * e.g., when none of its pass-by-copy composite data objects are proxies. This
 * cannot be determined by inspection. It can only be achieved by trusted
 * construction. A PureData value cannot be used as a communications channel,
 * and can therefore be safely shared with subgraphs that should not be able
 * to communicate with each other.
 */

/**
 * @typedef {Passable} Remotable
 * Might be an object explicitly declared to be `Remotable` using the
 * `Far` or `Remotable` functions, or a remote presence of a Remotable.
 */

/**
 * @typedef {Promise | Remotable} PassableCap
 * The leaves of a Passable's pass-by-copy superstructure.
 */

/**
 * @typedef {{
 *   [PASS_STYLE]: 'tagged',
 *   [Symbol.toStringTag]: string,
 *   payload: Passable
 * }} CopyTagged
 *
 * The tag is the value of the `[String.toStringTag]` property.
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
 * @typedef {EncodingClass<'NaN'> |
 *           EncodingClass<'undefined'> |
 *           EncodingClass<'Infinity'> |
 *           EncodingClass<'-Infinity'> |
 *           EncodingClass<'bigint'> & { digits: string } |
 *           EncodingClass<'@@asyncIterator'> |
 *           EncodingClass<'symbol'> & { name: string } |
 *           EncodingClass<'error'> & { name: string,
 *                                      message: string,
 *                                      errorId?: string
 *           } |
 *           EncodingClass<'slot'> & { index: number, iface?: InterfaceSpec } |
 *           EncodingClass<'hilbert'> & { original: Encoding,
 *                                        rest?: Encoding
 *           } |
 *           EncodingClass<'tagged'> & { tag: string,
 *                                       payload: Encoding
 *           }
 * } EncodingUnion
 * @typedef {{ [index: string]: Encoding,
 *             '@qclass'?: undefined
 * }} EncodingRecord
 * We exclude '@qclass' as a property in encoding records.
 * @typedef {EncodingUnion | null | string |
 *           boolean | number | EncodingRecord
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
 * @param {ConvertValToSlot<Slot>=} convertValToSlot
 * @param {ConvertSlotToVal<Slot>=} convertSlotToVal
 * @param {MakeMarshalOptions=} options
 * @returns {Marshal<Slot>}
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
 * @param {*} maybeRemotable the value to check
 * @returns {InterfaceSpec|undefined} the interface specification, or undefined
 * if not a deemed to be a Remotable
 */

/**
 * @callback Checker
 * Internal to a useful pattern for writing checking logic
 * (a "checkFoo" function) that can be used to implement a predicate
 * (an "isFoo" function) or a validator (an "assertFoo" function).
 *
 *    A predicate ideally only returns `true` or `false` and rarely throws.
 *    A validator throws an informative diagnostic when the predicate
 *      would have returned `false`, and simply returns `undefined` normally
 *      when the predicate would have returned `true`.
 *    The internal checking function that they share is parameterized by a
 *      `Checker` that determines how to proceed with a failure condition.
 *      Predicates pass in an identity function as checker. Validators
 *      pass in `assertChecker` which is a trivial wrapper around `assert`.
 *
 * See the various uses for good examples.
 * @param {boolean} cond
 * @param {Details=} details
 * @returns {boolean}
 */

// /////////////////////////////////////////////////////////////////////////////

/**
 * @typedef {Object} ReadOnlyRankStore
 * @property {() => Passable[]} snapshot
 * @property {() => ReadOnlyRankStore} readOnlyView
 * @property {(rankCover?: RankCover) => Iterable<[number, Passable]>} entries
 * @property {(rankCover?: RankCover) => Iterable<number>} keys
 * @property {(rankCover?: RankCover) => Iterable<Passable>} values
 */

/**
 * @typedef {Object} RankStore
 * @property {(passable: Passable) => void} add
 * TODO need some kind of deletion
 *
 * TODO I should be able to share supertype rather than repeat
 * @property {() => Passable[]} snapshot
 * @property {() => ReadOnlyRankStore} readOnlyView
 * @property {(rankCover?: RankCover) => Iterable<[number, Passable]>} entries
 * @property {(rankCover?: RankCover) => Iterable<number>} keys
 * @property {(rankCover?: RankCover) => Iterable<Passable>} values
 */

/**
 * @callback CompareRank
 * Returns `-1`, `0`, or `1` depending on whether the rank of `left`
 * is before, tied-with, or after the rank of `right`.
 *
 * This comparison function is valid as argument to
 * `Array.prototype.sort`. This is often described as a "total order"
 * but, depending on your definitions, this is technically incorrect
 * because it may return `0` to indicate that two distinguishable elements,
 * like `-0` and `0`, are tied, i.e., are in the same equivalence class
 * as far as this ordering is concerned. If each such equivalence class is
 * a *rank* and ranks are disjoint, then this "rank order" is a
 * total order among these ranks. In mathematics this goes by several
 * other names such as "total preorder".
 *
 * This function establishes a total rank order over all passables.
 * To do so it makes arbitrary choices, such as that all strings
 * are after all numbers. Thus, this order is not intended to be
 * used directly as a comparison with useful semantics. However, it must be
 * closely enough related to such comparisons to aid in implementing
 * lookups based on those comparisons. For example, in order to get a total
 * order among ranks, we put `NaN` after all other JavaScript "number" values.
 * But otherwise, we order JavaScript numbers by magnitude,
 * with `-0` tied with `0`. A semantically useful ordering of JavaScript number
 * values, i.e., IEEE floating point values, would compare magnitudes, and
 * so agree with the rank ordering everywhere except `NaN`. An array sorted by
 * rank would enable range queries by magnitude.
 * @param {Passable} left
 * @param {Passable} right
 * @returns {-1 | 0 | 1}
 */

/**
 * @typedef {[Passable, Passable]} RankCover
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
 * @param {CompareRank} compare
 * @param {RankCover} rankCover
 * @returns {IndexCover}
 */

/**
 * @callback CoveredEntries
 * @param {Passable[]} sorted
 * @param {IndexCover} indexCover
 * @returns {Iterable<[number, Passable]>}
 */
