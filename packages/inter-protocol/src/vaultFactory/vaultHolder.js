/** @file Use-object for the owner of a vault */
import { Fail } from '@endo/errors';
import { AmountShape } from '@agoric/ertp';
import { M, prepareExoClassKit } from '@agoric/vat-data';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/index.js';
import { UnguardedHelperI } from '@agoric/internal/src/typeGuards.js';

/**
 * @typedef {{
 *   topicKit: import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<VaultNotification>;
 *   vault: Vault | null;
 * }} State
 */

const HolderI = M.interface('holder', {
  getCollateralAmount: M.call().returns(AmountShape),
  getCurrentDebt: M.call().returns(AmountShape),
  getNormalizedDebt: M.call().returns(AmountShape),
  getPublicTopics: M.call().returns(TopicsRecordShape),
  makeAdjustBalancesInvitation: M.call().returns(M.promise()),
  makeCloseInvitation: M.call().returns(M.promise()),
  makeTransferInvitation: M.call().returns(M.promise()),
});

/** @type {{ [name: string]: [description: string, valueShape: Pattern] }} */
const PUBLIC_TOPICS = {
  vault: ['Vault holder status', M.any()],
};

/**
 * @param {import('@agoric/swingset-liveslots').Baggage} baggage
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').MakeRecorderKit} makeRecorderKit
 */
export const prepareVaultHolder = (baggage, makeRecorderKit) => {
  const makeVaultHolderKit = prepareExoClassKit(
    baggage,
    'Vault Holder',
    {
      helper: UnguardedHelperI,
      holder: HolderI,
      invitationMakers: M.interface('invitationMakers', {
        AdjustBalances: M.call().returns(M.promise()),
        CloseVault: M.call().returns(M.promise()),
        TransferVault: M.call().returns(M.promise()),
      }),
    },
    /**
     * @param {Vault} vault
     * @param {StorageNode} storageNode
     * @returns {State}
     */
    (vault, storageNode) => {
      // must be the fully synchronous maker because the kit is held in durable state
      // @ts-expect-error XXX Patterns
      const topicKit = makeRecorderKit(storageNode, PUBLIC_TOPICS.vault[1]);

      return { topicKit, vault };
    },
    {
      helper: {
        /** @throws if this holder no longer owns the vault */
        owned() {
          const { vault } = this.state;
          if (!vault) {
            throw Fail`Using vault holder after transfer`;
          }
          return vault;
        },
        getUpdater() {
          return this.state.topicKit.recorder;
        },
      },
      invitationMakers: {
        AdjustBalances() {
          return this.facets.holder.makeAdjustBalancesInvitation();
        },
        CloseVault() {
          return this.facets.holder.makeCloseInvitation();
        },
        TransferVault() {
          return this.facets.holder.makeTransferInvitation();
        },
      },
      holder: {
        getPublicTopics() {
          const { topicKit } = this.state;
          return harden({
            vault: {
              description: PUBLIC_TOPICS.vault[0],
              subscriber: topicKit.subscriber,
              storagePath: topicKit.recorder.getStoragePath(),
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
         * Starting a transfer revokes the vault holder. The associated updater
         * will get a special notification that the vault is being transferred.
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
