// @ts-check

import { makeParamManagerBuilder } from './paramManager.js';

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
 *
 * @param {ParamType} type
 */
const builderMethodName = type =>
  `add${type[0].toUpperCase() + type.substring(1)}`;

/** @type{Partial<Record<ParamType, boolean>>} */
const isAsync = {
  invitation: true,
};

/**
 * @see makeParamManagerSync
 * @template {Record<Keyword, ParamDescription>} T
 * @param {T} spec
 * @param {ERef<ZoeService>} [zoe]
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

  return builder.build();
};

/**
 * @see makeParamManager
 * @template {Record<Keyword, ParamDescription>} T
 * @param {T} spec
 */
const makeParamManagerSync = spec => {
  const builder = makeParamManagerBuilder();

  for (const [name, { type, value }] of Object.entries(spec)) {
    const add = builder[builderMethodName(type)];
    add(name, value);
  }

  return builder.build();
};

harden(makeParamManager);
harden(makeParamManagerSync);
export { makeParamManager, makeParamManagerSync };
