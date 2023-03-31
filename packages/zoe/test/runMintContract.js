import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp';

/**
 * @param {ZCF} zcf
 * @param {{feeMintAccess: FeeMintAccess}} privateArgs
 */
const start = async (zcf, privateArgs) => {
  const runIst = await zcf.registerFeeMint('IST', privateArgs.feeMintAccess);

  const run10 = AmountMath.make(runIst.getIssuerRecord().brand, 10n);

  const creatorFacet = Far('creatorFacet', {
    mintIst: () => {
      const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
      runIst.mintGains(harden({ IST: run10 }), zcfSeat);
      zcfSeat.exit();
      return E(userSeat).getPayout('IST');
    },
  });
  return harden({ creatorFacet });
};
harden(start);
export { start };
