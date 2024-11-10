// TODO: move to cosmic-proto? or client-utils?
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils.js';
import { toBase64 } from '@cosmjs/encoding';

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet'
 */

/**
 * `/agoric.swingset.XXX` matches package agoric.swingset in swingset/msgs.proto
 * aminoType taken from Type() in golang/cosmos/x/swingset/types/msgs.go
 */
export const SwingsetMsgs = {
  MsgWalletSpendAction: {
    typeUrl: '/agoric.swingset.MsgWalletSpendAction',
    aminoType: 'swingset/WalletSpendAction',
  },
};

/**
 * @param {string} address
 * @param {string} spendAction
 * @returns {import('@cosmjs/proto-signing').EncodeObject}
 */
export const makeWalletActionMessage = (address, spendAction) => ({
  typeUrl: SwingsetMsgs.MsgWalletSpendAction.typeUrl,
  value: {
    owner: toBase64(toAccAddress(address)),
    spendAction,
  },
});

/**
 * @param {string} address
 * @param {BridgeAction} bridgeAction
 * @param {ReturnType<typeof import('@endo/marshal').makeMarshal>['toCapData']} toCapData
 */
export const makeWalletMessageBy = (address, bridgeAction, toCapData) => {
  const spendAction = JSON.stringify(toCapData(harden(bridgeAction)));
  return makeWalletActionMessage(address, spendAction);
};
