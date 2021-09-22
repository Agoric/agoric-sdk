/* eslint-disable import/no-extraneous-dependencies,no-unused-vars,no-empty-function */
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import stablecoinBundle from '@agoric/treasury/bundles/bundle-stablecoinMachine.js';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';

export function buildRootObject() {
  let control;
  let meter;
  let zoe;
  let installation;

  return Far('root', {
    async bootstrap(vats, devices) {
      const service = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      zoe = await E(vats.zoe).buildZoe(service);
      const lots = 1_000_000_000n;
      meter = await E(service).createMeter(lots, 0n);
      const opts = { managerType: 'xs-worker', meter };
      control = await E(service).createVatByName('target', opts);
      await E(control.root).setZoe(zoe);
    },

    async measure(mode) {
      const start = await E(meter).get();
      await E(control.root)[mode]();
      const finish = await E(meter).get();
      return Number(start.remaining - finish.remaining);
    },

    async zoeInstallTreasury() {
      installation = await E(zoe).install(stablecoinBundle);
    },
    async zoeInstallBundle(bundle) {
      installation = await E(zoe).install(bundle);
    },

    async zoeInstantiate() {
      const ik = makeIssuerKit('tokens');
      await E(zoe).startInstance(installation, harden({ Central: ik.issuer }), {
        poolFee: 24n,
        protocolFee: 6n,
      });
    },
  });
}
