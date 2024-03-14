import { M } from '@endo/patterns';
import { prepareRevocableKit } from '@agoric/base-zone/zone-helpers.js';
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
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {MakeInvitation} makeInvitation
 *   A function with the same behavior as `zcf.makeInvitation`.
 *   A contract will normally just extract it from its own zcf using the
 *   argument expression
 *   ```js
 *   (...args) => zcf.makeInvitation(...args)
 *   ```
 *   See ownable-counter.js for the canonical example.
 * @param {string} uKindName
 *   The `kindName` of the underlying exo class
 * @param {(string|symbol)[]} uMethodNames
 *   The method names of the underlying exo class that should be represented
 *   by transparently-forwarding methods of the wrapping ownable object.
 * @param {OwnableOptions} [options]
 * @returns {<U>(underlying: U) => U}
 */
export const prepareOwnable = (
  zone,
  makeInvitation,
  uKindName,
  uMethodNames,
  options = {},
) => {
  const { uInterfaceName = uKindName } = options;
  const makeRevocableKit = prepareRevocableKit(zone, uKindName, uMethodNames, {
    uInterfaceName,
    extraMethodGuards: {
      makeTransferInvitation: M.call().returns(M.promise()),
    },
    extraMethods: {
      makeTransferInvitation() {
        const { underlying } = this.state;
        const { revoker } = this.facets;
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
  });

  const makeTransferHandler = zone.exoClass(
    'TransferHandler',
    OfferHandlerI,
    underlying => ({
      underlying,
    }),
    {
      handle(seat) {
        const { underlying } = this.state;
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
