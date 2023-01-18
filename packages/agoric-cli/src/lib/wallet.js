// @ts-check
/* global process */

import { boardSlottingMarshaller, storageHelper } from './rpc.js';

const marshaller = boardSlottingMarshaller();

/**
 * @param {string} addr
 * @param {import('./rpc').IdMap} ctx
 * @param {object} io
 * @param {import('./rpc.js').VStorage} io.vstorage
 * @returns {Promise<import('@agoric/smart-wallet/src/smartWallet').CurrentWalletRecord>}
 */
export const getCurrent = async (addr, ctx, { vstorage }) => {
  const capDataStr = await vstorage.readLatest(
    `published.wallet.${addr}.current`,
  );

  const capDatas = storageHelper.unserializeTxt(capDataStr, ctx);

  return capDatas[0];
};

/** @param {import('../lib/psm.js').BridgeAction} bridgeAction */
export const outputAction = bridgeAction => {
  const capData = marshaller.serialize(bridgeAction);
  process.stdout.write(JSON.stringify(capData));
  process.stdout.write('\n');
};
