/** @file Use-object for the owner of a staking account */
import { toRequestQueryJson } from '@agoric/cosmic-proto';
import {
  QueryBalanceRequest,
  QueryBalanceResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import {
  MsgWithdrawDelegatorReward,
  MsgWithdrawDelegatorRewardResponse,
} from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/tx.js';
import {
  MsgBeginRedelegate,
  MsgDelegate,
  MsgDelegateResponse,
  MsgUndelegate,
  MsgUndelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { AmountShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { M } from '@agoric/vat-data';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/index.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { decodeBase64 } from '@endo/base64';
import { E } from '@endo/far';
import {
  AmountArgShape,
  ChainAddressShape,
  ChainAmountShape,
  DelegationShape,
} from '../typeGuards.js';
import {
  encodeTxResponse,
  maxClockSkew,
  tryDecodeResponse,
} from '../utils/cosmos.js';
import { orchestrationAccountMethods } from '../utils/orchestrationAccount.js';
import { dateInSeconds } from '../utils/time.js';

/**
 * @import {AmountArg, IcaAccount, ChainAddress, CosmosValidatorAddress, ICQConnection, StakingAccountActions, DenomAmount, OrchestrationAccountI, DenomArg} from '../types.js';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js';
 * @import {Coin} from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
 * @import {Delegation} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/staking.js';
 * @import {Remote} from '@agoric/internal';
 * @import {TimerService} from '@agoric/time';
 * @import {Zone} from '@agoric/zone';
 */

const trace = makeTracer('ComosOrchestrationAccountHolder');

const { Fail } = assert;
/**
 * @typedef {object} ComosOrchestrationAccountNotification
 * @property {ChainAddress} chainAddress
 */

/**
 * @typedef {{
 *   topicKit: RecorderKit<ComosOrchestrationAccountNotification>;
 *   account: IcaAccount;
 *   chainAddress: ChainAddress;
 *   icqConnection: ICQConnection;
 *   bondDenom: string;
 *   timer: Remote<TimerService>;
 * }} State
 */

/** @see {OrchestrationAccountI} */
export const IcaAccountHolderI = M.interface('IcaAccountHolder', {
  ...orchestrationAccountMethods,
  asContinuingOffer: M.call().returns({
    publicSubscribers: M.any(),
    invitationMakers: M.any(),
    holder: M.any(),
  }),
  getPublicTopics: M.call().returns(TopicsRecordShape),
  delegate: M.callWhen(ChainAddressShape, AmountShape).returns(M.undefined()),
  redelegate: M.callWhen(
    ChainAddressShape,
    ChainAddressShape,
    AmountShape,
  ).returns(M.undefined()),
  withdrawReward: M.callWhen(ChainAddressShape).returns(
    M.arrayOf(ChainAmountShape),
  ),
  withdrawRewards: M.callWhen().returns(M.arrayOf(ChainAmountShape)),
  undelegate: M.callWhen(M.arrayOf(DelegationShape)).returns(M.undefined()),
});

/** @type {{ [name: string]: [description: string, valueShape: Pattern] }} */
const PUBLIC_TOPICS = {
  account: ['Staking Account holder status', M.any()],
};

export const trivialDelegateResponse = encodeTxResponse(
  {},
  MsgDelegateResponse.toProtoMsg,
);

const expect = (actual, expected, message) => {
  if (actual !== expected) {
    console.log(message, { actual, expected });
  }
};

/** @type {(c: { denom: string; amount: string }) => DenomAmount} */
const toDenomAmount = c => ({ denom: c.denom, value: BigInt(c.amount) });

/**
 * @param {Zone} zone
 * @param {MakeRecorderKit} makeRecorderKit
 * @param {ZCF} zcf
 */
export const prepareCosmosOrchestrationAccountKit = (
  zone,
  makeRecorderKit,
  zcf,
) => {
  const makeCosmosOrchestrationAccountKit = zone.exoClassKit(
    'Staking Account Holder',
    {
      helper: M.interface('helper', {
        owned: M.call().returns(M.remotable()),
        getUpdater: M.call().returns(M.remotable()),
        amountToCoin: M.call(AmountShape).returns(M.record()),
      }),
      holder: IcaAccountHolderI,
      invitationMakers: M.interface('invitationMakers', {
        Delegate: M.callWhen(ChainAddressShape, AmountShape).returns(
          InvitationShape,
        ),
        Redelegate: M.callWhen(
          ChainAddressShape,
          ChainAddressShape,
          AmountArgShape,
        ).returns(InvitationShape),
        WithdrawReward: M.callWhen(ChainAddressShape).returns(InvitationShape),
        Undelegate: M.callWhen(M.arrayOf(DelegationShape)).returns(
          InvitationShape,
        ),
        CloseAccount: M.callWhen().returns(InvitationShape),
        TransferAccount: M.callWhen().returns(InvitationShape),
      }),
    },
    /**
     * @param {ChainAddress} chainAddress
     * @param {string} bondDenom e.g. 'uatom'
     * @param {object} io
     * @param {IcaAccount} io.account
     * @param {Remote<StorageNode>} io.storageNode
     * @param {ICQConnection} io.icqConnection
     * @param {Remote<TimerService>} io.timer
     * @returns {State}
     */
    (chainAddress, bondDenom, io) => {
      const { storageNode, ...rest } = io;
      // must be the fully synchronous maker because the kit is held in durable state
      // @ts-expect-error XXX Patterns
      const topicKit = makeRecorderKit(storageNode, PUBLIC_TOPICS.account[1]);

      return { chainAddress, bondDenom, topicKit, ...rest };
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
        /**
         * @param {AmountArg} amount
         * @returns {Coin}
         */
        amountToCoin(amount) {
          const { bondDenom } = this.state;
          if ('denom' in amount) {
            assert.equal(amount.denom, bondDenom);
          } else {
            trace('TODO: handle brand', amount);
            // FIXME(#9211) brand handling
          }
          return harden({
            denom: bondDenom,
            amount: String(amount.value),
          });
        },
      },
      invitationMakers: {
        /**
         * @param {CosmosValidatorAddress} validator
         * @param {Amount<'nat'>} amount
         */
        Delegate(validator, amount) {
          trace('Delegate', validator, amount);

          return zcf.makeInvitation(async seat => {
            seat.exit();
            return this.facets.holder.delegate(validator, amount);
          }, 'Delegate');
        },
        /**
         * @param {CosmosValidatorAddress} srcValidator
         * @param {CosmosValidatorAddress} dstValidator
         * @param {AmountArg} amount
         */
        Redelegate(srcValidator, dstValidator, amount) {
          trace('Redelegate', srcValidator, dstValidator, amount);

          return zcf.makeInvitation(async seat => {
            seat.exit();
            return this.facets.holder.redelegate(
              srcValidator,
              dstValidator,
              amount,
            );
          }, 'Redelegate');
        },
        /** @param {CosmosValidatorAddress} validator */
        WithdrawReward(validator) {
          trace('WithdrawReward', validator);

          return zcf.makeInvitation(async seat => {
            seat.exit();
            return this.facets.holder.withdrawReward(validator);
          }, 'WithdrawReward');
        },
        /** @param {Delegation[]} delegations */
        Undelegate(delegations) {
          trace('Undelegate', delegations);

          return zcf.makeInvitation(async seat => {
            seat.exit();
            return this.facets.holder.undelegate(delegations);
          }, 'Undelegate');
        },
        CloseAccount() {
          throw Error('not yet implemented');
        },
        /**
         * Starting a transfer revokes the account holder. The associated
         * updater will get a special notification that the account is being
         * transferred.
         */
        TransferAccount() {
          throw Error('not yet implemented');
        },
      },
      holder: {
        asContinuingOffer() {
          const { holder, invitationMakers } = this.facets;
          return harden({
            publicSubscribers: holder.getPublicTopics(),
            invitationMakers,
            holder,
          });
        },
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

        // TODO move this beneath the Orchestration abstraction,
        // to the OrchestrationAccount provided by makeAccount()
        /** @returns {ChainAddress} */
        getAddress() {
          return this.state.chainAddress;
        },
        /**
         * _Assumes users has already sent funds to their ICA, until #9193
         *
         * @param {CosmosValidatorAddress} validator
         * @param {AmountArg} amount
         */
        async delegate(validator, amount) {
          trace('delegate', validator, amount);
          const { helper } = this.facets;
          const { chainAddress } = this.state;

          const result = await E(helper.owned()).executeEncodedTx([
            Any.toJSON(
              MsgDelegate.toProtoMsg({
                delegatorAddress: chainAddress.address,
                validatorAddress: validator.address,
                amount: helper.amountToCoin(amount),
              }),
            ),
          ]);

          expect(result, trivialDelegateResponse, 'MsgDelegateResponse');
        },
        async deposit(payment) {
          trace('deposit', payment);
          console.error(
            'FIXME deposit noop until https://github.com/Agoric/agoric-sdk/issues/9193',
          );
        },
        async getBalances() {
          throw Error('not yet implemented');
        },
        /**
         * _Assumes users has already sent funds to their ICA, until #9193
         *
         * @param {CosmosValidatorAddress} srcValidator
         * @param {CosmosValidatorAddress} dstValidator
         * @param {AmountArg} amount
         */
        async redelegate(srcValidator, dstValidator, amount) {
          trace('redelegate', srcValidator, dstValidator, amount);
          const { helper } = this.facets;
          const { chainAddress } = this.state;

          // NOTE: response, including completionTime, is currently discarded.
          await E(helper.owned()).executeEncodedTx([
            Any.toJSON(
              MsgBeginRedelegate.toProtoMsg({
                delegatorAddress: chainAddress.address,
                validatorSrcAddress: srcValidator.address,
                validatorDstAddress: dstValidator.address,
                amount: helper.amountToCoin(amount),
              }),
            ),
          ]);
        },

        /**
         * @param {CosmosValidatorAddress} validator
         * @returns {Promise<DenomAmount[]>}
         */
        async withdrawReward(validator) {
          trace('withdrawReward', validator);
          const { helper } = this.facets;
          const { chainAddress } = this.state;
          const msg = MsgWithdrawDelegatorReward.toProtoMsg({
            delegatorAddress: chainAddress.address,
            validatorAddress: validator.address,
          });
          const account = helper.owned();
          const result = await E(account).executeEncodedTx([Any.toJSON(msg)]);
          const response = tryDecodeResponse(
            result,
            MsgWithdrawDelegatorRewardResponse.fromProtoMsg,
          );
          trace('withdrawReward response', response);
          const { amount: coins } = response;
          return harden(coins.map(toDenomAmount));
        },
        /**
         * @param {DenomArg} denom
         * @returns {Promise<DenomAmount>}
         */
        async getBalance(denom) {
          const { chainAddress, icqConnection } = this.state;
          // TODO #9211 lookup denom from brand
          assert.typeof(denom, 'string');

          const [result] = await E(icqConnection).query([
            toRequestQueryJson(
              QueryBalanceRequest.toProtoMsg({
                address: chainAddress.address,
                denom,
              }),
            ),
          ]);
          if (!result?.key) throw Fail`Error parsing result ${result}`;
          const { balance } = QueryBalanceResponse.decode(
            decodeBase64(result.key),
          );
          if (!balance) throw Fail`Result lacked balance key: ${result}`;
          return harden(toDenomAmount(balance));
        },

        send(toAccount, amount) {
          console.log('send got', toAccount, amount);
          throw Error('not yet implemented');
        },

        transfer(amount, msg) {
          console.log('transferSteps got', amount, msg);
          throw Error('not yet implemented');
        },

        transferSteps(amount, msg) {
          console.log('transferSteps got', amount, msg);
          throw Error('not yet implemented');
        },

        withdrawRewards() {
          throw assert.error('Not implemented');
        },

        /** @param {Delegation[]} delegations */
        async undelegate(delegations) {
          trace('undelegate', delegations);
          const { helper } = this.facets;
          const { chainAddress, bondDenom, timer } = this.state;

          const result = await E(helper.owned()).executeEncodedTx(
            delegations.map(d =>
              Any.toJSON(
                MsgUndelegate.toProtoMsg({
                  delegatorAddress: chainAddress.address,
                  validatorAddress: d.validatorAddress,
                  amount: { denom: bondDenom, amount: d.shares },
                }),
              ),
            ),
          );

          const response = tryDecodeResponse(
            result,
            MsgUndelegateResponse.fromProtoMsg,
          );
          trace('undelegate response', response);
          const { completionTime } = response;

          await E(timer).wakeAt(dateInSeconds(completionTime) + maxClockSkew);
        },
      },
    },
  );

  return makeCosmosOrchestrationAccountKit;
};

/**
 * @typedef {ReturnType<
 *   ReturnType<typeof prepareCosmosOrchestrationAccountKit>
 * >} CosmosOrchestrationAccountKit
 */

/**
 * @param {Zone} zone
 * @param {MakeRecorderKit} makeRecorderKit
 * @param {ZCF} zcf
 * @returns {(
 *   ...args: Parameters<
 *     ReturnType<typeof prepareCosmosOrchestrationAccountKit>
 *   >
 * ) => CosmosOrchestrationAccountKit['holder']}
 */
export const prepareCosmosOrchestrationAccount = (
  zone,
  makeRecorderKit,
  zcf,
) => {
  const makeKit = prepareCosmosOrchestrationAccountKit(
    zone,
    makeRecorderKit,
    zcf,
  );
  return (...args) => makeKit(...args).holder;
};
/** @typedef {CosmosOrchestrationAccountKit['holder']} CosmosOrchestrationAccount */
