// @ts-check

import { Far } from '@endo/marshal';
import { assertIsRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { assertKeywordName } from '@agoric/zoe/src/cleanProposal.js';
import { Nat } from '@agoric/nat';
import { makeSubscriptionKit } from '@agoric/notifier';
import { makeStore } from '@agoric/store';
import { E } from '@endo/eventual-send';
import { ParamTypes } from '../constants.js';

import {
  makeLooksLikeBrand,
  makeAssertInstallation,
  makeAssertInstance,
  makeAssertBrandedRatio,
} from './assertions.js';

const { details: X } = assert;

/**
 * @type {(zoe?:ERef<ZoeService>) => ParamManagerBuilder}
 */
const makeParamManagerBuilder = zoe => {
  const namesToParams = makeStore('Parameter Name');
  const { publication, subscription } = makeSubscriptionKit();
  const getters = {};
  const setters = {};

  /**
   * Support for parameters that are copy objects
   *
   * @see buildInvitationParam
   *
   * @param {Keyword} name
   * @param {unknown} value
   * @param {(val) => void} assertion
   * @param {ParamType} type
   */
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

    // eslint-disable-next-line no-use-before-define
    getters[`get${name}`] = () => getTypedParam(type, name);
    // CRUCIAL: here we're creating the update functions that can change the
    // values of the governed contract's parameters. We'll return the updateFns
    // to our caller. They must handle them carefully to ensure that they end up
    // in appropriate hands.
    setters[`update${name}`] = setParamValue;
    namesToParams.init(name, publicMethods);
  };

  // HANDLERS FOR EACH PARAMETER TYPE /////////////////////////////////////////

  /** @type {(name: string, value: Amount, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addAmount = (name, value, builder) => {
    const assertAmount = a => {
      assert(a.brand, `Expected an Amount for ${name}, got "${a}"`);
      return AmountMath.coerce(a.brand, a);
    };
    buildCopyParam(name, value, assertAmount, ParamTypes.Amount);
    return builder;
  };

  /** @type {(name: string, value: Amount, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addBrandedAmount = (name, value, builder) => {
    const assertAmount = a => {
      assert(a.brand, `Expected an Amount for ${name}, got "${a}"`);
      return AmountMath.coerce(value.brand, a);
    };
    buildCopyParam(name, value, assertAmount, ParamTypes.Amount);
    return builder;
  };

  /** @type {(name: string, value: Brand, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addBrand = (name, value, builder) => {
    const assertBrand = makeLooksLikeBrand(name);
    buildCopyParam(name, value, assertBrand, ParamTypes.BRAND);
    return builder;
  };

  /** @type {(name: string, value: Installation<unknown>, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addInstallation = (name, value, builder) => {
    const assertInstallation = makeAssertInstallation(name);
    buildCopyParam(name, value, assertInstallation, ParamTypes.Installation);
    return builder;
  };

  /** @type {(name: string, value: Instance, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addInstance = (name, value, builder) => {
    const assertInstance = makeAssertInstance(name);
    buildCopyParam(name, value, assertInstance, ParamTypes.Instance);
    return builder;
  };

  /** @type {(name: string, value: bigint, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addNat = (name, value, builder) => {
    const assertNat = v => {
      assert.typeof(v, 'bigint');
      Nat(v);
      return true;
    };
    buildCopyParam(name, value, assertNat, ParamTypes.Nat);
    return builder;
  };

  /** @type {(name: string, value: Ratio, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addRatio = (name, value, builder) => {
    buildCopyParam(name, value, assertIsRatio, ParamTypes.Ratio);
    return builder;
  };

  /** @type {(name: string, value: Ratio, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addBrandedRatio = (name, value, builder) => {
    const assertBrandedRatio = makeAssertBrandedRatio(name, value);
    buildCopyParam(name, value, assertBrandedRatio, ParamTypes.Ratio);
    return builder;
  };

  /** @type {(name: string, value: string, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addString = (name, value, builder) => {
    const assertString = v => assert.typeof(v, 'string');
    buildCopyParam(name, value, assertString, ParamTypes.String);
    return builder;
  };

  /** @type {(name: string, value: any, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addUnknown = (name, value, builder) => {
    const assertUnknown = _v => true;
    buildCopyParam(name, value, assertUnknown, ParamTypes.Unknown);
    return builder;
  };

  const assertInvitation = async i => {
    assert(zoe, `zoe must be provided for governed Invitations ${zoe}`);
    const { instance, installation } = await E(zoe).getInvitationDetails(i);
    assert(instance && installation, 'must be an invitation');
  };

  /**
   * Invitations are closely held, so we should publicly reveal only the amount.
   * The approach here makes it possible for contracts to get the actual
   * invitation privately, and legibly assure clients that it matches the
   * publicly visible invitation amount. Contract reviewers still have to
   * manually verify that the actual invitation is handled carefully.
   * `getInternalValue()` will only be accessible within the contract.
   *
   * @param {string} name
   * @param {Invitation} invitation
   */
  const buildInvitationParam = async (name, invitation) => {
    assert(zoe, `zoe must be provided for governed Invitations ${zoe}`);
    let currentInvitation;
    let currentAmount;

    const setInvitation = async i => {
      [currentAmount] = await Promise.all([
        E(E(zoe).getInvitationIssuer()).getAmountOf(i),
        assertInvitation(i),
      ]);

      currentInvitation = i;
      publication.updateState({
        name,
        type: ParamTypes.Invitation,
        value: currentAmount,
      });
      return currentAmount;
    };
    await setInvitation(invitation);

    const makeDescription = () => {
      return { type: ParamTypes.Invitation, value: currentAmount };
    };

    const getVisibleValue = async allegedInvitation =>
      E(E(zoe).getInvitationIssuer()).getAmountOf(allegedInvitation);

    const publicMethods = Far(`Parameter ${name}`, {
      getValue: () => currentAmount,
      getInternalValue: () => currentInvitation,
      assertType: assertInvitation,
      makeDescription,
      getType: () => ParamTypes.Invitation,
      getVisibleValue,
    });

    // eslint-disable-next-line no-use-before-define
    getters[`get${name}`] = () => getTypedParam(ParamTypes.Invitation, name);
    // CRUCIAL: here we're creating the update functions that can change the
    // values of the governed contract's parameters. We'll return the updateFns
    // to our caller. They must handle them carefully to ensure that they end up
    // in appropriate hands.
    setters[`update${name}`] = setInvitation;
    namesToParams.init(name, publicMethods);
    return name;
  };

  /** @type {(name: string, value: Invitation, builder: ParamManagerBuilder) => Promise<ParamManagerBuilder>} */
  const addInvitation = async (name, value, builder) => {
    assertKeywordName(name);
    await Promise.all([
      assertInvitation(value),
      buildInvitationParam(name, value),
    ]);

    return builder;
  };

  // PARAM MANAGER METHODS ////////////////////////////////////////////////////

  const getTypedParam = (type, name) => {
    const param = namesToParams.get(name);
    assert(type === param.getType(), X`${name} is not ${type}`);
    return param.getValue();
  };

  const getVisibleValue = (name, proposed) => {
    const param = namesToParams.get(name);
    return param.getVisibleValue(proposed);
  };

  // should be exposed within contracts, and not externally, for invitations
  const getInternalParamValue = name => {
    return namesToParams.get(name).getInternalValue();
  };

  const getParams = () => {
    /** @type {Record<Keyword,ParamRecord>} */
    const descriptions = {};
    for (const [name, param] of namesToParams.entries()) {
      descriptions[name] = param.makeDescription();
    }
    return harden(descriptions);
  };

  const makeParamManager = () => {
    // CRUCIAL: Contracts that call buildParamManager should only export the
    // resulting paramManager to their creatorFacet, where it will be picked up by
    // contractGovernor. The getParams method can be shared widely.
    return Far('param manager', {
      getParams,
      getSubscription: () => subscription,
      getAmount: name => getTypedParam(ParamTypes.Amount, name),
      getBrand: name => getTypedParam(ParamTypes.BRAND, name),
      getInstance: name => getTypedParam(ParamTypes.Instance, name),
      getInstallation: name => getTypedParam(ParamTypes.Installation, name),
      getInvitationAmount: name => getTypedParam(ParamTypes.Invitation, name),
      getNat: name => getTypedParam(ParamTypes.Nat, name),
      getRatio: name => getTypedParam(ParamTypes.Ratio, name),
      getString: name => getTypedParam(ParamTypes.String, name),
      getUnknown: name => getTypedParam(ParamTypes.Unknown, name),
      getVisibleValue,
      getInternalParamValue,
      // Getters and setters for each param value
      ...getters,
      ...setters,
      // Collection of all getters for passing to read-only contexts
      asGetters: () => getters,
    });
  };

  const builder = {
    addAmount: (n, v) => addAmount(n, v, builder),
    addBrandedAmount: (n, v) => addBrandedAmount(n, v, builder),
    addBrand: (n, v) => addBrand(n, v, builder),
    addInstallation: (n, v) => addInstallation(n, v, builder),
    addInstance: (n, v) => addInstance(n, v, builder),
    addUnknown: (n, v) => addUnknown(n, v, builder),
    addInvitation: (n, v) => addInvitation(n, v, builder),
    addNat: (n, v) => addNat(n, v, builder),
    addRatio: (n, v) => addRatio(n, v, builder),
    addBrandedRatio: (n, v) => addBrandedRatio(n, v, builder),
    addString: (n, v) => addString(n, v, builder),
    build: () => makeParamManager(),
  };
  return builder;
};

harden(makeParamManagerBuilder);

export { makeParamManagerBuilder };
