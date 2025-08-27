// @ts-check
import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import {
  AmountPatternShape,
  AmountShape,
  BrandShape,
  PaymentShape,
} from '@agoric/ertp';
import { Shape as NetworkShape } from '@agoric/network';
import { CodecHelper } from '@agoric/cosmic-proto';
import { MsgSend as MsgSendType } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/tx.js';
import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';

const MsgSend = CodecHelper(MsgSendType);

const { Vow$ } = NetworkShape;

/**
 * @import {MsgSendProtoMsg} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/tx.js';
 * @import {FungibleTokenPacketData} from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {Coin} from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
 * @import {ERef, EReturn} from '@endo/far';
 * @import {Key, Pattern} from '@endo/patterns';
 * @import {TypedJson, ResponseTo, JsonSafe} from '@agoric/cosmic-proto';
 * @import {Amount, Brand, Payment} from '@agoric/ertp';
 * @import {PromiseVow, Vow, VowTools} from '@agoric/vow';
 * @import {TargetApp, TargetRegistration} from './bridge-target.js';
 * @import {BankManager, Bank} from './vat-bank.js';
 * @import {IBCEvent, IBCPacket, ScopedBridgeManager} from './types.js';
 */

/**
 * @typedef {SendInfo} NotifyInfo Extend this with any additional notification
 *   types.
 */

/**
 * @typedef {{
 *   msgTypeUrl: MsgSendProtoMsg['typeUrl'];
 *   coins: Coin[];
 *   target: string;
 * } & Omit<FungibleTokenPacketData, 'amount' | 'denom'>} SendInfo
 */

/**
 * @template {unknown[]} T
 * @typedef {Promise<T>} PromiseVowOfTupleMappedToGenerics Temporary hack
 *
 *   UNTIL(microsoft/TypeScript#57122): This type should be replaced with just
 *   PromiseVow<T>, but TypeScript doesn't understand that the result of a
 *   mapping a tuple type using generics is iterable:
 *
 *   'JsonSafe<MsgTransferResponse & { '@type':
 *   "/ibc.applications.transfer.v1.MsgTransferResponse"; }>[] |
 *   Vow<JsonSafe<MsgTransferResponse & { ...; }>[]>' must have a
 *   '[Symbol.iterator]()' method that returns an iterator.
 */

/**
 * Send a batch of query requests to the local chain. Unless there is a system
 * error, will return all results to indicate their success or failure.
 *
 * @template {TypedJson[]} [RT=TypedJson[]]
 * @callback QueryManyFn
 * @param {RT} requests
 * @returns {PromiseVowOfTupleMappedToGenerics<{
 *   [K in keyof RT]: JsonSafe<{
 *     error?: string;
 *     reply: ResponseTo<RT[K]>;
 *   }>;
 * }>}
 */

/**
 * @template {TypedJson[]} MT
 * @typedef {{
 *   [K in keyof MT]: JsonSafe<ResponseTo<MT[K]>>;
 * }} ResponseToMany
 */

/**
 * @typedef {{
 *   bank: Bank;
 *   lastSequence?: string;
 * } & Pick<LocalChainPowers, 'system' | 'transfer'>} AccountPowers
 */

/**
 * @typedef {{
 *   system: ScopedBridgeManager<'vlocalchain'>;
 *   bankManager: BankManager;
 *   transfer: import('./transfer.js').TransferMiddleware;
 * }} LocalChainPowers
 */

/**
 * @typedef {WeakMapStore<
 *   LocalChainPowers['transfer'],
 *   {
 *     transferBridgeManager: Pick<
 *       ScopedBridgeManager<'vtransfer'>,
 *       'fromBridge'
 *     >;
 *   }
 * >} AdditionalTransferPowers
 */

export const LocalChainAccountI = M.interface('LocalChainAccount', {
  getAddress: M.callWhen().returns(Vow$(M.string())),
  getBalance: M.callWhen(BrandShape).returns(Vow$(AmountShape)),
  deposit: M.callWhen(PaymentShape)
    .optional(AmountPatternShape)
    .returns(Vow$(AmountShape)),
  withdraw: M.callWhen(AmountShape).returns(Vow$(PaymentShape)),
  executeTx: M.callWhen(M.arrayOf(M.record())).returns(
    Vow$(M.arrayOf(M.record())),
  ),
  monitorTransfers: M.callWhen(M.remotable('TransferTap')).returns(
    Vow$(M.remotable('TargetRegistration')),
  ),
});

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {VowTools & {
 *   powersForTransfer: AdditionalTransferPowers;
 * }} powers
 */
export const prepareLocalChainAccountKit = (
  zone,
  { watch, allSettled, powersForTransfer },
) =>
  zone.exoClassKit(
    'LocalChainAccountKit',
    {
      account: LocalChainAccountI,
      depositPaymentWatcher: M.interface('DepositPaymentWatcher', {
        onFulfilled: M.call(BrandShape)
          .optional({
            payment: PaymentShape,
            optAmountShape: M.or(M.undefined(), AmountShape),
          })
          .returns(M.promise()),
      }),
      notifyTransferVatWatcher: M.interface('NotifyTransferVatWatcher', {
        onFulfilled: M.call(M.any(), M.record()).returns(M.any()),
      }),
      overrideWatcher: M.interface('OverrideWatcher', {
        onFulfilled: M.call(M.any(), M.any()).returns(M.any()),
      }),
    },
    /**
     * @param {import('@agoric/orchestration').Bech32Address} address
     * @param {AccountPowers} accountPowers
     */
    (address, { bank, system, transfer }) => ({
      address,
      bank,
      system,
      transfer,
      lastSequence: 0n,
    }),
    {
      depositPaymentWatcher: {
        /**
         * @param {Brand<'nat'>} brand
         * @param {{
         *   payment: Payment<'nat'>;
         *   optAmountShape: Amount<'nat'>;
         * }} ctx
         */
        onFulfilled(brand, { payment, optAmountShape }) {
          const purse = E(this.state.bank).getPurse(brand);
          return E(purse).deposit(payment, optAmountShape);
        },
      },
      notifyTransferVatWatcher: {
        /**
         * @template {TypedJson[]} MT
         * @param {ResponseToMany<MT>} fulfilment
         * @param {Record<number, NotifyInfo>} notifyInfos
         */
        onFulfilled(fulfilment, notifyInfos) {
          if (Object.keys(notifyInfos).length === 0) {
            // No need to notify the transfer bridge manager, so just return.
            return fulfilment;
          }

          const { transfer } = this.state;
          const transferPowers =
            powersForTransfer.has(transfer) && powersForTransfer.get(transfer);
          const { transferBridgeManager } = transferPowers || {};

          if (!transferBridgeManager) {
            // If there is no transfer bridge manager, then we can't notify it,
            // so bail and just return the fulfilment.
            return fulfilment;
          }

          // notify the transfer vat that assets have been sent.
          const notifyV = allSettled(
            Object.values(notifyInfos).flatMap(info => {
              if (!info) {
                // If there is no info, then this is not a tx message that needs
                // notification.
                return [];
              }

              // If the message is not a MsgSend, then we don't do anything.
              if (info.msgTypeUrl !== MsgSend.typeUrl) {
                return [];
              }

              const sendInfo = /** @type {SendInfo} */ (info);

              const { coins, target, memo, sender, receiver } = sendInfo;
              /** @type {Omit<FungibleTokenPacketData, 'amount' | 'denom'>} */
              const sharedFtpData = {
                sender,
                receiver,
                memo,
              };
              /** @type {Omit<IBCPacket, 'data' | 'sequence'>} */
              const sharedPacket = {
                source_port: 'localchain-msg',
                source_channel: 'channel-0',
                destination_port: 'localchain-msg',
                destination_channel: 'channel-1',
              };
              return coins.map(({ denom, amount }) => {
                // MsgSends are local to this chain, so ensure the transfer packet
                // reflects that.
                const transferDenom = `${sharedPacket.source_port}/${sharedPacket.source_channel}/${denom}`;

                /** @type {FungibleTokenPacketData} */
                const ftpData = {
                  ...sharedFtpData,
                  denom: transferDenom,
                  amount,
                };

                /** @type {bigint} */
                const lastSequence = BigInt(this.state.lastSequence ?? 0) + 1n;

                const sequence = String(lastSequence);
                this.state.lastSequence = lastSequence;

                /** @type {IBCPacket} */
                const packet = {
                  ...sharedPacket,
                  data: btoa(JSON.stringify(ftpData)),
                  sequence,
                };
                /** @type {IBCEvent<'receivePacket', 'VTRANSFER_IBC_EVENT'>} */
                const obj = {
                  type: 'VTRANSFER_IBC_EVENT',
                  event: 'receivePacket',
                  packet,
                  target: { onlyIfRegistered: target },
                };
                return E(transferBridgeManager).fromBridge(obj);
              });
            }),
          );

          const overrideV = watch(
            notifyV,
            this.facets.overrideWatcher,
            fulfilment,
          );

          return /** @type {Vow<typeof fulfilment>} */ (
            /** @type {unknown} */ (overrideV)
          );
        },
      },
      overrideWatcher: {
        /**
         * @template T
         * @param {unknown} _awaited
         * @param {T} override
         * @returns {T}
         */
        onFulfilled(_awaited, override) {
          // This watcher is used to wait for fulfilment, then override the
          // return.
          return override;
        },
      },
      account: {
        // Information that the account creator needs.
        getAddress() {
          return this.state.address;
        },
        /**
         * @param {Brand<'nat'>} brand
         * @returns {PromiseVow<Amount<'nat'>>}
         */
        async getBalance(brand) {
          const { bank } = this.state;
          const purse = E(bank).getPurse(brand);
          return E(purse).getCurrentAmount();
        },

        // TODO The payment parameter type below should be Payment<'nat'>.
        // https://github.com/Agoric/agoric-sdk/issues/9828
        /**
         * Deposit a payment into the bank purse that matches the alleged brand.
         * This is safe, since even if the payment lies about its brand, ERTP
         * will reject spoofed payment objects when depositing into a purse.
         *
         * @param {ERef<Payment<'nat'>>} payment
         * @param {Pattern} [optAmountShape] throws if the Amount of the Payment
         *   does not match the provided Pattern
         * @returns {PromiseVow<Amount<'nat'>>}
         */
        async deposit(payment, optAmountShape) {
          return watch(
            E(payment).getAllegedBrand(),
            this.facets.depositPaymentWatcher,
            {
              payment,
              optAmountShape,
            },
          );
        },
        /**
         * Withdraw a payment from the account's bank purse of the amount's
         * brand.
         *
         * @param {Amount<'nat'>} amount
         * @returns {PromiseVow<Payment<'nat'>>} payment
         */
        async withdraw(amount) {
          const { bank } = this.state;
          const purse = E(bank).getPurse(amount.brand);
          return E(purse).withdraw(amount);
        },

        /**
         * Execute a batch of messages on the local chain. Note in particular,
         * that for IBC `MsgTransfer`, execution only queues a packet for the
         * local chain's IBC stack, and returns a `MsgTransferResponse`
         * immediately, not waiting for the confirmation on the other chain.
         *
         * Messages are executed in order as a single atomic transaction and
         * returns the responses. If any of the messages fails, the entire batch
         * will be rolled back on the local chain.
         *
         * @template {TypedJson[]} MT messages tuple (use const with multiple
         *   elements or it will be a mixed array)
         * @param {MT} messages
         * @returns {PromiseVowOfTupleMappedToGenerics<ResponseToMany<MT>>}
         * @see {typedJson} which can be used on arguments to get typed return
         * values.
         */
        async executeTx(messages) {
          const { address, system } = this.state;
          messages.length > 0 || Fail`need at least one message to execute`;

          /** @type {Record<number, NotifyInfo>} */
          const notifyInfos = {};

          const rewrittenMsgs = messages.map((msg, i) => {
            const { '@type': typeUrl, ...value } = msg;
            if (typeUrl !== MsgSend.typeUrl) {
              console.info(
                `Skipping message ${i} of type ${typeUrl} as it is not a MsgSend`,
              );
              return msg;
            }

            const msgTypeUrl = /** @type {MsgSendProtoMsg['typeUrl']} */ (
              MsgSend.typeUrl
            );

            // Since the message is a `MsgSend`, then we remap the receiver
            // to its unhooked baseAddress.
            const origSend = MsgSend.fromPartial(value);
            const { baseAddress: target } = decodeAddressHook(
              origSend.toAddress,
            );
            const newSend = MsgSend.fromPartial({
              ...value,
              toAddress: target,
            });

            const {
              amount: coins,
              fromAddress: sender,
              // Propagate the original hooked address for the target
              // distinguish.
              toAddress: receiver,
            } = origSend;

            /** @type {NotifyInfo} */
            const info = {
              msgTypeUrl,
              coins,
              target,
              sender,
              receiver,
              memo: JSON.stringify({
                hookedTypeUrl: msgTypeUrl,
              }),
            };
            notifyInfos[i] = info;
            return harden({ '@type': msgTypeUrl, ...newSend });
          });

          const obj = {
            type: 'VLOCALCHAIN_EXECUTE_TX',
            // This address is the only one that `VLOCALCHAIN_EXECUTE_TX` will
            // accept as a signer for the transaction.  If the messages have other
            // addresses in signer positions, the transaction will be aborted.
            address,
            messages: rewrittenMsgs,
          };

          const notifiedV =
            /**
             * @type {PromiseVowOfTupleMappedToGenerics<
             *   ResponseToMany<MT>
             * >}
             */
            (
              /** @type {unknown} */ (
                watch(
                  E(system).toBridge(obj),
                  this.facets.notifyTransferVatWatcher,
                  notifyInfos,
                )
              )
            );

          return notifiedV;
        },
        /**
         * @param {TargetApp} tap
         * @returns {PromiseVow<TargetRegistration>}
         */
        async monitorTransfers(tap) {
          const { address, transfer } = this.state;
          return E(transfer).registerTap(address, tap);
        },
      },
    },
  );
/** @typedef {EReturn<EReturn<typeof prepareLocalChain>>} LocalChain */

/**
 * @typedef {Awaited<
 *   ReturnType<ReturnType<typeof prepareLocalChainAccountKit>>
 * >} LocalChainAccountKit
 */

/** @typedef {LocalChainAccountKit['account']} LocalChainAccount */

export const LocalChainI = M.interface('LocalChain', {
  makeAccount: M.callWhen().returns(Vow$(M.remotable('LocalChainAccount'))),
  query: M.callWhen(M.record()).returns(Vow$(M.record())),
  queryMany: M.callWhen(M.arrayOf(M.record())).returns(
    Vow$(M.arrayOf(M.record())),
  ),
});

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<typeof prepareLocalChainAccountKit>} makeAccountKit
 * @param {VowTools} vowTools
 */
const prepareLocalChain = (zone, makeAccountKit, { watch }) => {
  const makeLocalChainKit = zone.exoClassKit(
    'LocalChainKit',
    {
      public: LocalChainI,
      extractFirstQueryResultWatcher: M.interface(
        'ExtractFirstQueryResultWatcher',
        {
          onFulfilled: M.call(M.arrayOf(M.record())).returns(M.record()),
        },
      ),
    },
    /** @param {LocalChainPowers} powers */
    powers => {
      return { ...powers };
    },
    {
      public: {
        /**
         * Allocate a fresh address that doesn't correspond with a public key,
         * and follows the ICA guidelines to help reduce collisions. See
         * x/vlocalchain/keeper/keeper.go AllocateAddress for the use of the app
         * hash and block data hash.
         *
         * @returns {PromiseVow<LocalChainAccount>}
         */
        async makeAccount() {
          const { system, bankManager, transfer } = this.state;
          const address = await E(system).toBridge({
            type: 'VLOCALCHAIN_ALLOCATE_ADDRESS',
          });
          const bank = await E(bankManager).getBankForAddress(address);
          return makeAccountKit(address, { bank, system, transfer }).account;
        },
        /**
         * Make a single query to the local chain. Will reject with an error if
         * the query fails. Otherwise, return the response as a JSON-compatible
         * object.
         *
         * @template {TypedJson} [T=TypedJson]
         * @param {T} request
         * @returns {PromiseVow<JsonSafe<ResponseTo<T>>>}
         */
        async query(request) {
          const requests = harden([request]);
          return watch(
            E(this.facets.public).queryMany(requests),
            this.facets.extractFirstQueryResultWatcher,
          );
        },
        /** @type {QueryManyFn} */
        async queryMany(requests) {
          const { system } = this.state;
          return E(system).toBridge({
            type: 'VLOCALCHAIN_QUERY_MANY',
            messages: requests,
          });
        },
      },
      extractFirstQueryResultWatcher: {
        /**
         * Extract the first result from the array of results or throw an error
         * if that result failed.
         *
         * @param {JsonSafe<{
         *   error?: string;
         *   reply: TypedJson<any>;
         * }>[]} results
         */
        onFulfilled(results) {
          results.length === 1 ||
            Fail`expected exactly one result; got ${results}`;
          const { error, reply } = results[0];
          if (error) {
            throw Fail`query failed: ${error}`;
          }
          return reply;
        },
      },
    },
  );

  /**
   * @param {LocalChainPowers} powers
   */
  const makeLocalChain = powers => makeLocalChainKit(powers).public;
  return makeLocalChain;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {VowTools & { powersForTransfer: AdditionalTransferPowers }} powers
 */
export const prepareLocalChainTools = (zone, powers) => {
  const { powersForTransfer: _, ...localChainPowers } = powers;
  const makeLocalChainAccountKit = prepareLocalChainAccountKit(zone, powers);
  const makeLocalChain = prepareLocalChain(
    zone,
    makeLocalChainAccountKit,
    localChainPowers,
  );

  return makeLocalChain;
};
harden(prepareLocalChainTools);
/** @typedef {ReturnType<typeof prepareLocalChainTools>} LocalChainTools */
