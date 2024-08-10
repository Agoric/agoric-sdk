import { M } from '@endo/patterns';
import { prepareRevocableMakerKit } from '@agoric/base-zone/zone-helpers.js';
import { OfferHandlerI } from '../typeGuards.js';

const TransferProposalShape = M.splitRecord({
  give: {},
  want: {},
  exit: {
    onDemand: null,
  },
});

/**
 * @typedef {object} OwnableOptions
 * @property {string} [uInterfaceName]
 *   The `interfaceName` of the underlying interface guard.
 *   Defaults to the `uKindName`.
 */

/**
 * Prepare a kind that wraps an 'ownable' object with a `makeTransferInvitation`
 * ability and delegates to the underlying object methods specified in an
 * allowlist of method names.
 *
 * @template {(string | symbol)[]} MN Method names
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ZCF['makeInvitation']} makeInvitation
 *   A function with the same behavior as `zcf.makeInvitation`.
 *   A contract will normally just extract it from its own zcf using the
 *   argument expression
 *   ```js
 *   (...args) => zcf.makeInvitation(...args)
 *   ```
 *   See ownable-counter.js for the canonical example.
 * @param {string} uKindName
 *   The `kindName` of the underlying exo class
 * @param {MN} uMethodNames
 *   The method names of the underlying exo class that should be represented
 *   by transparently-forwarding methods of the wrapping ownable object.
 * @param {OwnableOptions} [options]
 * @returns {<U>(underlying: U) => Pick<U, MN[number]> & {makeTransferInvitation: () => Invitation<U>}}
 */
export const prepareOwnable = (
  zone,
  makeInvitation,
  uKindName,
  uMethodNames,
  options = {},
) => {
  const { uInterfaceName = uKindName } = options;
  const { revoke, makeRevocable } = prepareRevocableMakerKit(
    zone,
    uKindName,
    uMethodNames,
    {
      uInterfaceName,
      extraMethodGuards: {
        makeTransferInvitation: M.call().returns(M.promise()),
      },
      extraMethods: {
        makeTransferInvitation() {
          const { underlying } = this.state;
          const { revocable } = this.facets;
          const customDetails = underlying.getInvitationCustomDetails();
          // eslint-disable-next-line no-use-before-define
          const transferHandler = makeTransferHandler(underlying);

          const invitation = makeInvitation(
            transferHandler,
            'transfer',
            customDetails,
            TransferProposalShape,
          );
          revoke(revocable);
          return invitation;
        },
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
        const { underlying } = this.state;
        const revocable = makeRevocable(underlying);
        seat.exit();
        return revocable;
      },
    },
  );

  const makeOwnable = underlying => makeRevocable(underlying);
  return harden(makeOwnable);
};
harden(prepareOwnable);
