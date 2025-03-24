import { M, prepareExoClassKit } from '@agoric/vat-data';
import { defineDurableHandle } from '@agoric/zoe/src/makeHandle.js';

const EVMI = M.interface('evmTransaction', {
  getAddress: M.call().returns(M.any()),
});

const InvitationMakerI = M.interface('invitationMaker', {
  makeEVMTransactionInvitation: M.call(M.string(), M.array()).returns(M.any()),
});

/**
 * Make a kit suitable for returning to a EVM Transaction Kit.
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {object} powers
 * @param {object} localAccount
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
      },
      invitationMakers: {
        // "method" and "args" can be used to invoke methods of localAccount obj
        makeEVMTransactionInvitation(method, args) {
          const continuingEVMTransactionHandler = async seat => {
            const { evm } = this.facets;
            seat.exit();
            return evm.getAddress();
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
