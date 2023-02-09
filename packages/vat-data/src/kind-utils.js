import {
  provide,
  defineDurableKind,
  defineDurableKindMulti,
  makeKindHandle,
} from './vat-data-bindings.js';

/** @typedef {import('./types.js').Baggage} Baggage */
/** @typedef {import('./types.js').DurableKindHandle} DurableKindHandle */

/**
 * Make a version of the argument function that takes a kind context but
 * ignores it.
 *
 * @type {<T extends Function>(fn: T) => import('./types.js').PlusContext<never, T>}
 */
export const ignoreContext =
  fn =>
  (_context, ...args) =>
    fn(...args);
harden(ignoreContext);

/**
 * @param {Baggage} baggage
 * @param {string} kindName
 * @returns {DurableKindHandle}
 */
export const provideKindHandle = (baggage, kindName) =>
  provide(baggage, `${kindName}_kindHandle`, () => makeKindHandle(kindName));
harden(provideKindHandle);

/**
 * @deprecated Use prepareExoClass instead
 * @type {import('./types.js').PrepareKind}
 */
export const prepareKind = (
  baggage,
  kindName,
  init,
  behavior,
  options = undefined,
) =>
  defineDurableKind(
    provideKindHandle(baggage, kindName),
    init,
    behavior,
    options,
  );
harden(prepareKind);

/**
 * @deprecated Use prepareExoClassKit instead
 * @type {import('./types.js').PrepareKindMulti}
 */
export const prepareKindMulti = (
  baggage,
  kindName,
  init,
  behavior,
  options = undefined,
) =>
  defineDurableKindMulti(
    provideKindHandle(baggage, kindName),
    init,
    behavior,
    options,
  );
harden(prepareKindMulti);
