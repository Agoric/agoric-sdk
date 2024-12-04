// @ts-check

import { makeVstorageKit } from '@agoric/client-utils';
import { sendAction } from 'agoric/src/lib/index.js';
import { inspect } from 'util';

export const makeWalletUtils = async (
  { delay, execFileSync, fetch },
  networkConfig,
) => {
  const { agoricNames, fromBoard, marshaller, readLatestHead, vstorage } =
    await makeVstorageKit({ fetch }, networkConfig);

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
