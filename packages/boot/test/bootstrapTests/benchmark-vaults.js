// This is a version of bench-vaults-performance.js designed to run as a
// standalone node executable, without reference to Ava, using the
// benchmarkerator module.  It has had all intrinsic performance measurement
// code stripped out of it, purely implementing the vault benchmark test code in
// expectation of extrinsic measurement.

import { bench } from './benchmarkerator.js';

// eslint-disable-next-line import/order
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';

const collateralBrandKey = 'ATOM';

bench.addBenchmark('vault open', {
  executeRound: async (context, round) => {
    const { alice } = context.actors;

    const openVault = async (i, n, r) => {
      const offerId = `open-vault-${i}-of-${n}-round-${r}`;
      await alice.executeOfferMaker(Offers.vaults.OpenVault, {
        offerId,
        collateralBrandKey,
        wantMinted: 5,
        giveCollateral: 1.0,
      });

      const upd = alice.getLatestUpdateRecord();
      assert(
        upd.updated === 'offerStatus' &&
          upd.status.id === offerId &&
          upd.status.numWantsSatisfied === 1,
      );
    };

    const openN = async n => {
      const range = [...Array(n)].map((_, i) => i + 1);
      await Promise.all(range.map(i => openVault(i, n, round)));
    };

    const roundSize = context.params.size ? Number(context.params.size) : 1;
    await openN(roundSize);
  },
});

await bench.run('vaults');
