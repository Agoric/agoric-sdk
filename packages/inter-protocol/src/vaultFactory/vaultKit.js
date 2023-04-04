import '@agoric/zoe/exported.js';

import { makeTracer } from '@agoric/internal';
import { prepareVaultHolder } from './vaultHolder.js';

const trace = makeTracer('VK', false);

/**
 * Wrap the VaultHolder duration object in a record suitable for the result of an invitation.
 *
 * @param {import('@agoric/ertp').Baggage} baggage
 * @param {ERef<Marshaller>} marshaller
 */
export const prepareVaultKit = (baggage, marshaller) => {
  trace('prepareVaultKit', [...baggage.keys()]);

  const makeVaultHolder = prepareVaultHolder(baggage, marshaller);
  /**
   * Create a kit of utilities for use of the vault.
   *
   * @param {Vault} vault
   * @param {StorageNode} storageNode
   */
  const makeVaultKit = (vault, storageNode) => {
    trace('prepareVaultKit makeVaultKit');
    const { holder, helper, invitationMakers } = makeVaultHolder(
      vault,
      storageNode,
    );
    const holderTopics = holder.getPublicTopics();
    const vaultKit = harden({
      publicSubscribers: {
        vault: holderTopics.vault,
      },
      invitationMakers,
      vault: holder,
      vaultUpdater: helper.getUpdater(),
    });
    return vaultKit;
  };
  return makeVaultKit;
};

/** @typedef {(ReturnType<ReturnType<typeof prepareVaultKit>>)} VaultKit */
