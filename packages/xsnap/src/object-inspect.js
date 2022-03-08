/* eslint-disable no-empty */
/* eslint-disable no-nested-ternary,no-use-before-define */
// Adapted from object-inspect@1.12.0
/* global WeakRef */
/*
MIT License

Copyright (c) 2013 James Halliday

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const mapSize = Object.getOwnPropertyDescriptor(Map.prototype, 'size').get;
const mapForEach = Map.prototype.forEach;
const setSize = Object.getOwnPropertyDescriptor(Set.prototype, 'size').get;
const setForEach = Set.prototype.forEach;
const weakMapHas = WeakMap.prototype.has;
const weakSetHas = WeakSet.prototype.has;
const weakRefDeref = WeakRef.prototype.deref;
const booleanValueOf = Boolean.prototype.valueOf;
const objectToString = Object.prototype.toString;
const functionToString = Function.prototype.toString;
const $match = String.prototype.match;
const $slice = String.prototype.slice;
const $replace = String.prototype.replace;
const $toUpperCase = String.prototype.toUpperCase;
const $test = RegExp.prototype.test;
const $concat = Array.prototype.concat;
const $join = Array.prototype.join;
const bigIntValueOf = BigInt.prototype.valueOf;
const getOwnPropertySymbols = Object.getOwnPropertySymbols;
const symToString = Symbol.prototype.toString;
// ie, `has-tostringtag/shams
const toStringTag = Symbol.toStringTag;
const isEnumerable = Object.prototype.propertyIsEnumerable;
const dateToISOString = Date.prototype.toISOString;

const gPO = Reflect.getPrototypeOf;
const hasOwn = Object.prototype.hasOwnProperty;

export default function inspect0(obj, opts = {}, depth = 0, seen = new Set()) {
  if (typeof obj === 'undefined') {
    return 'undefined';
  }
  if (obj === null) {
    return 'null';
  }
  if (typeof obj === 'boolean') {
    return obj ? 'true' : 'false';
  }

  if (typeof obj === 'string') {
    return inspectString(obj, opts);
  }
  if (typeof obj === 'number') {
    if (obj === 0) {
      return Infinity / obj > 0 ? '0' : '-0';
    }
    return String(obj);
  }
  if (typeof obj === 'bigint') {
    return `${obj}n`;
  }

  const maxDepth = typeof opts.depth === 'undefined' ? 5 : opts.depth;
  if (typeof depth === 'undefined') {
    depth = 0;
  }
  if (depth >= maxDepth && maxDepth > 0 && typeof obj === 'object') {
    return isArray(obj) ? '[Array]' : '[Object]';
  }

  const indent = getIndent(opts, depth);

  if (seen.has(obj)) {
    return '[Circular]';
  }

  function inspect(value, from, noIndent) {
    if (from) {
      seen.add(from);
    }
    if (noIndent) {
      const newOpts = {
        depth: opts.depth,
      };
      if (has(opts, 'quoteStyle')) {
        newOpts.quoteStyle = opts.quoteStyle;
      }
      return inspect0(value, newOpts, depth + 1, seen);
    }
    return inspect0(value, opts, depth + 1, seen);
  }

  if (typeof obj === 'function') {
    const name = nameOf(obj);
    const keys = arrObjKeys(obj, inspect);
    return `[Function${name ? `: ${name}` : ' (anonymous)'}]${
      keys.length > 0 ? ` { ${$join.call(keys, ', ')} }` : ''
    }`;
  }
  if (isSymbol(obj)) {
    const symString = symToString.call(obj);
    return typeof obj === 'object' ? markBoxed(symString) : symString;
  }
  if (isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }
    const xs = arrObjKeys(obj, inspect);
    if (indent && !singleLineValues(xs)) {
      return `[${indentedJoin(xs, indent)}]`;
    }
    return `[ ${$join.call(xs, ', ')} ]`;
  }
  if (isError(obj)) {
    const parts = arrObjKeys(obj, inspect);
    if ('cause' in obj && !isEnumerable.call(obj, 'cause')) {
      return `{ [${String(obj)}] ${$join.call(
        $concat.call(`[cause]: ${inspect(obj.cause)}`, parts),
        ', ',
      )} }`;
    }
    if (parts.length === 0) {
      return `[${String(obj)}]`;
    }
    return `{ [${String(obj)}] ${$join.call(parts, ', ')} }`;
  }
  if (isMap(obj)) {
    const mapParts = [];
    mapForEach.call(obj, (value, key) => {
      mapParts.push(`${inspect(key, obj, true)} => ${inspect(value, obj)}`);
    });
    return collectionOf('Map', mapSize.call(obj), mapParts, indent);
  }
  if (isSet(obj)) {
    const setParts = [];
    setForEach.call(obj, value => {
      setParts.push(inspect(value, obj));
    });
    return collectionOf('Set', setSize.call(obj), setParts, indent);
  }
  if (isWeakMap(obj)) {
    return weakCollectionOf('WeakMap');
  }
  if (isWeakSet(obj)) {
    return weakCollectionOf('WeakSet');
  }
  if (isWeakRef(obj)) {
    return weakCollectionOf('WeakRef');
  }
  if (isNumber(obj)) {
    return markBoxed(inspect(Number(obj)));
  }
  if (isBigInt(obj)) {
    return markBoxed(inspect(bigIntValueOf.call(obj)));
  }
  if (isBoolean(obj)) {
    return markBoxed(booleanValueOf.call(obj));
  }
  if (isString(obj)) {
    return markBoxed(inspect(String(obj)));
  }
  if (isDate(obj)) {
    return dateToISOString.call(obj);
  }
  if (!isDate(obj) && !isRegExp(obj)) {
    const ys = arrObjKeys(obj, inspect);
    const isPlainObject = gPO
      ? gPO(obj) === Object.prototype
      : obj instanceof Object || obj.constructor === Object;
    const protoTag = obj instanceof Object ? '' : 'null prototype';
    const stringTag =
      !isPlainObject && toStringTag && Object(obj) === obj && toStringTag in obj
        ? $slice.call(toStr(obj), 8, -1)
        : protoTag
        ? 'Object'
        : '';
    const constructorTag =
      isPlainObject || typeof obj.constructor !== 'function'
        ? ''
        : obj.constructor.name
        ? `${obj.constructor.name} `
        : '';
    const tag =
      constructorTag +
      (stringTag || protoTag
        ? `[${$join.call(
            $concat.call([], stringTag || [], protoTag || []),
            ': ',
          )}] `
        : '');
    if (ys.length === 0) {
      return `${tag}{}`;
    }
    if (indent) {
      return `${tag}{${indentedJoin(ys, indent)}}`;
    }
    return `${tag}{ ${$join.call(ys, ', ')} }`;
  }
  return String(obj);
}

function wrapQuotes(s, defaultStyle, opts) {
  const quoteChar = (opts.quoteStyle || defaultStyle) === 'double' ? '"' : "'";
  return quoteChar + s + quoteChar;
}

function isArray(obj) {
  return (
    Array.isArray(obj) &&
    (!toStringTag || !(typeof obj === 'object' && toStringTag in obj))
  );
}
function isDate(obj) {
  return (
    obj instanceof Date && !(typeof obj === 'object' && toStringTag in obj)
  );
}
function isRegExp(obj) {
  return (
    obj instanceof RegExp && !(typeof obj === 'object' && toStringTag in obj)
  );
}
function isError(obj) {
  return (
    obj instanceof Error && !(typeof obj === 'object' && toStringTag in obj)
  );
}
function isString(obj) {
  return (
    String(obj) === obj && !(typeof obj === 'object' && toStringTag in obj)
  );
}
function isNumber(obj) {
  return (
    Number(obj) === obj && !(typeof obj === 'object' && toStringTag in obj)
  );
}
function isBoolean(obj) {
  return (
    Boolean(obj) === obj && !(typeof obj === 'object' && toStringTag in obj)
  );
}

// Symbol and BigInt do have Symbol.toStringTag by spec, so that can't be used to eliminate false positives
function isSymbol(obj) {
  return typeof obj === 'symbol';
}

function isBigInt(obj) {
  return typeof obj === 'bigint';
}

function has(obj, key) {
  return hasOwn.call(obj, key);
}

function toStr(obj) {
  return objectToString.call(obj);
}

function nameOf(f) {
  if (f.name) {
    return f.name;
  }
  const m = $match.call(functionToString.call(f), /^function\s*([\w$]+)/);
  if (m) {
    return m[1];
  }
  return null;
}

function indexOf(xs, x) {
  if (xs.indexOf) {
    return xs.indexOf(x);
  }
  for (let i = 0, l = xs.length; i < l; i += 1) {
    if (xs[i] === x) {
      return i;
    }
  }
  return -1;
}

function isMap(x) {
  if (!mapSize || !x || typeof x !== 'object') {
    return false;
  }
  try {
    mapSize.call(x);
    try {
      setSize.call(x);
    } catch (s) {
      return true;
    }
    return x instanceof Map; // core-js workaround, pre-v2.5.0
  } catch (e) {}
  return false;
}

function isWeakMap(x) {
  if (!weakMapHas || !x || typeof x !== 'object') {
    return false;
  }
  try {
    weakMapHas.call(x, weakMapHas);
    try {
      weakSetHas.call(x, weakSetHas);
    } catch (s) {
      return true;
    }
    return x instanceof WeakMap; // core-js workaround, pre-v2.5.0
  } catch (e) {}
  return false;
}

function isWeakRef(x) {
  if (!weakRefDeref || !x || typeof x !== 'object') {
    return false;
  }
  try {
    weakRefDeref.call(x);
    return true;
  } catch (e) {}
  return false;
}

function isSet(x) {
  if (!setSize || !x || typeof x !== 'object') {
    return false;
  }
  try {
    setSize.call(x);
    try {
      mapSize.call(x);
    } catch (m) {
      return true;
    }
    return x instanceof Set; // core-js workaround, pre-v2.5.0
  } catch (e) {}
  return false;
}

function isWeakSet(x) {
  if (!weakSetHas || !x || typeof x !== 'object') {
    return false;
  }
  try {
    weakSetHas.call(x, weakSetHas);
    try {
      weakMapHas.call(x, weakMapHas);
    } catch (s) {
      return true;
    }
    return x instanceof WeakSet; // core-js workaround, pre-v2.5.0
  } catch (e) {}
  return false;
}

function inspectString(str, opts) {
  if (str.length > opts.maxStringLength) {
    const remaining = str.length - opts.maxStringLength;
    const trailer = `... ${remaining} more character${
      remaining > 1 ? 's' : ''
    }`;
    return (
      inspectString($slice.call(str, 0, opts.maxStringLength), opts) + trailer
    );
  }
  // eslint-disable-next-line no-control-regex
  const s = $replace.call(
    $replace.call(str, /(['\\])/g, '\\$1'),
    // eslint-disable-next-line no-control-regex
    /[\x00-\x1f]/g,
    lowbyte,
  );
  return wrapQuotes(s, 'single', opts);
}

function lowbyte(c) {
  const n = c.charCodeAt(0);
  const x = {
    8: 'b',
    9: 't',
    10: 'n',
    12: 'f',
    13: 'r',
  }[n];
  if (x) {
    return `\\${x}`;
  }
  return `\\x${n < 0x10 ? '0' : ''}${$toUpperCase.call(n.toString(16))}`;
}

function markBoxed(str) {
  return `Object(${str})`;
}

function weakCollectionOf(type) {
  return `${type} { ? }`;
}

function collectionOf(type, size, entries, indent) {
  const joinedEntries = indent
    ? indentedJoin(entries, indent)
    : $join.call(entries, ', ');
  return `${type} (${size}) {${joinedEntries}}`;
}

function singleLineValues(xs) {
  for (let i = 0; i < xs.length; i += 1) {
    if (indexOf(xs[i], '\n') >= 0) {
      return false;
    }
  }
  return true;
}

function getIndent(opts, depth) {
  let baseIndent;
  if (opts.indent === '\t') {
    baseIndent = '\t';
  } else if (typeof opts.indent === 'number' && opts.indent > 0) {
    baseIndent = $join.call(Array(opts.indent + 1), ' ');
  } else {
    return null;
  }
  return {
    base: baseIndent,
    prev: $join.call(Array(depth + 1), baseIndent),
  };
}

function indentedJoin(xs, indent) {
  if (xs.length === 0) {
    return '';
  }
  const lineJoiner = `\n${indent.prev}${indent.base}`;
  return `${lineJoiner + $join.call(xs, `,${lineJoiner}`)}\n${indent.prev}`;
}

function arrObjKeys(obj, inspect) {
  const isArr = isArray(obj);
  const xs = [];
  if (isArr) {
    xs.length = obj.length;
    for (let i = 0; i < obj.length; i += 1) {
      xs[i] = has(obj, i) ? inspect(obj[i], obj) : '';
    }
  }
  const syms = getOwnPropertySymbols(obj);
  for (const key in obj) {
    if (!has(obj, key)) {
      // eslint-disable-next-line no-continue
      continue;
    }
    if (isArr && String(Number(key)) === key && key < obj.length) {
      // eslint-disable-next-line no-continue
      continue;
    }
    if ($test.call(/[^\w$]/, key)) {
      xs.push(`${inspect(key, obj)}: ${inspect(obj[key], obj)}`);
    } else {
      xs.push(`${key}: ${inspect(obj[key], obj)}`);
    }
  }
  for (let j = 0; j < syms.length; j += 1) {
    if (isEnumerable.call(obj, syms[j])) {
      xs.push(`[${inspect(syms[j])}]: ${inspect(obj[syms[j]], obj)}`);
    }
  }
  return xs;
}
