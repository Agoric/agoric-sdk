import { Fail, q } from '@endo/errors';
import { Far, passStyleOf } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp';
import { assertKeywordName } from '@agoric/zoe/src/cleanProposal.js';
import { Nat } from '@endo/nat';
import { keyEQ, makeScalarMapStore } from '@agoric/store';
import { E } from '@endo/eventual-send';
import { assertAllDefined } from '@agoric/internal';
import { ParamTypes } from '../constants.js';

import {
  assertTimestamp,
  assertRelativeTime,
  makeAssertBrandedRatio,
  makeAssertInstallation,
  makeAssertInstance,
  makeLooksLikeBrand,
} from './assertions.js';
import { CONTRACT_ELECTORATE } from './governParam.js';

/**
 * @import {MapStore} from '@agoric/swingset-liveslots';
 * @import {AnyParamManager, GovernanceSubscriptionState, ParamManagerBase, ParamStateRecord, ParamValueTyped, UpdateParams} from '../types.js';
 */

/**
 * @param {ParamManagerBase} paramManager
 * @param {{[CONTRACT_ELECTORATE]: ParamValueTyped<'invitation'>}} governedParams
 */
const assertElectorateMatches = (paramManager, governedParams) => {
  const managerElectorate =
    paramManager.getInvitationAmount(CONTRACT_ELECTORATE);
  const {
    [CONTRACT_ELECTORATE]: { value: paramElectorate },
  } = governedParams;
  paramElectorate ||
    Fail`Missing ${q(CONTRACT_ELECTORATE)} term in ${q(governedParams)}`;
  keyEQ(managerElectorate, paramElectorate) ||
    Fail`Electorate in manager (${managerElectorate})} incompatible with terms (${paramElectorate}`;
};

/**
 * @typedef {object} ParamManagerBuilder
 * @property {(name: string, value: Amount) => ParamManagerBuilder} addAmount
 * @property {(name: string, value: Brand) => ParamManagerBuilder} addBrand
 * @property {(name: string, value: Installation) => ParamManagerBuilder} addInstallation
 * @property {(name: string, value: Instance) => ParamManagerBuilder} addInstance
 * @property {(name: string, value: Invitation) => ParamManagerBuilder} addInvitation
 * @property {(name: string, value: bigint) => ParamManagerBuilder} addNat
 * @property {(name: string, value: Ratio) => ParamManagerBuilder} addRatio
 * @property {(name: string, value: import('@endo/marshal').CopyRecord<any>) => ParamManagerBuilder} addRecord
 * @property {(name: string, value: string) => ParamManagerBuilder} addString
 * @property {(name: string, value: import('@agoric/time').Timestamp) => ParamManagerBuilder} addTimestamp
 * @property {(name: string, value: import('@agoric/time').RelativeTime) => ParamManagerBuilder} addRelativeTime
 * @property {(name: string, value: any) => ParamManagerBuilder} addUnknown
 * @property {() => AnyParamManager} build
 */

/**
 * @param {import('@agoric/notifier').StoredPublisherKit<GovernanceSubscriptionState>} publisherKit
 * @param {ERef<ZoeService>} [zoe]
 */
const makeParamManagerBuilder = (publisherKit, zoe) => {
  /** @type {MapStore<Keyword, any>} */
  const namesToParams = makeScalarMapStore('Parameter Name');
  const { publisher, subscriber } = publisherKit;
  assertAllDefined({ publisher, subscriber });

  const getters = {};
  const setters = {};
  const unfinishedParams = [];

  // XXX let params be finished async. A concession to upgradability
  // UNTIL https://github.com/Agoric/agoric-sdk/issues/4343
  const finishBuilding = async () => {
    await Promise.all(unfinishedParams);
    unfinishedParams.length = 0;
  };

  const publish = () => {
    /** @type {ParamStateRecord} */
    const current = Object.fromEntries(
      [...namesToParams.entries()].map(([k, v]) => [k, v.makeDescription()]),
    );
    publisher.updateState({ current });
  };

  /**
   * Support for parameters that are copy objects
   *
   * @see buildInvitationParam
   *
   * @param {Keyword} name
   * @param {unknown} value
   * @param {(val) => void} assertion
   * @param {import('../constants.js').ParamType} type
   */
  const buildCopyParam = (name, value, assertion, type) => {
    let current;
    assertKeywordName(name);
    value !== undefined || Fail`param ${q(name)} must be defined`;

    const setParamValue = newValue => {
      assertion(newValue);
      current = newValue;
      return harden({ [name]: newValue });
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

    // names are keywords so they will necessarily be TitleCase
    getters[`get${name}`] = () => getTypedParam(type, name);
    // CRUCIAL: here we're creating the update functions that can change the
    // values of the governed contract's parameters. We'll return the updateFns
    // to our caller. They must handle them carefully to ensure that they end up
    // in appropriate hands.
    setters[`update${name}`] = setParamValue;
    setters[`prepareToUpdate${name}`] = proposedValue => proposedValue;
    namesToParams.init(name, publicMethods);
  };

  // HANDLERS FOR EACH PARAMETER TYPE /////////////////////////////////////////

  /** @type {(name: string, value: Amount, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addAmount = (name, value, builder) => {
    const assertAmount = a => {
      a.brand || Fail`Expected an Amount for ${q(name)}, got: ${a}`;
      return AmountMath.coerce(value.brand, a);
    };
    buildCopyParam(name, value, assertAmount, ParamTypes.AMOUNT);
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
    buildCopyParam(name, value, assertInstallation, ParamTypes.INSTALLATION);
    return builder;
  };

  /** @type {(name: string, value: Instance, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addInstance = (name, value, builder) => {
    const assertInstance = makeAssertInstance(name);
    buildCopyParam(name, value, assertInstance, ParamTypes.INSTANCE);
    return builder;
  };

  /** @type {(name: string, value: bigint, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addNat = (name, value, builder) => {
    const assertNat = v => {
      assert.typeof(v, 'bigint');
      Nat(v);
      return true;
    };
    buildCopyParam(name, value, assertNat, ParamTypes.NAT);
    return builder;
  };

  /** @type {(name: string, value: Ratio, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addRatio = (name, value, builder) => {
    const assertBrandedRatio = makeAssertBrandedRatio(name, value);
    buildCopyParam(name, value, assertBrandedRatio, ParamTypes.RATIO);
    return builder;
  };

  /** @type {(name: string, value: import('@endo/marshal').CopyRecord, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addRecord = (name, value, builder) => {
    const assertRecord = v => {
      passStyleOf(v);
      assert.typeof(v, 'object');
    };
    buildCopyParam(name, value, assertRecord, ParamTypes.PASSABLE_RECORD);
    return builder;
  };

  /** @type {(name: string, value: string, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addString = (name, value, builder) => {
    const assertString = v => assert.typeof(v, 'string');
    buildCopyParam(name, value, assertString, ParamTypes.STRING);
    return builder;
  };

  /** @type {(name: string, value: import('@agoric/time').Timestamp, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addTimestamp = (name, value, builder) => {
    buildCopyParam(name, value, assertTimestamp, ParamTypes.TIMESTAMP);
    return builder;
  };

  /** @type {(name: string, value: import('@agoric/time').RelativeTime, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addRelativeTime = (name, value, builder) => {
    buildCopyParam(name, value, assertRelativeTime, ParamTypes.RELATIVE_TIME);
    return builder;
  };

  /** @type {(name: string, value: any, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addUnknown = (name, value, builder) => {
    const assertUnknown = _v => true;
    buildCopyParam(name, value, assertUnknown, ParamTypes.UNKNOWN);
    return builder;
  };

  const assertInvitation = async i => {
    if (!zoe) {
      throw Fail`zoe must be provided for governed Invitations ${zoe}`;
    }

    // local check on isLive() gives better report than .getInvitationDetails()
    const isLive = await E(E(zoe).getInvitationIssuer()).isLive(i);
    isLive || Fail`Invitation passed to paramManager is not live ${i}`;
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
  const buildInvitationParam = (name, invitation) => {
    if (!zoe) {
      throw Fail`zoe must be provided for governed Invitations ${zoe}`;
    }
    let currentInvitation;
    let currentAmount;

    /**
     * @typedef {[Invitation, Amount]} SetInvitationParam
     */

    /**
     * Async phase to prepare for synchronous setting
     *
     * @param {Invitation} invite
     * @returns {Promise<SetInvitationParam>}
     */
    const prepareToSetInvitation = async invite => {
      const [preparedAmount] = await Promise.all([
        E(E(zoe).getInvitationIssuer()).getAmountOf(invite),
        assertInvitation(invite),
      ]);

      return [invite, preparedAmount];
    };

    /**
     * Synchronous phase of value setting
     *
     * @param {SetInvitationParam} param0
     */
    const setInvitation = ([newInvitation, amount]) => {
      currentAmount = amount;
      currentInvitation = newInvitation;
      return harden({ [name]: currentAmount });
    };

    const makeDescription = () => {
      return { type: ParamTypes.INVITATION, value: currentAmount };
    };

    const getVisibleValue = async allegedInvitation =>
      E(E(zoe).getInvitationIssuer()).getAmountOf(allegedInvitation);

    const publicMethods = Far(`Parameter ${name}`, {
      getValue: () => currentAmount,
      getInternalValue: () => currentInvitation,
      assertType: assertInvitation,
      makeDescription,
      getType: () => ParamTypes.INVITATION,
      getVisibleValue,
    });

    getters[`get${name}`] = () => getTypedParam(ParamTypes.INVITATION, name);
    // CRUCIAL: here we're creating the update functions that can change the
    // values of the governed contract's parameters. We'll return updateParams
    // (which can invoke all of them) to our caller. They must handle it
    // carefully to ensure that they end up in appropriate hands.
    setters[`prepareToUpdate${name}`] = prepareToSetInvitation;
    setters[`update${name}`] = setInvitation;

    // XXX let the value be set async. A concession to upgradability
    // UNTIL https://github.com/Agoric/agoric-sdk/issues/4343
    const finishInvitationParam = E.when(
      prepareToSetInvitation(invitation),
      invitationAndAmount => {
        setInvitation(invitationAndAmount);
        // delay until currentAmount is defined because readers expect a valid value
        namesToParams.init(name, publicMethods);
      },
    );
    unfinishedParams.push(finishInvitationParam);

    return name;
  };

  /** @type {(name: string, value: Invitation, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addInvitation = (name, value, builder) => {
    assertKeywordName(name);
    value !== null || Fail`param ${q(name)} must be defined`;

    buildInvitationParam(name, value);

    return builder;
  };

  // PARAM MANAGER METHODS ////////////////////////////////////////////////////

  const getTypedParam = (type, name) => {
    const param = namesToParams.get(name);
    type === param.getType() || Fail`${name} is not ${type}`;
    return param.getValue();
  };

  const getVisibleValue = (name, proposed) => {
    const param = namesToParams.get(name);
    return param.getVisibleValue(proposed);
  };

  // should be exposed within contracts, and not externally, for invitations
  /** @type {(name: string) => Promise<Invitation>} */
  const getInternalParamValue = async name => {
    await finishBuilding();
    return namesToParams.get(name).getInternalValue();
  };

  const getParams = async () => {
    await finishBuilding();
    /** @type {ParamStateRecord} */
    const descriptions = {};
    for (const [name, param] of namesToParams.entries()) {
      descriptions[name] = param.makeDescription();
    }
    return harden(descriptions);
  };

  /** @type {UpdateParams} */
  const updateParams = async paramChanges => {
    await finishBuilding();
    const paramNames = Object.keys(paramChanges);

    // promises to prepare every update
    const asyncResults = paramNames.map(name =>
      setters[`prepareToUpdate${name}`](paramChanges[name]),
    );
    // if any update doesn't succeed, fail the request
    const prepared = await Promise.all(asyncResults);

    // actually update
    for (const [i, name] of paramNames.entries()) {
      const setFn = setters[`update${name}`];
      setFn(prepared[i]);
    }
    publish();
  };

  // Called after all params have been added with their initial values
  const build = () => {
    // XXX let params be finished async. A concession to upgradability
    // UNTIL https://github.com/Agoric/agoric-sdk/issues/4343
    void E.when(finishBuilding(), () => publish());

    // CRUCIAL: Contracts that call buildParamManager should only export the
    // resulting paramManager to their creatorFacet, where it will be picked up by
    // contractGovernor. The getParams method can be shared widely.
    return Far('param manager', {
      getParams,
      getSubscription: () => subscriber,
      getAmount: name => getTypedParam(ParamTypes.AMOUNT, name),
      getBrand: name => getTypedParam(ParamTypes.BRAND, name),
      getInstance: name => getTypedParam(ParamTypes.INSTANCE, name),
      getInstallation: name => getTypedParam(ParamTypes.INSTALLATION, name),
      getInvitationAmount: name => getTypedParam(ParamTypes.INVITATION, name),
      getNat: name => getTypedParam(ParamTypes.NAT, name),
      getRatio: name => getTypedParam(ParamTypes.RATIO, name),
      getRecord: name => getTypedParam(ParamTypes.PASSABLE_RECORD, name),
      getString: name => getTypedParam(ParamTypes.STRING, name),
      getTimestamp: name => getTypedParam(ParamTypes.TIMESTAMP, name),
      getRelativeTime: name => getTypedParam(ParamTypes.RELATIVE_TIME, name),
      getUnknown: name => getTypedParam(ParamTypes.UNKNOWN, name),
      getVisibleValue,
      getInternalParamValue,
      // Getters and setters for each param value
      ...getters,
      updateParams,
      // Collection of all getters for passing to read-only contexts
      readonly: () => harden(getters),
    });
  };

  /** @type {ParamManagerBuilder} */
  const builder = {
    addAmount: (n, v) => addAmount(n, v, builder),
    addBrand: (n, v) => addBrand(n, v, builder),
    addInstallation: (n, v) => addInstallation(n, v, builder),
    addInstance: (n, v) => addInstance(n, v, builder),
    addUnknown: (n, v) => addUnknown(n, v, builder),
    addInvitation: (n, v) => addInvitation(n, v, builder),
    addNat: (n, v) => addNat(n, v, builder),
    addRatio: (n, v) => addRatio(n, v, builder),
    addRecord: (n, v) => addRecord(n, v, builder),
    addString: (n, v) => addString(n, v, builder),
    addRelativeTime: (n, v) => addRelativeTime(n, v, builder),
    addTimestamp: (n, v) => addTimestamp(n, v, builder),
    build,
  };
  return builder;
};

harden(assertElectorateMatches);
harden(makeParamManagerBuilder);

export { assertElectorateMatches, makeParamManagerBuilder };
