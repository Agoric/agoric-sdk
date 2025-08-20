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

  /** @type {import('@agoric/store').SetStore<ReturnType<typeof makeAdmin>>} */
  const admins = zone.setStore('admins');

  let value;
  const makeValueSetter = zone.exoClass(
    'FunThing',
    undefined,
    offset => ({ offset }),
    {
      setValue(valueIn) {
        const { offset } = this.state;
        value = valueIn + offset;
      },
    },
  );

  const publicFacet = zone.exo(
    'pf',
    M.interface('pf', {
      getPrices: M.call().returns(M.arrayOf(M.nat())),
      makeValueSetterInvitation: M.callWhen().returns(
        M.remotable('ValueSetter'),
      ),
      getValue: M.call().returns(M.scalar()),
    }),
    {
      getPrices() {
        return [...admins.values()].map(a => a.getPrice());
      },
      makeValueSetterInvitation() {
        return zcf.makeInvitation((seat, /** @type {object} */ args) => {
          seat.exit();
          return makeValueSetter(args?.offset);
        }, 'setter');
      },
      getValue() {
        return value;
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
            trace('admin invitation handler');
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
