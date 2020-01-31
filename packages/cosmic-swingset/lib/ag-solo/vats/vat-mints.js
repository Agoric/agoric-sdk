import harden from '@agoric/harden';
import { makeMint } from '@agoric/ertp';

import makeStore from '@agoric/store';

// This vat contains two starting mints for demos: moolaMint and
// simoleanMint. A third mint, the dustMint, is made by the pixel
// demo.

function build(_E, _log) {
  const mints = makeStore();

  const api = harden({
    getAllAssetNames: () => mints.keys(),
    getAssay: assetName => {
      const mint = mints.get(assetName);
      mint.getAssay();
    },
    getAssays: assetNames => assetNames.map(api.getAssay),

    // NOTE: having a reference to a mint object gives the ability to mint
    // new digital assets, a very powerful authority. This authority
    // should be closely held.
    getMint: mints.get,
    getMints: assetNames => assetNames.map(api.getMint),
    // For example, assetNameSingular might be 'moola', or 'simolean'
    makeMintAndAssay: assetNameSingular => {
      const mint = makeMint(assetNameSingular);
      mints.init(assetNameSingular, mint);
      return mint.getAssay();
    },
    mintInitialPayment: (assetName, extent) => {
      const mint = mints.get(assetName);
      const purse = mint.mint(extent);
      return purse.withdrawAll();
    },
    mintInitialPayments: (assetNames, extents) =>
      assetNames.map((assetName, i) =>
        api.mintInitialPayment(assetName, extents[i]),
      ),
  });

  return api;
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
