import '@agoric/zoe/exported.js';
import { Far } from '@endo/marshal';
import { makeVaultHolder } from './vaultHolder.js';

/**
 * Create a kit of utilities for use of the vault.
 *
 * @param {Vault} vault
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<Marshaller>} marshaller
 * @param {Subscriber<import('./vaultManager').AssetState>} assetSubscriber
 */
export const makeVaultKit = (
  vault,
  storageNode,
  marshaller,
  assetSubscriber,
) => {
  const { holder, helper } = makeVaultHolder(vault, storageNode, marshaller);
  const vaultKit = harden({
    publicSubscribers: {
      // XXX should come from manager directly https://github.com/Agoric/agoric-sdk/issues/5814
      asset: assetSubscriber,
      vault: holder.getSubscriber(),
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
