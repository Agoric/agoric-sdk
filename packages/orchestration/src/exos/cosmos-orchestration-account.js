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
  MsgUndelegate,
  MsgUndelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { makeTracer } from '@agoric/internal';
import { Shape as NetworkShape } from '@agoric/network';
import { M } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/index.js';
import { decodeBase64 } from '@endo/base64';
import { E } from '@endo/far';
import {
  AmountArgShape,
  ChainAddressShape,
  ChainAmountShape,
  CoinShape,
  DelegationShape,
} from '../typeGuards.js';
import { maxClockSkew, tryDecodeResponse } from '../utils/cosmos.js';
import { orchestrationAccountMethods } from '../utils/orchestrationAccount.js';
import { dateInSeconds } from '../utils/time.js';

/**
 * @import {AmountArg, IcaAccount, ChainAddress, CosmosValidatorAddress, ICQConnection, StakingAccountActions, DenomAmount, OrchestrationAccountI, DenomArg} from '../types.js';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js';
 * @import {Coin} from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
 * @import {Delegation} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/staking.js';
 * @import {Remote} from '@agoric/internal';
 * @import {TimerService} from '@agoric/time';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {ResponseQuery} from '@agoric/cosmic-proto/tendermint/abci/types.js';
 * @import {JsonSafe} from '@agoric/cosmic-proto';
 */

const trace = makeTracer('ComosOrchestrationAccountHolder');

const { Fail } = assert;
const { Vow$ } = NetworkShape; // TODO #9611

/**
 * @typedef {object} ComosOrchestrationAccountNotification
 * @property {ChainAddress} chainAddress
 */

/**
 * @typedef {{
 *   topicKit: RecorderKit<ComosOrchestrationAccountNotification>;
 *   account: IcaAccount;
 *   chainAddress: ChainAddress;
 *   icqConnection: ICQConnection | undefined;
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
  delegate: M.call(ChainAddressShape, AmountArgShape).returns(VowShape),
  redelegate: M.call(
    ChainAddressShape,
    ChainAddressShape,
    AmountArgShape,
  ).returns(VowShape),
  withdrawReward: M.call(ChainAddressShape).returns(
    Vow$(M.arrayOf(ChainAmountShape)),
  ),
  withdrawRewards: M.call().returns(Vow$(M.arrayOf(ChainAmountShape))),
  undelegate: M.call(M.arrayOf(DelegationShape)).returns(VowShape),
});

/** @type {{ [name: string]: [description: string, valueShape: Pattern] }} */
const PUBLIC_TOPICS = {
  account: ['Staking Account holder status', M.any()],
};

/** @type {(c: { denom: string; amount: string }) => DenomAmount} */
const toDenomAmount = c => ({ denom: c.denom, value: BigInt(c.amount) });

/**
 * @param {Zone} zone
 * @param {MakeRecorderKit} makeRecorderKit
 * @param {VowTools} vowTools
 * @param {ZCF} zcf
 */
export const prepareCosmosOrchestrationAccountKit = (
  zone,
  makeRecorderKit,
  { watch, asVow },
  zcf,
) => {
  const makeCosmosOrchestrationAccountKit = zone.exoClassKit(
    'Staking Account Holder',
    {
      helper: M.interface('helper', {
        owned: M.call().returns(M.remotable()),
        getUpdater: M.call().returns(M.remotable()),
        amountToCoin: M.call(AmountArgShape).returns(M.record()),
      }),
      returnVoidWatcher: M.interface('returnVoidWatcher', {
        onFulfilled: M.call(M.or(M.string(), M.record()))
          .optional(M.arrayOf(M.undefined()))
          .returns(M.undefined()),
      }),
      balanceQueryWatcher: M.interface('balanceQueryWatcher', {
        onFulfilled: M.call(M.arrayOf(M.record()))
          .optional(M.arrayOf(M.undefined())) // empty context
          .returns(M.or(M.record(), M.undefined())),
      }),
      undelegateWatcher: M.interface('undelegateWatcher', {
        onFulfilled: M.call(M.string())
          .optional(M.arrayOf(M.undefined())) // empty context
          .returns(Vow$(M.promise())),
      }),
      withdrawRewardWatcher: M.interface('withdrawRewardWatcher', {
        onFulfilled: M.call(M.string())
          .optional(M.arrayOf(M.undefined())) // empty context
          .returns(M.arrayOf(CoinShape)),
      }),
      holder: IcaAccountHolderI,
      invitationMakers: M.interface('invitationMakers', {
        Delegate: M.call(ChainAddressShape, AmountArgShape).returns(
          M.promise(),
        ),
        Redelegate: M.call(
          ChainAddressShape,
          ChainAddressShape,
          AmountArgShape,
        ).returns(M.promise()),
        WithdrawReward: M.call(ChainAddressShape).returns(M.promise()),
        Undelegate: M.call(M.arrayOf(DelegationShape)).returns(M.promise()),
        CloseAccount: M.call().returns(M.promise()),
        TransferAccount: M.call().returns(M.promise()),
      }),
    },
    /**
     * @param {ChainAddress} chainAddress
     * @param {string} bondDenom e.g. 'uatom'
     * @param {object} io
     * @param {IcaAccount} io.account
     * @param {Remote<StorageNode>} io.storageNode
     * @param {ICQConnection | undefined} io.icqConnection
     * @param {Remote<TimerService>} io.timer
     * @returns {State}
     */
    (chainAddress, bondDenom, io) => {
      const { storageNode, ...rest } = io;
      // must be the fully synchronous maker because the kit is held in durable state
      // @ts-expect-error XXX Patterns
      const topicKit = makeRecorderKit(storageNode, PUBLIC_TOPICS.account[1]);
      // TODO determine what goes in vstorage https://github.com/Agoric/agoric-sdk/issues/9066
      void E(topicKit.recorder).write('');

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
      balanceQueryWatcher: {
        /**
         * @param {JsonSafe<ResponseQuery>[]} results
         */
        onFulfilled([result]) {
          if (!result?.key) throw Fail`Error parsing result ${result}`;
          const { balance } = QueryBalanceResponse.decode(
            decodeBase64(result.key),
          );
          if (!balance) throw Fail`Result lacked balance key: ${result}`;
          return harden(toDenomAmount(balance));
        },
      },
      undelegateWatcher: {
        /**
         * @param {string} result
         */
        onFulfilled(result) {
          const response = tryDecodeResponse(
            result,
            MsgUndelegateResponse.fromProtoMsg,
          );
          trace('undelegate response', response);
          const { completionTime } = response;
          completionTime || Fail`No completion time result ${result}`;
          return watch(
            E(this.state.timer).wakeAt(
              dateInSeconds(completionTime) + maxClockSkew,
            ),
          );
        },
      },
      /**
       * takes an array of results (from `executeEncodedTx`) and returns void
       * since we are not interested in the result
       */
      returnVoidWatcher: {
        /** @param {string | Record<string, unknown>} result */
        onFulfilled(result) {
          trace('Result', result);
          return undefined;
        },
      },
      withdrawRewardWatcher: {
        /** @param {string} result */
        onFulfilled(result) {
          const response = tryDecodeResponse(
            result,
            MsgWithdrawDelegatorRewardResponse.fromProtoMsg,
          );
          trace('withdrawReward response', response);
          const { amount: coins } = response;
          return harden(coins.map(toDenomAmount));
        },
      },
      invitationMakers: {
        /**
         * @param {CosmosValidatorAddress} validator
         * @param {AmountArg} amount
         */
        Delegate(validator, amount) {
          trace('Delegate', validator, amount);

          return zcf.makeInvitation(seat => {
            seat.exit();
            return watch(this.facets.holder.delegate(validator, amount));
          }, 'Delegate');
        },
        /**
         * @param {CosmosValidatorAddress} srcValidator
         * @param {CosmosValidatorAddress} dstValidator
         * @param {AmountArg} amount
         */
        Redelegate(srcValidator, dstValidator, amount) {
          trace('Redelegate', srcValidator, dstValidator, amount);

          return zcf.makeInvitation(seat => {
            seat.exit();
            return watch(
              this.facets.holder.redelegate(srcValidator, dstValidator, amount),
            );
          }, 'Redelegate');
        },
        /** @param {CosmosValidatorAddress} validator */
        WithdrawReward(validator) {
          trace('WithdrawReward', validator);

          return zcf.makeInvitation(seat => {
            seat.exit();
            return watch(this.facets.holder.withdrawReward(validator));
          }, 'WithdrawReward');
        },
        /** @param {Omit<Delegation, 'delegatorAddress'>[]} delegations */
        Undelegate(delegations) {
          trace('Undelegate', delegations);

          return zcf.makeInvitation(seat => {
            seat.exit();
            return watch(this.facets.holder.undelegate(delegations));
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
        delegate(validator, amount) {
          return asVow(() => {
            trace('delegate', validator, amount);
            const { helper } = this.facets;
            const { chainAddress } = this.state;

            const results = E(helper.owned()).executeEncodedTx([
              Any.toJSON(
                MsgDelegate.toProtoMsg({
                  delegatorAddress: chainAddress.address,
                  validatorAddress: validator.address,
                  amount: helper.amountToCoin(amount),
                }),
              ),
            ]);
            return watch(results, this.facets.returnVoidWatcher);
          });
        },
        deposit(payment) {
          trace('deposit', payment);
          console.error(
            'FIXME deposit noop until https://github.com/Agoric/agoric-sdk/issues/9193',
          );
        },
        getBalances() {
          // TODO https://github.com/Agoric/agoric-sdk/issues/9610
          return asVow(() => Fail`not yet implemented`);
        },
        /**
         * _Assumes users has already sent funds to their ICA, until #9193
         *
         * @param {CosmosValidatorAddress} srcValidator
         * @param {CosmosValidatorAddress} dstValidator
         * @param {AmountArg} amount
         */
        redelegate(srcValidator, dstValidator, amount) {
          return asVow(() => {
            trace('redelegate', srcValidator, dstValidator, amount);
            const { helper } = this.facets;
            const { chainAddress } = this.state;

            const results = E(helper.owned()).executeEncodedTx([
              Any.toJSON(
                MsgBeginRedelegate.toProtoMsg({
                  delegatorAddress: chainAddress.address,
                  validatorSrcAddress: srcValidator.address,
                  validatorDstAddress: dstValidator.address,
                  amount: helper.amountToCoin(amount),
                }),
              ),
            ]);

            return watch(
              results,
              // NOTE: response, including completionTime, is currently discarded.
              this.facets.returnVoidWatcher,
            );
          });
        },
        /**
         * @param {CosmosValidatorAddress} validator
         * @returns {Vow<DenomAmount[]>}
         */
        withdrawReward(validator) {
          return asVow(() => {
            trace('withdrawReward', validator);
            const { helper } = this.facets;
            const { chainAddress } = this.state;
            const msg = MsgWithdrawDelegatorReward.toProtoMsg({
              delegatorAddress: chainAddress.address,
              validatorAddress: validator.address,
            });
            const account = helper.owned();

            const results = E(account).executeEncodedTx([Any.toJSON(msg)]);
            return watch(results, this.facets.withdrawRewardWatcher);
          });
        },
        /**
         * @param {DenomArg} denom
         * @returns {Vow<DenomAmount>}
         */
        getBalance(denom) {
          return asVow(() => {
            const { chainAddress, icqConnection } = this.state;
            if (!icqConnection) {
              throw Fail`Queries not available for chain ${chainAddress.chainId}`;
            }
            // TODO #9211 lookup denom from brand
            assert.typeof(denom, 'string');

            const results = E(icqConnection).query([
              toRequestQueryJson(
                QueryBalanceRequest.toProtoMsg({
                  address: chainAddress.address,
                  denom,
                }),
              ),
            ]);
            return watch(results, this.facets.balanceQueryWatcher);
          });
        },

        send(toAccount, amount) {
          console.log('send got', toAccount, amount);
          return asVow(() => Fail`not yet implemented`);
        },

        transfer(amount, msg) {
          console.log('transferSteps got', amount, msg);
          return asVow(() => Fail`not yet implemented`);
        },

        transferSteps(amount, msg) {
          console.log('transferSteps got', amount, msg);
          return asVow(() => Fail`not yet implemented`);
        },

        withdrawRewards() {
          return asVow(() => Fail`Not Implemented. Try using withdrawReward.`);
        },

        /** @param {Omit<Delegation, 'delegatorAddress'>[]} delegations */
        undelegate(delegations) {
          return asVow(() => {
            trace('undelegate', delegations);
            const { helper } = this.facets;
            const { chainAddress, bondDenom } = this.state;

            const undelegateV = watch(
              E(helper.owned()).executeEncodedTx(
                delegations.map(d =>
                  Any.toJSON(
                    MsgUndelegate.toProtoMsg({
                      delegatorAddress: chainAddress.address,
                      validatorAddress: d.validatorAddress,
                      amount: { denom: bondDenom, amount: d.shares },
                    }),
                  ),
                ),
              ),
              this.facets.undelegateWatcher,
            );
            return watch(undelegateV, this.facets.returnVoidWatcher);
          });
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
 * @param {VowTools} vowTools
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
  vowTools,
  zcf,
) => {
  const makeKit = prepareCosmosOrchestrationAccountKit(
    zone,
    makeRecorderKit,
    vowTools,
    zcf,
  );
  return (...args) => makeKit(...args).holder;
};
/** @typedef {CosmosOrchestrationAccountKit['holder']} CosmosOrchestrationAccount */
