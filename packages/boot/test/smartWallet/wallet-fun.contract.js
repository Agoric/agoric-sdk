/** @file contract that can invite participants to set prices */
import { makeTracer } from '@agoric/internal';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { M } from '@endo/patterns';

const trace = makeTracer('WFun');

/**
 * @param {ZCF} zcf
 * @param {unknown} _pa
 * @param {import('@agoric/swingset-liveslots').Baggage} baggage
 */
export const start = (zcf, _pa, baggage) => {
  const zone = makeDurableZone(baggage);
  const incarnation = (() => {
    if (!baggage.has('incarnation')) {
      baggage.init('incarnation', 0n);
      return 0n;
    }
    const post = /** @type {bigint} */ (baggage.get('incarnation')) + 1n;
    baggage.set('incarnation', post);
    return post;
  })();

  /** @type {import('@agoric/store').SetStore<ReturnType<typeof makeAdmin>>} */
  const admins = zone.setStore('admins');

  const publicFacet = zone.exo(
    'pf',
    M.interface('pf', {
      getIncarnation: M.call().returns(M.nat()),
      getPrices: M.call().returns(M.arrayOf(M.nat())),
    }),
    {
      getIncarnation() {
        return incarnation;
      },
      getPrices() {
        return [...admins.values()].map(a => a.getPrice());
      },
    },
  );

  const makeAdmin = zone.exoClass(
    'Admin',
    M.interface('Admin', {
      getPrice: M.call().returns(M.nat()),
      setPrice: M.call(M.nat()).returns(),
    }),
    () => ({ price: 0n }),
    {
      getPrice() {
        return this.state.price;
      },
      /** @param {import('@agoric/ertp').NatValue} p */
      setPrice(p) {
        this.state.price = p;
        console.log('price', p);
      },
    },
  );

  const creatorFacet = zone.exo(
    'cf',
    M.interface('cf', {
      makeAdminInvitation: M.callWhen().returns(M.remotable('Invitation')),
    }),
    {
      makeAdminInvitation() {
        return zcf.makeInvitation(
          seat => {
            trace('admin invitation handler', { incarnation });
            const it = makeAdmin();
            admins.add(it);
            seat.exit();
            return it;
          },
          'admin',
          undefined,
          harden(M.splitRecord({ give: {}, want: {} })),
        );
      },
    },
  );

  return {
    publicFacet,
    creatorFacet,
  };
};
harden(start);
