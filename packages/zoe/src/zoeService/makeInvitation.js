// @jessie-check

import { Fail, q } from '@endo/errors';
import { provideDurableMapStore } from '@agoric/vat-data';
import { AssetKind, hasIssuer, prepareIssuerKit } from '@agoric/ertp';
import { InvitationElementShape } from '../typeGuards.js';

/**
 * @import {Panic} from '@agoric/internal';
 * @import {Baggage} from '@agoric/vat-data';
 * @import {InvitationDetails} from '../types-index.js';
 */

/**
 * Not deprecated because the first use below is still correct.
 */
const ZOE_INVITATION_KIT = 'ZoeInvitationKit';

/**
 * @param {Baggage} baggage
 * @param {Panic} [optShutdownZoeVat]
 */
export const prepareInvitationKit = (
  baggage,
  optShutdownZoeVat = undefined,
) => {
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
  const invitationKit = prepareIssuerKit(
    invitationKitBaggage,
    'Zoe Invitation',
    AssetKind.SET,
    undefined,
    optShutdownZoeVat,
    { elementShape: InvitationElementShape },
  );

  return harden({
    invitationIssuer: invitationKit.issuer,
    invitationKit,
  });
};
