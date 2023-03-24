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

/**
 * @param {import('@agoric/smart-wallet/src/smartWallet').BridgeAction} bridgeAction
 * @param {Pick<import('stream').Writable,'write'>} [stdout]
 */
export const outputAction = (bridgeAction, stdout = process.stdout) => {
  const capData = marshaller.serialize(bridgeAction);
  stdout.write(JSON.stringify(capData));
  stdout.write('\n');
};

/**
 * @param {import('@agoric/smart-wallet/src/offers.js').OfferSpec} offer
 * @param {Pick<import('stream').Writable,'write'>} [stdout]
 */
export const outputExecuteOfferAction = (offer, stdout = process.stdout) => {
  /** @type {import('@agoric/smart-wallet/src/smartWallet').BridgeAction} */
  const spendAction = {
    method: 'executeOffer',
    offer,
  };
  outputAction(spendAction, stdout);
};

/**
 * @deprecated use `.current` node for current state
 * @param {import('@agoric/casting').Follower<import('@agoric/casting').ValueFollowerElement<import('@agoric/smart-wallet/src/smartWallet').UpdateRecord>>} follower
 * @param {Brand<'set'>} [invitationBrand]
 */
export const coalesceWalletState = async (follower, invitationBrand) => {
  // values with oldest last
  const history = [];
  for await (const followerElement of iterateReverse(follower)) {
    history.push(followerElement.value);
  }

  const coalescer = makeWalletStateCoalescer(invitationBrand);
  // update with oldest first
  for (const record of history.reverse()) {
    coalescer.update(record);
  }

  return coalescer.state;
};
