import { Far } from '@endo/marshal';
import { E } from '@endo/eventual-send';
import { listDifference, objectMap } from '@agoric/internal';

import { fit } from './patternMatchers.js';

/* Destructuring the object assert into two variables, details and quote. */
const { details: X, quote: q } = assert;
/* Using the Reflect API to apply a function to an object. */
const { apply, ownKeys } = Reflect;
/* Using object destructuring to assign the properties of the object Object to the variables
defineProperties, seal, and freeze. */
const { defineProperties, seal, freeze } = Object;

/**
 * It takes a list of
 * arguments, a method guard, and a label, and it checks that the arguments
 * satisfy the method guard
 * @param args - the arguments to the method
 * @param methodGuard - The guard for the method being called.
 * @param label - a string that will be used in error messages
 * @returns The function defendSyncArgs is being returned.
 */
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
 * It takes a method, a guard, and a label, and returns a new method that is guarded by the guard
 * @param method - The method to be guarded.
 * @param methodGuard - a guard object that describes the parameters and return value of the method
 * @param label - A string that will be used in error messages.
 * @returns A function that takes a method and a methodGuard and returns a function that takes a label
 * and returns a function that takes args and returns a result.
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

/**
 * It returns true if the argument is an object with a property named `klass` whose value is the string
 * `awaitArg`
 */
const isAwaitArgGuard = argGuard =>
  argGuard && typeof argGuard === 'object' && argGuard.klass === 'awaitArg';

/**
 * It takes a method guard and returns an object with two properties:
 *
 * - `awaitIndexes`: an array of indexes of the arguments that are awaited
 * - `rawMethodGuard`: a method guard with the awaited arguments replaced with their non-awaited
 * versions
 *
 * The first thing we do is assert that the rest argument is not awaited. This is because we don't
 * support awaiting rest arguments
 * @returns An object with two properties:
 *   1. awaitIndexes: An array of indexes of the arguments that are awaited.
 *   2. rawMethodGuard: A method guard with the awaited arguments replaced with their non-awaited
 * versions.
 */
const desync = methodGuard => {
  const { argGuards, optionalArgGuards = [], restArgGuard } = methodGuard;
  assert(
    !isAwaitArgGuard(restArgGuard),
    X`Rest args may not be awaited: ${restArgGuard}`,
  );
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

/**
 * It takes an async method,
 * a method guard, and a label, and returns a guarded async method
 * @param method - The method to be defended.
 * @param methodGuard - The guard for the method's arguments.
 * @param label - A string that will be used in error messages.
 * @returns An async method.
 */
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
 * It takes a method, a method guard, and a label, and returns a new method that is guarded by the
 * method guard
 * @param method - the method to be guarded
 * @param methodGuard - the method guard object
 * @param label - a string that will be used to identify the method in error messages
 * @returns A function that takes in a method, methodGuard, and label.
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
 * It takes a method tag, a context map, a behavior method, and a method guard, and returns a method
 * that calls the behavior method with the context from the context map.
 * @param methodTag - a string that identifies the method.
 * @param contextMap - a WeakMap that maps instances to their context objects
 * @param behaviorMethod - The method to be bound.
 * @param [thisfulMethods=false] - If true, the method will be bound to the instance.
 * @param [methodGuard] - a function that takes the context and returns true if the method should be
 * bound
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
    assert(
      context,
      X`${q(methodTag)} may only be applied to a valid instance: ${this}`,
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
 * @template T
 * @param {string} tag
 * @param {ContextMap} contextMap
 * @param {any} behaviorMethods
 * @param {boolean} [thisfulMethods]
 * @param {InterfaceGuard} [interfaceGuard]
 * @returns {T & RemotableBrand<{}, T>}
 */
/**
 * It takes a map of
 * methods, and returns a map of methods that are bound to the context
 * map
 * @param tag - a string that will be used in error messages
 * @param contextMap - a map from context names to context values
 * @param behaviorMethods - an object whose keys are method names and whose values are
 * @param [thisfulMethods=false] - If true, the method is allowed to use `this`.
 * @param [interfaceGuard] - interfaceGuard
 * @returns A Far object.
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
      assert(
        unimplemented.length === 0,
        X`methods ${q(unimplemented)} not implemented by ${q(tag)}`,
      );
      if (!sloppy) {
        const unguarded = listDifference(methodNames, methodGuardNames);
        assert(
          unguarded.length === 0,
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
 * @template A,S,T
 * @param {string} tag
 * @param {any} interfaceGuard
 * @param {(...args: A[]) => S} init
 * @param {T} methods
 * @param {object} [options]
 * @returns {(...args: A[]) => (T & RemotableBrand<{}, T>)}
 */
/**
 * It takes a bunch of
 * arguments and returns a function that creates an object with a prototype
 * that has methods that can access the object's state
 * @param tag - a string that will be used to identify the class in error messages
 * @param interfaceGuard - a predicate that takes an object and returns true if it is an instance of
 * the class.
 * @param init - a function that takes the arguments passed to the constructor and returns the initial
 * state record.
 * @param methods - a record of methods that will be added to the prototype of the class.
 * @param [options] - an optional object with a finish method that is called after the instance is
 * created.
 * @returns A function that takes a list of arguments and returns an object.
 */
export const defineHeapFarClass = (
  tag,
  interfaceGuard,
  init,
  methods,
  options = undefined,
) => {
  /** @type {WeakMap<T,Context<S,T>} */
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
  return harden(makeInstance);
};
harden(defineHeapFarClass);

/**
 * @template A,S,F
 * @param {string} tag
 * @param {any} interfaceGuardKit
 * @param {(...args: A[]) => S} init
 * @param {F} methodsKit
 * @param {object} [options]
 * @returns {(...args: A[]) => F}
 */
/**
 * It takes a tag, a set of
 * interfaces, a constructor, a set of methods, and an optional set of options, and
 * returns a constructor for a class that implements the interfaces and has the
 * methods
 * @param tag - a string that identifies the class
 * @param interfaceGuardKit - A map from facet names to guard functions.
 * @param init - a function that takes the arguments passed to the constructor and returns a state
 * record.
 * @param methodsKit - a map from facet names to maps from method names to method bodies.
 * @param [options] - an optional object with a finish method that will be called with the
 * @returns A function that takes a variable number of arguments and returns an object.
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
  assert(
    extraInterfaceNames.length === 0,
    X`Interfaces ${q(extraInterfaceNames)} not implemented by ${q(tag)}`,
  );
  const extraFacetNames = listDifference(interfaceNames, facetNames);
  assert(
    extraFacetNames.length === 0,
    X`Facets ${q(extraFacetNames)} of ${q(tag)} not guarded by interfaces`,
  );

  const contextMapKit = objectMap(methodsKit, () => new WeakMap());
  const prototypeKit = objectMap(methodsKit, (methods, facetName) =>
    defendPrototype(
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
  return harden(makeInstanceKit);
};
harden(defineHeapFarClassKit);

/**
 * @template T,M
 * @param {string} tag
 * @param {InterfaceGuard|undefined} interfaceGuard
 * @param {M} methods
 * @param {object} [options]
 * @returns {T & RemotableBrand<{}, T>}
 */
/**
 * It takes a tag, an interface guard, a set of methods, and an optional set of options, and returns a
 * function that creates a new heap-allocated instance of the class
 * @param tag - A string that identifies the class.
 * @param interfaceGuard - a function that takes an object and returns true if it is an instance of the
 * class.
 * @param methods - a map of method names to method implementations.
 * @param [options] - optional object
 * @returns A function that returns a new instance of the class.
 */
export const defineHeapFarInstance = (
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
harden(defineHeapFarInstance);
