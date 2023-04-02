// @ts-check
/* global process */

import { iterateReverse } from '@agoric/casting';
import { makeWalletStateCoalescer } from '@agoric/smart-wallet/src/utils.js';
import { execSwingsetTransaction, pollTx } from './chain.js';
import { boardSlottingMarshaller } from './rpc.js';

/** @typedef {import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord} CurrentWalletRecord  */
/** @typedef {import('@agoric/smart-wallet/src/offers.js').OfferSpec} OfferSpec */
/** @typedef {import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes} AgoricNamesRemotes  */

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
 * @param {string} addr
 * @param {Pick<import('./rpc.js').RpcUtils, 'readLatestHead'>} io
 * @returns {Promise<import('@agoric/smart-wallet/src/smartWallet').UpdateRecord>}
 */
export const getLastUpdate = (addr, { readLatestHead }) => {
  // @ts-expect-error cast
  return readLatestHead(`published.wallet.${addr}`);
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
 * Sign and broadcast a wallet-action.
 *
 * @throws { Error & { code: number } } if transaction fails
 * @param {import('@agoric/smart-wallet/src/smartWallet').BridgeAction} bridgeAction
 * @param {import('./rpc').MinimalNetworkConfig & {
 *   from: string,
 *   verbose?: boolean,
 *   keyring?: {home?: string, backend: string},
 *   stdout: Pick<import('stream').Writable, 'write'>,
 *   execFileSync: typeof import('child_process').execFileSync,
 *   delay: (ms: number) => Promise<void>,
 * }} opts
 */
export const sendAction = async (bridgeAction, opts) => {
  const offerBody = JSON.stringify(marshaller.serialize(bridgeAction));

  // tryExit should not require --allow-spend
  // https://github.com/Agoric/agoric-sdk/issues/7291
  const spendMethods = ['executeOffer', 'tryExitOffer'];
  const spendArg = spendMethods.includes(bridgeAction.method)
    ? ['--allow-spend']
    : [];

  const act = ['wallet-action', ...spendArg, offerBody];
  const out = execSwingsetTransaction([...act, '--output', 'json'], opts);
  assert(out); // not dry run
  const tx = JSON.parse(out);
  if (tx.code !== 0) {
    const err = Error(`failed to send action. code: ${tx.code}`);
    // @ts-expect-error XXX how to add properties to an error?
    err.code = tx.code;
    throw err;
  }

  return pollTx(tx.txhash, opts);
};

/**
 * @param {CurrentWalletRecord} current
 * @param {AgoricNamesRemotes} agoricNames
 */
export const findContinuingIds = (current, agoricNames) => {
  // XXX should runtime type-check
  /** @type {{ offerToUsedInvitation: [string, Amount<'set'>][]}} */
  const { offerToUsedInvitation: entries } = /** @type {any} */ (current);

  assert(Array.isArray(entries));

  const keyOf = (obj, val) => {
    const found = Object.entries(obj).find(e => e[1] === val);
    return found && found[0];
  };

  const found = [];
  for (const [offerId, { value }] of entries) {
    /** @type {{ description: string, instance: unknown }[]} */
    const [{ description, instance }] = value;
    if (
      description === 'charter member invitation' ||
      /Voter\d+/.test(description)
    ) {
      const instanceName = keyOf(agoricNames.instance, instance);
      found.push({ instance, instanceName, description, offerId });
    }
  }
  return found;
};
