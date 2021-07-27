// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { assert, details as X, q } from '@agoric/assert';
import { isPromise } from '@agoric/promise-kit';

import './types.js';
import '@agoric/assert/exported.js';

const {
  getPrototypeOf,
  getOwnPropertyDescriptors,
  isFrozen,
  prototype: objectPrototype,
} = Object;

const { prototype: functionPrototype } = Function;

const { ownKeys } = Reflect;

export const PASS_STYLE = Symbol.for('passStyle');

// TODO: Maintenance hazard: Coordinate with the list of errors in the SES
// whilelist. Currently, both omit AggregateError, which is now standard. Both
// must eventually include it.
const errorConstructors = new Map([
  ['Error', Error],
  ['EvalError', EvalError],
  ['RangeError', RangeError],
  ['ReferenceError', ReferenceError],
  ['SyntaxError', SyntaxError],
  ['TypeError', TypeError],
  ['URIError', URIError],
]);

export const getErrorConstructor = name => errorConstructors.get(name);
harden(getErrorConstructor);

/**
 * For most of these classification tests, we do strict validity `assert`s,
 * throwing if we detect something invalid. For errors, we need to remember
 * the error itself exists to help us diagnose a bug that's likely more
 * pressing than a validity bug in the error itself. Thus, whenever it is safe
 * to do so, we prefer to let the error test succeed and to couch these
 * complaints as notes on the error.
 *
 * TODO: BUG: SECURITY: Making this tolerant of malformed errors conflicts with
 * having passStyleOf be validating.
 *
 * @param {Passable} val
 * @returns {boolean}
 */
const isPassByCopyError = val => {
  // TODO: Need a better test than instanceof
  if (!(val instanceof Error)) {
    return false;
  }
  const proto = getPrototypeOf(val);
  const { name } = val;
  const EC = getErrorConstructor(name);
  if (!EC || EC.prototype !== proto) {
    assert.note(
      val,
      X`Errors must inherit from an error class .prototype ${val}`,
    );
  }

  const {
    message: mDesc,
    // Allow but ignore only extraneous own `stack` property.
    stack: _optStackDesc,
    ...restDescs
  } = getOwnPropertyDescriptors(val);
  if (ownKeys(restDescs).length >= 1) {
    assert.note(
      val,
      X`Passed Error has extra unpassed properties ${restDescs}`,
    );
  }
  if (mDesc) {
    if (typeof mDesc.value !== 'string') {
      assert.note(
        val,
        X`Passed Error "message" ${mDesc} must be a string-valued data property.`,
      );
    }
    if (mDesc.enumerable) {
      assert.note(
        val,
        X`Passed Error "message" ${mDesc} must not be enumerable`,
      );
    }
  }
  return true;
};

/**
 * @param {Passable} val
 * @param { Set<Passable> } inProgress
 * @returns {boolean}
 */
const isPassByCopyArray = (val, inProgress) => {
  if (!Array.isArray(val)) {
    return false;
  }
  assert(
    getPrototypeOf(val) === Array.prototype,
    X`Malformed array: ${val}`,
    TypeError,
  );
  const len = val.length;
  const descs = getOwnPropertyDescriptors(val);
  for (let i = 0; i < len; i += 1) {
    const desc = descs[i];
    assert(desc, X`Arrays must not contain holes: ${q(i)}`, TypeError);
    assert(
      'value' in desc,
      X`Arrays must not contain accessors: ${q(i)}`,
      TypeError,
    );
    assert(
      desc.enumerable,
      X`Array elements must be enumerable: ${q(i)}`,
      TypeError,
    );
    // Recursively validate that each member is passable.
    // eslint-disable-next-line no-use-before-define
    passStyleOfRecur(desc.value, inProgress);
  }
  assert(
    ownKeys(descs).length === len + 1,
    X`Arrays must not have non-indexes: ${val}`,
    TypeError,
  );
  return true;
};

/**
 * For a function to be a valid method, it must not be passable.
 * Otherwise, we risk confusing pass-by-copy data carrying
 * far functions with attempts at far objects with methods.
 *
 * TODO HAZARD Because we check this on the way to hardening a remotable,
 * we cannot yet check that `func` is hardened. However, without
 * doing so, it's inheritance might change after the `PASS_STYLE`
 * check below.
 *
 * @param {*} func
 * @returns {boolean}
 */
const canBeMethod = func => typeof func === 'function' && !(PASS_STYLE in func);

/**
 * @param {Passable} val
 * @param { Set<Passable> } inProgress
 * @returns {boolean}
 */
const isPassByCopyRecord = (val, inProgress) => {
  const proto = getPrototypeOf(val);
  if (proto !== objectPrototype && proto !== null) {
    return false;
  }
  const descs = getOwnPropertyDescriptors(val);
  const descKeys = ownKeys(descs);

  for (const descKey of descKeys) {
    if (typeof descKey !== 'string') {
      // Pass by copy records can only have string-named own properties
      return false;
    }
    const desc = descs[descKey];
    if (canBeMethod(desc.value)) {
      return false;
    }
  }
  for (const descKey of descKeys) {
    const desc = descs[/** @type {string} */ (descKey)];
    assert(
      !('get' in desc),
      X`Records must not contain accessors: ${q(descKey)}`,
      TypeError,
    );
    assert(
      desc.enumerable,
      X`Record fields must be enumerable: ${q(descKey)}`,
      TypeError,
    );
    // Recursively validate that each member is passable.
    // eslint-disable-next-line no-use-before-define
    passStyleOfRecur(desc.value, inProgress);
  }
  return true;
};

// Below we have a series of predicate functions and their (curried) assertion
// functions. The semantics of the assertion function is just to assert that
// the corresponding predicate function would have returned true. But it
// reproduces the internal tests so failures can give a better error message.

/**
 * @callback Checker
 * @param {boolean} cond
 * @param {Details=} details
 * @returns {boolean}
 */

/** @type {Checker} */
const assertChecker = (cond, details) => {
  assert(cond, details);
  return true;
};

/**
 * @param {InterfaceSpec} iface
 * @param {Checker} check
 */
const checkIface = (iface, check = x => x) => {
  return (
    // TODO other possible ifaces, once we have third party veracity
    check(
      typeof iface === 'string',
      X`Interface ${iface} must be a string; unimplemented`,
    ) &&
    check(
      iface === 'Remotable' || iface.startsWith('Alleged: '),
      X`For now, iface ${q(
        iface,
      )} must be "Remotable" or begin with "Alleged: "; unimplemented`,
    )
  );
};

/**
 * @param {InterfaceSpec} iface
 */
export const assertIface = iface => checkIface(iface, assertChecker);
harden(assertIface);

/**
 * @param {{ [PASS_STYLE]: string }} tagRecord
 * @param {PassStyle} passStyle
 * @param {Checker} [check]
 * @returns {boolean}
 */
const checkTagRecord = (tagRecord, passStyle, check = x => x) => {
  return (
    check(
      typeof tagRecord === 'object',
      X`A non-object cannot be a tagRecord: ${tagRecord}`,
    ) &&
    check(
      !Array.isArray(tagRecord),
      X`An array cannot be a tagRecords: ${tagRecord}`,
    ) &&
    check(tagRecord !== null, X`null cannot be a tagRecord`) &&
    check(
      PASS_STYLE in tagRecord,
      X`A tagRecord must have a [PASS_STYLE] property: ${tagRecord}`,
    ) &&
    check(
      tagRecord[PASS_STYLE] === passStyle,
      X`Expected ${q(passStyle)}, not ${q(
        tagRecord[PASS_STYLE],
      )}: ${tagRecord}`,
    )
  );
};

/**
 * @param {any} original
 * @param {Checker} [check]
 * @returns {boolean}
 */
const checkRemotableProtoOf = (original, check = x => x) => {
  /**
   * TODO: It would be nice to typedef this shape, but we can't declare a type
   * with PASS_STYLE from JSDoc.
   *
   * @type {{ [PASS_STYLE]: string,
   *          [Symbol.toStringTag]: string,
   *          toString: () => void
   *        }}
   */
  const proto = getPrototypeOf(original);
  if (
    !(
      checkTagRecord(proto, 'remotable', check) &&
      check(
        // Since we're working with TypeScript's unsound type system, mostly
        // to catch accidents and to provide IDE support, we type arguments
        // like `val` according to what they are supposed to be. The following
        // tests for a particular violation. However, TypeScript complains
        // because *if the declared type were accurate*, then the condition
        // would always return true.
        // @ts-ignore TypeScript assumes what we're trying to check
        proto !== objectPrototype,
        X`Remotables must now be explicitly declared: ${q(original)}`,
      )
    )
  ) {
    return false;
  }

  const protoProto = getPrototypeOf(proto);

  if (typeof original === 'object') {
    if (
      !check(
        protoProto === objectPrototype || protoProto === null,
        X`The Remotable Proto marker cannot inherit from anything unusual`,
      )
    ) {
      return false;
    }
  } else if (typeof original === 'function') {
    if (
      !check(
        protoProto === functionPrototype ||
          getPrototypeOf(protoProto) === functionPrototype,
        X`For far functions, the Remotable Proto marker must inherit from Function.prototype, in ${original}`,
      )
    ) {
      return false;
    }
  } else {
    assert.fail(X`unrecognized typeof ${original}`);
  }

  const {
    // @ts-ignore https://github.com/microsoft/TypeScript/issues/1863
    [PASS_STYLE]: passStyleDesc,
    toString: toStringDesc,
    // @ts-ignore https://github.com/microsoft/TypeScript/issues/1863
    [Symbol.toStringTag]: ifaceDesc,
    ...restDescs
  } = getOwnPropertyDescriptors(proto);

  return (
    check(
      ownKeys(restDescs).length === 0,
      X`Unexpected properties on Remotable Proto ${ownKeys(restDescs)}`,
    ) &&
    check(!!passStyleDesc, X`Remotable must have a [PASS_STYLE]`) &&
    check(
      // @ts-ignore TypeScript thinks this is a toString method, not descriptor
      typeof toStringDesc.value === 'function',
      X`toString must be a function`,
    ) &&
    checkIface(ifaceDesc && ifaceDesc.value, check)
  );
};

/**
 * Ensure that val could become a legitimate remotable.  This is used internally
 * both in the construction of a new remotable and checkRemotable.
 *
 * @param {*} val The remotable candidate to check
 * @param {Checker} [check]
 * @returns {boolean}
 */
const checkCanBeRemotable = (val, check = x => x) => {
  if (
    !(
      check(
        typeof val === 'object' || typeof val === 'function',
        X`cannot serialize non-objects like ${val}`,
      ) &&
      check(!Array.isArray(val), X`Arrays cannot be pass-by-remote`) &&
      check(val !== null, X`null cannot be pass-by-remote`)
    )
  ) {
    return false;
  }

  const descs = getOwnPropertyDescriptors(val);
  if (typeof val === 'object') {
    const keys = ownKeys(descs); // enumerable-and-not, string-or-Symbol
    return keys.every(
      key =>
        // Typecast needed due to https://github.com/microsoft/TypeScript/issues/1863
        check(
          !('get' in descs[/** @type {string} */ (key)]),
          X`cannot serialize Remotables with accessors like ${q(
            String(key),
          )} in ${val}`,
        ) &&
        check(
          canBeMethod(val[key]),
          X`cannot serialize Remotables with non-methods like ${q(
            String(key),
          )} in ${val}`,
        ) &&
        check(
          key !== PASS_STYLE,
          X`A pass-by-remote cannot shadow ${q(PASS_STYLE)}`,
        ),
    );
  } else if (typeof val === 'function') {
    // Far functions cannot be methods, and cannot have methods.
    // They must have exactly expected `.name` and `.length` properties
    const { name: nameDesc, length: lengthDesc, ...restDescs } = descs;
    const restKeys = ownKeys(restDescs);
    return (
      check(
        nameDesc && typeof nameDesc.value === 'string',
        X`Far function name must be a string, in ${val}`,
      ) &&
      check(
        lengthDesc && typeof lengthDesc.value === 'number',
        X`Far function length must be a number, in ${val}`,
      ) &&
      check(
        restKeys.length === 0,
        X`Far functions unexpected properties besides .name and .length ${restKeys}`,
      )
    );
  } else {
    assert.fail(X`unrecognized typeof ${val}`);
  }
};

export const assertCanBeRemotable = val => {
  checkCanBeRemotable(val, assertChecker);
};
harden(assertCanBeRemotable);

/**
 * @param {Remotable} val
 * @param {Checker} [check]
 * @returns {boolean}
 */
const checkRemotable = (val, check = x => x) => {
  const not = (cond, details) => !check(cond, details);
  if (not(isFrozen(val), X`cannot serialize non-frozen objects like ${val}`)) {
    return false;
  }
  if (!checkCanBeRemotable(val, check)) {
    return false;
  }
  return checkRemotableProtoOf(val, check);
};

/**
 * @param {Remotable} val
 */
const assertRemotable = val => {
  checkRemotable(val, assertChecker);
};

/** @type {MarshalGetInterfaceOf} */
export const getInterfaceOf = val => {
  const typestr = typeof val;
  if (
    (typestr !== 'object' && typestr !== 'function') ||
    val === null ||
    val[PASS_STYLE] !== 'remotable' ||
    !checkRemotable(val)
  ) {
    return undefined;
  }
  return val[Symbol.toStringTag];
};
harden(getInterfaceOf);

/** @type {CopySet} */
const assertCopySet = val => {
  checkTagRecord(val, 'copySet', assertChecker);
  const proto = getPrototypeOf(val);
  assert(
    proto === null || proto === objectPrototype,
    X`A copySet must inherit directly from null or Object.prototype: ${val}`,
  );
  const {
    // @ts-ignore TypeStript cannot index by symbols
    [PASS_STYLE]: passStyleDesc,
    toString: toStringDesc,
    elements: elementsDesc,
    ...restDescs
  } = getOwnPropertyDescriptors(proto);

  assert(
    ownKeys(restDescs).length === 0,
    X`Unexpected properties on copySet ${ownKeys(restDescs)}`,
  );
  assert(!!passStyleDesc, X`copySet must have a [PASS_STYLE]`);
  assert(
    // @ts-ignore TypeScript thinks toString is a function, not a desciptor
    typeof toStringDesc.value === 'function',
    X`toString must be a function`,
  );
  assert.equal(
    // Note that passStyle already ensures that the array only contains
    // passables.
    // eslint-disable-next-line no-use-before-define
    passStyleOf(elementsDesc.value),
    'copyArray',
    X`A copyArray must have an array of elements`,
  );
  // TODO Must also assert that the elements array contains only comparables,
  // which, fortunately, is the same as asserting that the array is a
  // comparable. However, that check is currently in the same-structure package,
  // leading to a layering problem.
};

/** @type {CopyMap} */
const assertCopyMap = val => {
  checkTagRecord(val, 'copyMap', assertChecker);
  const proto = getPrototypeOf(val);
  assert(
    proto === null || proto === objectPrototype,
    X`A copyMap must inherit directly from null or Object.prototype: ${val}`,
  );
  const {
    // @ts-ignore TypeStript cannot index by symbols
    [PASS_STYLE]: passStyleDesc,
    toString: toStringDesc,
    keys: keysDesc,
    values: valuesDesc,
    ...restDescs
  } = getOwnPropertyDescriptors(proto);

  assert(
    ownKeys(restDescs).length === 0,
    X`Unexpected properties on copyMap ${ownKeys(restDescs)}`,
  );
  assert(!!passStyleDesc, X`copyMap must have a [PASS_STYLE]`);
  assert(
    // @ts-ignore TypeScript thinks toString is a function, not a desciptor
    typeof toStringDesc.value === 'function',
    X`toString must be a function`,
  );
  assert.equal(
    // Note that passStyle already ensures that the array only contains
    // passables.
    // eslint-disable-next-line no-use-before-define
    passStyleOf(keysDesc.value),
    'copyArray',
    X`A copyArray must have an array of keys: ${val}`,
  );
  // TODO Must also assert that the keys array contains only comparables,
  // which, fortunately, is the same as asserting that the array is a
  // comparable. However, that check is currently in the same-structure package,
  // leading to a layering problem.

  assert.equal(
    // Note that passStyle already ensures that the array only contains
    // passables.
    // eslint-disable-next-line no-use-before-define
    passStyleOf(valuesDesc.value),
    'copyArray',
    X`A copyArray must have an array of values: ${val}`,
  );
  assert.equal(
    keysDesc.value.length,
    valuesDesc.value.length,
    X`The keys and values arrays must be the same length: ${val}`,
  );
};

/** @type {PatternNode} */
const assertPatternNode = val => {
  checkTagRecord(val, 'patternNode', assertChecker);
  const proto = getPrototypeOf(val);
  assert(
    proto === null || proto === objectPrototype,
    X`A patternNode must inherit directly from null or Object.prototype: ${val}`,
  );
  const {
    // @ts-ignore TypeStript cannot index by symbols
    [PASS_STYLE]: passStyleDesc,
    toString: toStringDesc,
    patternKind: patternKindDesc,
    ..._restDescs
  } = getOwnPropertyDescriptors(proto);

  assert(!!passStyleDesc, X`patternNode must have a [PASS_STYLE]`);
  assert(
    // @ts-ignore TypeScript thinks toString is a function, not a desciptor
    typeof toStringDesc.value === 'function',
    X`toString must be a function`,
  );
  assert(
    typeof patternKindDesc.value === 'string',
    X`toString must be a function`,
  );
  // TODO The test of patternNode validation.
};

/**
 * @param { Passable } val
 * @param { Set<Passable> } inProgress
 * @returns { PassStyle }
 */
const passStyleOfInternal = (val, inProgress) => {
  const typestr = typeof val;
  switch (typestr) {
    case 'object': {
      if (val === null) {
        return 'null';
      }
      const passStyleTag = val[PASS_STYLE];
      switch (passStyleTag) {
        case undefined: {
          break;
        }
        case 'remotable': {
          assertRemotable(val);
          return 'remotable';
        }
        case 'copySet': {
          assertCopySet(val);
          return 'copySet';
        }
        case 'copyMap': {
          assertCopyMap(val);
          return 'copyMap';
        }
        case 'patternNode': {
          assertPatternNode(val);
          return 'patternNode';
        }
        default: {
          assert.fail(X`Unrecognized PassStyle ${passStyleTag}`);
        }
      }
      assert(
        isFrozen(val),
        X`Cannot pass non-frozen objects like ${val}. Use harden()`,
      );
      if (isPromise(val)) {
        return 'promise';
      }
      assert(
        typeof val.then !== 'function',
        X`Cannot pass non-promise thenables`,
      );
      if (isPassByCopyError(val)) {
        return 'copyError';
      }
      if (isPassByCopyArray(val, inProgress)) {
        return 'copyArray';
      }
      if (isPassByCopyRecord(val, inProgress)) {
        return 'copyRecord';
      }
      assertCanBeRemotable(val);
      assert.fail(X`Remotables must now be explicitly declared: ${val}`);
    }
    case 'function': {
      if (getInterfaceOf(val)) {
        return 'remotable';
      }
      assert(
        isFrozen(val),
        X`Cannot pass non-frozen objects like ${val}. Use harden()`,
      );
      assertRemotable(val);
      return 'remotable';
    }
    case 'undefined':
    case 'string':
    case 'boolean':
    case 'number':
    case 'bigint':
    case 'symbol': {
      return typestr;
    }
    default: {
      assert.fail(X`Unrecognized typeof ${q(typestr)}`, TypeError);
    }
  }
};

/**
 * Purely for performance. However it is mutable static state, and
 * it does have some observability on proxies. TODO need to assess
 * whether this creates a static communications channel.
 *
 * passStyleOf does a full recursive walk of pass-by-copy
 * structures, in order to validate that they are acyclic. In addition
 * it is used by other algorithms to recursively walk these pass-by-copy
 * structures, so without this cache, these algorithms could be
 * O(N**2) or worse.
 *
 * @type {WeakMap<Passable, PassStyle>}
 */
const passStyleOfCache = new WeakMap();

/**
 * @param { Passable } val
 * @param { Set<Passable> } inProgress
 * @returns { PassStyle }
 */
const passStyleOfRecur = (val, inProgress) => {
  const isObject = Object(val) === val;
  if (isObject) {
    if (passStyleOfCache.has(val)) {
      // @ts-ignore
      return passStyleOfCache.get(val);
    }
    assert(!inProgress.has(val), X`Pass-by-copy data cannot be cyclic ${val}`);
    inProgress.add(val);
  }
  const passStyle = passStyleOfInternal(val, inProgress);
  if (isObject) {
    passStyleOfCache.set(val, passStyle);
    inProgress.delete(val);
  }
  return passStyle;
};

/**
 * objects can only be passed in one of two/three forms:
 * 1: pass-by-remote: all properties (own and inherited) are methods,
 *    the object itself is of type object, not function
 * 2: pass-by-copy: all string-named own properties are data, not methods
 *    the object must inherit from objectPrototype or null
 * 3: the empty object is pass-by-remote, for identity comparison
 *
 * all objects must be frozen
 *
 * anything else will throw an error if you try to serialize it
 * with these restrictions, our remote call/copy protocols expose all useful
 * behavior of these objects: pass-by-remote objects have no other data (so
 * there's nothing else to copy), and pass-by-copy objects have no other
 * behavior (so there's nothing else to invoke)
 *
 * How would val be passed?  For primitive values, the answer is
 *   * 'null' for null
 *   * throwing an error for a symbol, whether registered or not.
 *   * that value's typeof string for all other primitive values
 * For frozen objects, the possible answers
 *   * 'copyRecord' for non-empty records with only data properties
 *   * 'copyArray' for arrays with only data properties
 *   * 'copyError' for instances of Error with only data properties
 *   * 'remotable' for non-array objects with only method properties
 *   * 'promise' for genuine promises only
 *   * throwing an error on anything else, including thenables.
 * We export passStyleOf so other algorithms can use this module's
 * classification.
 *
 * @param {Passable} val
 * @returns {PassStyle}
 */
export const passStyleOf = val =>
  // Even when a WeakSet is correct, when the set has a shorter lifetime
  // than its keys, we prefer a Set due to expected implementation
  // tradeoffs.
  passStyleOfRecur(val, new Set());
harden(passStyleOf);
