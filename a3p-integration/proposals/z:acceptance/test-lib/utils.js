/* eslint-env node */
import { makeStargateClient, makeVstorageKit } from '@agoric/client-utils';
import { readFile, writeFile } from 'node:fs/promises';
import { networkConfig } from './rpc.js';

export const stargateClientP = makeStargateClient(networkConfig, { fetch });
export const vstorageKitP = makeVstorageKit({ fetch }, networkConfig);

/**
 * @import {WalletUtils} from '@agoric/client-utils';
 * @import {CurrentWalletRecord} from '@agoric/smart-wallet/src/smartWallet.js';
 */

/**
 * @param {string} fileName base file name without .tjs extension
 * @param {Record<string, string>} replacements
 */
export const replaceTemplateValuesInFile = async (fileName, replacements) => {
  let script = await readFile(`${fileName}.tjs`, 'utf-8');
  for (const [template, value] of Object.entries(replacements)) {
    script = script.replaceAll(`{{${template}}}`, value);
  }
  await writeFile(`${fileName}.js`, script);
};

// FIXME this return type depends on its arguments in surprising ways
/**
 * @param {string[]} addresses
 * @param {string} [targetDenom]
 * @returns {Promise<any>}
 */
export const getBalances = async (addresses, targetDenom = undefined) => {
  const client = await stargateClientP;
  const balancesList = await Promise.all(
    addresses.map(async address => {
      const balances = await client.getAllBalances(address);

      if (targetDenom) {
        const balance = balances.find(({ denom }) => denom === targetDenom);
        return balance ? BigInt(balance.amount) : undefined;
      }

      return balances;
    }),
  );

  return addresses.length === 1 ? balancesList[0] : balancesList;
};

// TODO move this out of testing. To inter-protocol?
// "vaults" is an Inter thing, but vstorage shape is a full chain (client) thing
// Maybe a plugin architecture where the truth is in inter-protocol and the
// client-lib rolls up the exports of many packages?
/**
 * @param {string} addr
 * @param {WalletUtils} walletUtils
 * @returns {Promise<string[]>}
 */
export const listVaults = async (addr, { getCurrentWalletRecord }) => {
  const current = await getCurrentWalletRecord(addr);
  const vaultStoragePaths = current.offerToPublicSubscriberPaths.map(
    ([_offerId, pathmap]) => pathmap.vault,
  );

  return vaultStoragePaths;
};

/**
 * @param {{setTimeout: typeof setTimeout}} io
 */
export const makeTimerUtils = ({ setTimeout }) => {
  /**
   * Resolve after a delay in milliseconds.
   *
   * @param {number} ms
   * @returns {Promise<void>}
   */
  const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));

  /** @param {number} timestamp */
  const waitUntil = async timestamp => {
    const timeDelta = Math.floor(Date.now() / 1000) - Number(timestamp);
    await delay(timeDelta);
  };

  return {
    delay,
    waitUntil,
  };
};
