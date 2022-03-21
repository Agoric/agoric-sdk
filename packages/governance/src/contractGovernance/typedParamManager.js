// @ts-check

import { ParamTypes } from '../constants.js';
import { CONTRACT_ELECTORATE } from './governParam.js';
import { makeParamManagerBuilder } from './paramManager.js';

/**
 * @typedef {Record<Keyword, ParamType>} ParamTypesMap
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
 * @typedef {ParamManagerBase & Getters<M> & Updaters<M> & {readonly: () => Getters<M>}} TypedParamManager
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
 * @template {ParamType} [T=ParamType]
 * @typedef {[type: T, value: ParamValueForType<T>]} ParamRecordTuple
 */

/**
 * @template {ParamType} T
 * @typedef {[type: T, value: ParamValueForType<T>]} ST param spec tuple
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
 * | ST<'unknown'>} SyncSpecTuple
 *
 * @typedef {['invitation', Invitation]} AsyncSpecTuple
 */

/**
 * @see makeParamManagerSync
 * @template {Record<Keyword, AsyncSpecTuple | SyncSpecTuple>} T
 * @param {T} spec
 * @param {ERef<ZoeService>} zoe
 * @returns {Promise<TypedParamManager<{[K in keyof T]: T[K][0]}>>}
 */
const makeParamManager = async (spec, zoe) => {
  const builder = makeParamManagerBuilder(zoe);

  const promises = [];
  for (const [name, [type, value]] of Object.entries(spec)) {
    const add = builder[builderMethodName(type)];
    if (isAsync[type]) {
      promises.push(add(name, value));
    } else {
      add(name, value);
    }
  }
  await Promise.all(promises);

  // @ts-expect-error cast
  return builder.build();
};

/**
 * Used only when the contract has multiple param managers.
 * Exactly one must manage the electorate, which requires the async version.
 *
 * @see makeParamManager
 * @template {Record<Keyword, SyncSpecTuple>} T
 * @param {T} spec
 * @returns {TypedParamManager<{[K in keyof T]: T[K][0]}>}
 */
const makeParamManagerSync = spec => {
  const builder = makeParamManagerBuilder();

  for (const [name, [type, value]] of Object.entries(spec)) {
    const add = builder[builderMethodName(type)];
    assert(add, `No builder method for param type '${type}'`);
    add(name, value);
  }

  // @ts-expect-error cast
  return builder.build();
};

/**
 * @template {ParamTypesMap} M Map of types of custom governed terms
 * @template {Record<string, ParamRecord>} CGT Custom governed terms
 * @param {ZCF<GovernanceTerms<CGT>>} zcf
 * @param {Payment} initialPoserInvitation
 * @param {M} paramTypesMap
 * @returns {Promise<TypedParamManager<M & {Electorate: 'invitation'}>>}
 */
const makeParamManagerFromTerms = async (
  zcf,
  initialPoserInvitation,
  paramTypesMap,
) => {
  const governedTerms = zcf.getTerms().governed;
  /** @type {Array<[Keyword, [ParamType, unknown]]>} */
  const makerSpecEntries = Object.entries(paramTypesMap).map(
    ([paramKey, paramType]) => [
      paramKey,
      [paramType, governedTerms[paramKey].value],
    ],
  );
  // Every governed contract has an Electorate param that starts as `initialPoserInvitation` private arg
  makerSpecEntries.push([
    CONTRACT_ELECTORATE,
    [ParamTypes.INVITATION, initialPoserInvitation],
  ]);
  // @ts-expect-error cast
  return makeParamManager(
    // @ts-expect-error cast
    Object.fromEntries(makerSpecEntries),
    zcf.getZoeService(),
  );
};

harden(makeParamManager);
harden(makeParamManagerSync);
harden(makeParamManagerFromTerms);
export { makeParamManager, makeParamManagerSync, makeParamManagerFromTerms };
