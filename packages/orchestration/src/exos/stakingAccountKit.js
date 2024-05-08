// @ts-check
/** @file Use-object for the owner of a staking account */
import {
  MsgWithdrawDelegatorReward,
  MsgWithdrawDelegatorRewardResponse,
} from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/tx.js';
import {
  MsgDelegate,
  MsgDelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import {
  QueryBalanceRequest,
  QueryBalanceResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { AmountShape, PaymentShape, AmountMath } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { UnguardedHelperI } from '@agoric/internal/src/typeGuards.js';
import { M, prepareExoClassKit } from '@agoric/vat-data';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/index.js';
import {
  depositToSeat,
  withdrawFromSeat,
} from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { decodeBase64 } from '@endo/base64';
import { E } from '@endo/far';
import { toRequestQueryJson, typedJson } from '@agoric/cosmic-proto';
import { TimeMath } from '@agoric/time';
import {
  ChainAddressShape,
  CoinShape,
  DepositProposalShape,
} from '../typeGuards.js';

/**
 * @import {ChainAccount, ChainAddress, ChainAmount, CosmosValidatorAddress, ICQConnection} from '../types.js';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js';
 * @import {Baggage} from '@agoric/swingset-liveslots';
 * @import {AnyJson} from '@agoric/cosmic-proto';
 * @import {LocalChainAccount} from '@agoric/vats/src/localchain.js';
 * @import {Payment} from '@agoric/ertp/exported.js';
 * @import {TimerService, RelativeTimeRecord, TimerBrand} from '@agoric/time';
 * @import {IBCChannelInfo} from '../types.js';
 */

const trace = makeTracer('StakingAccountHolder');

const { Fail } = assert;

const FIVE_MINUTES_IN_SECONDS = 300n;
const SECONDS_TO_NANOSECONDS = 1_000_000_000n;

/**
 * Utility to help verify Payments presented to the contract are
 * from known issuers.
 * @typedef {MapStore<Brand, Issuer>} BrandToIssuer
 */

/**
 * @typedef {object} StakingAccountNotification
 * @property {ChainAddress} chainAddress
 */

/**
 * @typedef {{
 *  topicKit: RecorderKit<StakingAccountNotification>;
 *  account: ChainAccount;
 *  localAccount: LocalChainAccount;
 *  chainAddress: ChainAddress;
 *  localAccountAddress: ChainAddress['address'];
 *  icqConnection: ICQConnection | undefined;
 *  bondDenom: string;
 *  bondDenomLocal: string;
 *  transferChannel: IBCChannelInfo;
 *  brandToIssuer: BrandToIssuer;
 *  chainTimerService: TimerService;
 *  chainTimerBrand: TimerBrand;
 * }} State
 */

export const ChainAccountHolderI = M.interface('ChainAccountHolder', {
  getPublicTopics: M.call().returns(TopicsRecordShape),
  getAddress: M.call().returns(ChainAddressShape),
  getBalance: M.callWhen().optional(M.string()).returns(CoinShape),
  delegate: M.callWhen(ChainAddressShape, AmountShape).returns(M.record()),
  deposit: M.callWhen(PaymentShape)
    .optional({
      timeoutTimestamp: M.bigint(),
    })
    .returns({ sequence: M.number() }),
  withdrawReward: M.callWhen(ChainAddressShape).returns(M.arrayOf(CoinShape)),
});

/** @type {{ [name: string]: [description: string, valueShape: Pattern] }} */
const PUBLIC_TOPICS = {
  account: ['Staking Account holder status', M.any()],
};

// UNTIL https://github.com/cosmology-tech/telescope/issues/605
/**
 * @param {Any} x
 * @returns {AnyJson}
 */
const toAnyJSON = x => /** @type {AnyJson} */ (Any.toJSON(x));

/**
 * @template T
 * @param {string} ackStr
 * @param {(p: {typeUrl: string, value: Uint8Array}) => T} fromProtoMsg
 */
export const tryDecodeResponse = (ackStr, fromProtoMsg) => {
  try {
    const any = Any.decode(decodeBase64(ackStr));
    const protoMsg = Any.decode(any.value);

    const msg = fromProtoMsg(protoMsg);
    return msg;
  } catch (cause) {
    throw assert.error(`bad response: ${ackStr}`, undefined, { cause });
  }
};

/** @type {(c: { denom: string, amount: string }) => ChainAmount} */
const toChainAmount = c => ({ denom: c.denom, value: BigInt(c.amount) });

/**
 * @param {Baggage} baggage
 * @param {MakeRecorderKit} makeRecorderKit
 * @param {ZCF} zcf
 */
export const prepareStakingAccountKit = (baggage, makeRecorderKit, zcf) => {
  const makeStakingAccountKit = prepareExoClassKit(
    baggage,
    'Staking Account Holder',
    {
      helper: UnguardedHelperI,
      holder: ChainAccountHolderI,
      invitationMakers: M.interface('invitationMakers', {
        Delegate: M.call(ChainAddressShape, AmountShape).returns(M.promise()),
        Deposit: M.call().returns(M.promise()),
        WithdrawReward: M.call(ChainAddressShape).returns(M.promise()),
        CloseAccount: M.call().returns(M.promise()),
        TransferAccount: M.call().returns(M.promise()),
      }),
    },
    /**
     * @param {{
     *   account: ChainAccount;
     *   localAccount: LocalChainAccount;
     *   storageNode: StorageNode;
     *   chainAddress: ChainAddress;
     *   localAccountAddress: ChainAddress['address'];
     *   icqConnection: ICQConnection | undefined;
     *   bondDenom: string;
     *   bondDenomLocal: string;
     *   transferChannel: IBCChannelInfo;
     *   brandToIssuer: BrandToIssuer;
     *   chainTimerService: TimerService;
     *   chainTimerBrand: TimerBrand;
     * }} initState
     * @returns {State}
     */
    ({
      account,
      localAccount,
      storageNode,
      chainAddress,
      localAccountAddress,
      icqConnection,
      bondDenom,
      bondDenomLocal,
      transferChannel,
      brandToIssuer,
      chainTimerService,
      chainTimerBrand,
    }) => {
      // must be the fully synchronous maker because the kit is held in durable state
      const topicKit = makeRecorderKit(storageNode, PUBLIC_TOPICS.account[1]);

      return harden({
        account,
        localAccount,
        chainAddress,
        localAccountAddress,
        topicKit,
        icqConnection,
        bondDenom,
        bondDenomLocal,
        transferChannel,
        brandToIssuer,
        chainTimerService,
        chainTimerBrand,
      });
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
         * Takes the current time from ChainTimerService and adds a relative
         * time to determine a timeout timestamp in nanoseconds.
         * @param {RelativeTimeRecord} [relativeTime] defaults to 5 minutes
         * @returns {Promise<bigint>} Timeout timestamp in absolute nanoseconds since unix epoch
         */
        async getTimeoutTimestamp(relativeTime) {
          const { chainTimerService, chainTimerBrand } = this.state;
          const currentTime = await E(chainTimerService).getCurrentTimestamp();
          return (
            TimeMath.addAbsRel(
              currentTime,
              relativeTime ||
                TimeMath.coerceRelativeTimeRecord(
                  FIVE_MINUTES_IN_SECONDS,
                  chainTimerBrand,
                ),
            ).absValue * SECONDS_TO_NANOSECONDS
          );
        },
      },
      invitationMakers: {
        /**
         *
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
        Deposit() {
          trace('Deposit');
          // TODO consider adding timeoutTimestamp as a parameter. current
          // default is `FIVE_MINUTES_IN_SECONDS`
          return zcf.makeInvitation(
            async seat => {
              const { give } = seat.getProposal();
              // only one entry permitted by proposal shape
              const [keyword, giveAmount] = Object.entries(give)[0];
              this.state.brandToIssuer.has(giveAmount.brand) ||
                Fail`${giveAmount.brand} not registered`;

              const payments = await withdrawFromSeat(zcf, seat, give);
              const payment = await Object.values(payments)[0];
              try {
                await this.facets.holder.deposit(payment);
              } catch (_depositOrTransferError) {
                try {
                  await depositToSeat(zcf, seat, give, payments);
                  throw Fail`Deposit failed, payment returned.`;
                } catch (error) {
                  if (error.message.includes('not a live paymen')) {
                    const pmt = await E(this.state.localAccount).withdraw(
                      giveAmount,
                    );
                    // @ts-expect-error VirtualPurse vs Purse?
                    await depositToSeat(zcf, seat, give, {
                      [keyword]: pmt,
                    });
                    throw Fail`Deposit failed, payment returned.`;
                  } else {
                    throw error;
                  }
                }
              } finally {
                seat.exit();
              }
            },
            'Deposit',
            undefined,
            DepositProposalShape,
          );
        },
        /** @param {CosmosValidatorAddress} validator */
        WithdrawReward(validator) {
          trace('WithdrawReward', validator);

          return zcf.makeInvitation(async seat => {
            seat.exit();
            return this.facets.holder.withdrawReward(validator);
          }, 'WithdrawReward');
        },
        CloseAccount() {
          throw Error('not yet implemented');
        },
        /**
         * Starting a transfer revokes the account holder. The associated updater
         * will get a special notification that the account is being transferred.
         */
        TransferAccount() {
          throw Error('not yet implemented');
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
        // #9212 TODO move this beneath the Orchestration abstraction,
        // to the OrchestrationAccount provided by makeAccount()
        /** @returns {ChainAddress} */
        getAddress() {
          return this.state.chainAddress;
        },
        /**
         * @param {CosmosValidatorAddress} validator
         * @param {Amount<'nat'>} ertpAmount
         */
        async delegate(validator, ertpAmount) {
          trace('delegate', validator, ertpAmount);

          // FIXME brand handling #9211
          trace('TODO: handle brand', ertpAmount);
          const amount = {
            amount: String(ertpAmount.value),
            denom: this.state.bondDenom,
          };

          const account = this.facets.helper.owned();
          const delegatorAddress = this.state.chainAddress.address;

          const result = await E(account).executeEncodedTx([
            toAnyJSON(
              MsgDelegate.toProtoMsg({
                delegatorAddress,
                validatorAddress: validator.address,
                amount,
              }),
            ),
          ]);

          if (!result) throw Fail`Failed to delegate.`;
          return tryDecodeResponse(result, MsgDelegateResponse.fromProtoMsg);
        },
        /**
         * Only `bondDenom` deposits accepted until #9211, #9063
         * @param {Payment} payment
         * @param {{ timeoutTimestamp: bigint }} [opts]
         * @returns {Promise<{ sequence: number }>}
         */
        async deposit(payment, opts) {
          const brand = await E(payment).getAllegedBrand();
          const issuer = this.state.brandToIssuer.get(brand);
          issuer || Fail`Unknown Issuer for Brand ${brand}.`;

          const amount = await E(issuer).getAmountOf(payment);
          !AmountMath.isEmpty(amount) ||
            Fail`Payment amount must be greater than 0.`;

          const { localAccount } = this.state;
          trace('Depositing funds to LCA');
          // XXX consider adding exposing an interface to withdraw / send
          // messages from the LCA (e.g., withdraw funds)
          await E(localAccount).deposit(payment);

          const timeoutTimestamp =
            opts?.timeoutTimestamp ??
            (await this.facets.helper.getTimeoutTimestamp());

          trace('Transferring funds to ICA');
          /**
           * // TODO can we infer `/ibc.applications.transfer.v1.MsgTransferResponse`?
           * @type {unknown[]}
           */
          const [result] = await E(localAccount).executeTx([
            typedJson('/ibc.applications.transfer.v1.MsgTransfer', {
              sourcePort: this.state.transferChannel.sourcePortId,
              sourceChannel: this.state.transferChannel.sourceChannelId,
              token: {
                amount: String(amount.value),
                // TODO use Amount (of Payment) to determine denom #9211, #9063 (`ibc/toyatom` won't work here)
                denom: this.state.bondDenom,
              },
              sender: this.state.localAccountAddress,
              receiver: this.state.chainAddress.address,
              timeoutHeight: {
                revisionHeight: 0n,
                revisionNumber: 0n,
              },
              // #9324 what's a reasonable timeout? currently using `FIVE_MINUTES_IN_SECONDS`
              timeoutTimestamp,
              memo: '',
            }),
          ]);
          trace('MsgTransfer result', result);

          return /** @type {{ sequence: number }} */ (result);
        },
        /**
         * @param {CosmosValidatorAddress} validator
         * @returns {Promise<ChainAmount[]>}
         */
        async withdrawReward(validator) {
          const { chainAddress } = this.state;
          assert.typeof(validator.address, 'string');
          const msg = MsgWithdrawDelegatorReward.toProtoMsg({
            delegatorAddress: chainAddress.address,
            validatorAddress: validator.address,
          });
          const account = this.facets.helper.owned();
          const result = await E(account).executeEncodedTx([toAnyJSON(msg)]);
          const { amount: coins } = tryDecodeResponse(
            result,
            MsgWithdrawDelegatorRewardResponse.fromProtoMsg,
          );
          return harden(coins.map(toChainAmount));
        },
        /**
         * @param {ChainAmount['denom']} [denom] - defaults to bondDenom
         * @returns {Promise<ChainAmount>}
         */
        async getBalance(denom) {
          const { chainAddress, icqConnection, bondDenom } = this.state;
          denom ||= bondDenom;
          assert.typeof(denom, 'string');

          if (!icqConnection) throw Fail`Queries not enabled`;

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
          return harden(toChainAmount(balance));
        },
      },
    },
  );
  return makeStakingAccountKit;
};

/** @typedef {ReturnType<ReturnType<typeof prepareStakingAccountKit>>} StakingAccountKit */
/** @typedef {StakingAccountKit['holder']} StakingAccounHolder */
