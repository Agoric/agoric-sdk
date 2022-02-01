// @ts-check

import { Far, mapIterable } from '@endo/marshal';
import { assertIsRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { assertKeywordName } from '@agoric/zoe/src/cleanProposal.js';
import { Nat } from '@agoric/nat';
import { makeSubscriptionKit } from '@agoric/notifier';
import { makeStore } from '@agoric/store';
import { E } from '@agoric/eventual-send';

import {
  makeLooksLikeBrand,
  makeAssertInstallation,
  makeAssertInstance,
  makeAssertBrandedRatio,
} from './assertions.js';

const { details: X } = assert;
/**
 * @type {{
 *  AMOUNT: 'amount',
 *  BRAND: 'brand',
 *  INSTANCE: 'instance',
 *  INSTALLATION: 'installation',
 *  INVITATION: 'invitation',
 *  NAT: 'nat',
 *  RATIO: 'ratio',
 *  STRING: 'string',
 *  UNKNOWN: 'unknown',
 * }}
 *
 * UNKNOWN is an escape hatch for types we haven't added yet. If you are
 * developing a new contract and use UNKNOWN, please also file an issue to ask
 * us to support the new type.
 */
const ParamType = {
  AMOUNT: 'amount',
  BRAND: 'brand',
  INSTANCE: 'instance',
  INSTALLATION: 'installation',
  INVITATION: 'invitation',
  NAT: 'nat',
  RATIO: 'ratio',
  STRING: 'string',
  UNKNOWN: 'unknown',
};

/** @type {(zoe?:ERef<ZoeService>) => ParamManagerBuilder} */
const makeParamManagerBuilder = zoe => {
  const namesToParams = makeStore('Parameter Name');
  const { publication, subscription } = makeSubscriptionKit();
  const updateFns = {};

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
      makeDescription: () => ({ name, type, value: current }),
      makeShortDescription: () => ({ type, value: current }),
      getVisibleValue,
      getType: () => type,
    });

    // CRUCIAL: here we're creating the update functions that can change the
    // values of the governed contract's parameters. We'll return the updateFns
    // to our caller. They must handle them carefully to ensure that they end up
    // in appropriate hands.
    updateFns[`update${name}`] = setParamValue;
    namesToParams.init(name, publicMethods);
  };

  // HANDLERS FOR EACH PARAMETER TYPE /////////////////////////////////////////

  /** @type {(name: string, amount: Amount, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addAmount = (name, amount, builder) => {
    const assertAmount = a => {
      assert(a.brand, `Expected an Amount for ${name}, got "${a}"`);
      return AmountMath.coerce(a.brand, a);
    };
    buildCopyParam(name, amount, assertAmount, ParamType.AMOUNT);
    return builder;
  };

  /** @type {(name: string, amount: Amount, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addBrandedAmount = (name, amount, builder) => {
    const assertAmount = a => {
      assert(a.brand, `Expected an Amount for ${name}, got "${a}"`);
      return AmountMath.coerce(amount.brand, a);
    };
    buildCopyParam(name, amount, assertAmount, ParamType.AMOUNT);
    return builder;
  };

  /** @type {(name: string, value: Brand, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addBrand = (name, value, builder) => {
    const assertBrand = makeLooksLikeBrand(name);
    buildCopyParam(name, value, assertBrand, ParamType.BRAND);
    return builder;
  };

  /** @type {(name: string, value: Installation, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addInstallation = (name, value, builder) => {
    const assertInstallation = makeAssertInstallation(name);
    buildCopyParam(name, value, assertInstallation, ParamType.INSTALLATION);
    return builder;
  };

  /** @type {(name: string, value: Instance, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addInstance = (name, value, builder) => {
    const assertInstance = makeAssertInstance(name);
    buildCopyParam(name, value, assertInstance, ParamType.INSTANCE);
    return builder;
  };

  /** @type {(name: string, value: bigint, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addNat = (name, value, builder) => {
    const assertNat = v => {
      assert.typeof(v, 'bigint');
      Nat(v);
      return true;
    };
    buildCopyParam(name, value, assertNat, ParamType.NAT);
    return builder;
  };

  /** @type {(name: string, value: Ratio, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addRatio = (name, value, builder) => {
    buildCopyParam(name, value, assertIsRatio, ParamType.RATIO);
    return builder;
  };

  /** @type {(name: string, value: Ratio, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addBrandedRatio = (name, value, builder) => {
    const assertBrandedRatio = makeAssertBrandedRatio(name, value);
    buildCopyParam(name, value, assertBrandedRatio, ParamType.RATIO);
    return builder;
  };

  /** @type {(name: string, value: string, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addString = (name, value, builder) => {
    const assertString = v => assert.typeof(v, 'string');
    buildCopyParam(name, value, assertString, ParamType.STRING);
    return builder;
  };

  /** @type {(name: string, value: any, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addUnknown = (name, value, builder) => {
    const assertUnknown = _v => true;
    buildCopyParam(name, value, assertUnknown, ParamType.UNKNOWN);
    return builder;
  };

  const assertInvitation = async i => {
    assert(zoe, `zoe must be provided for governed Invitations ${zoe}`);
    const { instance, installation } = await E(zoe).getInvitationDetails(i);
    assert(instance && installation, 'must be an invitation');
  };

  // Invitations are closely held, so we should only reveal the amount publicly.
  // getInternalValue() will only be accessible within the contract.
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
        type: ParamType.INVITATION,
        value: currentAmount,
      });
      return currentAmount;
    };
    await setInvitation(invitation);

    const makeDescription = () => {
      return ({ name, type: ParamType.INVITATION, value: currentAmount });
    };
    const makeShortDescription = () => {
      return ({ type: ParamType.INVITATION, value: currentAmount });
    };

    const getVisibleValue = async allegedInvitation =>
      E(E(zoe).getInvitationIssuer()).getAmountOf(allegedInvitation);

    const publicMethods = Far(`Parameter ${name}`, {
      getValue: () => currentAmount,
      getInternalValue: () => currentInvitation,
      assertType: assertInvitation,
      makeDescription,
      makeShortDescription,
      getType: () => ParamType.INVITATION,
      getVisibleValue,
    });

    // CRUCIAL: here we're creating the update functions that can change the
    // values of the governed contract's parameters. We'll return the updateFns
    // to our caller. They must handle them carefully to ensure that they end up
    // in appropriate hands.
    updateFns[`update${name}`] = setInvitation;
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

  const getParam = name => {
    return namesToParams.get(name).makeDescription();
  };

  const getTypedParam = (type, name) => {
    const param = namesToParams.get(name);
    assert(type === param.getType(), X`${name} is not ${type}`);
    return param.getValue();
  };

  const getVisibleValue = (name, proposed) => {
    const param = namesToParams.get(name);
    return param.getVisibleValue(proposed);
  };

  const getParamList = () =>
    harden(mapIterable(namesToParams.keys(), k => getParam(k)));

  // should be exposed within contracts, and not externally, for invitations
  const getInternalParamValue = name => {
    return namesToParams.get(name).getInternalValue();
  };

  const getParams = () => {
    /** @type {Record<Keyword,ParamDescription>} */
    const descriptions = {};
    for (const [name, param] of namesToParams.entries()) {
      descriptions[name] = param.makeShortDescription();
    }
    return harden(descriptions);
  };

  // XXX some type safety but you don't know what keys are valid
  // TODO replace with explicit keys that map to value types
  const makeParamManager = updateFunctions => {
    // CRUCIAL: Contracts that call buildParamManager should only export the
    // resulting paramManager to their creatorFacet, where it will be picked up by
    // contractGovernor. The getParams method can be shared widely.
    return Far('param manager', {
      getParams,
      getSubscription: () => subscription,
      getAmount: name => getTypedParam(ParamType.AMOUNT, name),
      getBrand: name => getTypedParam(ParamType.BRAND, name),
      getInstance: name => getTypedParam(ParamType.INSTANCE, name),
      getInstallation: name => getTypedParam(ParamType.INSTALLATION, name),
      getInvitationAmount: name => getTypedParam(ParamType.INVITATION, name),
      getNat: name => getTypedParam(ParamType.NAT, name),
      getRatio: name => getTypedParam(ParamType.RATIO, name),
      getString: name => getTypedParam(ParamType.STRING, name),
      getUnknown: name => getTypedParam(ParamType.UNKNOWN, name),
      getVisibleValue,
      getParamList,
      getInternalParamValue,
      ...updateFunctions,
    });
  };

  /** @type {ParamManagerBuilder} */
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
    build: () => makeParamManager(updateFns),
  };
  return builder;
};

harden(makeParamManagerBuilder);
harden(ParamType);

export { ParamType, makeParamManagerBuilder };
