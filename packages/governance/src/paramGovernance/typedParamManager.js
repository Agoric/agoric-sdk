// @ts-check

import { makeParamManagerBuilder } from './paramManager.js';

/**
 * @template {Record<Keyword, ParamRecordTuple>} T
 * @typedef {{
 *   [Property in keyof T as `get${string & Property}`]: () => ParamValueForType<T[Property][0]>
 * }} Getters
 */

/**
 * @template {Record<Keyword, ParamRecordTuple>} T
 * @typedef {{
 *   [Property in keyof T as `update${string & Property}`]: (value: ParamValueForType<T[Property][0]>) => void
 * }} Updaters
 */

/**
 * @template {Record<Keyword, ST<ParamType>>} T
 * @typedef {ParamManagerBase & Getters<T> & Updaters<T> & {asGetters: () => Getters<T>}} TypedParamManager
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

/**
 * @typedef {ST<'amount'>
 * | ST<'brand'>
 * | ST<'brandedAmount'>
 * | ST<'brandedRatio'>
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
 * @param {ERef<ZoeService>} [zoe]
 * @returns {Promise<TypedParamManager<T>>}
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
 * @see makeParamManager
 * @template {Record<Keyword, SyncSpecTuple>} T
 * @param {T} spec
 * @returns {TypedParamManager<T>}
 */
const makeParamManagerSync = spec => {
  const builder = makeParamManagerBuilder();

  for (const [name, [type, value]] of Object.entries(spec)) {
    const add = builder[builderMethodName(type)];
    add(name, value);
  }

  // @ts-expect-error cast
  return builder.build();
};

harden(makeParamManager);
harden(makeParamManagerSync);
export { makeParamManager, makeParamManagerSync };
