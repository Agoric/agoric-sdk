import { provide } from '@agoric/store';
import { defineDurableKind, makeKindHandle } from './vat-data-bindings.js';

const { fromEntries, entries } = Object;

export const dropContext =
  fn =>
  (_, ...args) =>
    fn(...args);
// @ts-expect-error TODO statically recognize harden
harden(dropContext);

export const provideKindHandle = (baggage, kindName) =>
  provide(baggage, `${kindName}_kindHandle`, () => makeKindHandle(kindName));
// @ts-expect-error TODO statically recognize harden
harden(provideKindHandle);

/**
 * @template T
 * @param {import('@agoric/store').MapStore<string, unknown>} baggage
 * @param {string} kindName
 * @param {T} methods
 * @param {import('./types.js').DefineKindOptions<unknown>} [options]
 * @returns {T}
 */
export const ProvideFar = (baggage, kindName, methods, options = undefined) => {
  const kindHandle = provideKindHandle(baggage, kindName);
  const behavior = fromEntries(
    entries(methods).map(([k, m]) => [k, dropContext(m)]),
  );
  const makeSingleton = defineDurableKind(
    kindHandle,
    () => ({}),
    behavior,
    options,
  );
  return provide(baggage, `the_${kindName}`, () => makeSingleton());
};
// @ts-expect-error TODO statically recognize harden
harden(ProvideFar);
