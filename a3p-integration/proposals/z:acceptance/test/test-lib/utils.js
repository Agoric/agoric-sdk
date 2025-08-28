/* eslint-env node */
import {
  LOCAL_CONFIG,
  makeStargateClient,
  makeVstorageKit,
  retryUntilCondition,
} from '@agoric/client-utils';
import { evalBundles, getDetailsMatchingVats } from '@agoric/synthetic-chain';
import { readFile, writeFile } from 'node:fs/promises';

export const stargateClientP = makeStargateClient(LOCAL_CONFIG, { fetch });
export const vstorageKit = makeVstorageKit({ fetch }, LOCAL_CONFIG);

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

  /** @param {number | bigint} secondsSinceEpoch */
  const waitUntil = async secondsSinceEpoch => {
    await null;
    const waitMs = Number(secondsSinceEpoch) * 1000 - Date.now();
    if (waitMs <= 0) return;
    await delay(waitMs);
  };

  return {
    delay,
    waitUntil,
  };
};

/**
 * This function solves the limitation of getIncarnation when multiple Vats
 * are returned for the provided vatName and does not return the incarnation
 * of the desired Vat (e.g. zcf-mintHolder-USDC)
 * @param {string} vatName
 * @returns {Promise<number>}
 */
const getIncarnationFromDetails = async vatName => {
  const matchingVats = await getDetailsMatchingVats(vatName);
  const expectedVat = matchingVats.find(
    /** @param {{ vatName: string }} vat */
    vat => vat.vatName.endsWith(vatName),
  );
  assert(expectedVat, `No matching Vat was found for ${vatName}`);
  return expectedVat.incarnation;
};

export const upgradeContract = async (submissionPath, vatName) => {
  const incarnationBefore = await getIncarnationFromDetails(vatName);
  await evalBundles(submissionPath);

  return retryUntilCondition(
    async () => getIncarnationFromDetails(vatName),
    value => value === incarnationBefore + 1,
    `${vatName} upgrade not processed yet`,
    { setTimeout, retryIntervalMs: 5000, maxRetries: 15 },
  );
};
