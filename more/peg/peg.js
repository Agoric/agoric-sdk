/* eslint-disable */

import harden from '@agoric/harden';
import { makeNatDescOps } from '../../core/config/natDescOps';
import { makeMint } from '../../core/mint';

// This implementation may be out of date

// Creates a local assay that locally represents a remotely issued
// currency. Returns a promise for a peg object that asynchonously
// converts between the two. The local currency is synchronously
// transferable locally.
function makePeg(E, remoteAssayP, makeMintKeeper, makeUnitOps = makeNatDescOps) {
  const remoteLabelP = E(remoteAssayP).getLabel();

  // The remoteLabel is a local copy of the remote pass-by-copy
  // label. It has a presence of the remote assay and a copy of the
  // description.
  return Promise.resolve(remoteLabelP).then(remoteLabel => {
    // Retaining remote currency deposits it in here.
    // Redeeming local currency withdraws remote from here.
    const backingPurseP = E(remoteAssayP).makeEmptyPurse('backing');

    const { description } = remoteLabel;
    const localMint = makeMint(description, makeMintKeeper, makeUnitOps);
    const localAssay = localMint.getAssay();
    const localLabel = localAssay.getLabel();

    function localUnitsOf(remoteUnits) {
      return harden({
        label: localLabel,
        extent: remoteUnits.extent,
      });
    }

    function remoteUnitsOf(localUnits) {
      return harden({
        label: remoteLabel,
        extent: localUnits.extent,
      });
    }

    return harden({
      getLocalAssay() {
        return localAssay;
      },

      getRemoteAssay() {
        return remoteAssayP;
      },

      retainAll(remotePaymentP, name = 'backed') {
        return E(backingPurseP)
          .depositAll(remotePaymentP)
          .then(remoteUnits =>
            localMint
              .mint(localUnitsOf(remoteUnits), `${name} purse`)
              .withdrawAll(name),
          );
      },

      redeemAll(localPayment, name = 'redeemed') {
        return localAssay
          .burnAll(localPayment)
          .then(localUnits =>
            E(backingPurseP).withdraw(remoteUnitsOf(localUnits), name),
          );
      },
    });
  });
}
harden(makePeg);

export { makePeg };
