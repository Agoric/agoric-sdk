// @ts-check
/**
 * @file Adapter to make synthetic-chain wallet compatible with reflectWalletStore
 *
 * This creates a MinimalWalletKit from synthetic-chain's agoric wallet commands,
 * allowing a3p tests to use reflectWalletStore without a full SigningSmartWalletKit.
 */

import { agoric, mkTemp } from '@agoric/synthetic-chain';
import { writeFile } from 'node:fs/promises';

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {UpdateRecord} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {VstorageKit} from '@agoric/client-utils';
 * @import {MinimalWalletKit} from '@agoric/deploy-script-support/src/wallet-utils.js';
 */

/**
 * Create a MinimalWalletKit for a synthetic-chain wallet address
 *
 * This adapts the synthetic-chain's `agoric wallet` commands to work with
 * reflectWalletStore, enabling direct method calls on wallet store entries.
 *
 * @param {object} options
 * @param {string} options.address - Wallet address (e.g., 'agoric15u29...')
 * @param {VstorageKit} options.vstorageKit - Vstorage kit for reading wallet updates
 * @returns {MinimalWalletKit}
 */
export const makeSyntheticWalletKit = ({ address, vstorageKit }) => {
  /**
   * Send a bridge action using synthetic-chain's wallet command
   *
   * @type {MinimalWalletKit['sendBridgeAction']}
   */
  const sendBridgeAction = async (action, _fee) => {
    const capData = vstorageKit.marshaller.toCapData(harden(action));
    const tempFile = await mkTemp('wallet-action-XXX');
    await writeFile(tempFile, JSON.stringify(capData), 'utf-8');

    try {
      const result = await agoric.wallet(
        'send',
        '--from',
        address,
        '--keyring-backend=test',
        '--offer',
        tempFile,
      );

      // Synthetic-chain wallet command returns void on success
      return { code: 0 };
    } catch (err) {
      return {
        code: 1,
        rawLog: err instanceof Error ? err.message : String(err),
      };
    }
  };

  /**
   * Get the last wallet update for this address
   *
   * @returns {Promise<UpdateRecord>}
   */
  const getLastUpdate = async () => {
    return vstorageKit.readPublished(`wallet.${address}`);
  };

  return harden({
    sendBridgeAction,
    query: {
      getLastUpdate,
    },
  });
};
