/**
 * @file socialHub -- connect other social names to agoric user nameHubs
 */

import { makeNameHubKit } from '@agoric/vats';
import { E, Far } from '@endo/far';

/**
 * @typedef {{namesByAddress: ERef<import("@agoric/vats").NameHub>}} SocialTerms
 * @param {ZCF<SocialTerms>} zcf
 */
export const start = (zcf, privateArgs, _baggage) => {
  const { namesByAddress } = zcf.getTerms();
  const { namesByAddressAdmin } = privateArgs;
  // TODO: pattern to check that namesByAddressAdmin is a remotable

  const social = makeNameHubKit();

  /** @type {OfferHandler} */
  const registerHandler = async (seat, offerArgs) => {
    // TODO: charge for registration?
    // const { give } = seat.getProposal;
    // const { Fee } = give;
    // AmountMath.isGTE(Fee, Price) || Fail`you lose!`;

    const { name, address } = offerArgs;

    const yourHub = await E(namesByAddress).lookup(address);
    await E(social.nameAdmin).update(name, yourHub);
    return `${name} registered with ${address}`;
  };

  const publicFacet = Far('SocialHub PF', {
    makeRegisterInvitation: () =>
      zcf.makeInvitation(registerHandler, 'register'),
  });

  return { publicFacet };
};
