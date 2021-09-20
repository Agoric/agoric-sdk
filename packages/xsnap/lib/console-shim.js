/* global globalThis, print */

// We use setQuote() below to break the cycle
// where SES requires console and console is
// implemented using assert.quote from SES.
let quote = _v => '[?]';

const printAll = (...args) => {
  // Though xsnap doesn't have a whole console, it does have print().
  // eslint-disable-next-line no-restricted-globals
  print(...args.map(v => (typeof v === 'string' ? v : quote(v))));
};

const noop = _ => {};

/**
 * Since SES expects (requires?) a console,
 * provide one based on xsnap's print.
 * Note that this runs in the start compartment,
 * before lockdown.
 *
 * See https://github.com/Agoric/agoric-sdk/issues/2146
 */
const console = {
  debug: printAll,
  log: printAll,
  info: printAll,
  warn: printAll,
  error: printAll,

  trace: noop,
  dirxml: noop,
  group: noop,
  groupCollapsed: noop,
  groupEnd: noop,

  assert: noop,
  timeLog: noop,

  clear: noop,
  count: noop,
  countReset: noop,
  dir: noop,

  table: noop,
  time: noop,
  timeEnd: noop,
  profile: noop,
  profileEnd: noop,
  timeStamp: noop,
};

let quoteSet = false;

export function setQuote(f) {
  if (quoteSet) {
    throw TypeError('quote already set');
  }
  quote = f;
  quoteSet = true;
}

globalThis.console = console;
