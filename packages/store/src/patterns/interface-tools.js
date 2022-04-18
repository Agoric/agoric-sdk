import { Far } from '@endo/marshal';
import { E } from '@endo/eventual-send';
import { M, fit } from './patternMatchers.js';
import { listDifference, objectMap } from '../utils.js';

const { details: X, quote: q } = assert;
const { apply, ownKeys } = Reflect;
const { fromEntries, entries, create, defineProperties, seal, freeze } = Object;

const makeMethodGuardMaker = (callKind, argGuards) =>
  harden({
    returns: (returnGuard = M.undefined()) =>
      harden({
        klass: 'methodGuard',
        callKind,
        argGuards,
        returnGuard,
      }),
  });

const makeAwaitArgGuard = argGuard =>
  harden({
    klass: 'awaitArg',
    argGuard,
  });

const isAwaitArgGuard = argGuard =>
  argGuard && typeof argGuard === 'object' && argGuard.klass === 'awaitArg';

export const I = harden({
  interface: (interfaceName, methodGuards) => {
    for (const [_, methodGuard] of entries(methodGuards)) {
      assert(
        methodGuard.klass === 'methodGuard',
        X`unrecognize method guard ${methodGuard}`,
      );
    }
    return harden({
      klass: 'Interface',
      interfaceName,
      methodGuards,
    });
  },
  call: (...argGuards) => makeMethodGuardMaker('sync', argGuards),
  callWhen: (...argGuards) => makeMethodGuardMaker('async', argGuards),
  apply: argGuards => makeMethodGuardMaker('sync', argGuards),
  applyWhen: argGuards => makeMethodGuardMaker('async', argGuards),

  await: argGuard => makeAwaitArgGuard(argGuard),
});

const mimicMethodNameLength = (defensiveMethod, rawMethod) => {
  defineProperties(defensiveMethod, {
    name: { value: rawMethod.name },
    length: { value: rawMethod.length },
  });
};

const defendSyncMethod = (rawMethod, contextMap, methodGuard, label) => {
  const { argGuards, returnGuard } = methodGuard;

  const { defensiveSyncMethod } = {
    // Note purposeful use of `this` and concise method syntax
    defensiveSyncMethod(...args) {
      assert(
        contextMap.has(this),
        X`method can only be used on its own instances: ${q(label)}`,
      );
      const context = contextMap.get(this);
      fit(harden(args), argGuards, `${label}: args`);
      const result = apply(rawMethod, context, args);
      fit(result, returnGuard, `${label}: result`);
      return result;
    },
  };
  mimicMethodNameLength(defensiveSyncMethod, rawMethod);
  return harden(defensiveSyncMethod);
};

const defendAsyncMethod = (rawMethod, contextMap, methodGuard, label) => {
  const { argGuards, returnGuard } = methodGuard;

  const rawArgGuards = [];
  const awaitIndexes = [];
  for (let i = 0; i < argGuards.length; i += 1) {
    const argGuard = argGuards[i];
    if (isAwaitArgGuard(argGuard)) {
      rawArgGuards.push(argGuard.argGuard);
      awaitIndexes.push(i);
    } else {
      rawArgGuards.push(argGuard);
    }
  }
  harden(rawArgGuards);
  harden(awaitIndexes);
  const { defensiveAsyncMethod } = {
    // Note purposeful use of `this` and concise method syntax
    defensiveAsyncMethod(...args) {
      assert(
        contextMap.has(this),
        X`method can only be used on its own instances: ${q(label)}`,
      );
      const context = contextMap.get(this);
      const awaitList = awaitIndexes.map(i => args[i]);
      const p = Promise.all(awaitList);
      const rawArgs = [...args];
      const resultP = E.when(p, awaitedArgs => {
        for (let j = 0; j < awaitIndexes.length; j += 1) {
          rawArgs[awaitIndexes[j]] = awaitedArgs[j];
        }
        fit(harden(rawArgs), rawArgGuards, `${label}: args`);
        return apply(rawMethod, context, rawArgs);
      });
      return E.when(resultP, result => {
        fit(result, returnGuard, `${label}: result`);
        return result;
      });
    },
  };
  mimicMethodNameLength(defensiveAsyncMethod, rawMethod);
  return harden(defensiveAsyncMethod);
};

const defendMethod = (rawMethod, contextMap, methodGuard, label) => {
  const { klass, callKind } = methodGuard;
  assert(klass === 'methodGuard');

  if (callKind === 'sync') {
    return defendSyncMethod(rawMethod, contextMap, methodGuard, label);
  } else {
    assert(callKind === 'async');
    return defendAsyncMethod(rawMethod, contextMap, methodGuard, label);
  }
};

const defendPrototype = (
  className,
  rawPrototype,
  contextMap,
  interfaceGuard,
) => {
  const { klass, interfaceName, methodGuards } = interfaceGuard;
  assert(klass === 'Interface');
  assert.typeof(interfaceName, 'string');

  const methodNames = ownKeys(rawPrototype).filter(
    // Drop the constructor. Do not defend it. `defendClass` will make
    // a defensive constructor by other means.
    mName => mName !== 'constructor',
  );
  {
    const methodGuardNames = ownKeys(methodGuards);
    const unimplemented = listDifference(methodGuardNames, methodNames);
    assert(
      unimplemented.length === 0,
      X`methods ${q(unimplemented)} not implemented by ${q(className)}`,
    );
    const unguarded = listDifference(methodNames, methodGuardNames);
    assert(
      unguarded.length === 0,
      X`methods ${q(unguarded)} not guarded by ${q(interfaceName)}`,
    );
  }

  // Return the defensivePrototype, which can be used as a shared
  // prototype and shared by instances, avoiding the per-object-per-method
  // allocation cost of the objects as closure pattern. That's why we
  // use `this` above. To make it safe, each defensive method starts with
  // a fail-fast brand check on `this`, ensuring that the methods can only be
  // applied to legitimate instances.
  const defensivePrototype = fromEntries(
    methodNames.map(mName => [
      mName,
      defendMethod(
        rawPrototype[mName],
        contextMap,
        methodGuards[mName],
        `${className}.${mName}`,
      ),
    ]),
  );
  return Far(className, defensivePrototype);
};

export const defendClass = (interfaceGuard, init, RawClass) => {
  // To avoid hardening `state`, cannot be a WeakMapStore
  const contextMap = new WeakMap();
  const { name: className } = RawClass;
  assert.typeof(className, 'string');
  assert(interfaceGuard.klass === 'Interface');
  const defensivePrototype = defendPrototype(
    className,
    RawClass.prototype,
    contextMap,
    interfaceGuard,
  );

  // Don't freeze state
  const makeRepresentative = state => {
    const context = { state };
    const self = harden(create(defensivePrototype));
    context.self = self;
    freeze(context);
    contextMap.set(self, context);
    // if (finish) {
    //   finish(context);
    // }
    return self;
  };

  const makeInstance = (...args) => {
    // Don't freeze state
    const state = seal(init(...args));
    return makeRepresentative(state);
  };

  defineProperties(makeInstance, {
    name: { value: className },
    length: { value: init.length },
  });
  return harden(makeInstance);
};
harden(defendClass);

/// //////////////////////// Multi /////////////////////////

export const defendClassKit = (interfaceGuardKit, init, rawClassKit) => {
  const contextMapKit = objectMap(
    interfaceGuardKit,
    () =>
      // To avoid hardening `state`, cannot be a WeakMapStore
      new WeakMap(),
  );
  harden(interfaceGuardKit);
  harden(init);
  harden(rawClassKit);
  const facetNames = ownKeys(interfaceGuardKit);
  {
    const classFacetNames = ownKeys(rawClassKit);
    assert(
      listDifference(facetNames, classFacetNames).length === 0,
      X`facets missing from class kit: ${classFacetNames}`,
    );
    assert(
      listDifference(classFacetNames, facetNames).length === 0,
      X`extra facets on class kit: ${classFacetNames}`,
    );
    const mapFacetNames = ownKeys(contextMapKit);
    assert(
      listDifference(facetNames, mapFacetNames).length === 0,
      X`facets missing from map kit: ${mapFacetNames}`,
    );
    assert(
      listDifference(mapFacetNames, facetNames).length === 0,
      X`extra facets on map kit: ${mapFacetNames}`,
    );
  }
  const defensivePrototypeKit = objectMap(
    rawClassKit,
    (RawClass, facetName) => {
      const interfaceGuard = interfaceGuardKit[facetName];
      const { name: className } = RawClass;
      assert.typeof(className, 'string');
      assert(interfaceGuard.klass === 'Interface');
      return defendPrototype(
        className,
        RawClass.prototype,
        contextMapKit[facetName],
        interfaceGuard,
      );
    },
  );

  // Don't freeze state
  const makeRepresentativeKit = state => {
    const context = { state };
    const facets = objectMap(
      defensivePrototypeKit,
      (defensivePrototype, facetName) => {
        const facet = harden(create(defensivePrototype));
        contextMapKit[facetName].init(facet, context);
        return facet;
      },
    );
    context.facets = facets;
    freeze(context);
    // if (finish) {
    //   finish(context);
    // }
    return facets;
  };

  const makeInstanceKit = (...args) => {
    // Don't freeze state
    const state = seal(init(...args));
    return makeRepresentativeKit(state);
  };
  defineProperties(makeInstanceKit, {
    // name: { value: tag },
    length: { value: init.length },
  });
  return harden(makeInstanceKit);
};
harden(defendClassKit);
