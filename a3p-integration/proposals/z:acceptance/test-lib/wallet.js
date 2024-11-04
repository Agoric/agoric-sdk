// TODO DRY in https://github.com/Agoric/agoric-sdk/issues/9109
// @ts-check
/* global */

import { inspect } from 'util';
import { execSwingsetTransaction, pollTx } from './chain.js';
import { makeTimerUtils } from './utils.js';

/**
 * Sign and broadcast a wallet-action.
 *
 * @throws { Error & { code: number } } if transaction fails
 * @param {import('@agoric/smart-wallet/src/smartWallet.js').BridgeAction} bridgeAction
 * @param {import('./rpc.js').MinimalNetworkConfig & {
 *   from: string,
 *   marshaller: Pick<import('@endo/marshal').Marshal<string | null>, 'toCapData'>,
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

/**
 * Stop-gap using execFileSync until we have a pure JS signing client.
 *
 * @param {object} root0
 * @param {import('@agoric/client-utils').WalletUtils} root0.walletUtils
 * @param {import('child_process')['execFileSync']} root0.execFileSync
 * @param {typeof setTimeout} root0.setTimeout
 * @param {import('@agoric/client-utils').MinimalNetworkConfig} networkConfig
 */
export const makeAgdWalletUtils = async (
  { execFileSync, walletUtils, setTimeout },
  networkConfig,
) => {
  const { marshaller } = walletUtils;

  const { delay } = await makeTimerUtils({ setTimeout });
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
    broadcastBridgeAction,
  };
};
