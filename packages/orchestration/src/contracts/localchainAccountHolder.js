// @ts-check
/** @file Use-object for the owner of a localchain account */
import { AmountShape } from '@agoric/ertp';
import { UnguardedHelperI } from '@agoric/internal/src/typeGuards.js';
import { M, prepareExoClassKit } from '@agoric/vat-data';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';

const { Fail } = assert;
/**
 * @typedef {object} LocalChainAccountNotification
 * @property {string} address
 */

/**
 * @typedef {{
 *   topicKit: import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<LocalChainAccountNotification>;
 *   account: import('@agoric/vats/src/localchain.js').LocalChainAccount | null;
 * }} State
 */

const HolderI = M.interface('holder', {
  getPublicTopics: M.call().returns(TopicsRecordShape),
  makeDelegateInvitation: M.call(M.string(), AmountShape).returns(M.promise()),
  makeCloseInvitation: M.call().returns(M.promise()),
  makeTransferInvitation: M.call().returns(M.promise()),
});

/** @type {{ [name: string]: [description: string, valueShape: Pattern] }} */
const PUBLIC_TOPICS = {
  account: ['Account holder status', M.any()],
};

/**
 * @param {import('@agoric/ertp').Baggage} baggage
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').MakeRecorderKit} makeRecorderKit
 */
export const prepareAccountHolder = (baggage, makeRecorderKit) => {
  const makeAccountHolderKit = prepareExoClassKit(
    baggage,
    'Account Holder',
    {
      helper: UnguardedHelperI,
      holder: HolderI,
      invitationMakers: M.interface('invitationMakers', {
        Delegate: HolderI.payload.methodGuards.makeDelegateInvitation,
        CloseAccount: HolderI.payload.methodGuards.makeCloseInvitation,
        TransferAccount: HolderI.payload.methodGuards.makeTransferInvitation,
      }),
    },
    /**
     * @param {import('@agoric/vats/src/localchain.js').LocalChainAccount} account
     * @param {StorageNode} storageNode
     * @returns {State}
     */
    (account, storageNode) => {
      account || Fail`missing account param`;
      // must be the fully synchronous maker because the kit is held in durable state
      const topicKit = makeRecorderKit(storageNode, PUBLIC_TOPICS.account[1]);

      return { account, topicKit };
    },
    {
      helper: {
        /** @throws if this holder no longer owns the account */
        owned() {
          const { account } = this.state;
          if (!account) {
            throw Fail`Using account holder after transfer`;
          }
          return account;
        },
        getUpdater() {
          return this.state.topicKit.recorder;
        },
      },
      // Proxy to holder's makers for the Smart Wallet
      // TODO normalize this pattern with a utility
      invitationMakers: {
        Delegate(validatorAddress, amount) {
          return this.facets.holder.makeDelegateInvitation(
            validatorAddress,
            amount,
          );
        },
        CloseAccount() {
          return this.facets.holder.makeCloseInvitation();
        },
        TransferAccount() {
          return this.facets.holder.makeTransferInvitation();
        },
      },
      holder: {
        getPublicTopics() {
          const { topicKit } = this.state;
          return harden({
            account: {
              description: PUBLIC_TOPICS.account[0],
              subscriber: topicKit.subscriber,
              storagePath: topicKit.recorder.getStoragePath(),
            },
          });
        },
        /**
         * @param {string} validatorAddress
         * @param {Amount} amount
         */
        async makeDelegateInvitation(validatorAddress, amount) {
          console.log(
            'localchainAccountHolder makeDelegateInvitation',
            validatorAddress,
            amount,
          );

          const lca = this.facets.helper.owned();
          console.log('DEBUG lca', lca);
          const delegatorAddress = await E(lca).getAddress();
          const result = E(lca).executeTx([
            {
              '@type': '/cosmos.staking.v1beta1.MsgDelegate',
              obj: {
                amount: 'FIXME',
                validatorAddress,
                delegatorAddress,
              },
            },
          ]);
        },
        makeCloseInvitation() {
          throw Error('not yet implemented');
        },
        /**
         * Starting a transfer revokes the account holder. The associated updater
         * will get a special notification that the account is being transferred.
         */
        makeTransferInvitation() {
          throw Error('not yet implemented');
        },
      },
    },
  );
  return makeAccountHolderKit;
};
