/* global globalThis */
import * as c from './constants';

let replaceGlobalMeter;

// When using this function's text in a SES1 (pre-0.8) shim, we redefine this
// constant to be Error.
const SES1ErrorConstructor = null;

export function isTamed() {
  if (replaceGlobalMeter) {
    return true;
  }
  return false;
}

export function tameMetering() {
  if (replaceGlobalMeter) {
    // Already installed.
    return replaceGlobalMeter;
  }

  // These are properties that we cannot define.
  const DEFINE_PROPERTY_FAILURES_ALLOWLIST = [
    '#.Function.prototype.Symbol(Symbol.hasInstance)',
    '#.globalThis.URL.prototype.Symbol(format)',
  ];

  // These are paths that are already frozen.
  const FROZEN_PATHS_ALLOWLIST = ['#.globalThis.console._times.__proto__'];

  const {
    defineProperty,
    entries,
    getOwnPropertyDescriptor,
    getOwnPropertyDescriptors,
    getPrototypeOf,
    setPrototypeOf,
  } = Object;
  const { apply, construct, get } = Reflect;
  const { get: wmGet, set: wmSet } = WeakMap.prototype;

  const ObjectConstructor = Object;
  const ProxyConstructor = Proxy;

  const FunctionPrototype = Function.prototype;

  let globalMeter = null;
  const definePropertyFailures = new Set(DEFINE_PROPERTY_FAILURES_ALLOWLIST);
  const frozenPaths = new Set(FROZEN_PATHS_ALLOWLIST);
  const wrapped = new WeakMap();
  const setWrapped = (...args) => apply(wmSet, wrapped, args);
  const getWrapped = (...args) => apply(wmGet, wrapped, args);

  // eslint-disable-next-line no-new-func
  const globalEval = Function('return eval')();

  // How to test for a constructor: https://stackoverflow.com/a/48036194
  const isConstructorHandler = {
    construct() {
      // Hack to return an object without allocating a fresh one.
      return isConstructorHandler;
    },
  };
  const isConstructor = x => {
    try {
      const TestProxy = new ProxyConstructor(x, isConstructorHandler);
      return !!new TestProxy();
    } catch (e) {
      return false;
    }
  };

  const wrapDescriptor = (desc, pname = undefined) => {
    const newDesc = {};
    for (const [k, v] of entries(desc)) {
      const path = pname && (k === 'value' ? pname : `${pname}.${k}`);
      // eslint-disable-next-line no-use-before-define
      newDesc[k] = wrap(v, path);
    }
    return newDesc;
  };

  function wrap(target, pname = undefined, constructor = undefined) {
    if (ObjectConstructor(target) !== target) {
      return target;
    }

    let wrapper = getWrapped(target);
    if (wrapper) {
      return wrapper;
    }

    let targetIsConstructor = false;

    // Without this ErrorConstructor hack, SES pre-0.8 fails with:
    // TypeError: prototype function Error() { [native code] } of
    //   unknown.global.EvalError is not already in the fringeSet
    // This is due to an ordering constraint between when SES-pre-0.8
    // captures the intrinsics versus when it runs the shims.
    //
    // SES 0.8 and later do not have this constraint, since the
    // vetted shims are installed before SES is even imported.
    //
    // Not wrapping the Error constructor doesn't cause much of an
    // exposure, although it can be used to hold onto large
    // strings without counting towards the allocation meter.
    // That's not a problem we're trying to solve yet.
    //
    // Passing through globalEval's identity is alright, too, since
    // only SES uses it directly, and wraps it with a rewriting
    // version for user code.
    if (
      typeof target !== 'function' ||
      target === FunctionPrototype ||
      target === SES1ErrorConstructor ||
      target === globalEval
    ) {
      // Preserve identity and mutate in place.
      wrapper = target;
    } else if (isConstructor(target)) {
      // The wrapper needs construct behaviour.
      targetIsConstructor = true;
      wrapper = function meteredConstructor(...args) {
        if (!globalMeter) {
          // Fast path.
          const newTarget = new.target;
          if (newTarget) {
            return construct(target, args, newTarget);
          }
          return apply(target, this, args);
        }
        // We're careful not to use the replaceGlobalMeter function as
        // it may consume some stack.
        // Instead, directly manipulate the globalMeter variable.
        const savedMeter = globalMeter;
        let ret;
        try {
          // This is a common idiom to disable global metering so
          // that the savedMeter can use builtins without
          // recursively calling itself.

          // Track the consumption of a computron.
          globalMeter = null;
          savedMeter[c.METER_COMPUTE](undefined, false);

          // Reinstall the saved meter for the actual function invocation.
          globalMeter = savedMeter;
          const newTarget = new.target;
          if (!newTarget) {
            ret = apply(target, this, args);
          } else {
            ret = construct(target, args, newTarget);
          }

          // Track the allocation of the return value.
          globalMeter = null;
          savedMeter[c.METER_ALLOCATE](ret, false);
          return ret;
        } catch (e) {
          // Track the allocation of the exception value.
          globalMeter = null;
          savedMeter[c.METER_ALLOCATE](e, false);
          throw e;
        } finally {
          // Restore the saved meter.
          globalMeter = savedMeter;
        }
      };
      if (!getOwnPropertyDescriptor(target, 'prototype')) {
        // Remove the .prototype by binding the function.
        wrapper = wrapper.bind();
      }
      defineProperty(wrapper, 'name', { value: target.name });
    } else {
      // The function wrapper must not have construct behaviour.
      // Defining it as a concise method ensures the correct
      // behaviour (type function, sensitive to `this`, but no `.prototype`).
      const { name = '' } = target;
      ({ [name]: wrapper } = {
        [name](...args) {
          // Fast path:
          if (!globalMeter) {
            return apply(target, this, args);
          }
          // We're careful not to use the replaceGlobalMeter function as
          // it may consume some stack.
          // Instead, directly manipulate the globalMeter variable.
          const savedMeter = globalMeter;
          let ret;
          try {
            // This is a common idiom to disable global metering so
            // that the savedMeter can use builtins without
            // recursively calling itself.

            // Track the consumption of a computron.
            globalMeter = null;
            savedMeter[c.METER_COMPUTE](undefined, false);

            // Reinstall the saved meter for the actual function invocation.
            globalMeter = savedMeter;
            ret = apply(target, this, args);

            // Track the allocation of the return value.
            globalMeter = null;
            savedMeter[c.METER_ALLOCATE](ret, false);
            return ret;
          } catch (e) {
            // Track the allocation of the exception value.
            globalMeter = null;
            savedMeter[c.METER_ALLOCATE](e, false);
            throw e;
          } finally {
            // Restore the saved meter.
            globalMeter = savedMeter;
          }
        },
      });
    }

    // We have a wrapper identity, so prevent recursion by installing it now.
    setWrapped(target, wrapper);
    setWrapped(wrapper, wrapper);

    if (targetIsConstructor) {
      const proto = get(target, 'prototype');
      if (proto) {
        // Replace the constructor.
        const wproto = wrap(proto, pname && `${pname}.prototype`, wrapper);
        if (proto !== wproto) {
          throw Error(`prototype wrapping didn't preserve identity ${pname}`);
        }
      }
    }

    setPrototypeOf(
      wrapper,
      wrap(getPrototypeOf(target), pname && `${pname}.__proto__`),
    );

    const assignToWrapper = (p, desc) => {
      let newDesc;
      if (constructor && p === 'constructor') {
        newDesc = {
          value: constructor,
          writable: true,
          enumerable: false,
          configurable: true,
        };
      } else {
        newDesc = wrapDescriptor(desc, pname && `${pname}.${String(p)}`);
      }

      if (Object.isFrozen(wrapper)) {
        if (!frozenPaths.has(pname)) {
          frozenPaths.add(pname);
          // This is an intentional use of console.log, not a debugging vestige.
          console.log(`Cannot meter frozen ${pname}`);
        }
        return;
      }

      try {
        defineProperty(wrapper, p, newDesc);
      } catch (e) {
        // Ignore: TypeError: Cannot redefine property: ...
        const path = pname ? `${pname}.${String(p)}` : '*unknown*';
        if (!definePropertyFailures.has(path)) {
          definePropertyFailures.add(path);
          // This is an intentional use of console.log, not a debugging vestige.
          console.log(`Cannot meter defined ${path}`);
        }
      }
    };

    // Assign the wrapped descriptors to the target.
    const tdescs = getOwnPropertyDescriptors(target);
    Object.getOwnPropertyNames(tdescs).forEach(p =>
      assignToWrapper(p, tdescs[p]),
    );
    Object.getOwnPropertySymbols(tdescs).forEach(p =>
      assignToWrapper(p, tdescs[p]),
    );

    return wrapper;
  }

  // Override the globals and anonymous intrinsics with wrappers.
  const wrapRoot = {
    Function,
    async AsyncFunction() {
      await Promise.resolve(123);
      return 456;
    },
    *GeneratorFunction() {
      yield 123;
    },
    async *AsyncGeneratorFunction() {
      yield 123;
    },
    globalThis,
  };

  // Clear out the prototype of the wrapRoot so that we iterate only
  // on the explicit properties.
  Object.setPrototypeOf(wrapRoot, null);
  wrap(wrapRoot, '#');

  // Provide a way to set the meter.
  replaceGlobalMeter = m => {
    const oldMeter = globalMeter;
    if (m !== undefined) {
      globalMeter = m;
    }
    /* if (oldMeter === null) {
      console.log('returning', oldMeter, Error('here'));
    } */
    return oldMeter;
  };
  return replaceGlobalMeter;
}
