// @ts-check

import { provide } from '@agoric/store';
import {
  defineDurableKind,
  defineDurableKindMulti,
  makeKindHandle,
  makeScalarBigMapStore,
  provideDurableMapStore,
  provideDurableSetStore,
  provideDurableWeakMapStore,
  provideDurableWeakSetStore,
} from './vat-data-bindings.js';

// TODO Why doesn't this replace the need for the individual type
// imports below?
// import './types.d.ts';

/** @template L,R @typedef {import('@endo/eventual-send').RemotableBrand<L, R>} RemotableBrand */
/** @typedef {import('./types.js').Baggage} Baggage */
/** @template T @typedef {import('./types.js').DefineKindOptions<T>} DefineKindOptions */
/** @template T @typedef {import('./types.js').KindFacet<T>} KindFacet */
/** @template S,F @typedef {import('./types.js').KindContext<S, F>} KindContext */
/** @typedef {import('./types.js').DurableKindHandle} DurableKindHandle */
/** @typedef {import('./types.js').Porter} Porter */

// TODO figure this out and then restore all `hardenx` calls back to `harden`
// and delete `harden`.
// If we annotate the `harden` with at-ts-expect-error, then a `yarn lint`
// in packages/wallet/ui complains that the ts-expect-error directive is unused.
// If we don't annotate it with anything, then a `yarn lint` in this package,
// packages/vat-data, complains that it cannot find the name `hardem`.
// If we annotate it only at-ts-ignore, then `yarn lint` here complains that
// we should use at-expect-error instead. So we have to suppress the error
// about using the wrong error suppressor.
// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore
const hardenx = arg => harden(arg);

const { entries, fromEntries } = Object;

export const dropContext =
  fn =>
  (_, ...args) =>
    fn(...args);
hardenx(dropContext);

/**
 * @param {Baggage} baggage
 * @param {string} kindName
 * @returns {DurableKindHandle}
 */
export const provideKindHandle = (baggage, kindName) =>
  provide(baggage, `${kindName}_kindHandle`, () => makeKindHandle(kindName));
hardenx(provideKindHandle);

/**
 * By analogy with how `Array.prototype.map` will map the elements of
 * an array to transformed elements of an array of the same shape,
 * `objectMap` will do likewise for the string-named own enumerable
 * properties of an object.
 *
 * Typical usage applies `objectMap` to a CopyRecord, i.e.,
 * an object for which `passStyleOf(original) === 'copyRecord'`. For these,
 * none of the following edge cases arise. The result will be a CopyRecord
 * with exactly the same property names, whose values are the mapped form of
 * the original's values.
 *
 * When the original is not a CopyRecord, some edge cases to be aware of
 *    * No matter how mutable the original object, the returned object is
 *      hardened.
 *    * Only the string-named enumerable own properties of the original
 *      are mapped. All other properties are ignored.
 *    * If any of the original properties were accessors, `Object.entries`
 *      will cause its `getter` to be called and will use the resulting
 *      value.
 *    * No matter whether the original property was an accessor, writable,
 *      or configurable, all the properties of the returned object will be
 *      non-writable, non-configurable, data properties.
 *    * No matter what the original object may have inherited from, and
 *      no matter whether it was a special kind of object such as an array,
 *      the returned object will always be a plain object inheriting directly
 *      from `Object.prototype` and whose state is only these new mapped
 *      own properties.
 *
 * With these differences, even if the original object was not a CopyRecord,
 * if all the mapped values are Passable, then the returned object will be
 * a CopyRecord.
 *
 * @template {string} K
 * @template T
 * @template U
 * @param {Record<K,T>} original
 * @param {(value: T, key?: string) => U} mapFn
 * @returns {Record<K,U>}
 */
export const objectMap = (original, mapFn) => {
  const ents = entries(original);
  const mapEnts = ents.map(([k, v]) => [k, mapFn(v, k)]);
  return /** @type {Record<K, U>} */ (hardenx(fromEntries(mapEnts)));
};

/** @type {import('./types.js').VivifyKind} */
export const vivifyKind = (
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
hardenx(vivifyKind);

/** @type {import('./types.js').VivifyKindMulti} */
export const vivifyKindMulti = (
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
hardenx(vivifyKindMulti);

/**
 * @template T
 * @param {Baggage} baggage
 * @param {string} kindName
 * @param {T} methods
 * @param {DefineKindOptions<unknown>} [options]
 * @returns {T & RemotableBrand<{}, T>}
 */
export const vivifySingleton = (
  baggage,
  kindName,
  methods,
  options = undefined,
) => {
  const behavior = objectMap(methods, dropContext);
  const makeSingleton = vivifyKind(
    baggage,
    kindName,
    () => ({}),
    behavior,
    options,
  );

  // Similar double suppression dance going on. In this package, a `yarn lint`
  // doesn't need any suppression and is happy with the code as is.
  // But a `yarn lint` in packages/wallet/ui considers it ill typed.
  // TODO figure this out and remove the double suppression.
  // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
  // @ts-ignore
  return provide(baggage, `the_${kindName}`, () => makeSingleton());
};
hardenx(vivifySingleton);

/**
 * @param {Baggage} rootBaggage
 * TODO When I put square brackets on `rootBaggage` to indicate it is
 * optional, or indicate it is optional in all other static ways I
 * happen to know (`=}`, `|undefined}`), and then hover over `rootBaggage`
 * in my IDE, it looses its `MapStore` typing and instead falls back to `any`.
 * Nothing similar happens, for example, with `porterKindOptions`.
 * @param {DefineKindOptions<any>} [porterKindOptions]
 * @returns {Porter}
 */
export const vivifyRootPorter = (
  rootBaggage = makeScalarBigMapStore('root baggage', { durable: true }),
  porterKindOptions = {},
) => {
  /**
   * @param {Baggage} baggage
   * @returns {Porter}
   */
  const makePorter = vivifyKind(
    rootBaggage,
    'Porter',
    baggage => ({ baggage }),
    {
      provide: ({ state: { baggage } }, label, makeValue) =>
        provide(baggage, label, makeValue),

      providePorter: ({ state: { baggage } }, label, options = {}) =>
        provide(baggage, `${label} porter`, () =>
          makePorter(makeScalarBigMapStore(`${label} baggage`, options)),
        ),
      makeFreshPorter: (
        _context,
        baggage = makeScalarBigMapStore('fresh baggage', { durable: true }),
      ) => makePorter(baggage),

      getBaggage: ({ state: { baggage } }) => baggage,

      provideMapStore: ({ state: { baggage } }, label, options = {}) =>
        provideDurableMapStore(baggage, label, options),
      provideWeakMapStore: ({ state: { baggage } }, label, options = {}) =>
        provideDurableWeakMapStore(baggage, label, options),
      provideSetStore: ({ state: { baggage } }, label, options = {}) =>
        provideDurableSetStore(baggage, label, options),
      provideWeakSetStore: ({ state: { baggage } }, label, options = {}) =>
        provideDurableWeakSetStore(baggage, label, options),

      vivifyKind: ({ state: { baggage } }, tag, init, facet, options = {}) =>
        vivifyKind(baggage, tag, init, facet, options),

      vivifyKindMulti: (
        { state: { baggage } },
        tag,
        init,
        behavior,
        options = {},
      ) => vivifyKindMulti(baggage, tag, init, behavior, options),

      vivifySingleton: ({ state: { baggage } }, tag, methods, options = {}) =>
        vivifySingleton(baggage, tag, methods, options),
    },
    porterKindOptions,
  );
  return makePorter(rootBaggage);
};
hardenx(vivifyRootPorter);
