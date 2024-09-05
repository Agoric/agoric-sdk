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

const { Vow$ } = NetworkShape;

/**
 * @import {TypedJson, ResponseTo, JsonSafe} from '@agoric/cosmic-proto';
 * @import {PromiseVow, VowTools} from '@agoric/vow';
 * @import {TargetApp, TargetRegistration} from './bridge-target.js';
 * @import {BankManager, Bank} from './vat-bank.js';
 * @import {ScopedBridgeManager} from './types.js';
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
 * @typedef {{
 *   system: ScopedBridgeManager<'vlocalchain'>;
 *   bank: Bank;
 *   transfer: import('./transfer.js').TransferMiddleware;
 * }} AccountPowers
 */

/**
 * @typedef {{
 *   system: ScopedBridgeManager<'vlocalchain'>;
 *   bankManager: BankManager;
 *   transfer: import('./transfer.js').TransferMiddleware;
 * }} LocalChainPowers
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
 * @param {VowTools} vowTools
 */
export const prepareLocalChainAccountKit = (zone, { watch }) =>
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
    },
    /**
     * @param {string} address
     * @param {AccountPowers} powers
     */
    (address, powers) => ({
      address,
      ...powers,
      reserved: undefined,
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
         * @returns {PromiseVowOfTupleMappedToGenerics<{
         *   [K in keyof MT]: JsonSafe<ResponseTo<MT[K]>>;
         * }>}
         *
         * @see {typedJson} which can be used on arguments to get typed return
         * values.
         */
        async executeTx(messages) {
          const { address, system } = this.state;
          messages.length > 0 || Fail`need at least one message to execute`;

          const obj = {
            type: 'VLOCALCHAIN_EXECUTE_TX',
            // This address is the only one that `VLOCALCHAIN_EXECUTE_TX` will
            // accept as a signer for the transaction.  If the messages have other
            // addresses in signer positions, the transaction will be aborted.
            address,
            messages,
          };
          return E(system).toBridge(obj);
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
          return makeAccountKit(address, { system, bank, transfer }).account;
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
 * @param {VowTools} vowTools
 */
export const prepareLocalChainTools = (zone, vowTools) => {
  const makeAccountKit = prepareLocalChainAccountKit(zone, vowTools);
  const makeLocalChain = prepareLocalChain(zone, makeAccountKit, vowTools);

  return harden({ makeLocalChain });
};
harden(prepareLocalChainTools);

/** @typedef {ReturnType<typeof prepareLocalChainTools>} LocalChainTools */
/** @typedef {ReturnType<LocalChainTools['makeLocalChain']>} LocalChain */
