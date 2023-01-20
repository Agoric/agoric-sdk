/**
 * @file Use-object for the owner of a vault
 */
import { AmountShape } from '@agoric/ertp';
import {
  makeStoredSubscriber,
  SubscriberShape,
  vivifyDurablePublishKit,
} from '@agoric/notifier';
import { M, defineExoKitFactory } from '@agoric/vat-data';
import { makeEphemeraProvider } from '../contractSupport.js';
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
  getSubscriber: M.call().returns(SubscriberShape),
  makeAdjustBalancesInvitation: M.call().returns(M.promise()),
  makeCloseInvitation: M.call().returns(M.promise()),
  makeTransferInvitation: M.call().returns(M.promise()),
});
/**
 *
 * @param {import('@agoric/ertp').Baggage} baggage
 */
export const vivifyVaultHolder = baggage => {
  const makeVaultHolderPublishKit = vivifyDurablePublishKit(
    baggage,
    'Vault Holder publish kit',
  );

  const makeVaultHolderKit = defineExoKitFactory(
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
     * @param {ERef<Marshaller>} marshaller
     * @returns {State}
     */
    (vault, storageNode, marshaller) => {
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
        /** @returns {StoredSubscriber<VaultNotification>} */
        getSubscriber() {
          const ephemera = provideEphemera(this.state.subscriber);
          return ephemera.storedSubscriber;
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
