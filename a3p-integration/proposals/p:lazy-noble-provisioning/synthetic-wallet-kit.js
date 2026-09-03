// @ts-check
import { mkTemp } from '@agoric/synthetic-chain';
import { writeFile } from 'node:fs/promises';

/**
 * @import {UpdateRecord} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {agoric as syntheticChainAgoric} from '@agoric/synthetic-chain';
 * @import {VstorageKit} from '@agoric/client-utils';
 * @import {WalletStoreSigner} from '@agoric/client-utils/src/wallet-store.ts';
 */

/**
 * `agoric wallet send` reports only success or failure, so the rest of the
 * DeliverTxResponse is synthesized. reflectWalletStore reads only `code` and
 * `rawLog`.
 *
 * XXX narrow `WalletStoreSigner['sendBridgeAction']` to return
 * `Pick<DeliverTxResponse, 'code' | 'rawLog'>` so that this can go away. That
 * type is documented as the minimal interface `reflectWalletStore` needs, but
 * demanding a full tx response obliges every synthetic implementation to invent
 * these seven fields.
 */
const txDetail = harden({
  height: -1,
  txIndex: 0,
  transactionHash: '',
  events: [],
  msgResponses: [],
  gasUsed: 0n,
  gasWanted: 0n,
});

/**
 * @param {object} options
 * @param {typeof syntheticChainAgoric} options.agoric
 * @param {string} options.address
 * @param {Pick<VstorageKit, 'marshaller'> & {
 *   readPublished: (path: `wallet.${string}`) => Promise<UpdateRecord>,
 * }} options.vstorageKit
 * @returns {WalletStoreSigner}
 */
export const makeSyntheticWalletKit = ({ agoric, address, vstorageKit }) => {
  /** @type {WalletStoreSigner['sendBridgeAction']} */
  const sendBridgeAction = async action => {
    const capData = vstorageKit.marshaller.toCapData(harden(action));
    const offerFile = await mkTemp('synthetic-wallet-action-XXX');
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
      return { ...txDetail, code: 0 };
    } catch (error) {
      return {
        ...txDetail,
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
