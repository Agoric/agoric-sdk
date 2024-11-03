import { agoric, makeAgd } from '@agoric/synthetic-chain';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { boardSlottingMarshaller, makeFromBoard } from './rpc.js';

/**
 * @import {WalletUtils} from './wallet.js';
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

const showAndExec = (file, args, opts) => {
  console.log('$', file, ...args);
  return execFileSync(file, args, opts);
};

// @ts-expect-error string is not assignable to Buffer
export const agd = makeAgd({ execFileSync: showAndExec }).withOpts({
  keyringBackend: 'test',
});

/**
 * @param {string[]} addresses
 * @param {string} [targetDenom]
 */
export const getBalances = async (addresses, targetDenom = undefined) => {
  const balancesList = await Promise.all(
    addresses.map(async address => {
      const { balances } = await agd.query(['bank', 'balances', address]);

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
export const listVaults = async (addr, { readLatestHead }) => {
  // TODO parameterize readLatestHead to match these string types
  const current = /** @type {CurrentWalletRecord} */ (
    await readLatestHead(`published.wallet.${addr}.current`)
  );
  const vaultStoragePaths = current.offerToPublicSubscriberPaths.map(
    ([_offerId, pathmap]) => pathmap.vault,
  );

  return vaultStoragePaths;
};

export const makeTimerUtils = ({ setTimeout }) => {
  /**
   * Resolve after a delay in milliseconds.
   *
   * @param {number} ms
   * @returns {Promise<void>}
   */
  const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));

  const waitUntil = async timestamp => {
    const timeDelta = Math.floor(Date.now() / 1000) - Number(timestamp);
    await delay(timeDelta);
  };

  return {
    delay,
    waitUntil,
  };
};

const fromBoard = makeFromBoard();
const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);

export const getAgoricNamesBrands = async () => {
  const brands = await agoric
    .follow('-lF', ':published.agoricNames.brand', '-o', 'text')
    .then(res => Object.fromEntries(marshaller.fromCapData(JSON.parse(res))));

  return brands;
};

export const getAgoricNamesInstances = async () => {
  const instances = await agoric
    .follow('-lF', ':published.agoricNames.instance', '-o', 'text')
    .then(res => Object.fromEntries(marshaller.fromCapData(JSON.parse(res))));

  return instances;
};
