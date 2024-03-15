/**
 * @file copied from packages/agoric-cli,
 * removing polling and coalescing features whose dependencies cause import problems here
 */
// TODO DRY in https://github.com/Agoric/agoric-sdk/issues/9109
// @ts-check
/* global */

import { E, Far } from '@endo/far';
import { inspect } from 'util';
import { execSwingsetTransaction, pollTx } from './chain.js';
import { makeRpcUtils } from './rpc.js';

/** @typedef {import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord} CurrentWalletRecord  */
/** @typedef {import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes} AgoricNamesRemotes  */

/**
 * @template T
 * @param follower
 * @param [options]
 */
export const iterateReverse = (follower, options) =>
  // For now, just pass through the iterable.
  Far('iterateReverse iterable', {
    /** @returns {AsyncIterator<T>} */
    [Symbol.asyncIterator]: () => {
      const eachIterable = E(follower).getReverseIterable(options);
      const iterator = E(eachIterable)[Symbol.asyncIterator]();
      return Far('iterateEach iterator', {
        next: () => E(iterator).next(),
      });
    },
  });

/** @type {CurrentWalletRecord} */
const emptyCurrentRecord = {
  purses: [],
  offerToUsedInvitation: [],
  offerToPublicSubscriberPaths: [],
  liveOffers: [],
};

/**
 * @param {string} addr
 * @param {Pick<import('./rpc.js').RpcUtils, 'readLatestHead'>} io
 * @returns {Promise<import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord>}
 */
export const getCurrent = async (addr, { readLatestHead }) => {
  // Partial because older writes may not have had all properties
  // NB: assumes changes are only additions
  let current =
    /** @type {Partial<import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord> | undefined} */ (
      await readLatestHead(`published.wallet.${addr}.current`)
    );
  if (current === undefined) {
    throw new Error(`undefined current node for ${addr}`);
  }

  // Repair a type misunderstanding seen in the wild.
  // See https://github.com/Agoric/agoric-sdk/pull/7139
  let offerToUsedInvitation = current.offerToUsedInvitation;
  if (
    offerToUsedInvitation &&
    typeof offerToUsedInvitation === 'object' &&
    !Array.isArray(offerToUsedInvitation)
  ) {
    offerToUsedInvitation = Object.entries(offerToUsedInvitation);
    current = harden({
      ...current,
      offerToUsedInvitation,
    });
  }

  // override full empty record with defined values from published one
  return { ...emptyCurrentRecord, ...current };
};

/**
 * @param {string} addr
 * @param {Pick<import('./rpc.js').RpcUtils, 'readLatestHead'>} io
 * @returns {Promise<import('@agoric/smart-wallet/src/smartWallet.js').UpdateRecord>}
 */
export const getLastUpdate = (addr, { readLatestHead }) => {
  // @ts-expect-error cast
  return readLatestHead(`published.wallet.${addr}`);
};

/**
 * Sign and broadcast a wallet-action.
 *
 * @throws { Error & { code: number } } if transaction fails
 * @param {import('@agoric/smart-wallet/src/smartWallet.js').BridgeAction} bridgeAction
 * @param {import('./rpc.js').MinimalNetworkConfig & {
 *   from: string,
 *   marshaller: import('@endo/marshal').Marshal<'string'>,
 *   fees?: string,
 *   verbose?: boolean,
 *   keyring?: {home?: string, backend: string},
 *   stdout: Pick<import('stream').Writable, 'write'>,
 *   execFileSync: typeof import('child_process').execFileSync,
 *   delay: (ms: number) => Promise<void>,
 *   dryRun?: boolean,
 * }} opts
 */
export const sendAction = async (bridgeAction, opts) => {
  const { marshaller } = opts;
  const offerBody = JSON.stringify(marshaller.toCapData(harden(bridgeAction)));

  // tryExit should not require --allow-spend
  // https://github.com/Agoric/agoric-sdk/issues/7291
  const spendMethods = ['executeOffer', 'tryExitOffer'];
  const spendArg = spendMethods.includes(bridgeAction.method)
    ? ['--allow-spend']
    : [];

  const act = ['wallet-action', ...spendArg, offerBody];
  const out = execSwingsetTransaction([...act, '--output', 'json'], opts);
  if (opts.dryRun) {
    return;
  }

  assert(out); // not dry run
  const tx = JSON.parse(out);
  if (tx.code !== 0) {
    const err = Error(`failed to send tx: ${tx.raw_log} code: ${tx.code}`);
    // @ts-expect-error XXX how to add properties to an error?
    err.code = tx.code;
    throw err;
  }

  return pollTx(tx.txhash, opts);
};

export const makeWalletUtils = async (
  { delay, execFileSync, fetch },
  networkConfig,
) => {
  const { agoricNames, fromBoard, marshaller, readLatestHead, vstorage } =
    await makeRpcUtils({ fetch }, networkConfig);

  /**
   *
   * @param {string} from
   * @param {import('@agoric/smart-wallet/src/smartWallet.js').BridgeAction} bridgeAction
   */
  const broadcastBridgeAction = async (from, bridgeAction) => {
    console.log('broadcastBridgeAction', inspect(bridgeAction, { depth: 10 }));
    return sendAction(bridgeAction, {
      ...networkConfig,
      delay,
      execFileSync,
      from,
      marshaller,
      keyring: { backend: 'test' },
    });
  };

  return {
    agoricNames,
    broadcastBridgeAction,
    fromBoard,
    networkConfig,
    readLatestHead,
    vstorage,
  };
};
