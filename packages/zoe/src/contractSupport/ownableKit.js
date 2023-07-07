import { M } from '@endo/patterns';
import { prepareExo } from '@agoric/vat-data';
import { OfferHandlerI } from '../typeGuards.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

const { apply } = Reflect;

const TransferProposalShape = harden({
  give: {},
  want: {},
  exit: {
    onDemand: {},
  },
});

const defaultGetSelfFromThis = {
  getSelfFromThis() {
    const { self } = this;
    return self;
  },
}.getSelfFromThis;

export const makeOwnableKit = (
  zcf,
  baggage,
  detailsShape,
  makeOwnableObject,
  getSelfFromThis = defaultGetSelfFromThis,
) => {
  const OwnableObjectMethodGuards = harden({
    incr: M.call().returns(M.bigint()),
    getCustomDetails: M.call().returns(detailsShape),
    makeTransferInvitation: M.call().returns(M.promise()),
  });

  let revokeTransferHandler;

  const transferHandler = prepareExo(
    baggage,
    'TransferHandler',
    OfferHandlerI,
    {
      handle(seat) {
        // @ts-expect-error Usual self-typing problem
        const { self } = this;
        // TODO implement *Seat.getDetails()
        const { customDetails } = seat.getDetails();
        seat.exit();
        revokeTransferHandler(self);
        return makeOwnableObject(customDetails);
      },
    },
    {
      receiveRevoker(revoke) {
        revokeTransferHandler = revoke;
      },
    },
  );

  let revokeOwnableObject;

  const ownableObjectMethods = harden({
    makeTransferInvitation() {
      const self = apply(getSelfFromThis, this, []);
      const invitation = zcf.makeInvitation(
        // eslint-disable-next-line no-use-before-define
        transferHandler,
        'transfer',
        self.getCustomDetails(),
        TransferProposalShape,
      );
      revokeOwnableObject(self);
      return invitation;
    },
  });

  const ownableObjectOptions = harden({
    receiveRevoker(revoke) {
      revokeOwnableObject = revoke;
    },
  });

  return harden({
    // note: includes getCustomDetails
    OwnableObjectMethodGuards,
    // note: does not include getCustomDetails,
    // so getCustomDetails is effectively an abstract method that must be
    // concretely implemented.
    ownableObjectMethods,
    ownableObjectOptions,
  });
};
harden(makeOwnableKit);
