import { objectMap } from '@agoric/internal';

import { defendPrototype, defendPrototypeKit } from './exo-tools.js';

const { seal, freeze } = Object;

const emptyRecord = harden({});

/**
 * When calling `defineDurableKind` and
 * its siblings, used as the `init` function argument to indicate that the
 * state record of the (virtual/durable) instances of the kind/exoClass
 * should be empty, and that the returned maker function should have zero
 * parameters.
 *
 * @returns {{}}
 */
export const initEmpty = () => emptyRecord;

/**
 * @template {(...args: any) => any} I init state function
 * @template {Record<string | symbol, CallableFunction>} M methods
 * @type {DefineExoClass<I,M>}
 */
export const defineExoClass = (
  label,
  interfaceGuard,
  init,
  methods,
  { finish = undefined } = {},
) => {
  const contextMap = new WeakMap();
  const prototype = defendPrototype(
    label,
    contextMap,
    methods,
    true,
    interfaceGuard,
  );
  const makeInstance = (...args) => {
    // Be careful not to freeze the state record
    const state = seal(init(...args));
    const self = harden({ __proto__: prototype });
    const context = freeze({ state, self });
    contextMap.set(self, context);
    if (finish) {
      // @ts-expect-error I don't understand the type error
      finish(context);
    }
    return self;
  };
  // @ts-expect-error could be instantiated with different subtype
  return harden(makeInstance);
};
harden(defineExoClass);

/**
 * @template {(...args: any) => any} I init state function
 * @template {Record<string, Record<string | symbol, CallableFunction>>} F facets
 * @type {DefineExoClassKit<I,F>}
 */
export const defineExoClassKit = (
  label,
  interfaceGuardKit,
  init,
  methodsKit,
  { finish = undefined } = {},
) => {
  const contextMapKit = objectMap(methodsKit, () => new WeakMap());
  const prototypeKit = defendPrototypeKit(
    label,
    contextMapKit,
    methodsKit,
    true,
    interfaceGuardKit,
  );
  const makeInstanceKit = (...args) => {
    // Be careful not to freeze the state record
    const state = seal(init(...args));
    // Don't freeze context until we add facets
    const context = { state };
    const facets = objectMap(prototypeKit, (prototype, facetName) => {
      const self = harden({ __proto__: prototype });
      contextMapKit[facetName].set(self, context);
      return self;
    });
    context.facets = facets;
    // Be careful not to freeze the state record
    freeze(context);
    if (finish) {
      // @ts-expect-error TS doesn't know we added `facets`
      finish(context);
    }
    return facets;
  };
  // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error -- different per package https://github.com/Agoric/agoric-sdk/issues/4620
  // @ts-ignore xxx
  return harden(makeInstanceKit);
};
harden(defineExoClassKit);

/**
 * @template {Record<string | symbol, CallableFunction>} M methods
 * @type {MakeExo<M>}
 */
export const makeExo = (
  label,
  interfaceGuard,
  methods,
  options = undefined,
) => {
  const makeInstance = defineExoClass(
    label,
    interfaceGuard,
    // @ts-expect-error TS should understand that `initEmpty` can be an I
    initEmpty,
    methods,
    options,
  );
  // @ts-expect-error TS things there are two unrelated `Exo<M>` types
  return makeInstance();
};
harden(makeExo);
