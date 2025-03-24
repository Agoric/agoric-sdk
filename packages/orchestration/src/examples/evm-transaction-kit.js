import { M, prepareExoClassKit } from '@agoric/vat-data';
import { defineDurableHandle } from '@agoric/zoe/src/makeHandle.js';

const EVMI = M.interface('evmTransaction', {
  printName: M.call(M.any(), M.any()).returns(M.any()),
});

const InvitationMakerI = M.interface('invitationMaker', {
  makeEvmTransactionInvitation: M.call(M.any(), M.any()).returns(M.any()),
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
        makeEvmTransactionInvitation(firstName, lastName) {
          const { evm } = this.facets;
          const continuingEVMTransactionHandler = cSeat => {
            cSeat.exit();
            return evm.printName(firstName, lastName);
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
