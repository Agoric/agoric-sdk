// @ts-check
/* global process */

import { iterateReverse } from '@agoric/casting';
import { makeWalletStateCoalescer } from '@agoric/smart-wallet/src/utils.js';
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

/** @param {import('@agoric/smart-wallet/src/smartWallet').BridgeAction} bridgeAction */
export const outputAction = bridgeAction => {
  const capData = marshaller.serialize(bridgeAction);
  process.stdout.write(JSON.stringify(capData));
  process.stdout.write('\n');
};

/**
 * @param {import('@agoric/smart-wallet/src/offers.js').OfferSpec} offer
 */
export const outputExecuteOfferAction = offer => {
  /** @type {import('@agoric/smart-wallet/src/smartWallet').BridgeAction} */
  const spendAction = {
    method: 'executeOffer',
    offer,
  };
  outputAction(spendAction);
};

/**
 * @deprecated use `.current` node for current state
 * @param {import('@agoric/casting').Follower<import('@agoric/casting').ValueFollowerElement<import('@agoric/smart-wallet/src/smartWallet').UpdateRecord>>} follower
 */
export const coalesceWalletState = async follower => {
  // values with oldest last
  const history = [];
  for await (const followerElement of iterateReverse(follower)) {
    history.push(followerElement.value);
  }

  const coalescer = makeWalletStateCoalescer();
  // update with oldest first
  for (const record of history.reverse()) {
    coalescer.update(record);
  }

  return coalescer.state;
};
