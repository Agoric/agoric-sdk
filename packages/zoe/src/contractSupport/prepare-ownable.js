import { M } from '@endo/patterns';
import { prepareExoClass, prepareRevocableKit } from '@agoric/vat-data';
import { OfferHandlerI } from '../typeGuards.js';

const TransferProposalShape = M.splitRecord({
  give: {},
  want: {},
  exit: {
    onDemand: null,
  },
});

export const prepareOwnable = (
  zcf,
  baggage,
  uKindName,
  uInterfaceName,
  uMethodNames,
) => {
  const makeRevocableKit = prepareRevocableKit(
    baggage,
    uKindName,
    uInterfaceName,
    uMethodNames,
    {
      makeTransferInvitation: M.call().returns(M.promise()),
    },
    {
      makeTransferInvitation() {
        const {
          state: {
            // @ts-expect-error `this` typing
            underlying,
          },
          facets: {
            // @ts-expect-error `this` typing
            revoker,
          },
        } = this;
        const customDetails = underlying.getCustomDetails();
        // eslint-disable-next-line no-use-before-define
        const transferHandler = makeTransferHandler(underlying);

        const invitation = zcf.makeInvitation(
          transferHandler,
          'transfer',
          customDetails,
          TransferProposalShape,
        );
        revoker.revoke();
        return invitation;
      },
    },
  );

  const makeTransferHandler = prepareExoClass(
    baggage,
    'TransferHandler',
    OfferHandlerI,
    underlying => ({
      underlying,
    }),
    {
      handle(seat) {
        const {
          state: { underlying },
        } = this;
        const { revocable } = makeRevocableKit(underlying);
        seat.exit();
        return revocable;
      },
    },
  );

  const makeOwnable = underlying => {
    const { revocable } = makeRevocableKit(underlying);
    return revocable;
  };
  return harden(makeOwnable);
};
harden(prepareOwnable);
