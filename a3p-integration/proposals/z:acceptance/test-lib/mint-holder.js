/* eslint-env node */

import { agoric, evalBundles, getISTBalance } from '@agoric/synthetic-chain';
import { makeVstorageKit } from '@agoric/client-utils';
import { replaceTemplateValuesInFile } from './utils.js';
import { sendOfferAgd, psmSwap, snapshotAgoricNames } from './psm-lib.js';

const SUBMISSION_DIR = 'mint-test-submission';

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

  for (const label of labelList) {
    const vbankAsset = Object.values(vbankAssets).filter(
      asset => asset.issuerName === label,
    );
    assert(vbankAsset);

    const denom = vbankAsset[0].denom;
    const mintHolderVat = `zcf-mintHolder-${label}`;

    assetList.push({ label, denom, mintHolderVat });
  }

  return assetList;
};

export const mintPayment = async (t, address, label, denom) => {
  await replaceTemplateValuesInFile(`${SUBMISSION_DIR}/send-script`, {
    ADDRESS: address,
    LABEL: label,
  });

  await evalBundles(SUBMISSION_DIR);

  const balance = await getISTBalance(address, denom);
  t.is(balance, 10, `receiver ${denom} balance should be by 10`);
};

export const swap = async (t, address, label, denom, want) => {
  const pair = `IST.${label}`;

  const istBalanceBefore = await getISTBalance(address, 'uist');
  const anchorBalanceBefore = await getISTBalance(address, denom);

  await psmSwap(address, ['swap', '--pair', pair, '--wantMinted', want], {
    now: Date.now,
    follow: agoric.follow,
    setTimeout,
    sendOffer: sendOfferAgd,
  });

  const istBalanceAfter = await getISTBalance(address, 'uist');
  const anchorBalanceAfter = await getISTBalance(address, denom);

  t.is(istBalanceAfter, istBalanceBefore + want);
  t.is(anchorBalanceAfter, anchorBalanceBefore - want);
};
