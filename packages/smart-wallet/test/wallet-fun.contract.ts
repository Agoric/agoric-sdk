/** @file contract that can invite participants to set prices */
import { makeTracer } from '@agoric/internal';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { M } from '@endo/patterns';
import type { NatValue } from '@agoric/ertp';
import type { SetStore } from '@agoric/store';
import type { Baggage } from '@agoric/vat-data';
import type { ZCF, ZCFSeat } from '@agoric/zoe';

const trace = makeTracer('WFun');

export const start = (zcf: ZCF, _pa: unknown, baggage: Baggage) => {
  const zone = makeDurableZone(baggage);

  const admins: SetStore<ReturnType<typeof makeAdmin>> =
    zone.setStore('admins');

  let value: NatValue | undefined;
  const makeValueSetter = zone.exoClass(
    'FunThing',
    undefined,
    (offset: NatValue | undefined) => ({ offset }),
    {
      setValue(valueIn: NatValue) {
        const { offset } = this.state;
        value = offset === undefined ? valueIn : valueIn + offset;
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
      getPrices(): NatValue[] {
        return [...admins.values()].map(a => a.getPrice());
      },
      makeValueSetterInvitation() {
        return zcf.makeInvitation(
          (seat: ZCFSeat, args?: { offset?: NatValue }) => {
            seat.exit();
            return makeValueSetter(args?.offset);
          },
          'setter',
        );
      },
      getValue(): NatValue | undefined {
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
      setPrice(p: NatValue) {
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
