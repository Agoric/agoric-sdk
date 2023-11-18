// @ts-check
import { E, Far } from '@endo/far';
import { withdrawFromSeat } from '../../contractSupport/zoeHelpers.js';

const { keys, values } = Object;

/**
 * @typedef {object} PostalSvcTerms
 * @property {import('@agoric/vats').NameHub} namesByAddress
 */

/** @param {ZCF<PostalSvcTerms>} zcf */
export const start = zcf => {
  const { namesByAddress, issuers } = zcf.getTerms();
  console.log('postalSvc issuers', Object.keys(issuers));

  /**
   * @param {string} addr
   * @param {Payment} pmt
   * @returns
   */
  const sendTo = (addr, pmt) => {
    const dpositFacet = E(namesByAddress).lookup(addr, 'depositFacet');
    return E(dpositFacet).receive(pmt);
  };

  const handleSend = recipient => async seat => {
    const { give } = seat.getProposal();
    const payouts = await withdrawFromSeat(zcf, seat, give);

    // XXX partial failure?
    for await (const pmtP of values(payouts)) {
      const pmt = await pmtP;
      await sendTo(recipient, pmt);
    }
    return `sent ${keys(payouts).join(', ')}`;
  };

  const publicFacet = Far('postalSvc', {
    sendTo,
    makeSendInvitation: recipient => {
      assert.typeof(recipient, 'string');
      return zcf.makeInvitation(handleSend(recipient), 'send');
    },
  });
  return { publicFacet };
};
