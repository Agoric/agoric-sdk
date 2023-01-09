/**
 * @file Use-object for the owner of a vault
 */
import { AmountShape } from '@agoric/ertp';
import { makeStoredPublishKit, SubscriberShape } from '@agoric/notifier';
import { defineDurableFarClassKit, M, makeKindHandle } from '@agoric/vat-data';
import { makeEphemeraProvider } from '../contractSupport.js';

const { Fail } = assert;

// XXX durable key to an ephemeral object
// UNTIL https://github.com/Agoric/agoric-sdk/issues/4567
let holderId = 0n;

/**
 * @type {(key: bigint) => {
 * publisher: StoredPublishKit<VaultNotification>['publisher'],
 * subscriber: StoredPublishKit<VaultNotification>['subscriber'],
 * }} */
// @ts-expect-error not yet defined
const provideEphemera = makeEphemeraProvider(() => ({}));

/**
 * @typedef {{
 * holderId: bigint,
 * vault: Vault | null,
 * }} State
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

  holderId += 1n;
  const ephemera = provideEphemera(holderId);
  // UNTIL https://github.com/Agoric/agoric-sdk/issues/4567
  Object.assign(ephemera, { subscriber, publisher });

  return { holderId, vault };
};

const helper = {
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
    return provideEphemera(this.state.holderId).publisher;
  },
};

const holder = {
  getSubscriber() {
    return provideEphemera(this.state.holderId).subscriber;
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
};

export const makeVaultHolder = defineDurableFarClassKit(
  makeKindHandle('VaultHolder'),
  {
    helper: M.interface(
      'helper',
      // helper not exposed so guard not necessary
      {},
      { sloppy: true },
    ),
    holder: M.interface('holder', {
      getCollateralAmount: M.call().returns(AmountShape),
      getCurrentDebt: M.call().returns(AmountShape),
      getNormalizedDebt: M.call().returns(AmountShape),
      getSubscriber: M.call().returns(SubscriberShape),
      makeAdjustBalancesInvitation: M.call().returns(M.promise()),
      makeCloseInvitation: M.call().returns(M.promise()),
      makeTransferInvitation: M.call().returns(M.promise()),
    }),
  },
  initState,
  { helper, holder },
);
