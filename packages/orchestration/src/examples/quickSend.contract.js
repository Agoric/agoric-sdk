import { NobleCalc } from '../../tools/noble-mock.js';
import { AgoricCalc } from '../../tools/agoric-mock.js';

/**
 * @import {Baggage} from '@agoric/vat-data';
 */

/**
 * @param {ZCF<{ makerFee: number; contractFee: number }>} zcf
 * @param {{ orch: any; storageNode: any; t: any }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { orch, storageNode, t } = privateArgs;
  const { contractFee, makerFee } = zcf.getTerms();
  const fundingPool = await orch.makeLocalAccount();
  const settlement = await orch.makeLocalAccount();
  const feeAccount = await orch.makeLocalAccount();

  const { nextLabel: next } = t.context;
  storageNode.setValue(settlement.getAddress());

  const publicFacet = harden({
    getPoolAddress: async () => fundingPool.getAddress(),
    getSettlementAddress: async () => settlement.getAddress(),
    getFeeAddress: async () => feeAccount.getAddress(),
  });

  await settlement.tap(
    harden({
      onReceive: async ({ amount, extra }) => {
        t.log(next(), 'tap onReceive', { amount });
        // XXX partial failure?
        await Promise.all([
          settlement.send({
            dest: fundingPool.getAddress(),
            amount: amount - contractFee,
          }),
          settlement.send({
            dest: feeAccount.getAddress(),
            amount: contractFee,
          }),
        ]);
      },
    }),
  );

  const watcherFacet = harden({
    releaseAdvance: async ({ amount, dest, nobleFwd }) => {
      t.log(next(), 'contract.releaseAdvance', { amount, dest });
      t.is(
        NobleCalc.fwdAddressFor(
          AgoricCalc.virtualAddressFor(fundingPool.getAddress(), dest),
        ),
        nobleFwd,
      );
      const advance = amount - makerFee - contractFee;
      await fundingPool.transfer({ dest, amount: advance });
    },
  });

  const creatorFacet = harden({
    // TODO: continuing invitation pattern
    getWatcherFacet: () => watcherFacet,
  });

  return harden({
    publicFacet,
    creatorFacet,
  });
};
harden(start);
