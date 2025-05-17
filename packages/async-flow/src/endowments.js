import { Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { isPromise } from '@endo/promise-kit';
import {
  isRemotable,
  isPassable,
  GET_METHOD_NAMES,
  Far,
} from '@endo/pass-style';
import { M, objectMap } from '@endo/patterns';
import { prepareVowTools, toPassableCap } from '@agoric/vow';
import { isVow } from '@agoric/vow/src/vow-utils.js';
import { isUpgradeDisconnection } from '@agoric/internal/src/upgrade-api.js';
import { PropertyKeyShape } from './type-guards.js';

/**
 * @import {RemotableObject} from '@endo/pass-style'
 * @import {Zone} from '@agoric/base-zone'
 * @import {Callable} from '@agoric/internal'
 * @import {PreparationOptions} from '../src/types.js'
 */

/**
 * @typedef {'promise' | 'storable' | 'far' | 'function' | 'array' | 'record' | 'state'} EndowmentKind
 */

const {
  getOwnPropertyDescriptor,
  getOwnPropertyDescriptors,
  create,
  fromEntries,
  entries,
  prototype: objectPrototype,
} = Object;
const { ownKeys } = Reflect;

const FunctionWrapperI = M.interface('FunctionWrapper', {
  apply: M.call(M.array()).returns(M.any()),
});

const StateAccessorI = M.interface('StateAccessor', {
  get: M.call(PropertyKeyShape).returns(M.any()),
  set: M.call(PropertyKeyShape, M.any()).returns(),
});

const UnwrapperI = M.interface('Unwrapper', {
  unwrap: M.call(M.remotable('guestWrapped')).returns(M.raw()),
});

export const forwardingMethods = rem => {
  const keys = rem[GET_METHOD_NAMES]();
  const makeMethodEntry = key =>
    entries({
      [key](...args) {
        return rem[key](...args);
      },
    })[0];
  return fromEntries(keys.map(makeMethodEntry));
};

/**
 * @param {Zone} outerZone
 * @param {PreparationOptions} [outerOptions]
 */
export const prepareEndowmentTools = (outerZone, outerOptions = {}) => {
  const { vowTools = prepareVowTools(outerZone) } = outerOptions;
  const { makeVowKit } = vowTools;

  const functionUnwrapper = outerZone.exo('FunctionUnwrapper', UnwrapperI, {
    unwrap(guestWrapped) {
      return Far('UnwrappedFunction', (...args) => guestWrapped.apply(args));
    },
  });

  const makeStateUnwrapper = outerZone.exoClass(
    'StateUnwrapper',
    UnwrapperI,
    keys => ({ keys }),
    {
      unwrap(guestWrapped) {
        const { state } = this;
        const { keys } = state;
        return harden(
          create(
            objectPrototype,
            fromEntries(
              keys.flatMap(key =>
                entries(
                  getOwnPropertyDescriptors({
                    get [key]() {
                      return guestWrapped.get(key);
                    },
                    set [key](newValue) {
                      guestWrapped.set(key, newValue);
                    },
                  }),
                ),
              ),
            ),
          ),
        );
      },
    },
  );

  /**
   * Endowment taxonomy. Expected to grow over time.
   * Defined within `prepareEndowmentTools` because isStorable depends on zone.
   *
   * @param {unknown} e
   * @returns {EndowmentKind}
   */
  const endowmentKindOf = e => {
    harden(e);
    if (isPromise(e)) {
      return 'promise';
    } else if (outerZone.isStorable(e)) {
      return 'storable';
    } else if (isPassable(e) && isRemotable(e)) {
      return 'far';
    } else if (typeof e === 'function') {
      return 'function';
    } else if (typeof e === 'object') {
      if (e === null) {
        throw Fail`internal: null is always storable`;
      }
      if (Array.isArray(e)) {
        return 'array';
      }
      const keys = ownKeys(e);
      keys.length >= 1 || Fail`empty record should be storable ${e}`;
      const desc = /** @type {PropertyDescriptor} */ (
        getOwnPropertyDescriptor(e, keys[0])
      );
      if ('value' in desc) {
        return 'record';
      } else {
        'get' in desc || Fail`internal: unexpected descriptor ${desc}`;
        return 'state';
      }
    } else {
      throw Fail`unexpected endowment ${e}`;
    }
  };
  harden(endowmentKindOf);

  const unwrapMap = outerZone.weakMapStore('unwrapMap', {
    keyShape: M.remotable('wrapped'),
    valueShape: M.remotable('unwrapper'),
  });

  const unwrapMapHas = k => {
    if (isVow(k) || isRemotable(k)) {
      return unwrapMap.has(toPassableCap(k));
    } else {
      return false;
    }
  };
  const unwrapMapGet = k => unwrapMap.get(toPassableCap(k));
  const unwrapMapSet = (k, v) => {
    const k2 = toPassableCap(k);
    if (unwrapMapHas(k)) {
      unwrapMap.set(k2, v);
    } else {
      unwrapMap.init(k2, v);
    }
  };

  /**
   * @param {Zone} zone
   * @param {string} tag
   * @param {unknown} e
   */
  const prepareEndowment = (zone, tag, e) => {
    const eKind = endowmentKindOf(e);
    switch (eKind) {
      case 'promise': {
        const p = /** @type {Promise} */ (e);
        // Not using watch or watchPromise because upgrade rejection
        // should leave it to be resolved by the next promise endowment
        const { vow, resolver } = makeVowKit();
        void E.when(
          p,
          v => {
            resolver.resolve(v);
          },
          reason => {
            if (!isUpgradeDisconnection(reason)) {
              resolver.reject(reason);
            }
          },
        );
        return vow;
      }
      case 'storable': {
        return e;
      }
      case 'far': {
        const r = /** @type {RemotableObject} */ (e);
        const methods = forwardingMethods(r);
        return zone.exo(
          tag,
          M.interface('FarWrapped', {}, { defaultGuards: 'raw' }),
          methods,
        );
      }
      case 'function': {
        const f = /** @type {Callable} */ (e);
        const wrapped = zone.exo(tag, FunctionWrapperI, {
          apply(args) {
            return f(...args);
          },
        });
        unwrapMapSet(wrapped, functionUnwrapper);
        return wrapped;
      }
      case 'array': {
        const a = /** @type {unknown[]} */ (e);
        const subZone = zone.subZone(tag);
        return a.map((subE, i) => prepareEndowment(subZone, `${i}`, subE));
      }
      case 'record': {
        const r = /** @type {Record<PropertyKey, unknown>} */ (e);
        const subZone = zone.subZone(tag);
        return objectMap(r, (subE, k) =>
          prepareEndowment(subZone, String(k), subE),
        );
      }
      case 'state': {
        const state = /** @type {Record<PropertyKey, unknown>} */ (e);
        const keys = harden(ownKeys(state));
        const wrapped = zone.exo(tag, StateAccessorI, {
          get(key) {
            return state[key];
          },
          set(key, newValue) {
            state[key] = newValue;
          },
        });
        const stateUnwrapper = makeStateUnwrapper(keys);
        // Need to replace the instance because the keys may be different
        unwrapMapSet(wrapped, stateUnwrapper);
        return wrapped;
      }
      default: {
        throw Fail`unexpected endowment ${e}`;
      }
    }
  };

  const unwrap = (wrapped, guestWrapped) => {
    if (unwrapMapHas(wrapped)) {
      const unwrapper = unwrapMapGet(wrapped);
      return unwrapper.unwrap(guestWrapped);
    } else {
      return guestWrapped;
    }
  };

  return harden({ prepareEndowment, unwrap });
};
harden(prepareEndowmentTools);

/**
 * @typedef {ReturnType<prepareEndowmentTools>} EndowmentTools
 */
