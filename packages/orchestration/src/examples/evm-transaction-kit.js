import { M } from '@agoric/vat-data';
import { mustMatch } from '@endo/patterns';

const EVMI = M.interface('evmTransaction', {
  getAddress: M.call().returns(M.any()),
  send: M.call(M.any(), M.any()).returns(M.any()),
});

const InvitationMakerI = M.interface('invitationMaker', {
  makeEVMTransactionInvitation: M.call(M.string(), M.array()).returns(M.any()),
});

/**
 * @import {Zone} from '@agoric/zone';
 */

const EvmAccountShape = {
  localAccount: M.remotable('OrchestrationAccount<{chainId:"agoric-3"}>'),
  evmWalletAddress: M.any(),
};
harden(EvmAccountShape);

/**
 * Make a kit suitable for returning to a EVM Transaction Kit.
 *
 * @param {Zone} zone
 * @param {object} powers
 * @param powers.zcf
 */
export const prepareEVMTransactionKit = (zone, { zcf }) => {
  const makeEVMTransactionKit = zone.exoClassKit(
    'EVMTransactionKit',
    { evm: EVMI, invitationMakers: InvitationMakerI },
    initialState => {
      mustMatch(initialState, EvmAccountShape);
      return harden({ evmWalletAddress: undefined, ...initialState });
    },
    {
      evm: {
        async getAddress() {
          const localChainAddress = await this.state.localAccount.getAddress();
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
          await this.state.localAccount.send(toAccount, amount);
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
