/* eslint-env node */

import { agoric, evalBundles, getISTBalance } from '@agoric/synthetic-chain';
import { makeVstorageKit } from '@agoric/client-utils';
import { readFile, writeFile } from 'node:fs/promises';
import { psmSwap, snapshotAgoricNames, tryISTBalances } from './psm-lib.js';

/** @type {(x: number) => number} */
const scale6 = x => x * 1_000_000;

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

export const getPSMChildren = async (fetch, networkConfig) => {
  const {
    vstorage: { keys },
  } = await makeVstorageKit({ fetch }, networkConfig);

  const children = await keys('published.psm.IST');

  return children;
};

export const getAssetList = async labelList => {
  const assetList = [];
  const { vbankAssets } = await snapshotAgoricNames();

  // Determine the assets to consider based on labelList
  const assetsToConsider =
    labelList ||
    Object.values(vbankAssets)
      .map(asset => asset.issuerName)
      .filter(Boolean); // testvbankAsset can be malformed.

  for (const label of assetsToConsider) {
    if (label === 'IST') {
      break;
    }

    const vbankAsset = Object.values(vbankAssets).find(
      asset => asset.issuerName === label,
    );
    assert(vbankAsset, `vbankAsset not found for ${label}`);

    const { denom } = vbankAsset;
    const mintHolderVat = `zcf-mintHolder-${label}`;

    assetList.push({ label, denom, mintHolderVat });
  }

  return assetList;
};

export const mintPayment = async (t, address, assetList, value) => {
  const SUBMISSION_DIR = 'mint-payment';

  for (const asset of assetList) {
    const { label, denom } = asset;

    const scaled = BigInt(parseInt(value, 10) * 1_000_000).toString();

    await replaceTemplateValuesInFile(`${SUBMISSION_DIR}/send-script`, {
      ADDRESS: address,
      LABEL: label,
      VALUE: scaled,
    });

    await evalBundles(SUBMISSION_DIR);

    const balance = await getISTBalance(address, denom);

    // Add to value the BLD provisioned to smart wallet
    if (label === 'BLD') {
      value += 10;
    }

    t.is(
      balance,
      value,
      `receiver ${denom} balance ${balance} is not ${value}`,
    );
  }
};

/**
 *
 * @param {import('ava').ExecutionContext} t
 * @param {string} address
 * @param {Array<{ label: string, denom: string, mintHolderVat: string}>} assetList
 * @param {number} want in IST
 */
export const swap = async (t, address, assetList, want) => {
  for (const asset of assetList) {
    const { label, denom } = asset;

    // TODO: remove condition after fixing issue #10655
    if (/^DAI/.test(label)) {
      break;
    }

    const pair = `IST.${label}`;

    const istBalanceBefore = await getISTBalance(address, 'uist', 1); // we want uist not IST
    const anchorBalanceBefore = await getISTBalance(address, denom);

    const psmSwapIo = {
      now: Date.now,
      follow: agoric.follow,
      setTimeout,
      log: console.log,
    };

    await psmSwap(
      address,
      ['swap', '--pair', pair, '--wantMinted', want],
      psmSwapIo,
    );

    const istBalanceAfter = await getISTBalance(address, 'uist', 1); // we want uist not IST
    const anchorBalanceAfter = await getISTBalance(address, denom);

    await tryISTBalances(
      t,
      istBalanceAfter,
      istBalanceBefore + scale6(want), // scale "want" to uist
    );
    t.is(anchorBalanceAfter, anchorBalanceBefore - want);
  }
};
