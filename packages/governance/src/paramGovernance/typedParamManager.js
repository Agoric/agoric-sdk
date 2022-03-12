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
  makeAssertBrandedRatio,
} from './assertions.js';
import { makeParamManagerBuilder, ParamType } from './paramManager.js';

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
 *
 * @param {ParamType} type
 */
const builderMethodName = type =>
  `add${type[0].toUpperCase() + type.substring(1)}`;

/**
 * @see makeParamManagerSync
 * @template {Record<Keyword, ParamDescription>} T
 * @param {T} spec
 * @param {ERef<ZoeService>} [zoe]
 */
const makeParamManager = async (spec, zoe) => {};

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
