// @ts-check

import { sendAction } from 'agoric/src/lib/index.js';
import { inspect } from 'util';

/**
 * Stop-gap using execFileSync until we have a pure JS signing client.
 *
 * @param {object} root0
 * @param {import('child_process')['execFileSync']} root0.execFileSync
 * @param {import('@agoric/client-utils').SmartWalletKit} root0.smartWalletKit
 * @param {any} root0.delay
 * @param {import('@agoric/client-utils').MinimalNetworkConfig} networkConfig
 */
export const makeAgdWalletKit = async (
  { execFileSync, smartWalletKit, delay },
  networkConfig,
) => {
  /**
   *
   * @param {string} from
   * @param {import('@agoric/smart-wallet/src/smartWallet.js').BridgeAction} bridgeAction
   */
  const broadcastBridgeAction = async (from, bridgeAction) => {
    console.log('broadcastBridgeAction', inspect(bridgeAction, { depth: 10 }));
    // @ts-expect-error XXX ERef type confusion
    return sendAction(bridgeAction, {
      ...networkConfig,
      delay,
      execFileSync,
      from,
      keyring: { backend: 'test' },
    });
  };

  return {
    ...smartWalletKit,
    broadcastBridgeAction,
  };
};
