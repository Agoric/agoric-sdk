/**
 * @file Use-object for the owner of a vault
 */
// @ts-check
import '@agoric/zoe/exported.js';

import { makeStoredPublishKit } from '@agoric/notifier';
import {
  defineDurableKindMulti,
  M,
  makeKindHandle,
  vivifyFarClass,
} from '@agoric/vat-data';
import { AmountShape } from '@agoric/ertp';
import { makeEphemeraProvider } from '../contractSupport.js';

const { details: X } = assert;

const SubscriberShape = M.remotable('Subscriber');
const InvitationShape = M.remotable('Invitation');

// TODO share interface with vaults
const VaultHolderI = M.interface('VaultHolder', {
  getSubscriber: M.call().returns(SubscriberShape),
  makeAdjustBalancesInvitation: M.call().returns(InvitationShape),
  makeCloseInvitation: M.call().returns(InvitationShape),
  makeTransferInvitation: M.call().returns(InvitationShape),
  getCollateralAmount: M.call().returns(AmountShape),
  getCurrentDebt: M.call().returns(AmountShape),
  getNormalizedDebt: M.call().returns(AmountShape),
});

// XXX durable key to an ephemeral object
// UNTIL https://github.com/Agoric/agoric-sdk/issues/4567
let holderId = 0n;
/**
 * @typedef {{
 * holderId: bigint,
 * vault: Vault | null,
 * }} State
 */
/**
 * @type {(key: bigint) => {
 * publisher: StoredPublishKit<VaultNotification>['publisher'],
 * subscriber: StoredPublishKit<VaultNotification>['subscriber'],
 * }} */
// @ts-expect-error not yet defined
const provideEphemera = makeEphemeraProvider(() => ({}));

/**
 * @param context
 * @param context.state
 * @param context.state.vault
 * @throws if this holder no longer owns the vault
 */
const owned = ({ state: { vault } }) => {
  assert(vault, X`Using vault holder after transfer`);
  return vault;
};

const vivifyVaultHolder = baggage => {
  const makeHolder = vivifyFarClass(
    baggage,
    `VaultHolder`,
    VaultHolderI,
    (vault, subscriber) => {
      holderId += 1n;
      const ephemera = provideEphemera(holderId);
      // UNTIL https://github.com/Agoric/agoric-sdk/issues/4567
      Object.assign(ephemera, { subscriber });

      return { holderId, vault };
    },
    {
      getSubscriber() {
        return provideEphemera(this.state.holderId).subscriber;
      },
      makeAdjustBalancesInvitation() {
        return owned(this).makeAdjustBalancesInvitation();
      },
      makeCloseInvitation() {
        return owned(this).makeCloseInvitation();
      },
      /**
       * Starting a transfer revokes the vault holder. The associated updater will
       * get a special notification that the vault is being transferred.
       *
       */
      makeTransferInvitation() {
        const { state } = this;
        const vault = owned(this);
        state.vault = null;
        return vault.makeTransferInvitation();
      },
      // for status/debugging
      getCollateralAmount() {
        return owned(this).getCollateralAmount();
      },
      getCurrentDebt() {
        return owned(this).getCurrentDebt();
      },
      getNormalizedDebt() {
        return owned(this).getNormalizedDebt();
      },
    },
  );
  const makeVaultHolder = (vault, storageNode, marshaller) => {
    /** @type {StoredPublishKit<VaultNotification>} */
    const { subscriber, publisher } = makeStoredPublishKit(
      storageNode,
      marshaller,
    );
    const holder = makeHolder(vault, subscriber);
    return harden({ holder, updater: publisher });
  };
  return makeVaultHolder;
};
/**
 *
 * @param {Vault} vault
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<Marshaller>} marshaller
 * @returns {State}
 */

export const makeVaultHolder = defineDurableKindMulti(
  makeKindHandle('VaultHolder'),
  initState,
  behavior,
);
