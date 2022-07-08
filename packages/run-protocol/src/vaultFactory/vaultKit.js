// @ts-check
import { makeNotifierFromSubscriber } from '@agoric/notifier';
import '@agoric/zoe/exported.js';
import { Far } from '@endo/marshal';
import { makeVaultHolder } from './vaultHolder.js';

/**
 * Create a kit of utilities for use of the vault.
 *
 * @param {Vault} vault
 * @param {Subscriber<import('./vaultManager').AssetState>} assetSubscriber
 */
export const makeVaultKit = (vault, assetSubscriber) => {
  const { holder, helper } = makeVaultHolder(vault);
  const vaultKit = harden({
    publicNotifiers: {
      vault: holder.getNotifier(),
      asset: makeNotifierFromSubscriber(assetSubscriber),
    },
    invitationMakers: Far('invitation makers', {
      AdjustBalances: holder.makeAdjustBalancesInvitation,
      CloseVault: holder.makeCloseInvitation,
      TransferVault: holder.makeTransferInvitation,
    }),
    vault: holder,
    vaultUpdater: helper.getUpdater(),
  });
  return vaultKit;
};

/** @typedef {(ReturnType<typeof makeVaultKit>)} VaultKit */
