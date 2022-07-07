/**
 * @file Use-object for the owner of a vault
 */
// @ts-check
import { makeStoredPublishKit } from '@agoric/notifier';
import { defineDurableKindMulti, makeKindHandle } from '@agoric/vat-data';
import '@agoric/zoe/exported.js';

const { details: X } = assert;

/**
 * @typedef {{
 * publisher: StoredPublishKit<VaultNotification>['publisher'],
 * subscriber: StoredPublishKit<VaultNotification>['subscriber'],
 * vault: Vault | null,
 * }} State
 * @typedef {Readonly<{
 *   state: State,
 *   facets: {
 *     helper: import('@agoric/vat-data/src/types').KindFacet<typeof helper>,
 *     self: import('@agoric/vat-data/src/types').KindFacet<typeof holder>,
 *   },
 * }>} MethodContext
 */

/**
 *
 * @param {Vault} vault
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<Marshaller>} marshaller
 * @returns {State}
 */
const initState = (vault, storageNode, marshaller) => {
  /** @type {StoredPublishKit<VaultNotification>} */
  const { subscriber, publisher } = makeStoredPublishKit(
    storageNode,
    marshaller,
  );

  return { publisher, subscriber, vault };
};

const helper = {
  /**
   * @param {MethodContext} context
   * @throws if this holder no longer owns the vault
   */
  owned: ({ state }) => {
    const { vault } = state;
    assert(vault, X`Using vault holder after transfer`);
    return vault;
  },
  /** @param {MethodContext} context */
  getUpdater: ({ state }) => state.publisher,
};

const holder = {
  /** @param {MethodContext} context */
  getSubscriber: ({ state }) => state.subscriber,
  /** @param {MethodContext} context */
  makeAdjustBalancesInvitation: ({ facets }) =>
    facets.helper.owned().makeAdjustBalancesInvitation(),
  /** @param {MethodContext} context */
  makeCloseInvitation: ({ facets }) =>
    facets.helper.owned().makeCloseInvitation(),
  /**
   * Starting a transfer revokes the vault holder. The associated updater will
   * get a special notification that the vault is being transferred.
   *
   * @param {MethodContext} context
   */
  makeTransferInvitation: ({ state, facets }) => {
    const vault = facets.helper.owned();
    state.vault = null;
    return vault.makeTransferInvitation();
  },
  // for status/debugging
  /** @param {MethodContext} context */
  getCollateralAmount: ({ facets }) =>
    facets.helper.owned().getCollateralAmount(),
  /** @param {MethodContext} context */
  getCurrentDebt: ({ facets }) => facets.helper.owned().getCurrentDebt(),
  /** @param {MethodContext} context */
  getNormalizedDebt: ({ facets }) => facets.helper.owned().getNormalizedDebt(),
};

const behavior = { helper, holder };

export const makeVaultHolder = defineDurableKindMulti(
  makeKindHandle('VaultHolder'),
  initState,
  behavior,
);
