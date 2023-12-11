// @ts-check
import { E, Far } from '@endo/far';
import { withdrawFromSeat } from '../../contractSupport/zoeHelpers.js';
import { prepareExo, prepareExoClassKit, provide } from '@agoric/vat-data';

const { keys, values } = Object;

/** @type {ContractMeta} */
export const meta = harden({
  upgradability: 'canBeUpgraded',
});

/**
 * @typedef {object} PostalSvcTerms
 * @property {import('@agoric/vats').NameHub} namesByAddress
 */

/**
 * @param {ZCF<PostalSvcTerms>} zcf
 * @param {unknown} _pf
 * @param {Baggage} baggage
 */
export const start = (zcf, _pf, baggage) => {
  const { namesByAddress, issuers } = zcf.getTerms();
  console.log('postalSvc issuers', Object.keys(issuers));

  const make = prepareExoClassKit(baggage, 'PostalSvc', undefined, () => ({}), {
    publicFacet: {
      lookup(...path) {
        return E(namesByAddress).lookup(...path);
      },
      /**
       * @param {string} addr
       * @returns {ERef<DepositFacet>}
       */
      getDepositFacet(addr) {
        assert.typeof(addr, 'string');
        return E(namesByAddress).lookup(addr, 'depositFacet');
      },

      /**
       * @param {string} addr
       * @param {Payment} pmt
       */
      sendTo(addr, pmt) {
        const { publicFacet } = this.facets;
        return E(publicFacet.getDepositFacet(addr)).receive(pmt);
      },

      /** @param {string} recipient */
      makeSendInvitation(recipient) {
        assert.typeof(recipient, 'string');
        const { publicFacet } = this.facets;

        /** @type {OfferHandler} */
        const handleSend = async seat => {
          const { give } = seat.getProposal();
          const depositFacet = await publicFacet.getDepositFacet(recipient);
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
      },
    },
    creatorFacet: {},
  });

  const facets = provide(baggage, 'postalSvc', make);
  return facets;
};
