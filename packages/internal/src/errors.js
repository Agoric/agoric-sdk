/* global globalThis */

const { create, freeze } = Object;

/** @import {quote as QuoteI, Fail as FailTagI} from "@endo/errors"; */

/**
 * @type {{
 *   quote: QuoteI;
 *   fail: import('@endo/errors').assert['fail'];
 *   Fail: FailTagI;
 * }}
 */
const assert = globalThis.assert || create(null);

// https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#prod-IdentifierName
const rIdentifierName = /^[\p{ID_Start}$_][\p{ID_Continue}$]*$/u;
/** @type {(str: string) => boolean} */
const isIdentifier = str => rIdentifierName.test(str);

/**
 * Quote for readability, prefering single quote characters to minimize JSON
 * escaping.
 *
 * @type {(maybeStr?: string) => string}
 */
const squote = maybeStr => {
  if (maybeStr === undefined) return 'undefined';
  const quoted = JSON.stringify(maybeStr);
  return quoted.includes("'") ? quoted : `'${quoted.slice(1, -1)}'`;
};

/**
 * Replace a non-JSON-representable value with a string in square brackets (and
 * to avoid collisions, also wrap any string that starts with "[").
 *
 * @type {(_key: string, val: unknown) => unknown}
 */
const qReplacer = (_key, val) => {
  if (val === undefined) return '[undefined]';
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return `[${val}]`;
    if (Object.is(val, -0)) return `[-0]`;
    return val;
  }
  if (typeof val === 'bigint') {
    // Separate every group of three digits from the right.
    const grouped = `${val}`.replace(
      /^(?<prefix>|-?[0-9]+?)(?<triples>(?:[0-9]{3})+)$/g,
      (_m, p, t) => [...(p ? [p] : []), ...t.match(/.../g)].join('_'),
    );
    return `[${grouped}n]`;
  }
  if (typeof val === 'function') {
    const { name } = val;
    const qname =
      // eslint-disable-next-line no-nested-ternary
      name === undefined
        ? '[anonymous]'
        : isIdentifier(name)
          ? name
          : squote(name);
    return `[function ${qname}]`;
  }
  if (typeof val === 'symbol') {
    const { description } = val;
    if (Symbol.keyFor(val) !== undefined) {
      return `[Symbol.for(${squote(description)})]`;
    }
    const symbolName = Object.getOwnPropertyNames(Symbol).find(
      k => /** @type {any} */ (Symbol)[k] === val,
    );
    if (symbolName) {
      return isIdentifier(symbolName)
        ? `[Symbol.${symbolName}]`
        : `[Symbol[${squote(symbolName)}]]`;
    }
    return `[Symbol(${squote(description)})]`;
  }
  if (typeof val === 'string' && val.startsWith('[')) return `[${squote(val)}]`;
  return val;
};

const quotes = new WeakSet();

/** @type {QuoteI} */
export const q =
  assert.quote ||
  ((x, spaces) => {
    if (quotes.has(/** @type {any} */ (x))) x = /** @type {any} */ (x).x;
    // TODO: Use a proper `inspect` for depth truncation/cycle handling/etc.
    const str = JSON.stringify(x, qReplacer, spaces);
    const quote = freeze({ x, toString: freeze(() => str) });
    quotes.add(quote);
    return /** @type {any} */ (quote);
  });
freeze(q);

/** @type {FailTagI} */
export const Fail =
  assert.Fail ||
  ((strings, ...subs) => {
    const templateStrings = /** @type {TemplateStringsArray} */ (strings);
    throw Error(String.raw(templateStrings, ...subs.map(q)));
  });
freeze(Fail);

/** @type {(details: string) => never} */
const fail =
  assert.fail ||
  (details => {
    throw Error(details);
  });

/**
 * @template T
 * @param {T | null | undefined} val
 * @param {string} [optDetails]
 * @returns {T}
 */
export const NonNullish = (val, optDetails) => {
  // This `!= null` idiom checks that `val` is neither `null` nor `undefined`.
  if (val != null) {
    return val;
  }
  fail(optDetails !== undefined ? optDetails : `unexpected ${q(val)}`);
};
freeze(NonNullish);
