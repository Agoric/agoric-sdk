// @ts-check
import '@agoric/zoe/exported.js';
import { Far } from '@endo/marshal';
import { makeVaultHolder } from './vaultHolder.js';

/**
 * Create a kit of utilities for use of the vault.
 *
 * @param {Vault} vault
 * @param {Notifier<import('./vaultManager').AssetState>} assetNotifier
 */
export const makeVaultKit = (vault, assetNotifier) => {
  const { title, helper } = makeVaultHolder(vault);
  const vaultKit = harden({
    publicNotifiers: {
      vault: title.getNotifier(),
      asset: assetNotifier,
    },
    invitationMakers: Far('invitation makers', {
      AdjustBalances: title.makeAdjustBalancesInvitation,
      CloseVault: title.makeCloseInvitation,
      TransferVault: title.makeTransferInvitation,
    }),
    vault: title,
    vaultUpdater: helper.getUpdater(),
  });
  return vaultKit;
};

/** @typedef {(ReturnType<typeof makeVaultKit>)} VaultKit */
