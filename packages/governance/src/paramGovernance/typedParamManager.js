// @ts-check

import { Far } from '@endo/marshal';
import { assertIsRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { assertKeywordName } from '@agoric/zoe/src/cleanProposal.js';
import { Nat } from '@agoric/nat';
import { makeSubscriptionKit } from '@agoric/notifier';
import { makeStore } from '@agoric/store';

import {
  makeLooksLikeBrand,
  makeAssertInstallation,
  makeAssertInstance,
} from './assertions.js';
import { ParamType } from './paramManager.js';

const { details: X } = assert;

/**
 * @template {Record<Keyword, ParamDescription>} T
 * @typedef {{
 *   [Property in keyof T as `get${string & Property}`]: () => T[Property]['value']
 * }} Getters
 */

/**
 * @template {Record<Keyword, ParamDescription>} T
 * @typedef {{
 *   [Property in keyof T as `update${string & Property}`]: (value: any) => void
 * }} Updaters
 */

/**
 * @template {Record<Keyword, ParamDescription>} T
 * @param {T} spec
 * @param {ERef<ZoeService>} [zoe]
 */
const makeParamManager = (spec, zoe) => {
  const namesToParams = makeStore('Parameter Name');
  const { publication, subscription } = makeSubscriptionKit();
  /** @type {Getters<spec>} */
  // @ts-expect-error these get defined below
  const getters = {};
  /** @type {Updaters<spec>} */
  // @ts-expect-error these get defined below
  const updaters = {};

  // support for parameters that are copy objects
  const buildCopyParam = (name, value, assertion, type) => {
    let current;
    assertKeywordName(name);

    const setParamValue = newValue => {
      assertion(newValue);
      current = newValue;
      publication.updateState({ name, type, value: current });
      return newValue;
    };
    setParamValue(value);

    const getVisibleValue = proposed => {
      assertion(proposed);
      return proposed;
    };

    const publicMethods = Far(`Parameter ${name}`, {
      getValue: () => current,
      assertType: assertion,
      makeDescription: () => ({ type, value: current }),
      getVisibleValue,
      getType: () => type,
    });

    // @ts-expect-error checker doesn't know that 'name' is a keyof T
    getters[`get${name}`] = () => current;
    // CRUCIAL: here we're creating the update functions that can change the
    // values of the governed contract's parameters. We'll return the updateFns
    // to our caller. They must handle them carefully to ensure that they end up
    // in appropriate hands.
    // @ts-expect-error checker doesn't know that 'name' is a keyof T
    updaters[`update${name}`] = setParamValue;
    namesToParams.init(name, publicMethods);
  };

  /**
   * Handlers for each parameter type
   *
   * @type {Record<ParamType, (Keyword, any) => void>}
   */
  const adders = {
    amount: (name, value) => {
      const assertAmount = a => {
        assert(a.brand, `Expected an Amount for ${name}, got "${a}"`);
        return AmountMath.coerce(value.brand, a);
      };
      buildCopyParam(name, value, assertAmount, ParamType.AMOUNT);
    },

    brand: (name, value) => {
      const assertBrand = makeLooksLikeBrand(name);
      buildCopyParam(name, value, assertBrand, ParamType.BRAND);
    },

    installation: (name, value) => {
      const assertInstallation = makeAssertInstallation(name);
      buildCopyParam(name, value, assertInstallation, ParamType.INSTALLATION);
    },

    instance: (name, value) => {
      const assertInstance = makeAssertInstance(name);
      buildCopyParam(name, value, assertInstance, ParamType.INSTANCE);
    },

    invitation: (name, value) => {
      throw Error('Not yet implemented');
    },

    nat: (name, value) => {
      const assertNat = v => {
        assert.typeof(v, 'bigint');
        Nat(v);
        return true;
      };
      buildCopyParam(name, value, assertNat, ParamType.NAT);
    },

    ratio: (name, value) => {
      buildCopyParam(name, value, assertIsRatio, ParamType.RATIO);
    },

    relativeTime: (name, value) => {
      throw Error('Not yet implemented');
    },

    string: (name, value) => {
      const assertString = v => assert.typeof(v, 'string');
      buildCopyParam(name, value, assertString, ParamType.STRING);
    },

    unknown: (name, value) => {
      const assertUnknown = _v => true;
      buildCopyParam(name, value, assertUnknown, ParamType.UNKNOWN);
    },
  };

  const getVisibleValue = (name, proposed) =>
    namesToParams.get(name).getVisibleValue(proposed);

  /**
   * Should be exposed within contracts, and not externally, for invitations
   *
   * @param {keyof typeof spec} name
   */
  const getInternalParamValue = name =>
    namesToParams.get(name).getInternalValue();

  const getParams = () => {
    /** @type {Record<Keyword,ParamDescription>} */
    const descriptions = {};
    for (const [name, param] of namesToParams.entries()) {
      descriptions[name] = param.makeDescription();
    }
    return harden(descriptions);
  };

  for (const [name, desc] of Object.entries(spec)) {
    const { type, value } = desc;
    const add = adders[type];
    add(name, value);
  }
  return Far('param manager', {
    getParams,
    getSubscription: () => subscription,
    getVisibleValue,
    getInternalParamValue,
    ...getters,
    ...updaters,
  });
};

harden(makeParamManager);
export { makeParamManager };
