// @ts-check
import { agoric, mkTemp } from '@agoric/synthetic-chain';
import { writeFile } from 'node:fs/promises';

/**
 * @import {UpdateRecord} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {VstorageKit} from '@agoric/client-utils';
 * @import {WalletStoreSigner} from '@agoric/client-utils/src/wallet-store.ts';
 */

/**
 * @param {object} options
 * @param {string} options.address
 * @param {VstorageKit} options.vstorageKit
 * @returns {WalletStoreSigner}
 */
export const makeSyntheticWalletKit = ({ address, vstorageKit }) => {
  /** @type {WalletStoreSigner['sendBridgeAction']} */
  const sendBridgeAction = async action => {
    const capData = vstorageKit.marshaller.toCapData(harden(action));
    const offerFile = await mkTemp('lazy-noble-action-XXX');
    await writeFile(offerFile, JSON.stringify(capData), 'utf-8');

    try {
      await agoric.wallet(
        'send',
        '--from',
        address,
        '--keyring-backend=test',
        '--offer',
        offerFile,
      );
      return { code: 0 };
    } catch (error) {
      return {
        code: 1,
        rawLog: error instanceof Error ? error.message : String(error),
      };
    }
  };

  return harden({
    sendBridgeAction,
    query: {
      /** @returns {Promise<UpdateRecord>} */
      getLastUpdate: () => vstorageKit.readPublished(`wallet.${address}`),
    },
  });
};
