import { makeTracer } from '@agoric/internal';
import '@agoric/zoe/exported.js';
import { Far } from '@endo/marshal';
import { prepareVaultHolder } from './vaultHolder.js';

const trace = makeTracer('IV');

/**
 *
 * @param {import('@agoric/ertp').Baggage} baggage
 * @param {ERef<Marshaller>} marshaller
 */
export const prepareVaultKit = (baggage, marshaller) => {
  trace('prepareVaultKit', baggage);

  const makeVaultHolder = prepareVaultHolder(baggage, marshaller);
  /**
   * Create a kit of utilities for use of the vault.
   *
   * @param {Vault} vault
   * @param {StorageNode} storageNode
   */
  const makeVaultKit = (vault, storageNode) => {
    trace('prepareVaultKit makeVaultKit');
    const { holder, helper } = makeVaultHolder(vault, storageNode);
    const holderTopics = holder.getPublicTopics();
    const vaultKit = harden({
      publicSubscribers: {
        vault: holderTopics.vault,
      },
      invitationMakers: Far('invitation makers', {
        AdjustBalances: () => holder.makeAdjustBalancesInvitation(),
        CloseVault: () => holder.makeCloseInvitation(),
        TransferVault: () => holder.makeTransferInvitation(),
      }),
      vault: holder,
      vaultUpdater: helper.getUpdater(),
    });
    return vaultKit;
  };
  return makeVaultKit;
};

/** @typedef {(ReturnType<ReturnType<typeof prepareVaultKit>>)} VaultKit */
