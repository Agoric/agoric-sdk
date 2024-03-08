import { E } from '@endo/far';
import { M } from '@endo/patterns';

const { Fail } = assert;

export const LocalChainAccountI = M.interface('LocalChainAccount', {
  getAddress: M.callWhen().returns(M.string()),
  executeTx: M.callWhen(M.arrayOf(M.record())).returns(M.arrayOf(M.record())),
});

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareLocalChainAccount = zone =>
  zone.exoClass(
    'LocalChainAccount',
    LocalChainAccountI,
    /**
     * @param {import('./types.js').ScopedBridgeManager} system
     * @param {string} address
     * @param {{ query: (messages: any[]) => Promise<any> }} chain
     */
    (system, address, chain) => ({ system, address, chain }),
    {
      // Information that the account creator needs.
      async getAddress() {
        return this.state.address;
      },
      async executeTx(messages) {
        const { system, address } = this.state;
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

export const LocalChainI = M.interface('LocalChain', {
  createAccount: M.callWhen().returns(M.remotable('LocalChainAccount')),
  query: M.callWhen(M.record()).returns(M.record()),
  queryMany: M.callWhen(M.arrayOf(M.record())).returns(M.arrayOf(M.record())),
});

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<typeof prepareLocalChainAccount>} createAccount
 */
const prepareLocalChain = (zone, createAccount) =>
  zone.exoClass(
    'LocalChain',
    LocalChainI,
    /** @param {import('./types.js').ScopedBridgeManager} system */
    system => ({ system }),
    {
      async createAccount() {
        const { system } = this.state;
        // Allocate a fresh address that doesn't correspond with a public key,
        // and follows the ICA guidelines to help reduce collisions.  See
        // x/vlocalchain/keeper/keeper.go AllocateAddress for the use of the app
        // hash and block data hash.
        const address = await E(system).toBridge({
          type: 'VLOCALCHAIN_ALLOCATE_ADDRESS',
        });
        return createAccount(system, address, this.self);
      },
      async query(request) {
        const requests = harden([request]);
        const results = await E(this.self).queryMany(requests);
        const { error, reply } = results[0];
        if (error) {
          throw Error(`query failed: ${error}`);
        }
        return reply;
      },
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
  const createAccount = prepareLocalChainAccount(zone);
  const makeLocalChain = prepareLocalChain(zone, createAccount);

  return harden({ makeLocalChain });
};
harden(prepareLocalChainTools);

/** @typedef {ReturnType<typeof prepareLocalChainTools>} LocalChainTools */
/** @typedef {ReturnType<LocalChainTools['makeLocalChain']>} LocalChain */
