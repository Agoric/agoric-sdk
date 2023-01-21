import { makeTracer } from '@agoric/internal';
import '@agoric/zoe/exported.js';
import { Far } from '@endo/marshal';
import { prepareVaultHolder } from './vaultHolder.js';

const trace = makeTracer('IV');

export const prepareVaultKit = baggage => {
  trace('prepareVaultKit', baggage);

  const makeVaultHolder = prepareVaultHolder(baggage);
  /**
   * Create a kit of utilities for use of the vault.
   *
   * @param {Vault} vault
   * @param {ERef<StorageNode>} storageNode
   * @param {ERef<Marshaller>} marshaller
   * @param {Subscriber<import('./vaultManager').AssetState>} assetSubscriber
   */
  const makeVaultKit = (vault, storageNode, marshaller, assetSubscriber) => {
    trace('prepareVaultKit makeVaultKit');
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
  return makeVaultKit;
};

/** @typedef {(ReturnType<ReturnType<typeof prepareVaultKit>>)} VaultKit */
