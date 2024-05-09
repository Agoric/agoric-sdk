// @ts-check
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { AmountShape } from '@agoric/ertp';

const { Fail } = assert;

/**
 * @import {BankManager} from './vat-bank.js';
 * @import {ScopedBridgeManager} from './types.js';
 */

/** @import {TypedJson, ResponseTo} from '@agoric/cosmic-proto'; */

/**
 * @typedef {{
 *   system: ScopedBridgeManager;
 *   bankManager: BankManager;
 * }} LocalChainPowers
 */

export const LocalChainAccountI = M.interface('LocalChainAccount', {
  getAddress: M.callWhen().returns(M.string()),
  deposit: M.callWhen(M.remotable('Payment'))
    .optional(M.pattern())
    .returns(AmountShape),
  executeTx: M.callWhen(M.arrayOf(M.record())).returns(M.arrayOf(M.record())),
});

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareLocalChainAccount = zone =>
  zone.exoClass(
    'LocalChainAccount',
    LocalChainAccountI,
    /**
     * @param {string} address
     * @param {LocalChainPowers} powers
     */
    (address, powers) => ({ address, ...powers, reserved: undefined }),
    {
      // Information that the account creator needs.
      async getAddress() {
        return this.state.address;
      },
      /**
       * Deposit a payment into the bank purse that matches the alleged brand.
       * This is safe, since even if the payment lies about its brand, ERTP will
       * reject spoofed payment objects when depositing into a purse.
       *
       * @param {Payment} payment
       */
      async deposit(payment) {
        const { address, bankManager } = this.state;

        const allegedBrand = await E(payment).getAllegedBrand();
        const bankAcct = E(bankManager).getBankForAddress(address);
        const allegedPurse = E(bankAcct).getPurse(allegedBrand);
        return E(allegedPurse).deposit(payment);
      },
      /**
       * Execute a batch of transactions and return the responses. Use
       * `typedJson()` on the arguments to get typed return values.
       *
       * @template {TypedJson[]} MT messages tuple (use const with multiple
       *   elements or it will be a mixed array)
       * @param {MT} messages
       * @returns {Promise<{ [K in keyof MT]: ResponseTo<MT[K]> }>}
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

// XXX vestigial? for future use?
export const LocalChainAdminI = M.interface('LocalChainAdmin', {});

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<typeof prepareLocalChainAccount>} makeAccount
 */
const prepareLocalChain = (zone, makeAccount) =>
  zone.exoClassKit(
    'LocalChain',
    { public: LocalChainI, admin: LocalChainAdminI },
    /** @param {LocalChainPowers} powers */
    powers => {
      return { ...powers };
    },
    {
      admin: {},
      public: {
        /**
         * Allocate a fresh address that doesn't correspond with a public key,
         * and follows the ICA guidelines to help reduce collisions. See
         * x/vlocalchain/keeper/keeper.go AllocateAddress for the use of the app
         * hash and block data hash.
         */
        async makeAccount() {
          const { system, bankManager } = this.state;
          const address = await E(system).toBridge({
            type: 'VLOCALCHAIN_ALLOCATE_ADDRESS',
          });
          return makeAccount(address, { system, bankManager });
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
          const results = await E(this.facets.public).queryMany(requests);
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
/** @typedef {ReturnType<LocalChainTools['makeLocalChain']>} LocalChainKit */
/** @typedef {LocalChainKit['public']} LocalChain */
