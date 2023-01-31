import { makeTracer } from '@agoric/internal';
import '@agoric/zoe/exported.js';
import { E } from '@endo/eventual-send';
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
   * @param {Subscriber<import('./vaultManager').AssetState>} assetSubscriber
   */
  const makeVaultKit = (vault, storageNode, assetSubscriber) => {
    trace('prepareVaultKit makeVaultKit');
    const { holder, helper } = makeVaultHolder(vault, storageNode);
    const holderTopics = holder.getTopics();
    holderTopics.then(ts =>
      console.log('DEBUG makeVaultKit awaited holderTopics', ts),
    );

    const vaultKit = harden({
      publicSubscribers: {
        // NB this is a plain Subscriber, before the introduction of TopicMeta
        // @deprecated get from manager directly https://github.com/Agoric/agoric-sdk/issues/5814
        asset: assetSubscriber,
        vault: E.get(holderTopics).vault,
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

/** @typedef {Awaited<ReturnType<ReturnType<typeof prepareVaultKit>>>} VaultKit */
