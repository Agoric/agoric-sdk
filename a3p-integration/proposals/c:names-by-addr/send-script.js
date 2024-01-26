// @ts-nocheck
/* global E */

/**
 * Send a payment by looking up deposit facet via namesByAddress.
 *
 * see ./post.test.js
 *
 * @param {BootstrapPowers} powers
 */
const sendIt = async powers => {
  const addr = '{{ADDRESS}}';
  const {
    consume: { namesByAddress, zoe },
    instance: {
      consume: { reserve },
    },
  } = powers;
  const pf = E(zoe).getPublicFacet(reserve);
  const anInvitation = await E(pf).makeAddCollateralInvitation();
  const addressDepositFacet = E(namesByAddress).lookup(addr, 'depositFacet');
  await E(addressDepositFacet).receive(anInvitation);
};

sendIt;
