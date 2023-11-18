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
   * @returns {ERef<DepositFacet>}
   */
  const getDepositFacet = addr => {
    assert.typeof(addr, 'string');
    return E(namesByAddress).lookup(addr, 'depositFacet');
  };

  /**
   * @param {string} addr
   * @param {Payment} pmt
   */
  const sendTo = (addr, pmt) => E(getDepositFacet(addr)).receive(pmt);

  /** @param {string} recipient */
  const makeSendInvitation = recipient => {
    assert.typeof(recipient, 'string');

    /** @type {OfferHandler} */
    const handleSend = async seat => {
      const { give } = seat.getProposal();
      const depositFacet = await getDepositFacet(recipient);
      const payouts = await withdrawFromSeat(zcf, seat, give);

      // XXX partial failure? return payments?
      await Promise.all(
        values(payouts).map(pmtP =>
          Promise.resolve(pmtP).then(pmt => E(depositFacet).receive(pmt)),
        ),
      );
      return `sent ${keys(payouts).join(', ')}`;
    };

    return zcf.makeInvitation(handleSend, 'send');
  };

  const publicFacet = Far('postalSvc', {
    lookup: (...path) => E(namesByAddress).lookup(...path),
    getDepositFacet,
    sendTo,
    makeSendInvitation,
  });
  return { publicFacet };
};
