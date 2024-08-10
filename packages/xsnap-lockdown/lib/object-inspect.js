// @ts-nocheck
/* eslint-disable no-nested-ternary,no-use-before-define */

/* global globalThis */
// Adapted from object-inspect@1.12.0 https://github.com/inspect-js/object-inspect
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
const WeakRefPrototype =
  typeof globalThis.WeakRef === 'function' ? globalThis.WeakRef.prototype : {};
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
const getOwnPropertyNames = Object.getOwnPropertyNames;
const getOwnPropertySymbols = Object.getOwnPropertySymbols;
const symToString = Symbol.prototype.toString;
const symKeyFor = Symbol.keyFor;
// ie, `has-tostringtag/shams
const toStringTag = Symbol.toStringTag;
const isEnumerable = Object.prototype.propertyIsEnumerable;
const dateToISOString = Date.prototype.toISOString;

const gPO = Reflect.getPrototypeOf;
const hasOwn = Object.prototype.hasOwnProperty;

// Separate every three rightmost digits.
const separateDigits = (
  digits,
  separator = '_',
  separationRegExp = /^-?\d+(\d{3})$/,
) => {
  const separations = [];
  let match;
  // eslint-disable-next-line no-cond-assign
  while ((match = digits.match(separationRegExp))) {
    separations.unshift(match[1]);
    digits = digits.slice(0, -match[1].length);
  }
  separations.unshift(digits);
  return $join.call(separations, separator);
};

function inspect0(obj, opts = {}, depth = 0, circular = new Set()) {
  // Handle enumerable primitives.
  if (obj == null) {
    return obj === null ? 'null' : 'undefined';
  }
  if (obj === true) {
    return 'true';
  }
  if (obj === false) {
    return 'false';
  }

  const typeofObj = typeof obj;
  if (typeofObj === 'string') {
    return inspectString(obj, opts);
  }
  if (typeofObj === 'number') {
    if (obj === 0) {
      return Infinity / obj > 0 ? '0' : '-0';
    }
    return String(obj);
  }
  if (typeofObj === 'bigint') {
    // Separate the digits to help visualise, terminate with `n`.
    return `${separateDigits(String(obj))}n`;
  }

  const maxDepth = typeof opts.depth === 'undefined' ? 5 : opts.depth;
  if (depth >= maxDepth && maxDepth > 0 && typeofObj === 'object') {
    return isArray(obj) ? '[Array]' : '[Object]';
  }

  const indent = getIndent(opts, depth);

  if (circular.has(obj)) {
    return '[Circular]';
  }

  function inspect(value, from, noIndent) {
    if (from) {
      circular.add(from);
    }
    let ret;
    if (noIndent) {
      const newOpts = {
        depth: opts.depth,
      };
      if (has(opts, 'quoteStyle')) {
        newOpts.quoteStyle = opts.quoteStyle;
      }
      ret = inspect0(value, newOpts, depth + 1, circular);
    } else {
      ret = inspect0(value, opts, depth + 1, circular);
    }
    if (from) {
      circular.delete(from);
    }
    return ret;
  }

  if (typeofObj === 'function') {
    const name = nameOf(obj);
    const keys = arrObjKeys(obj, inspect);
    return `[Function${name ? `: ${name}` : ' (anonymous)'}]${
      keys.length > 0 ? ` { ${$join.call(keys, ', ')} }` : ''
    }`;
  }
  if (isSymbol(obj)) {
    const registered = symKeyFor(obj);
    if (registered !== undefined) {
      // Registered symbol.
      return `Symbol.for(${registered})`;
    }
    return symToString.call(obj);
  }
  if (typeof obj !== 'object') {
    // Some new unknown type
    return typeof obj;
  }

  if (isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }
    const elems = arrObjKeys(obj, inspect);
    if (indent && !singleLineValues(elems)) {
      return `[${indentedJoin(elems, indent)}]`;
    }
    return `[ ${$join.call(elems, ', ')} ]`;
  }
  if (isError(obj)) {
    const parts = arrObjKeys(obj, inspect);
    if ('cause' in obj && !isEnumerable.call(obj, 'cause')) {
      parts.unshift(`[cause]: ${inspect(obj.cause)}`);
    }
    if (parts.length === 0) {
      return `[${String(obj)}]`;
    }
    return `{ [${String(obj)}] ${$join.call(parts, ', ')} }`;
  }

  const objProto = gPO(obj);
  switch (objProto) {
    case Map.prototype: {
      const mapParts = [];
      mapForEach.call(obj, (value, key) => {
        mapParts.push(`${inspect(key, obj, true)} => ${inspect(value, obj)}`);
      });
      return collectionOf('Map', mapSize.call(obj), mapParts, indent);
    }
    case Set.prototype: {
      const setParts = [];
      setForEach.call(obj, value => {
        setParts.push(inspect(value, obj));
      });
      return collectionOf('Set', setSize.call(obj), setParts, indent);
    }
    case WeakMap.prototype: {
      return weakContainerOf('WeakMap');
    }
    case WeakSet.prototype: {
      return weakContainerOf('WeakSet');
    }
    case WeakRefPrototype: {
      return weakContainerOf('WeakRef');
    }
    case BigInt.prototype: {
      return markBoxed(inspect(bigIntValueOf.call(obj)));
    }
    default:
    // Fall-through
  }

  if (!(toStringTag in obj)) {
    switch (objProto) {
      case Number.prototype: {
        return markBoxed(inspect(Number(obj)));
      }
      case Boolean.prototype: {
        return markBoxed(booleanValueOf.call(obj));
      }
      case String.prototype: {
        return markBoxed(inspect(String(obj)));
      }
      case Date.prototype: {
        return dateToISOString.call(obj);
      }
      case RegExp.prototype: {
        return String(obj);
      }
      default:
      // Fall-through
    }
  }

  const elems = arrObjKeys(obj, inspect);
  const isPlainObject = objProto === Object.prototype;
  const protoTag =
    isPlainObject || obj instanceof Object ? '' : 'null prototype';
  const stringTag =
    !isPlainObject && toStringTag && Object(obj) === obj && toStringTag in obj
      ? $slice.call(toStr(obj), 8, -1)
      : protoTag
        ? 'Object'
        : '';
  const protoConstructor = objProto && objProto.constructor;
  const constructorTag =
    isPlainObject || typeof protoConstructor !== 'function'
      ? ''
      : protoConstructor.name
        ? `${protoConstructor.name} `
        : '';
  const tag =
    constructorTag +
    (stringTag || protoTag
      ? `[${$join.call(
          $concat.call([], stringTag || [], protoTag || []),
          ': ',
        )}] `
      : '');
  if (elems.length === 0) {
    return `${tag}{}`;
  }
  if (indent) {
    return `${tag}{${indentedJoin(elems, indent)}}`;
  }
  return `${tag}{ ${$join.call(elems, ', ')} }`;
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
function isError(obj) {
  return (
    obj instanceof Error && !(typeof obj === 'object' && toStringTag in obj)
  );
}

// Symbol and BigInt do have Symbol.toStringTag by spec, so that can't be used to eliminate false positives
function isSymbol(obj) {
  return typeof obj === 'symbol';
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
  const s = $replace.call(
    // Replace ' with \' and \ with \\.
    $replace.call(str, /(['\\])/g, '\\$1'),
    // eslint-disable-next-line no-control-regex
    /[\x00-\x1f]/g,
    lowbyte,
  );
  return wrapQuotes(s, 'single', opts);
}

// Replace control characters with `\b`, `\t`, `\n`, `\f`, `\r`, `\x0B` or
// `\xAB` escaped versions.
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

function weakContainerOf(type) {
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
  const elems = [];
  if (isArr) {
    elems.length = obj.length;
    for (let i = 0; i < obj.length; i += 1) {
      elems[i] = has(obj, i) ? inspect(obj[i], obj) : '';
    }
  }
  const syms = getOwnPropertySymbols(obj);
  for (const key of getOwnPropertyNames(obj)) {
    if (!isEnumerable.call(obj, key)) {
      continue;
    }
    if (isArr && String(Number(key)) === key && key < obj.length) {
      continue;
    }
    if ($test.call(/[^\w$]/, key)) {
      elems.push(`${inspect(key, obj)}: ${inspect(obj[key], obj)}`);
    } else {
      elems.push(`${key}: ${inspect(obj[key], obj)}`);
    }
  }
  for (let j = 0; j < syms.length; j += 1) {
    if (isEnumerable.call(obj, syms[j])) {
      elems.push(`[${inspect(syms[j])}]: ${inspect(obj[syms[j]], obj)}`);
    }
  }
  return elems;
}

const outerInspect = (obj, ...args) => {
  try {
    return inspect0(obj, ...args);
  } catch (err) {
    let errStr;
    try {
      errStr = inspect0(err);
    } catch (_) {
      errStr = 'throw';
    }
    return `[cannot inspect (${typeof obj}) due to ${errStr}]`;
  }
};

// This must be the only import/export statement, and occur last in the file, so
// that confined-object-inspect.js can comment out the `export default`
// and evaluate this entire file's source code to obtain the inspector as the
// completion value.
export default harden(outerInspect);
