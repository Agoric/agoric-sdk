import { Nat } from '@endo/nat';
import { assert, Fail } from '@endo/errors';

// NOTE: confusing terminology: "slot" vs. "reference".  All these things
// called "slots" are references, but the word "slot" suggests something into
// which something else is put and a reference isn't one of those.  So improved
// terminology would be an improvement, though any such change should be
// thought through very carefully since changing these names will touch many
// files.  (You could call it a "reference", except that a phrase like "vat
// reference" is ambiguous as to whether it means a reference belonging to a
// vat or a reference *to* a vat, whereas "vat slot" does not have this problem
// as badly.  Also, "slot" is a short, single syllable word, which is nice.
// But still "slot" implies containership which I think is wrong.)

/**
 * Parse a vref string into its component parts:
 *   {
 *      type: STRING, // 'object', 'device', 'promise'
 *      allocatedByVat: BOOL, // true=>allocated by vat, false=>by the kernel
 *      id: Nat,
 *      subid: Nat,
 *      baseRef: STRING,
 *      facet: Nat,
 *      virtual: BOOL, // true=>vref designates a "merely virtual" object (not durable, not ephemeral)
 *      durable: BOOL, // designates a durable (not merely virtual, not ephemeral)
 *   }
 *
 * A vref string can take one of the forms:
 *
 *   T-N
 *   T+N
 *   T+DN/I
 *   T+DN/I:F
 *
 * Where:
 *
 *   T is a single character encoding the type of entity being referenced: 'd'
 *      for 'device', 'o' for 'object', or 'p' for 'promise'.  One of the string
 *      values 'device', 'object', or 'promise' is returned as the `type`
 *      property of the result.
 *
 *   '+' or '-' encodes who allocated the reference: '-' for the kernel
 *      (typically an import) or '+ for the vat (typically an export).  This is
 *      returned in the `allocatedByVat` property of the result as a boolean.
 *
 *   D is the durability status: for object exports ("o+"), this will
 *      be the letter 'd' for durable objects, the letter 'v' for
 *      non-durable ("merely virtual") objects, or empty for
 *      "Remotable" (ephemeral) objects. It is empty for object
 *      imports ("o-"), and both both imports and exports of all other
 *      types (promises, devices)
 *
 *   N is a decimal integer representing the identity of the referenced entity.
 *      This is returned in the `id` property of the result as a BigInt.
 *
 *   I if present (only allowed if T is 'o') is a decimal integer representing
 *      the instance id of the referenced object.  In this case N denotes a
 *      category of objects that share a common shape, either one of the store
 *      types or a virtual object kind, and I indicates which instance of that
 *      category is being referred to.  If present this is returned as the
 *      `subid` property of the result as a BigInt.
 *
 *   F if present (only allowed if I is also present) is a decimal integer
 *      referencing a facet of the referenced object.  In this case N/I denotes
 *      a particular object instance and F indicates which of several possible
 *      facets of that instance is being addressed.  If present this is returned
 *      in the `facet` property of the result as a BigInt.
 *
 * The `baseRef` property of the result is `vref` stripped of any facet indicator.
 *
 * A "vref" identifies an entity visible to vat code to which messages may be
 * sent and which may be compared for equality to other such entities.  Let's
 * call such an entity an "addressable object".
 *
 * A "baseRef" designates an entity that is managed by LiveSlots, both as a unit
 * of garbage collection specifically and as a unit of memory management more
 * generally.  Such an entity may be a promise or remotable object or imported
 * presence, all of which will always be JavaScript objects in memory, or it may
 * be a virtual object or collection, which can be in memory or on disk or both.
 * Let's call such an entity a "base object".  In most cases this is one and the
 * same with the addressable object that the vref designates, but in the case of
 * a faceted object it is the faceted object as a whole (represented in memory,
 * though not on disk, as the cohort array) rather than any particular
 * individual facet (the faceted object per se is never exposed directly to code
 * running within the vat; only its facets are).
 *
 * XXX TODO: The previous comment suggests some renaming is warranted:
 *
 * In the current implementation, a vref string may only include decimal digits,
 * the letters 'd'/'o'/'p'/'v', and the punctuation characters '+', '-', '/',
 * and ':'.  Future evolution of the vref syntax might add more characters to
 * this set, but the characters '|' and ',' are permanently excluded: '|' is
 * used (notably by the collection manager) as delimiter in vatstore keys that
 * include vrefs, and ',' is used as a separator in lists of vrefs.
 *
 * `slotToVal` maps a baseRef to a base object (actually to a weakRef that
 *    points to a base object)
 * `getValForSlot` maps a baseRef to a base object, or to undefined if it is not
 *    resident in memory
 * `convertSlotToVal` maps a vref to to an addressable object, loading it from
 *    disk if necessary
 *
 * `valToSlot` maps an addressable object to a vref
 * `getSlotForVal` maps an addressable object to a vref
 * `convertValToSlot` maps an addressable object to a vref, generating a new
 *    vref if necessary
 *
 * @param {string} vref  The string to be parsed, as described above.
 *
 * @returns {*} a vref components descriptor corresponding to the vref string
 *    parameter, assuming it is syntactically well formed.
 *
 * @throws if the given vref string is syntactically incorrect.
 */
export function parseVatSlot(vref) {
  assert.typeof(vref, 'string');
  const parts = vref.split(':');
  parts.length === 1 || parts.length === 2 || Fail`invalid vref ${vref}`;
  const [baseRef, facetStr] = parts;
  let type;
  let allocatedByVat;
  const typechar = baseRef[0];
  const allocchar = baseRef[1];
  let idSuffix = baseRef.slice(2);

  if (typechar === 'o') {
    type = 'object';
  } else if (typechar === 'd') {
    type = 'device';
  } else if (typechar === 'p') {
    type = 'promise';
  } else {
    Fail`invalid vref ${vref}`;
  }

  if (allocchar === '+') {
    allocatedByVat = true;
  } else if (allocchar === '-') {
    allocatedByVat = false;
  } else {
    Fail`invalid vref ${vref}`;
  }

  let virtual = false;
  let durable = false;
  if (idSuffix.startsWith('d')) {
    durable = true;
    idSuffix = idSuffix.slice(1);
  } else if (idSuffix.startsWith('v')) {
    virtual = true; // merely virtual
    idSuffix = idSuffix.slice(1);
  }
  const delim = idSuffix.indexOf('/');
  let id;
  let subid;
  let facet;
  if (delim > 0) {
    (type === 'object' && allocatedByVat) || Fail`invalid vref ${vref}`;
    virtual || durable || Fail`invalid vref ${vref}`; // subid only exists for virtuals/durables
    id = Nat(BigInt(idSuffix.substr(0, delim)));
    subid = Nat(BigInt(idSuffix.slice(delim + 1)));
  } else {
    id = Nat(BigInt(idSuffix));
  }
  if (subid !== undefined && facetStr !== undefined) {
    facet = Nat(BigInt(facetStr));
  }

  return { type, allocatedByVat, virtual, durable, id, subid, baseRef, facet };
}

/**
 * Generate a vat slot reference string given a type, ownership, and id.
 *
 * @param {'object'|'device'|'promise'} type The type
 * @param {boolean} allocatedByVat  Flag: true=>vat allocated, false=>kernel allocated
 * @param {number | bigint} id    The id, a Nat.
 *
 * @returns {string} the corresponding vat slot reference string.
 *
 * @throws if type is not one of the above known types.
 */
export function makeVatSlot(type, allocatedByVat, id) {
  let idSuffix;
  if (allocatedByVat) {
    idSuffix = `+${Nat(id)}`;
  } else {
    idSuffix = `-${Nat(id)}`;
  }

  if (type === 'object') {
    return `o${idSuffix}`;
  }
  if (type === 'device') {
    return `d${idSuffix}`;
  }
  if (type === 'promise') {
    return `p${idSuffix}`;
  }
  throw Fail`unknown type ${type}`;
}

/**
 * Assert function to ensure that a vat slot reference string refers to a
 * slot of a given type.
 *
 * @param {string} type  The vat slot type desired, a string.
 * @param {string} vatSlot  The vat slot reference string being tested
 *
 * @throws if vatSlot is not of the given type or is malformed.
 *
 * @returns {void}
 */
export function insistVatType(type, vatSlot) {
  type === parseVatSlot(vatSlot).type ||
    Fail`vatSlot ${vatSlot} is not of type ${type}`;
}
