/**
 * @file Use-object for the owner of a vault
 */
import { AmountShape } from '@agoric/ertp';
import {
  makeStoredSubscriber,
  prepareDurablePublishKit,
} from '@agoric/notifier';
import { M, prepareExoClassKit } from '@agoric/vat-data';
import { makeEphemeralStoredSubscriberProvider } from '@agoric/zoe/src/contractSupport/durability.js';
import { makeEphemeraProvider } from '@agoric/zoe/src/contractSupport/index.js';
import {
  fulfilledTopicMetasRecord,
  TopicMetasRecordShape,
} from '../contractSupport.js';
import { UnguardedHelperI } from '../typeGuards.js';

const { Fail } = assert;

/**
 * Ephemera are the elements of state that cannot (or need not) be durable.
 *
 * @type {(durableSubscriber: Subscriber<VaultNotification>) => {
 * storedSubscriber: StoredSubscriber<VaultNotification>,
 * }} */
// @ts-expect-error not yet defined
const provideEphemera = makeEphemeraProvider(() => ({}));

const provideStoredSubscriber = makeEphemeralStoredSubscriberProvider();

/**
 * @typedef {{
 * publisher: PublishKit<VaultNotification>['publisher'],
 * subscriber: PublishKit<VaultNotification>['subscriber'],
 * vault: Vault | null,
 * }} State
 */

const HolderI = M.interface('holder', {
  getCollateralAmount: M.call().returns(AmountShape),
  getCurrentDebt: M.call().returns(AmountShape),
  getNormalizedDebt: M.call().returns(AmountShape),
  getTopics: M.call().returns(M.promise()), // TopicMetasRecord
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
     * @param {ERef<StorageNode>} storageNode
     * @returns {State}
     */
    (vault, storageNode) => {
      /** @type {PublishKit<VaultNotification>} */
      const { subscriber, publisher } = makeVaultHolderPublishKit();

      const ephemera = provideEphemera(subscriber);
      ephemera.storedSubscriber = makeStoredSubscriber(
        subscriber,
        storageNode,
        marshaller,
      );

      return { subscriber, publisher, vault };
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
        async getTopics() {
          const { subscriber } = this.state;
          const ephemera = provideEphemera(this.state.subscriber);
          return fulfilledTopicMetasRecord(
            /** @type {const} */ ({
              vault: {
                subscriber,
                vstoragePath: ephemera.storedSubscriber.getPath(),
              },
            }),
          );
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
