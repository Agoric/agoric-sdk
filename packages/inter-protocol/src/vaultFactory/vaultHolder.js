/**
 * @file Use-object for the owner of a vault
 */
import { AmountShape } from '@agoric/ertp';
import {
  pipeTopicToStorage,
  prepareDurablePublishKit,
  SubscriberShape,
  TopicsRecordShape,
} from '@agoric/notifier';
import { M, prepareExoClassKit } from '@agoric/vat-data';
import { makeStorageNodePathProvider } from '@agoric/zoe/src/contractSupport/durability.js';
import { UnguardedHelperI } from '../typeGuards.js';

const { Fail } = assert;

/**
 * @typedef {{
 * publisher: PublishKit<VaultNotification>['publisher'],
 * subscriber: PublishKit<VaultNotification>['subscriber'],
 * storageNode: StorageNode,
 * vault: Vault | null,
 * }} State
 */

const HolderI = M.interface('holder', {
  getCollateralAmount: M.call().returns(AmountShape),
  getCurrentDebt: M.call().returns(AmountShape),
  getNormalizedDebt: M.call().returns(AmountShape),
  getSubscriber: M.call().returns(SubscriberShape),
  getPublicTopics: M.call().returns(TopicsRecordShape),
  makeAdjustBalancesInvitation: M.call().returns(M.promise()),
  makeCloseInvitation: M.call().returns(M.promise()),
  makeTransferInvitation: M.call().returns(M.promise()),
});
/**
 *
 * @param {import('@agoric/ertp').Baggage} baggage
 * @param {ERef<Marshaller>} marshaller
 */
export const prepareVaultHolder = (baggage, marshaller) => {
  const memoizedPath = makeStorageNodePathProvider(baggage);

  const makeVaultHolderPublishKit = prepareDurablePublishKit(
    baggage,
    'Vault Holder publish kit',
  );

  const makeVaultHolderKit = prepareExoClassKit(
    baggage,
    'Vault Holder',
    {
      helper: UnguardedHelperI,
      holder: HolderI,
    },
    /**
     *
     * @param {Vault} vault
     * @param {StorageNode} storageNode
     * @returns {State}
     */
    (vault, storageNode) => {
      /** @type {PublishKit<VaultNotification>} */
      const { subscriber, publisher } = makeVaultHolderPublishKit();

      pipeTopicToStorage(subscriber, storageNode, marshaller);

      return { publisher, storageNode, subscriber, vault };
    },
    {
      helper: {
        /**
         * @throws if this holder no longer owns the vault
         */
        owned() {
          const { vault } = this.state;
          if (!vault) {
            throw Fail`Using vault holder after transfer`;
          }
          return vault;
        },
        getUpdater() {
          return this.state.publisher;
        },
      },
      holder: {
        /** @deprecated use getPublicTopics */
        getSubscriber() {
          return this.state.subscriber;
        },
        getPublicTopics() {
          const { subscriber, storageNode } = this.state;
          return harden({
            vault: {
              description: 'Vault holder status',
              subscriber,
              storagePath: memoizedPath(storageNode),
            },
          });
        },
        makeAdjustBalancesInvitation() {
          return this.facets.helper.owned().makeAdjustBalancesInvitation();
        },
        makeCloseInvitation() {
          return this.facets.helper.owned().makeCloseInvitation();
        },
        /**
         * Starting a transfer revokes the vault holder. The associated updater will
         * get a special notification that the vault is being transferred.
         */
        makeTransferInvitation() {
          const vault = this.facets.helper.owned();
          this.state.vault = null;
          return vault.makeTransferInvitation();
        },
        // for status/debugging
        getCollateralAmount() {
          return this.facets.helper.owned().getCollateralAmount();
        },
        getCurrentDebt() {
          return this.facets.helper.owned().getCurrentDebt();
        },
        getNormalizedDebt() {
          return this.facets.helper.owned().getNormalizedDebt();
        },
      },
    },
  );
  return makeVaultHolderKit;
};
