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
    const depositFacet = E(namesByAddress).lookup(addr, 'depositFacet');
    return E(depositFacet).receive(pmt);
  };

  const makeSendInvitation = recipient => {
    assert.typeof(recipient, 'string');

    const handleSend = async seat => {
      const { give } = seat.getProposal();
      /** @type {ERef<DepositFacet>} */
      const depositFacet = E(namesByAddress).lookup(recipient, 'depositFacet');
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
    sendTo,
    makeSendInvitation,
  });
  return { publicFacet };
};
