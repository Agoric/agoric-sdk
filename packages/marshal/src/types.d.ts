/* eslint-disable */

export type NestedArray<T> = Array<T | NestedArray<T>>;

// TODO declare more precise types throughout this file, so the type system
// and IDE can be more helpful.

export type PassStyle =
  | 'undefined'
  | 'null'
  | 'boolean'
  | 'number'
  | 'bigint'
  | 'string'
  | 'symbol'
  | 'copyArray'
  | 'copyRecord'
  | 'remotable'
  | 'error'
  | 'promise';

/**
 * A Passable value that may be marshalled. It is classified as one of
 * PassStyle. A Passable must be hardened.
 *
 * A Passable has a pass-by-copy superstructure. This includes
 *    * the atomic pass-by-copy primitives ("undefined" | "null" |
 *      "boolean" | "number" | "bigint" | "string" | "symbol"),
 *    * the pass-by-copy containers ("copyArray" | "copyRecord") that
 *      contain other Passables,
 *    * and the special cases ("error" | "promise"), which
 *      also contain other Passables.
 *
 * A Passable's pass-by-copy superstructure ends in
 * PassableCap leafs ("remotable" | "promise"). Since a
 * Passable is hardened, its structure and classification is stable --- its
 * structure and classification cannot change even if some of the objects are
 * proxies.
 */
export type Passable = any;

export type PassStyleOf = (passable: Passable) => PassStyle;

/**
 * A Passable is a Structure when it contains only
 *    * pass-by-copy primitives,
 *    * pass-by-copy containers,
 *    * remotables.
 *
 * Two Structures may be compared by for equivalence according to
 * `sameStructure`, which is the strongest equivalence class supported by
 * marshal's distributed object semantics.
 *
 * Two Structures can also be compared for full ordering,
 *    * where their passStyles are ordered according to the
 *      PassStyle typedef above.
 *    * Two primitives of the same PassStyle are compared by the
 *      natural ordering of that primitive, with NaN greater than
 *      all other numbers and equivalent to itself.
 *    * All remotables are considered equivalent for purposes of
 *      ordering.
 *    * copyArrays are lexicographically ordered
 *    * copyRecords are lexicographically order according to the
 *      sorted order of their property names
 *    * copySets and copyMaps may have keys (such as remotables)
 *      which are equivalent for purposes of ordering. Thus, for
 *      purposes of ordering we consider them to be multisets (bags)
 *      and multimaps, so we recursively order according to the
 *      set of values associated with each equivalence class of keys.
 */
export type Structure = Passable;

/**
 * @deprecated Renamed to `Structure`
 */
export type Comparable = Structure;

/**
 * A Structure is OnlyData when its pass-by-copy superstructure has no
 * remotables, i.e., when all the leaves of the data structure tree are
 * primitive data types or empty composites.
 */
export type OnlyData = Structure;

/**
 * An OnlyData value is PureData when it contains no hidden mutable state,
 * e.g., when none of its pass-by-copy composite data objects are proxies. This
 * cannot be determined by inspection. It can only be achieved by trusted
 * construction. A PureData value cannot be used as a communications channel,
 * and can therefore be safely shared with subgraphs that should not be able
 * to communicate with each other.
 */
export type PureData = OnlyData;

/**
 * Might be an object explicitly declared to be `Remotable` using the
 * `Far` or `Remotable` functions, or a remote presence of a Remotable.
 */
export type Remotable = Passable;

/**
 * The leaves of a Passable's pass-by-copy superstructure.
 */
export type PassableCap = Promise<any> | Remotable;

export type CopySet = Passable;

export type CopyMap = Passable;

export type PatternNode = Passable;

// /////////////////////////////////////////////////////////////////////////////

export type ConvertValToSlot<Slot> = (val: PassableCap) => Slot;

export type ConvertSlotToVal<Slot> = (
  slot: Slot,
  iface?: InterfaceSpec | undefined,
) => PassableCap;

export type EncodingClass<T> = {
  '@qclass': T;
};

export type EncodingUnion =
  | EncodingClass<'NaN'>
  | EncodingClass<'undefined'>
  | EncodingClass<'Infinity'>
  | EncodingClass<'-Infinity'>
  | (EncodingClass<'bigint'> & {
      digits: string;
    })
  | EncodingClass<'@@asyncIterator'>
  | (EncodingClass<'error'> & {
      name: string;
      message: string;
      errorId?: string;
    })
  | (EncodingClass<'slot'> & {
      index: number;
      iface?: InterfaceSpec;
    })
  | (EncodingClass<'hilbert'> & {
      original: Encoding;
      rest?: Encoding;
    });
/**
 *
 */
export type EncodingRecord = {
  [index: string]: Encoding;
} & {
  // We exclude '@qclass' as a property in encoding records.
  '@qclass'?: undefined;
};
export type EncodingElement =
  | EncodingUnion
  | null
  | string
  | boolean
  | number
  | EncodingRecord;

/**
 * The JSON structure that the data portion of a Passable serializes to.
 *
 * The QCLASS 'hilbert' is a reference to the Hilbert Hotel
 * of https://www.ias.edu/ideas/2016/pires-hilbert-hotel
 * If QCLASS appears as a property name in the data, we encode it instead
 * as a QCLASS record of type 'hilbert'. To do so, we must move the other
 * parts of the record into fields of the hilbert record.
 */
export type Encoding = EncodingElement | NestedArray<EncodingElement>;

export type CapData<Slot> = {
  /** A JSON.stringify of an Encoding */
  body: string;
  slots: Slot[];
};

export type Serialize<Slot> = (val: Passable) => CapData<Slot>;

export type Unserialize<Slot> = (data: CapData<Slot>) => Passable;

export type Marshal<Slot> = {
  serialize: Serialize<Slot>;
  unserialize: Unserialize<Slot>;
};

export type MakeMarshal<Slot> = (
  convertValToSlot?: ConvertValToSlot<Slot> | undefined,
  convertSlotToVal?: ConvertSlotToVal<Slot> | undefined,
  options?: MakeMarshalOptions | undefined,
) => Marshal<Slot>;

export type MakeMarshalOptions = {
  /**
   * controls whether serialized errors
   * also carry tagging information, made from `marshalName` and numbers
   * generated (currently by counting) starting at `errorIdNum`. The
   * `errorTagging` option defaults to `'on'`. Serialized
   * errors are also logged to `marshalSaveError` only if tagging is `'on'`.
   */
  errorTagging?: ('on' | 'off') | undefined;
  /**
   * Used to identify sent errors.
   */
  marshalName?: string | undefined;
  /**
   * Ascending numbers staring from here
   * identify the sending of errors relative to this marshal instance.
   */
  errorIdNum?: number | undefined;
  /**
   * If `errorTagging` is
   * `'on'`, then errors serialized by this marshal instance are also
   * logged by calling `marshalSaveError` *after* `assert.note` associated
   * that error with its errorId. Thus, if `marshalSaveError` in turn logs
   * to the normal console, which is the default, then the console will
   * show that note showing the associated errorId.
   */
  marshalSaveError?: ((err: Error) => void) | undefined;
};

// /////////////////////////////////////////////////////////////////////////////

/**
 * This is an interface specification.
 * For now, it is just a string, but will eventually be any OnlyData. Either
 * way, it must remain pure, so that it can be safely shared by subgraphs that
 * are not supposed to be able to communicate.
 */
export type InterfaceSpec = string;

/**
 * Simple semantics, just tell what interface (or undefined) a remotable has.
 */
export type MarshalGetInterfaceOf = (
  maybeRemotable: any,
) => InterfaceSpec | undefined;
