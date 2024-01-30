import { M } from '@endo/patterns';
import { OfferHandlerI } from '../typeGuards.js';
import { prepareRevocableKit } from './prepare-revocable.js';

const TransferProposalShape = M.splitRecord({
  give: {},
  want: {},
  exit: {
    onDemand: null,
  },
});

/**
 * @template {any} [U=any]
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {MakeInvitation} makeInvitation
 * @param {string} uKindName
 * @param {string} uInterfaceName
 * @param {(string|symbol)[]} uMethodNames
 * @returns {(underlying: U) => U}
 */
export const prepareOwnable = (
  zone,
  makeInvitation,
  uKindName,
  uInterfaceName,
  uMethodNames,
) => {
  const makeRevocableKit = prepareRevocableKit(
    zone,
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
        const customDetails = underlying.getInvitationCustomDetails();
        // eslint-disable-next-line no-use-before-define
        const transferHandler = makeTransferHandler(underlying);

        const invitation = makeInvitation(
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

  const makeTransferHandler = zone.exoClass(
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
