// @ts-check

import { sendAction } from 'agoric/src/lib/index.js';
import { inspect } from 'node:util';

/**
 * @import {SmartWalletKit} from '@agoric/client-utils';
 * @import {MinimalNetworkConfig} from '@agoric/client-utils';
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet.js';
 */

/**
 * Stop-gap using execFileSync until we have a pure JS signing client.
 *
 * @param {object} root0
 * @param {import('child_process')['execFileSync']} root0.execFileSync
 * @param {SmartWalletKit} root0.smartWalletKit
 * @param {any} root0.delay
 * @param {MinimalNetworkConfig} networkConfig
 */
export const makeAgdWalletKit = async (
  { execFileSync, smartWalletKit, delay },
  networkConfig,
) => {
  /**
   *
   * @param {string} from
   * @param {BridgeAction} bridgeAction
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
