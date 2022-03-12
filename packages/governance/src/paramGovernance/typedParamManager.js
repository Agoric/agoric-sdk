// @ts-check

import { makeParamManagerBuilder } from './paramManager.js';

/**
 * @template {Record<Keyword, ParamRecord>} T
 * @typedef {{
 *   [Property in keyof T as `get${string & Property}`]: () => T[Property]['value']
 * }} Getters
 */

/**
 * @template {Record<Keyword, ParamRecord>} T
 * @typedef {{
 *   [Property in keyof T as `update${string & Property}`]: (value: T[Property]['value']) => void
 * }} Updaters
 */

/**
 * @template {Record<Keyword, ParamRecord>} T
 * @typedef {ParamManagerBase & Getters<T> & Updaters<T>} TypedParamManager
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
 * @see makeParamManagerSync
 * @template {Record<Keyword, ParamRecord>} T
 * @param {T} spec
 * @param {ERef<ZoeService>} [zoe]
 * @returns {Promise<TypedParamManager<T>>}
 */
const makeParamManager = async (spec, zoe) => {
  const builder = makeParamManagerBuilder(zoe);

  const promises = [];
  for (const [name, { type, value }] of Object.entries(spec)) {
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
 * @template {Record<Keyword, ParamRecord>} T
 * @param {T} spec
 * @returns {TypedParamManager<T>}
 */
const makeParamManagerSync = spec => {
  const builder = makeParamManagerBuilder();

  for (const [name, { type, value }] of Object.entries(spec)) {
    const add = builder[builderMethodName(type)];
    add(name, value);
  }

  // @ts-expect-error cast
  return builder.build();
};

harden(makeParamManager);
harden(makeParamManagerSync);
export { makeParamManager, makeParamManagerSync };
