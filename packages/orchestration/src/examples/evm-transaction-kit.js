import { M, prepareExoClassKit } from '@agoric/vat-data';
import { defineDurableHandle } from '@agoric/zoe/src/makeHandle.js';

const EVMI = M.interface('evmTransaction', {
  printName: M.call(M.any(), M.any()).returns(M.any()),
});

const InvitationMakerI = M.interface('invitationMaker', {
  makeEvmTransactionInvitation: M.call(M.string(), M.array()).returns(M.any()),
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
  const makeEvmTransactionKit = prepareExoClassKit(
    baggage,
    'EVMTransactionKit',
    { evm: EVMI, invitationMakers: InvitationMakerI },
    id => {
      const evmTransactionHandle = makeEVMTransactionHandle();
      return { id, evmTransactionHandle };
    },
    {
      evm: {
        printName: (firstName, lastName) => {
          console.log(`Hi ${firstName} ${lastName}`);
          return `Hi ${firstName} ${lastName} ${JSON.stringify(localAccount)}`;
        },
      },
      invitationMakers: {
        makeEvmTransactionInvitation(method, args) {
          const { evm } = this.facets;
          const continuingEVMTransactionHandler = async cSeat => {
            cSeat.exit();
            if (method === 'printName') {
              return evm.printName('Rabi', 'Siddique');
            }
            if (method === 'localAccount') {
              const localChainAddress = await localAccount.getAddress();
              return localChainAddress.value;
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
  return makeEvmTransactionKit;
};
harden(prepareEVMTransactionKit);
