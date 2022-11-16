import { Far } from '@endo/marshal';
import { E } from '@endo/eventual-send';
import { listDifference, objectMap } from '@agoric/internal';

import { fit } from './patternMatchers.js';

const { details: X, quote: q } = assert;
const { apply, ownKeys } = Reflect;
const { defineProperties, seal, freeze } = Object;

const defendSyncArgs = (args, methodGuard, label) => {
  const { argGuards, optionalArgGuards, restArgGuard } = methodGuard;
  if (args.length < argGuards.length) {
    assert.fail(
      X`${label} args: ${args} - expected ${argGuards.length} arguments`,
    );
  }
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const argLabel = `${label} arg ${i}`;
    if (i < argGuards.length) {
      fit(arg, argGuards[i], argLabel);
    } else if (
      optionalArgGuards &&
      i < argGuards.length + optionalArgGuards.length
    ) {
      if (arg !== undefined) {
        // In the optional section, an `undefined` arg succeeds
        // unconditionally
        fit(arg, optionalArgGuards[i - argGuards.length], argLabel);
      }
    } else if (restArgGuard) {
      const restArg = harden(args.slice(i));
      fit(restArg, restArgGuard, `${label} rest[${i}]`);
      return;
    } else {
      assert.fail(
        X`${argLabel}: ${args} - expected fewer than ${i + 1} arguments`,
      );
    }
  }
  if (restArgGuard) {
    fit(harden([]), restArgGuard, `${label} rest[]`);
  }
};

/**
 * @param {Method} method
 * @param {MethodGuard} methodGuard
 * @param {string} label
 * @returns {Method}
 */
const defendSyncMethod = (method, methodGuard, label) => {
  const { returnGuard } = methodGuard;
  const { syncMethod } = {
    // Note purposeful use of `this` and concise method syntax
    syncMethod(...args) {
      defendSyncArgs(harden(args), methodGuard, label);
      const result = apply(method, this, args);
      fit(harden(result), returnGuard, `${label}: result`);
      return result;
    },
  };
  return syncMethod;
};

const isAwaitArgGuard = argGuard =>
  argGuard && typeof argGuard === 'object' && argGuard.klass === 'awaitArg';

const desync = methodGuard => {
  const { argGuards, optionalArgGuards = [], restArgGuard } = methodGuard;
  !isAwaitArgGuard(restArgGuard) ||
    assert.fail(X`Rest args may not be awaited: ${restArgGuard}`);
  const rawArgGuards = [...argGuards, ...optionalArgGuards];

  const awaitIndexes = [];
  for (let i = 0; i < rawArgGuards.length; i += 1) {
    const argGuard = rawArgGuards[i];
    if (isAwaitArgGuard(argGuard)) {
      rawArgGuards[i] = argGuard.argGuard;
      awaitIndexes.push(i);
    }
  }
  return {
    awaitIndexes,
    rawMethodGuard: {
      argGuards: rawArgGuards.slice(0, argGuards.length),
      optionalArgGuards: rawArgGuards.slice(argGuards.length),
      restArgGuard,
    },
  };
};

const defendAsyncMethod = (method, methodGuard, label) => {
  const { returnGuard } = methodGuard;
  const { awaitIndexes, rawMethodGuard } = desync(methodGuard);
  const { asyncMethod } = {
    // Note purposeful use of `this` and concise method syntax
    asyncMethod(...args) {
      const awaitList = awaitIndexes.map(i => args[i]);
      const p = Promise.all(awaitList);
      const rawArgs = [...args];
      const resultP = E.when(p, awaitedArgs => {
        for (let j = 0; j < awaitIndexes.length; j += 1) {
          rawArgs[awaitIndexes[j]] = awaitedArgs[j];
        }
        defendSyncArgs(rawArgs, rawMethodGuard, label);
        return apply(method, this, rawArgs);
      });
      return E.when(resultP, result => {
        fit(harden(result), returnGuard, `${label}: result`);
        return result;
      });
    },
  };
  return asyncMethod;
};

/**
 *
 * @param {Method} method
 * @param {MethodGuard} methodGuard
 * @param {string} label
 */
const defendMethod = (method, methodGuard, label) => {
  const { klass, callKind } = methodGuard;
  assert(klass === 'methodGuard');
  if (callKind === 'sync') {
    return defendSyncMethod(method, methodGuard, label);
  } else {
    assert(callKind === 'async');
    return defendAsyncMethod(method, methodGuard, label);
  }
};

/**
 *
 * @param {string} methodTag
 * @param {WeakMap} contextMap
 * @param {Method} behaviorMethod
 * @param {boolean} [thisfulMethods]
 * @param {MethodGuard} [methodGuard]
 */
const bindMethod = (
  methodTag,
  contextMap,
  behaviorMethod,
  thisfulMethods = false,
  methodGuard = undefined,
) => {
  assert.typeof(behaviorMethod, 'function');

  const getContext = self => {
    const context = contextMap.get(self);
    context ||
      assert.fail(
        X`${q(methodTag)} may only be applied to a valid instance: ${self}`,
      );
    return context;
  };

  // Violating all Jessie rules to create representatives that inherit
  // methods from a shared prototype. The bound method therefore needs
  // to mention `this`. We define it using concise method syntax
  // so that it will be `this` sensitive but not constructable.
  //
  // We normally consider `this` unsafe because of the hazard of a
  // method of one abstraction being applied to an instance of
  // another abstraction. To prevent that attack, the bound method
  // checks that its `this` is in the map in which its representatives
  // are registered.
  let { method } = thisfulMethods
    ? {
        method(...args) {
          const context = getContext(this);
          return apply(behaviorMethod, context, args);
        },
      }
    : {
        method(...args) {
          const context = getContext(this);
          return apply(behaviorMethod, null, [context, ...args]);
        },
      };
  if (methodGuard) {
    method = defendMethod(method, methodGuard, methodTag);
  }
  defineProperties(method, {
    name: { value: methodTag },
    length: {
      value: thisfulMethods ? behaviorMethod.length : behaviorMethod.length - 1,
    },
  });
  return method;
};

/**
 * @template {Record<string | symbol, Method>} T
 * @param {string} tag
 * @param {WeakMap} contextMap
 * @param {T} behaviorMethods
 * @param {boolean} [thisfulMethods]
 * @param {InterfaceGuard} [interfaceGuard]
 * @returns {T & import('@endo/eventual-send').RemotableBrand<{}, T>}
 */
export const defendPrototype = (
  tag,
  contextMap,
  behaviorMethods,
  thisfulMethods = false,
  interfaceGuard = undefined,
) => {
  const prototype = {};
  const methodNames = ownKeys(behaviorMethods).filter(
    // By ignoring any method named "constructor", we can use a
    // class.prototype as a behaviorMethods.
    name => name !== 'constructor',
  );
  let methodGuards;
  if (interfaceGuard) {
    const {
      klass,
      interfaceName,
      methodGuards: mg,
      sloppy = false,
    } = interfaceGuard;
    methodGuards = mg;
    assert.equal(klass, 'Interface');
    assert.typeof(interfaceName, 'string');
    {
      const methodGuardNames = ownKeys(methodGuards);
      const unimplemented = listDifference(methodGuardNames, methodNames);
      unimplemented.length === 0 ||
        assert.fail(
          X`methods ${q(unimplemented)} not implemented by ${q(tag)}`,
        );
      if (!sloppy) {
        const unguarded = listDifference(methodNames, methodGuardNames);
        unguarded.length === 0 ||
          assert.fail(
            X`methods ${q(unguarded)} not guarded by ${q(interfaceName)}`,
          );
      }
    }
  }
  for (const prop of methodNames) {
    prototype[prop] = bindMethod(
      `In ${q(prop)} method of (${tag})`,
      contextMap,
      behaviorMethods[prop],
      thisfulMethods,
      // TODO some tool does not yet understand the `?.[` syntax
      methodGuards && methodGuards[prop],
    );
  }
  // @ts-expect-error could be instantiated with different subtype
  return Far(tag, prototype);
};
harden(defendPrototype);

const emptyRecord = harden({});

/**
 * When calling `defineDurableKind` and
 * its siblings, used as the `init` function argument to indicate that the
 * state record of the (virtual/durable) instances of the kind/farClass
 * should be empty, and that the returned maker function should have zero
 * parameters.
 *
 * @returns {{}}
 */
export const initEmpty = () => emptyRecord;

/**
 * @template [S = any]
 * @template [T = any]
 * @typedef {object} Context
 * @property {S} state
 * @property {T} self
 */

/**
 * @template A
 * @template S
 * @template {{}} T
 * @param {string} tag
 * @param {any} interfaceGuard
 * @param {(...args: A[]) => S} init
 * @param {T} methods
 * @param {object} [options]
 * @returns {(...args: A[]) => (T & import('@endo/eventual-send').RemotableBrand<{}, T>)}
 */
export const defineHeapFarClass = (
  tag,
  interfaceGuard,
  init,
  methods,
  options = undefined,
) => {
  /** @type {WeakMap<T,Context<S, T>>} */
  const contextMap = new WeakMap();
  const prototype = defendPrototype(
    tag,
    contextMap,
    methods,
    true,
    interfaceGuard,
  );
  const makeInstance = (...args) => {
    // Be careful not to freeze the state record
    const state = seal(init(...args));
    /** @type {T} */
    // @ts-expect-error could be instantiated with different subtype
    const self = harden({ __proto__: prototype });
    // Be careful not to freeze the state record
    /** @type {Context<S,T>} */
    const context = freeze({ state, self });
    contextMap.set(self, context);
    if (options) {
      const { finish = undefined } = options;
      if (finish) {
        finish(context);
      }
    }
    return self;
  };
  // @ts-expect-error could be instantiated with different subtype
  return harden(makeInstance);
};
harden(defineHeapFarClass);

/**
 * @template A
 * @template S
 * @template {Record<string, any>} F
 * @param {string} tag
 * @param {any} interfaceGuardKit
 * @param {(...args: A[]) => S} init
 * @param {F} methodsKit
 * @param {object} [options]
 * @returns {(...args: A[]) => F}
 */
export const defineHeapFarClassKit = (
  tag,
  interfaceGuardKit,
  init,
  methodsKit,
  options = undefined,
) => {
  const facetNames = ownKeys(methodsKit);
  const interfaceNames = ownKeys(interfaceGuardKit);
  const extraInterfaceNames = listDifference(facetNames, interfaceNames);
  extraInterfaceNames.length === 0 ||
    assert.fail(
      X`Interfaces ${q(extraInterfaceNames)} not implemented by ${q(tag)}`,
    );
  const extraFacetNames = listDifference(interfaceNames, facetNames);
  extraFacetNames.length === 0 ||
    assert.fail(
      X`Facets ${q(extraFacetNames)} of ${q(tag)} not guarded by interfaces`,
    );

  const contextMapKit = objectMap(methodsKit, () => new WeakMap());
  const prototypeKit = objectMap(methodsKit, (methods, facetName) =>
    defendPrototype(
      // @ts-expect-error could be symbol
      `${tag} ${facetName}`,
      contextMapKit[facetName],
      methods,
      true,
      interfaceGuardKit[facetName],
    ),
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
    if (options) {
      const { finish = undefined } = options;
      if (finish) {
        finish(context);
      }
    }
    return facets;
  };
  // @ts-expect-error xxx
  return harden(makeInstanceKit);
};
harden(defineHeapFarClassKit);

/**
 * @template {Record<string, Method>} T
 * @param {string} tag
 * @param {InterfaceGuard | undefined} interfaceGuard CAVEAT: static typing does not yet support `callWhen` transformation
 * @param {T} methods
 * @param {object} [options]
 * @returns {T & import('@endo/eventual-send').RemotableBrand<{}, T>}
 */
export const makeHeapFarInstance = (
  tag,
  interfaceGuard,
  methods,
  options = undefined,
) => {
  const makeInstance = defineHeapFarClass(
    tag,
    interfaceGuard,
    initEmpty,
    methods,
    options,
  );
  return makeInstance();
};
harden(makeHeapFarInstance);
