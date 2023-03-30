// @ts-check
/* global process */

import { iterateReverse } from '@agoric/casting';
import { AmountMath } from '@agoric/ertp';
import { makeWalletStateCoalescer } from '@agoric/smart-wallet/src/utils.js';
import { execSwingsetTransaction, pollTx } from './chain.js';
import { boardSlottingMarshaller } from './rpc.js';

const marshaller = boardSlottingMarshaller();

/**
 * @param {string} addr
 * @param {Pick<import('./rpc.js').RpcUtils, 'readLatestHead'>} io
 * @returns {Promise<import('@agoric/smart-wallet/src/smartWallet').CurrentWalletRecord>}
 */
export const getCurrent = (addr, { readLatestHead }) => {
  // @ts-expect-error cast
  return readLatestHead(`published.wallet.${addr}.current`);
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

const sendHint =
  'Now use `agoric wallet send ...` to sign and broadcast the offer.\n';

/**
 * @param {import('@agoric/smart-wallet/src/smartWallet').BridgeAction} bridgeAction
 * @param {{
 *   stdout: Pick<import('stream').Writable,'write'>,
 *   stderr: Pick<import('stream').Writable,'write'>,
 * }} io
 */
export const outputActionAndHint = (bridgeAction, { stdout, stderr }) => {
  outputAction(bridgeAction, stdout);
  stderr.write(sendHint);
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

/**
 * Sign and broadcast a wallet-action (or do a dry-run).
 *
 * @throws { Error & { code: number } } if transaction fails
 * @param {import('@agoric/smart-wallet/src/smartWallet').BridgeAction} bridgeAction
 * @param {import('./rpc').MinimalNetworkConfig & {
 *   from: string,
 *   dryRun?: boolean,
 *   verbose?: boolean,
 *   keyring?: {home: string, backend: string}
 *   stdout: Pick<import('stream').Writable, 'write'>
 *   execFileSync: typeof import('child_process').execFileSync,
 *   delay: (ms: number) => Promise<void>,
 * }} opts
 */
export const doAction = async (bridgeAction, opts) => {
  const offerBody = JSON.stringify(marshaller.serialize(bridgeAction));
  const spendArg =
    bridgeAction.method === 'executeOffer' ? ['--allow-spend'] : [];
  const act = ['wallet-action', ...spendArg, offerBody];
  const out = execSwingsetTransaction([...act, '--output', 'json'], opts);
  if (!out) return;
  const tx = JSON.parse(out);
  if (tx.code !== 0) {
    const err = Error(`failed to send action. code: ${tx.code}`);
    // @ts-expect-error XXX how to add properties to an error?
    err.code = tx.code;
    throw err;
  }

  return pollTx(tx.txhash, opts);
};

const { entries } = Object;
/**
 * @param {AmountKeywordRecord | undefined } give
 * @param {AmountKeywordRecord | undefined} payouts
 */
export const paidOut = (give, payouts) => {
  if (!payouts || !give) return false;
  for (const [kw, amt] of entries(give)) {
    if (!(kw in payouts && AmountMath.isGTE(payouts[kw], amt))) {
      return false;
    }
  }
  return true;
};
