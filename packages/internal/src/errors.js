/* global globalThis */

const { defineProperty, freeze } = Object;

// cf. https://github.com/endojs/endo/blob/master/packages/ses/src/lockdown.js
const seemsToBeLockedDown = () =>
  globalThis.Function.prototype.constructor !== globalThis.Function;

/**
 * @typedef {{
 *   quote: import('@endo/errors').quote;
 *   fail: import('@endo/errors')['assert']['fail'];
 *   Fail: import('@endo/errors').Fail;
 * }} EndoAssertMethods
 */

/**
 * @template {'quote' | 'fail' | 'Fail'} Name
 * @param {Name} name
 * @param {EndoAssertMethods[Name]} unsafeFn
 */
const polyfillAssertMethod = (name, unsafeFn) => {
  if (seemsToBeLockedDown()) return globalThis.assert[name];
  const namedFn = {
    /** @type {typeof unsafeFn} */
    [name]: (...args) => {
      if (seemsToBeLockedDown()) {
        // NOTE: In the future, we might instead defer to Endo's assert even
        // after the fact, which would allow for arbitrary import ordering but
        // open up a window before `lockdown()` in which error messages are
        // uncensored.
        throw Error(`Use of unsafe ${name} polyfill after lockdown!`);
      }
      return unsafeFn(...args);
    },
  }[name];
  return freeze(namedFn);
};

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

export const q = polyfillAssertMethod('quote', (x, spaces) => {
  if (quotes.has(/** @type {any} */ (x))) x = /** @type {any} */ (x).x;
  // TODO: Use a proper `inspect` for depth truncation/cycle handling/etc.
  const str = JSON.stringify(x, qReplacer, spaces);
  const quote = freeze({ x, toString: freeze(() => str) });
  quotes.add(quote);
  return /** @type {any} */ (quote);
});

export const Fail = polyfillAssertMethod('Fail', (strings, ...subs) => {
  const templateStrings = /** @type {TemplateStringsArray} */ (strings);
  throw Error(String.raw(templateStrings, ...subs.map(q)));
});

const fail = polyfillAssertMethod(
  'fail',
  (optDetails, errConstructor = Error, { errorName, cause, errors } = {}) => {
    const messageString = /** @type {any} */ (optDetails);
    const opts = cause && { cause };
    let error;
    if (errConstructor && errConstructor === globalThis.AggregateError) {
      error = AggregateError(errors || [], messageString, opts);
    } else {
      error = /** @type {ErrorConstructor} */ (errConstructor)(
        messageString,
        opts,
      );
      if (errors) {
        defineProperty(error, 'errors', {
          value: errors,
          writable: true,
          enumerable: false,
          configurable: true,
        });
      }
    }
    if (errorName) error.name = `${errorName} ${error.name}`;
    throw error;
  },
);

/**
 * @template T
 * @param {T | null | undefined} val
 * @param {string} [optDetails]
 * @returns {T}
 */
export const NonNullish = (val, optDetails) => {
  // This `== null` idiom checks if `val` is `null` or `undefined`.
  if (val == null) {
    throw fail(optDetails !== undefined ? optDetails : `unexpected ${q(val)}`);
  }
  return val;
};
freeze(NonNullish);
