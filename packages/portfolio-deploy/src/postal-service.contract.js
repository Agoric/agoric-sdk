/** @file contract to deliver to addressees */

import { makeTracer } from '@agoric/internal';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { E } from '@endo/eventual-send';
import { M } from '@endo/patterns';
import { makePromiseKit } from '@endo/promise-kit';

const depositFacetKey = 'depositFacet';

/**
 * @import {Remote} from '@agoric/internal';
 * @import {NameHub} from '@agoric/vats';
 * @import {Baggage} from '@agoric/vat-data';
 */

const privateArgsShape = harden({
  namesByAddress: M.remotable('namesByAddress'),
});
export const meta = { privateArgsShape };
harden(meta);

const publicI = M.interface('PostalPub', {
  getDepositFacet: M.callWhen(M.string()).returns(M.remotable('DepositFacet')),
  deliverPayment: M.callWhen(M.string(), M.remotable('Payment')).returns(),
  deliverPrize: M.callWhen(M.string(), M.any()).optional(M.string()).returns(),
});

const trace = makeTracer('PostSvc');

/**
 *
 * @param {ZCF} zcf
 * @param {{ namesByAddress: Remote<NameHub>}} privateArgs
 * @param {Baggage} baggage
 */
export const start = (zcf, privateArgs, baggage) => {
  const { namesByAddress } = privateArgs;
  const zone = makeDurableZone(baggage);

  const publicFacet = zone.exo('postalSvc publicFacet', publicI, {
    /** @param {string} addr */
    async getDepositFacet(addr) {
      trace('getDepositFacet', addr);
      const depositFacet = await E(namesByAddress).lookup(
        addr,
        depositFacetKey,
      );
      trace('getDepositFacet', addr, depositFacet);
      return depositFacet;
    },
    /**
     * @param {string} addr
     * @param {Payment} pmt
     */
    async deliverPayment(addr, pmt) {
      // @ts-expect-error XXX TS2339: Property 'self' does not exist...???
      const depositFacetP = this.self.getDepositFacet(addr);
      await E(depositFacetP).receive(pmt);
    },
    /**
     * Deliver an invitation to an offer whose result is a prize.
     *
     * NB: The invitation handler is _not_ durable; the prize will
     * be dropped if the postal service is upgraded before the prize
     * is collected.
     *
     * @param {string} addr
     * @param {unknown} prize
     * @param {string} label
     */
    async deliverPrize(addr, prize, label = 'prize') {
      const delivered = makePromiseKit();
      const toCollectPrize = await zcf.makeInvitation(seat => {
        seat.exit();
        delivered.resolve(true);
        return prize;
      }, `deliver ${label}`);
      // @ts-expect-error XXX TS2339: Property 'self' does not exist...???
      await this.self.deliverPayment(addr, toCollectPrize);
      await delivered.promise;
    },
  });

  return { publicFacet };
};
harden(start);
