/**
 * @file Get a contract upgrade kit by name.
 */

import { E } from '@endo/eventual-send';

/**
 * @import {ContractStartFunction, Instance} from '@agoric/zoe/src/zoeService/utils';
 */

const trace = (...args) => console.log('---- GetUpgradeKit', ...args);

/**
 * @template {ContractStartFunction} SF
 * @typedef {StartedInstanceKit<SF> & {
 *   label: string;
 *   privateArgs?: Parameters<SF>[1];
 * }} UpgradeKit
 */

/**
 * @typedef {PromiseSpaceOf<{
 *   getUpgradeKit: <SF extends ContractStartFunction>(name: string) => Promise<UpgradeKit<SF>>
 * }>} GetUpgradeKitPowers
 */

/**
 * @param {BootstrapPowers & GetUpgradeKitPowers} powers
 */
export const produceGetUpgradeKit = async powers => {
  powers.produce.getUpgradeKit.reset();
  const { consume } = powers;

  const agoricNames = await consume.agoricNames;
  const contractKits = await consume.contractKits;
  const instancePrivateArgs = await consume.instancePrivateArgs;

  /**
   * @template {ContractStartFunction} SF
   * @param {string} name
   * @returns {Promise<UpgradeKit<SF>>}
   */
  const getUpgradeKit = async name => {
    trace('getting instance for', name);
    /** @type {Instance<SF>} */
    const instance = await E(agoricNames).lookup('instance', name);

    trace('getting contract kit for', name);
    const kit = /** @type {StartedInstanceKit<SF> & {label: string}} */ (
      contractKits.get(instance)
    );

    trace('getting privateArgs for', name);
    const privateArgs = instancePrivateArgs.has(instance)
      ? /** @type {Parameters<SF>[1]} */ (instancePrivateArgs.get(instance))
      : undefined;

    return { ...kit, privateArgs };
  };
  harden(getUpgradeKit);

  powers.produce.getUpgradeKit.resolve(getUpgradeKit);
};

export const getManifestForGetUpgradeKit = () => ({
  manifest: {
    [produceGetUpgradeKit.name]: {
      consume: {
        agoricNames: true,
        contractKits: true,
        instancePrivateArgs: true,
      },
      produce: { getUpgradeKit: true },
    },
  },
});
