// @jessie-check

import { Fail, q } from '@endo/errors';
import { provideDurableMapStore } from '@agoric/vat-data';
import { AssetKind, hasIssuer, prepareIssuerKit } from '@agoric/ertp';
import { InvitationElementShape } from '../typeGuards.js';

/**
 * Not deprecated because the first use below is still correct.
 */
const ZOE_INVITATION_KIT = 'ZoeInvitationKit';

/**
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {import('@agoric/swingset-vat').ShutdownWithFailure | undefined} shutdownZoeVat
 */
export const prepareInvitationKit = (baggage, shutdownZoeVat = undefined) => {
  const invitationKitBaggage = provideDurableMapStore(
    baggage,
    ZOE_INVITATION_KIT,
  );
  if (invitationKitBaggage.has(ZOE_INVITATION_KIT)) {
    // This legacy second use of ZOE_INVITATION_KIT is unneeded.
    hasIssuer(invitationKitBaggage) ||
      Fail`Legacy use of ${q(
        ZOE_INVITATION_KIT,
      )} must be redundant with normal storing of issuerKit in issuerBaggage`;
    // Upgrade this legacy state by simply deleting it.
    invitationKitBaggage.delete(ZOE_INVITATION_KIT);
  }

  /** @type {IssuerKit<'set', InvitationDetails>} */
  // @ts-expect-error cast
  const invitationKit = prepareIssuerKit(
    invitationKitBaggage,
    'Zoe Invitation',
    AssetKind.SET,
    undefined,
    shutdownZoeVat,
    { elementShape: InvitationElementShape },
  );

  return harden({
    invitationIssuer: invitationKit.issuer,
    invitationKit,
  });
};
