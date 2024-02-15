import { E } from '@endo/far';
import { M } from '@endo/patterns';

export const LocalChainAccountI = M.interface('LocalChainAccount', {
  getAddress: M.callWhen().returns(M.string()),
  getBalance: M.callWhen().returns(M.any()),
  executeTx: M.callWhen(M.arrayOf(M.any())).returns(M.arrayOf(M.any())),
});

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareLocalChainAccount = zone =>
  zone.exoClass(
    'LocalChainAccount',
    LocalChainAccountI,
    (system, address) => ({ system, address }),
    {
      // Information that the account creator needs.
      async getAddress() {
        return this.state.address;
      },
      async getBalance() {
        // We make a balance request, scoped to our own address.
        const { system, address } = this.state;
        return E(system).toBridge({
          type: 'VLOCALCHAIN_GET_BALANCE',
          address,
        });
      },
      async executeTx(messages) {
        const { system, address } = this.state;
        const obj = {
          type: 'VLOCALCHAIN_EXECUTE_TX',
          address,
          messages,
        };
        return E(system).toBridge(obj);
      },
    },
  );

export const LocalChainI = M.interface('LocalChain', {
  createAccount: M.callWhen().returns(M.remotable('LocalChainAccount')),
});

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<typeof prepareLocalChainAccount>} createAccount
 */
const prepareLocalChain = (zone, createAccount) =>
  zone.exoClass('LocalChain', LocalChainI, system => ({ system }), {
    async createAccount() {
      const { system } = this.state;
      // Allocate a fresh address that doesn't correspond with a public key,
      // and follows the ICA guidelines to help reduce collisions.
      const address = await E(system).toBridge({
        type: 'VLOCALCHAIN_ALLOCATE_ADDRESS',
      });
      return createAccount(system, address);
    },
  });

/** @param {import('@agoric/base-zone').Zone} zone */
export const prepareLocalChainTools = zone => {
  const createAccount = prepareLocalChainAccount(zone);
  const makeLocalChain = prepareLocalChain(zone, createAccount);

  return harden({ makeLocalChain });
};
harden(prepareLocalChainTools);
