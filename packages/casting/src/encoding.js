// @ts-check
/* eslint-disable no-unused-vars -- missing types imports */
/* eslint-disable import/no-extraneous-dependencies -- FIXME */
import {
  SwingsetMsgs,
  SwingsetRegistry,
  zeroFee,
} from '@agoric/wallet-ui/src/util/keyManagement.js';
import { toBase64 } from '@cosmjs/encoding';
import { SigningStargateClient } from '@cosmjs/stargate';
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils.js';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx.js';

/**
 * @param {import('@cosmjs/proto-signing').OfflineSigner} offlineSigner
 * @param {import('./types.js').ApplyMethodPayload} actionPayload
 * @returns {Promise<TxRaw>}
 */
export const prepareActionTransaction = async (
  offlineSigner,
  actionPayload,
) => {
  console.log('sendAction', actionPayload);
  const signingClient = await SigningStargateClient.offline(offlineSigner, {
    registry: SwingsetRegistry,
  });
  const accounts = await offlineSigner.getAccounts();
  assert.equal(accounts.length, 1);
  const { address } = accounts[0];
  const act1 = {
    typeUrl: SwingsetMsgs.MsgWalletSpendAction.typeUrl,
    /** @type {import('@agoric/wallet-ui/src/util/keyManagement.js').WalletAction} */
    value: {
      owner: toBase64(toAccAddress(address)),
      // ??? document how this works
      action: JSON.stringify(actionPayload),
    },
  };

  const msgs = [act1];
  console.log('sign spend action', { address, msgs });

  return signingClient.sign(
    address,
    msgs,
    zeroFee(),
    'casting leader sendAction',
    {
      accountNumber: 123, // FIXME
      chainId: 'FIXME',
      sequence: 1, // FIXME
    },
  );
};
