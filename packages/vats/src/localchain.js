// @ts-check
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { AmountShape, BrandShape, PaymentShape } from '@agoric/ertp';

const { Fail } = assert;

/**
 * @import {TypedJson, ResponseTo, JsonSafe} from '@agoric/cosmic-proto';
 * @import {BankManager, Bank} from './vat-bank.js';
 * @import {ScopedBridgeManager} from './types.js';
 */

/**
 * @typedef {{
 *   system: ScopedBridgeManager<'vlocalchain'>;
 *   bank: Bank;
 * }} AccountPowers
 */

/**
 * @typedef {{
 *   system: ScopedBridgeManager<'vlocalchain'>;
 *   bankManager: BankManager;
 * }} LocalChainPowers
 */

export const LocalChainAccountI = M.interface('LocalChainAccount', {
  getAddress: M.callWhen().returns(M.string()),
  getBalance: M.callWhen(BrandShape).returns(AmountShape),
  deposit: M.callWhen(PaymentShape).optional(M.pattern()).returns(AmountShape),
  withdraw: M.callWhen(AmountShape).returns(PaymentShape),
  executeTx: M.callWhen(M.arrayOf(M.record())).returns(M.arrayOf(M.record())),
});

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareLocalChainAccount = zone =>
  zone.exoClass(
    'LocalChainAccount',
    LocalChainAccountI,
    /**
     * @param {string} address
     * @param {AccountPowers} powers
     */
    (address, powers) => ({ address, ...powers, reserved: undefined }),
    {
      // Information that the account creator needs.
      async getAddress() {
        return this.state.address;
      },
      /** @param {Brand<'nat'>} brand */
      async getBalance(brand) {
        const { bank } = this.state;
        const purse = E(bank).getPurse(brand);
        return E(purse).getCurrentAmount();
      },
      /**
       * Deposit a payment into the bank purse that matches the alleged brand.
       * This is safe, since even if the payment lies about its brand, ERTP will
       * reject spoofed payment objects when depositing into a purse.
       *
       * @param {Payment<'nat'>} payment
       * @param {Pattern} [optAmountShape] throws if the Amount of the Payment
       *   does not match the provided Pattern
       * @returns {Promise<Amount>}
       */
      async deposit(payment, optAmountShape) {
        const { bank } = this.state;

        const allegedBrand = await E(payment).getAllegedBrand();
        const purse = E(bank).getPurse(allegedBrand);
        return E(purse).deposit(payment, optAmountShape);
      },
      /**
       * Withdraw a payment from the account's bank purse of the amount's brand.
       *
       * @param {Amount<'nat'>} amount
       * @returns {Promise<Payment<'nat'>>} payment
       */
      async withdraw(amount) {
        const { bank } = this.state;
        const purse = E(bank).getPurse(amount.brand);
        return E(purse).withdraw(amount);
      },
      /**
       * Execute a batch of transactions and return the responses. Use
       * `typedJson()` on the arguments to get typed return values.
       *
       * @template {TypedJson[]} MT messages tuple (use const with multiple
       *   elements or it will be a mixed array)
       * @param {MT} messages
       * @returns {Promise<{ [K in keyof MT]: JsonSafe<ResponseTo<MT[K]>> }>}
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
    },
  );
/**
 * @typedef {Awaited<
 *   ReturnType<Awaited<ReturnType<typeof prepareLocalChainAccount>>>
 * >} LocalChainAccount
 */

export const LocalChainI = M.interface('LocalChain', {
  makeAccount: M.callWhen().returns(M.remotable('LocalChainAccount')),
  query: M.callWhen(M.record()).returns(M.record()),
  queryMany: M.callWhen(M.arrayOf(M.record())).returns(M.arrayOf(M.record())),
});

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<typeof prepareLocalChainAccount>} makeAccount
 */
const prepareLocalChain = (zone, makeAccount) =>
  zone.exoClass(
    'LocalChain',
    LocalChainI,
    /** @param {LocalChainPowers} powers */
    powers => {
      return { ...powers };
    },
    {
      /**
       * Allocate a fresh address that doesn't correspond with a public key, and
       * follows the ICA guidelines to help reduce collisions. See
       * x/vlocalchain/keeper/keeper.go AllocateAddress for the use of the app
       * hash and block data hash.
       */
      async makeAccount() {
        const { system, bankManager } = this.state;
        const address = await E(system).toBridge({
          type: 'VLOCALCHAIN_ALLOCATE_ADDRESS',
        });
        const bank = await E(bankManager).getBankForAddress(address);
        return makeAccount(address, { system, bank });
      },
      /**
       * Make a single query to the local chain. Will reject with an error if
       * the query fails. Otherwise, return the response as a JSON-compatible
       * object.
       *
       * @param {import('@agoric/cosmic-proto').TypedJson} request
       * @returns {Promise<import('@agoric/cosmic-proto').TypedJson>}
       */
      async query(request) {
        const requests = harden([request]);
        const results = await E(this.self).queryMany(requests);
        results.length === 1 ||
          Fail`expected exactly one result; got ${results}`;
        const { error, reply } = results[0];
        if (error) {
          throw Fail`query failed: ${error}`;
        }
        return reply;
      },
      /**
       * Send a batch of query requests to the local chain. Unless there is a
       * system error, will return all results to indicate their success or
       * failure.
       *
       * @param {import('@agoric/cosmic-proto').TypedJson[]} requests
       * @returns {Promise<
       *   {
       *     error?: string;
       *     reply: import('@agoric/cosmic-proto').TypedJson;
       *   }[]
       * >}
       */
      async queryMany(requests) {
        const { system } = this.state;
        return E(system).toBridge({
          type: 'VLOCALCHAIN_QUERY_MANY',
          messages: requests,
        });
      },
    },
  );

/** @param {import('@agoric/base-zone').Zone} zone */
export const prepareLocalChainTools = zone => {
  const makeAccount = prepareLocalChainAccount(zone);
  const makeLocalChain = prepareLocalChain(zone, makeAccount);

  return harden({ makeLocalChain });
};
harden(prepareLocalChainTools);

/** @typedef {ReturnType<typeof prepareLocalChainTools>} LocalChainTools */
/** @typedef {ReturnType<LocalChainTools['makeLocalChain']>} LocalChain */
