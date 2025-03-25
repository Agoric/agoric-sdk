import { M, prepareExoClassKit } from '@agoric/vat-data';
import { defineDurableHandle } from '@agoric/zoe/src/makeHandle.js';

const EVMI = M.interface('evmTransaction', {
  getAddress: M.call().returns(M.any()),
  send: M.call(M.any(), M.any()).returns(M.any()),
});

const InvitationMakerI = M.interface('invitationMaker', {
  makeEVMTransactionInvitation: M.call(M.string(), M.array()).returns(M.any()),
});

/**
 * Make a kit suitable for returning to a EVM Transaction Kit.
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {object} powers
 * @param powers.zcf
 * @param {import('../orchestration-api').OrchestrationAccount<{
 *   chainId: 'agoric-3';
 * }>} localAccount
 */
export const prepareEVMTransactionKit = (baggage, { zcf }, localAccount) => {
  const makeEVMTransactionHandle = defineDurableHandle(
    baggage,
    'EVMTransaction',
  );
  const makeEVMTransactionKit = prepareExoClassKit(
    baggage,
    'EVMTransactionKit',
    { evm: EVMI, invitationMakers: InvitationMakerI },
    id => {
      const evmTransactionHandle = makeEVMTransactionHandle();
      return { id, evmTransactionHandle };
    },

    {
      evm: {
        async getAddress() {
          const localChainAddress = await localAccount.getAddress();
          return localChainAddress.value;
        },

        /**
         * Sends tokens from the local account to a specified Cosmos chain
         * address.
         *
         * @param {import('@agoric/orchestration').CosmosChainAddress} toAccount
         * @param {import('@agoric/orchestration').AmountArg} amount
         * @returns {Promise<string>} A success message upon completion.
         */
        async send(toAccount, amount) {
          await localAccount.send(toAccount, amount);
          return 'transfer success';
        },
      },
      invitationMakers: {
        // "method" and "args" can be used to invoke methods of localAccount obj
        makeEVMTransactionInvitation(method, args) {
          const continuingEVMTransactionHandler = async seat => {
            const { evm } = this.facets;
            seat.exit();
            switch (method) {
              case 'getAddress':
                return evm.getAddress();
              case 'send':
                return evm.send(args[0], args[1]);
              default:
                return 'Invalid method';
            }
          };

          return zcf.makeInvitation(
            continuingEVMTransactionHandler,
            'evmTransaction',
          );
        },
      },
    },
  );
  return makeEVMTransactionKit;
};
harden(prepareEVMTransactionKit);
