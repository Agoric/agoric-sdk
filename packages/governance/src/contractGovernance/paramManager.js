/* eslint @typescript-eslint/no-floating-promises: "warn" */
import { AmountShape, AmountValueShape, BrandShape } from '@agoric/ertp';
import {
  InstallationShape,
  InstanceHandleShape,
  KeywordShape,
} from '@agoric/zoe/src/typeGuards.js';
import { assertKeywordName } from '@agoric/zoe/src/cleanProposal.js';
import { keyEQ, M, mustMatch } from '@agoric/store';
import { E } from '@endo/eventual-send';
import { assertAllDefined } from '@agoric/internal';
import { prepareExoClass, makeScalarBigMapStore } from '@agoric/vat-data';
import { RelativeTimeShape, TimestampShape } from '@agoric/time';
import { ToFarFunction } from '@endo/captp';
import { PublicTopicShape } from '@agoric/zoe/src/contractSupport/index.js';
import { makeBrandedRatioPattern } from '@agoric/zoe/src/contractSupport/ratio.js';

import { ParamTypes } from '../constants.js';
import { CONTRACT_ELECTORATE } from './governParam.js';
import { InvitationShape } from '../typeGuards.js';

const { Fail, quote: q } = assert;

/**
 * @file
 * The terminology here is that a ParamHolder holds the value of a particular
 * parameter, while a ParamManager manages a collection of parameters.
 */

/**
 * @typedef {Record<Keyword, ParamType>} ParamTypesMap
 */
/**
 * @template {ParamStateRecord} M
 * @typedef {{ [R in keyof M]: M[R]['type']}} ParamTypesMapFromRecord
 */
/**
 * @template {ParamTypesMap} M
 * @typedef {{ [T in keyof M]: { type: M[T], value: ParamValueForType<M[T]> } }} ParamRecordsFromTypes
 */

/**
 * @template {ParamTypesMap} M
 * @typedef {{
 *   [K in keyof M as `get${string & K}`]: () => ParamValueForType<M[K]>
 * }} Getters
 */

/**
 * @template {ParamTypesMap} T
 * @typedef {{
 *   [K in keyof T as `update${string & K}`]: (value: ParamValueForType<T[K]>) => void
 * }} Updaters
 */

/**
 * @template {ParamTypesMap} M
 * @typedef {ParamManagerBase & {updateParams: UpdateParams}} ParamManager
 */

/**
 * @param {ParamType} type
 */
const builderMethodName = type =>
  `add${type[0].toUpperCase() + type.substring(1)}`;

/** @type {Partial<Record<ParamType, boolean>>} */
const isAsync = {
  invitation: true,
};

/**
 * @template {ParamType} T
 * @typedef {[type: T, value: ParamValueForType<T>]} ST param spec tuple
 */

/**
 * @typedef {{ type: 'invitation', value: Amount<'set'> }} InvitationParam
 */

// XXX better to use the manifest constant ParamTypes
// but importing that here turns this file into a module,
// breaking the ambient typing
/**
 * @typedef {ST<'amount'>
 * | ST<'brand'>
 * | ST<'installation'>
 * | ST<'instance'>
 * | ST<'nat'>
 * | ST<'ratio'>
 * | ST<'string'>
 * | ST<'timestamp'>
 * | ST<'relativeTime'>
 * | ST<'unknown'>} SyncSpecTuple
 *
 * @typedef {['invitation', Invitation]} AsyncSpecTuple
 */

export const buildParamGovernanceExoMakers = (zoe, baggage) => {
  const ParamHolderCommon = {
    getValue: M.call().returns(M.any()),
    makeDescription: M.call().returns({ type: M.string(), value: M.any() }),
    getVisibleValue: M.call(M.any()).returns(M.any()),
    prepareToUpdate: M.call(M.any()).returns(M.any()),
    update: M.call(M.any()).returns(M.recordOf(KeywordShape, M.any())),
    getGetterElement: M.call().returns([M.string(), M.any()]),
    getFarGetterElement: M.call().returns([M.string(), M.any(), M.pattern()]),
  };

  const CopyParamHolderI = M.interface('CopyParamHolder', ParamHolderCommon);

  const makeCopyParamHolder = prepareExoClass(
    baggage,
    'CopyParamHolder',
    CopyParamHolderI,
    (name, current, type, pattern) => {
      return { current, type, name, pattern };
    },
    {
      makeDescription() {
        const { state } = this;
        return {
          type: state.type,
          value: state.current,
        };
      },
      getValue() {
        return this.state.current;
      },
      getVisibleValue(proposed) {
        const {
          state: { name, pattern },
        } = this;
        mustMatch(
          proposed,
          pattern,
          `Proposed value ${proposed} for ${name} must match ${pattern}`,
        );
        return proposed;
      },
      prepareToUpdate(proposed) {
        return proposed;
      },
      update(proposed) {
        const { state } = this;
        mustMatch(
          proposed,
          state.pattern,
          `${state.name} must match ${state.pattern}, was ${proposed}`,
        );
        state.current = proposed;
        return harden({ [state.name]: proposed });
      },
      getGetterElement() {
        const { state } = this;
        // names are keywords so they will necessarily be TitleCase
        const name = `get${state.name}`;
        const getter = () => state.current;
        return [name, getter];
      },
      getFarGetterElement() {
        const { state } = this;
        // names are keywords so they will necessarily be TitleCase
        const name = `get${state.name}`;
        const getter = ToFarFunction(name, () => state.current);
        const guard = M.call().returns(state.pattern);
        return [name, getter, guard];
      },
    },
    {
      stateShape: {
        name: KeywordShape,
        current: M.any(),
        // XXX how to say it must be one of ParamTypes?
        type: M.string(),
        pattern: M.pattern(),
      },
    },
  );

  const assertInvitation = async i => {
    if (!zoe) {
      throw Fail`zoe must be provided for governed Invitations`;
    }
    const { instance, installation } = await E(zoe).getInvitationDetails(i);
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error -- the build config doesn't expect an error here
    // @ts-ignore typedefs say they're guaranteed truthy but just to be safe
    assert(instance && installation, 'must be an invitation');
  };

  const InvitationParamHolderI = M.interface('InvitationParamHolder', {
    ...ParamHolderCommon,
    getValue: M.call().returns(InvitationShape),
  });

  const makeInvitationParamHolder = prepareExoClass(
    baggage,
    'InvitationParamHolder',
    InvitationParamHolderI,
    (name, current, amount) => {
      return { name, current, amount };
    },
    {
      makeDescription() {
        const { state } = this;
        return {
          type: ParamTypes.INVITATION,
          value: state.amount,
        };
      },
      async prepareToUpdate(invite) {
        const { state } = this;
        const [preparedAmount] = await Promise.all([
          E(E(zoe).getInvitationIssuer()).getAmountOf(invite),
        ]);
        assertInvitation(invite);

        state.amount = preparedAmount;
        return [invite, preparedAmount];
      },
      update(inviteAndAmount) {
        const [invite, amount] = inviteAndAmount;
        this.state.amount = amount;
        this.state.current = invite;
        return harden({ [this.state.name]: amount });
      },

      getValue() {
        return this.state.current;
      },
      /**
       * Called when preparing to change value to validate the new value.
       *
       * @param {any} proposed
       */
      getVisibleValue(proposed) {
        const {
          state: { name, amount },
        } = this;
        mustMatch(
          proposed,
          InvitationShape,
          `Proposed value ${proposed} for ${name} must match InvitationShape`,
        );

        return amount;
      },
      getGetterElement() {
        const { state } = this;

        // names are keywords so they will necessarily be TitleCase
        // return { [`get${state.name}`]: () => state.current };
        const name = `get${state.name}`;
        const fn = () => state.amount;
        return [name, fn];
      },
      getFarGetterElement() {
        const { state } = this;

        // names are keywords so they will necessarily be TitleCase
        // return { [`get${state.name}`]: () => state.current };
        const name = `get${state.name}`;
        const fn = ToFarFunction(name, () => state.amount);
        const guard = M.call().returns(AmountShape);
        return [name, fn, guard];
      },
    },
    {
      stateShape: {
        name: KeywordShape,
        current: M.or(M.undefined(), M.eref(InvitationShape)),
        // XXX is there a tighter declaration for InvitationAmountShape?
        amount: M.or(AmountShape, M.undefined()),
      },
    },
  );

  const GovernedParamManagerI = M.interface('GovernedParamManager', {
    getInternalParamValue: M.call(M.string()).returns(M.any()),
    getters: M.call().returns(M.recordOf(M.string(), M.any())),
    getterFunctions: M.call().returns(M.recordOf(M.string(), M.any())),
    accessors: M.call().returns({
      behavior: M.recordOf(M.string(), M.any()),
      guards: M.recordOf(M.string(), M.pattern()),
    }),
    getPublicTopics: M.call()
      .optional(BrandShape)
      .returns({ governance: PublicTopicShape }),
    updateParams: M.call(M.any()).returns(M.promise()),
    getParamDescriptions: M.call().returns(
      M.recordOf(M.string(), { type: M.string(), value: M.any() }),
    ),
    getGovernedParams: M.call().returns(
      M.recordOf(M.string(), { type: M.string(), value: M.any() }),
    ),
    getVisibleValue: M.call().returns(M.any()),
    publish: M.call().returns(),
  });

  const makeParamManagerExo = prepareExoClass(
    baggage,
    'Param manager',
    GovernedParamManagerI,
    (namesToParams, recorderKit) => {
      const { subscriber, recorder } = recorderKit;
      return {
        namesToParams,
        subscriber,
        recorder,
      };
    },
    {
      // arguably should be a separate facet, but this object must be held
      // tightly because of updateParams, and publish() is much less sensitive.
      publish() {
        const { state } = this;
        /** @type {ParamStateRecord} */
        const current = Object.fromEntries(
          [...state.namesToParams.entries()].map(([k, paramHolder]) => [
            k,
            paramHolder.makeDescription(),
          ]),
        );
        state.recorder.write({ current });
      },
      getParamDescriptions() {
        const { state } = this;

        /** @type {ParamStateRecord} */
        const descriptions = {};
        for (const [name, paramHolder] of state.namesToParams.entries()) {
          descriptions[name] = paramHolder.makeDescription();
        }

        return harden(descriptions);
      },
      getGovernedParams() {
        const { self } = this;
        return self.getParamDescriptions();
      },
      getInternalParamValue(name) {
        const { state } = this;
        return state.namesToParams.get(name).getValue();
      },
      getterFunctions() {
        const { state } = this;
        const behavior = {};
        for (const holder of state.namesToParams.values()) {
          const [name, fn] = holder.getGetterElement();
          behavior[name] = fn;
        }

        return harden(behavior);
      },
      getPublicTopics() {
        // deconstructed from makeRecorderTopic()
        return harden({
          governance: {
            description: 'parameters',
            subscriber: this.state.subscriber,
            storagePath: this.state.recorder.getStoragePath(),
          },
        });
      },
      accessors() {
        const { state } = this;
        /** @type {Record<string, Function>} */
        const behavior = {};
        /** @type {Record<string, Pattern>} */
        const guards = {};
        for (const holder of state.namesToParams.values()) {
          const [name, fn, clause] = holder.getFarGetterElement();
          behavior[name] = fn;
          guards[name] = clause;
        }

        return harden({ behavior, guards });
      },
      getters() {
        const { state } = this;
        const behavior = {};
        for (const holder of state.namesToParams.values()) {
          const [name, fn] = holder.getFarGetterElement();
          behavior[name] = fn;
        }

        return behavior;
      },
      async updateParams(paramChanges) {
        const { self, state } = this;
        const paramNames = Object.keys(paramChanges);

        // promises to prepare every update
        const asyncResults = paramNames.map(name => {
          const paramHolder = state.namesToParams.get(name);
          return paramHolder.prepareToUpdate(paramChanges[name]);
        });

        // if any update doesn't succeed, fail the request
        const prepared = await Promise.all(asyncResults);

        // actually update
        for (const [i, name] of paramNames.entries()) {
          const paramHolder = state.namesToParams.get(name);
          paramHolder.update(prepared[i]);
        }
        self.publish();
      },
      getVisibleValue(name, proposed) {
        const { state } = this;
        const paramHolder = state.namesToParams.get(name);
        return paramHolder.getVisibleValue(proposed);
      },
    },
    {
      finish: async ({ self }) => {
        self.publish();
      },
    },
  );

  return {
    makeCopyParamHolder,
    makeInvitationParamHolder,
    makeParamManagerExo,
  };
};
harden(buildParamGovernanceExoMakers);

/** @typedef {ReturnType<buildParamGovernanceExoMakers>} ParamGovernanceExoMakers */

/**
 * @param {ParamManager<*>} paramManager
 * @param {{[CONTRACT_ELECTORATE]: ParamValueTyped<'invitation'>}} governedParams
 */
export const assertElectorateMatches = async (paramManager, governedParams) => {
  const { behavior } = await paramManager.accessors();
  const managerElectorate = behavior.getElectorate();
  const {
    Electorate: { value: paramElectorate },
  } = governedParams;
  paramElectorate || Fail`Missing Electorate term in ${q(governedParams)}`;
  keyEQ(managerElectorate, paramElectorate) ||
    Fail`Electorate in manager (${managerElectorate})} incompatible with terms (${paramElectorate}`;
};
harden(assertElectorateMatches);

/**
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<any>} recorderKit
 * @param {ParamGovernanceExoMakers} makers
 * @param {ERef<ZoeService>} [zoe]
 */
export const makeParamManagerBuilder = (baggage, recorderKit, makers, zoe) => {
  /** @type {MapStore<Keyword, any>} */
  const namesToHolders = makeScalarBigMapStore('Parameter Holders', {
    durable: true,
  });
  assertAllDefined(recorderKit);

  // We want all the addType() functions to be sync, so we have to delay
  // construction of the paramManager until we get the invitation amounts.
  const unfinishedParams = [];

  /**
   * Support for parameters that are copy objects
   *
   * @see buildInvitationParam
   *
   * @param {Keyword} name
   * @param {unknown} value
   * @param {import('@endo/patterns').Pattern} pattern
   * @param {ParamType} type
   */
  const buildCopyParam = (name, value, pattern, type) => {
    assertKeywordName(name);
    value !== undefined || Fail`param ${q(name)} must be defined`;

    const holder = makers.makeCopyParamHolder(name, value, type, pattern);
    namesToHolders.init(name, holder);
  };

  // HANDLERS FOR EACH PARAMETER TYPE /////////////////////////////////////////

  /** @type {(name: string, value: Amount, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addAmount = (name, value, builder) => {
    const brandedAmountShape = harden({
      brand: value.brand,
      value: AmountValueShape,
    });
    buildCopyParam(name, value, brandedAmountShape, ParamTypes.AMOUNT);
    return builder;
  };

  /** @type {(name: string, value: Brand, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addBrand = (name, value, builder) => {
    buildCopyParam(name, value, BrandShape, ParamTypes.BRAND);
    return builder;
  };

  /** @type {(name: string, value: Installation<unknown>, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addInstallation = (name, value, builder) => {
    buildCopyParam(name, value, InstallationShape, ParamTypes.INSTALLATION);
    return builder;
  };

  /** @type {(name: string, value: Instance, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addInstance = (name, value, builder) => {
    buildCopyParam(name, value, InstanceHandleShape, ParamTypes.INSTANCE);
    return builder;
  };

  /** @type {(name: string, value: bigint, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addNat = (name, value, builder) => {
    buildCopyParam(name, value, M.nat(), ParamTypes.NAT);
    return builder;
  };

  /** @type {(name: string, value: Ratio, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addRatio = (name, value, builder) => {
    const shape = makeBrandedRatioPattern(value);
    buildCopyParam(name, value, shape, ParamTypes.RATIO);
    return builder;
  };

  /** @type {(name: string, value: import('@endo/marshal').CopyRecord<unknown>, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addRecord = (name, value, builder) => {
    buildCopyParam(name, value, M.record(), ParamTypes.PASSABLE_RECORD);
    return builder;
  };

  /** @type {(name: string, value: string, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addString = (name, value, builder) => {
    buildCopyParam(name, value, M.string(), ParamTypes.STRING);
    return builder;
  };

  /** @type {(name: string, value: import('@agoric/time/src/types').Timestamp, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addTimestamp = (name, value, builder) => {
    buildCopyParam(name, value, TimestampShape, ParamTypes.TIMESTAMP);
    return builder;
  };

  /** @type {(name: string, value: import('@agoric/time/src/types').RelativeTime, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addRelativeTime = (name, value, builder) => {
    buildCopyParam(name, value, RelativeTimeShape, ParamTypes.RELATIVE_TIME);
    return builder;
  };

  /** @type {(name: string, value: any, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addUnknown = (name, value, builder) => {
    buildCopyParam(name, value, M.any(), ParamTypes.UNKNOWN);
    return builder;
  };

  /**
   * Invitations are closely held, so we should publicly reveal only the amount.
   * The approach here makes it possible for contracts to get the actual
   * invitation privately, and legibly assure clients that it matches the
   * publicly visible invitation amount. Contract reviewers still have to
   * manually verify that the actual invitation is handled carefully.
   * `getValue()` will only be accessible within the contract.
   *
   * @param {string} name
   * @param {Invitation} invitation
   * @param {ERef<Amount>} amountP
   */
  const buildInvitationParam = (name, invitation, amountP) => {
    if (!zoe) {
      throw Fail`zoe must be provided for governed Invitations ${zoe}`;
    }

    void E.when(amountP, amount => {
      const holder = makers.makeInvitationParamHolder(name, invitation, amount);
      namesToHolders.init(name, holder);
      return name;
    });
  };

  /** @type {(name: string, value: Invitation, builder: ParamManagerBuilder) => ParamManagerBuilder} */
  const addInvitation = (name, value, builder) => {
    assertKeywordName(name);
    value !== null || Fail`param ${q(name)} must be defined`;

    if (!zoe) {
      throw Fail`zoe must be provided for governed Invitations ${zoe}`;
    }
    const amountP = E(E(zoe).getInvitationIssuer()).getAmountOf(value);
    unfinishedParams.push(amountP);

    buildInvitationParam(name, value, amountP);

    return builder;
  };

  // Called after all params have been added with their initial values
  const build = async () => {
    await Promise.all(unfinishedParams);

    // CRUCIAL: Contracts should only export the paramManager to a
    // contractGovernor, which should not expose updateParams().
    return makers.makeParamManagerExo(namesToHolders, recorderKit);
  };

  const buildSync = () => {
    unfinishedParams.length === 0 ||
      Fail`Cannot call buildSync when some parameters are async`;

    // CRUCIAL: Contracts should only export the paramManager to a
    // contractGovernor, which should not expose updateParams().
    return makers.makeParamManagerExo(namesToHolders, recorderKit);
  };

  /** @type {ParamManagerBuilder} */
  const builder = harden({
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
    buildSync,
  });
  return builder;
};
harden(makeParamManagerBuilder);

/**
 * @typedef {object} ParamManagerBuilder
 * @property {(name: string, value: Amount) => ParamManagerBuilder} addAmount
 * @property {(name: string, value: Brand) => ParamManagerBuilder} addBrand
 * @property {(name: string, value: Installation) => ParamManagerBuilder} addInstallation
 * @property {(name: string, value: Instance) => ParamManagerBuilder} addInstance
 * @property {(name: string, value: Invitation) => ParamManagerBuilder} addInvitation
 * @property {(name: string, value: bigint) => ParamManagerBuilder} addNat
 * @property {(name: string, value: Ratio) => ParamManagerBuilder} addRatio
 * @property {(name: string, value: import('@endo/marshal').CopyRecord<unknown>) => ParamManagerBuilder} addRecord
 * @property {(name: string, value: string) => ParamManagerBuilder} addString
 * @property {(name: string, value: import('@agoric/time').Timestamp) => ParamManagerBuilder} addTimestamp
 * @property {(name: string, value: import('@agoric/time').RelativeTime) => ParamManagerBuilder} addRelativeTime
 * @property {(name: string, value: any) => ParamManagerBuilder} addUnknown
 * @property {() => Promise<AnyParamManager>} build
 * @property {() => AnyParamManager} buildSync
 */

/**
 * Most clients should use the contractHelper's handleParamGovernance(). That
 * calls makeParamManagerFromTerms(), which uses this makeParamManger() to make
 * a single paramManager (PM) for the contract. When the contract needs multiple
 * PMs (e.g. one per collateral type as the VaultFactory does), then the
 * contract should use makeParamManager for the top-level PM, and any others
 * that have async needs. The rest can use makeParamManagerSync.
 *
 * @see makeParamManagerSync
 * @template {Record<Keyword, AsyncSpecTuple | SyncSpecTuple>} T
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<any>} recorderKit
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {T} spec
 * @param {ZCF} zcf
 * @param {ParamGovernanceExoMakers} makers
 * @returns {Promise<ParamManager<{[K in keyof T]: T[K][0]}>>}
 */
export const makeParamManager = (recorderKit, baggage, spec, zcf, makers) => {
  const builder = makeParamManagerBuilder(
    baggage,
    recorderKit,
    makers,
    zcf.getZoeService(),
  );

  const promises = [];
  for (const [name, [type, value]] of Object.entries(spec)) {
    const add = builder[builderMethodName(type)];
    if (isAsync[type]) {
      promises.push(add(name, value));
    } else {
      add(name, value);
    }
  }

  // XXX kick off promises but don't block. This is a concession to contract
  // reincarnation which cannot block on a remote call.
  // UNTIL https://github.com/Agoric/agoric-sdk/issues/4343
  void E.when(Promise.all(promises), undefined, reason =>
    zcf.shutdownWithFailure(reason),
  );

  return builder.build();
};
harden(makeParamManager);

/**
 * Used only when the contract has multiple param managers.
 * Exactly one must manage the electorate, which requires the async version.
 *
 * @see makeParamManager
 * @template {Record<Keyword, SyncSpecTuple>} T
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<any>} recorderKit
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {T} spec
 * @param {ParamGovernanceExoMakers} makers
 * @returns {ParamManager<{[K in keyof T]: T[K][0]}>}
 */
export const makeParamManagerSync = (recorderKit, baggage, spec, makers) => {
  const builder = makeParamManagerBuilder(baggage, recorderKit, makers);

  for (const [name, [type, value]] of Object.entries(spec)) {
    const add = builder[builderMethodName(type)];
    add || Fail`No builder method for param type ${q(type)}`;
    add(name, value);
  }

  return builder.buildSync();
};
harden(makeParamManagerSync);

/**
 * @template {Record<string, Invitation> & {Electorate: Invitation}} I Private invitation values
 * @template {ParamTypesMap} M Map of types of custom governed terms
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<any>} recorderKit
 * @param {ZCF<GovernanceTerms<M>>} zcf
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {I} invitations invitation objects, which must come from privateArgs
 * @param {M} paramTypesMap
 * @param {ParamGovernanceExoMakers} makers
 * @returns {Promise<ParamManager<M & {[K in keyof I]: 'invitation'}>>}
 */
export const makeParamManagerFromTermsAndMakers = (
  recorderKit,
  zcf,
  baggage,
  invitations,
  paramTypesMap,
  makers,
) => {
  const { governedParams } = zcf.getTerms();
  /** @type {Array<[Keyword, SyncSpecTuple | AsyncSpecTuple]>} */
  const makerSpecEntries = Object.entries(paramTypesMap).map(
    ([paramKey, paramType]) => [
      paramKey,
      /** @type {SyncSpecTuple} */ ([
        paramType,
        governedParams[paramKey].value,
      ]),
    ],
  );
  // Every governed contract has an Electorate param that starts as `initialPoserInvitation` private arg
  for (const [name, invitation] of Object.entries(invitations)) {
    makerSpecEntries.push([name, [ParamTypes.INVITATION, invitation]]);
  }
  const makerSpec = Object.fromEntries(makerSpecEntries);
  makerSpec[CONTRACT_ELECTORATE] ||
    Fail`missing Electorate invitation param value`;

  return makeParamManager(recorderKit, baggage, makerSpec, zcf, makers);
};
harden(makeParamManagerFromTermsAndMakers);

/**
 * @template {Record<string, Invitation> & {Electorate: Invitation}} I Private invitation values
 * @template {ParamTypesMap} M Map of types of custom governed terms
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<any>} recorderKit
 * @param {ZCF<GovernanceTerms<M>>} zcf
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {I} invitations invitation objects, which must come from privateArgs
 * @param {M} paramTypesMap
 * @returns {Promise<ParamManager<M & {[K in keyof I]: 'invitation'}>>}
 */
export const makeParamManagerFromTerms = (
  recorderKit,
  zcf,
  baggage,
  invitations,
  paramTypesMap,
) => {
  const paramMakerKit = buildParamGovernanceExoMakers(
    zcf.getZoeService(),
    baggage,
  );
  return makeParamManagerFromTermsAndMakers(
    recorderKit,
    zcf,
    baggage,
    invitations,
    paramTypesMap,
    paramMakerKit,
  );
};
harden(makeParamManagerFromTerms);
