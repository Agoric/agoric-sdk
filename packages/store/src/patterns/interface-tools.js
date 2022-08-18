import { Far } from '@endo/marshal';
import { E } from '@endo/eventual-send';
import { fit } from './patternMatchers.js';
import { listDifference } from '../utils.js';

const { details: X, quote: q } = assert;
const { apply, ownKeys } = Reflect;
const { defineProperties } = Object;

const defendSyncArgs = (args, methodGuard, label) => {
  const { argGuards, optionalArgGuards, restArgGuard } = methodGuard;
  if (args.length < argGuards.length) {
    assert.fail(
      X`${label} args: ${args} - expected ${argGuards.length} arguments`,
    );
  }
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const argLabel = `${label} args[${i}]`;
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

function bindMethod(
  methodTag,
  contextMap,
  behaviorMethod,
  thisfulMethods = false,
  methodGuard = undefined,
) {
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
  // to mention `this`. We define it using concise menthod syntax
  // so that it will be `this` sensitive but not constructable.
  //
  // We normally consider `this` unsafe because of the hazard of a
  // method of one abstraction being applied to an instance of
  // another abstraction. To prevent that attack, the bound method
  // checks that it's `this` is in the map in which its representatives
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
}

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
      `${tag}.${String(prop)}`,
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
