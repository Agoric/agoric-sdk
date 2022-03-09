// @ts-check

import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

// import { E } from '@agoric/eventual-send';
import '@agoric/governance/src/exported';

import {
  assertProposalShape,
} from '@agoric/zoe/src/contractSupport/index.js';
import {
  ceilMultiplyBy,
  makeRatio,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { Far } from '@endo/marshal';
// import { CONTRACT_ELECTORATE } from '@agoric/governance';

import { AmountMath } from '@agoric/ertp';
import { makeMakeCollectFeesInvitation } from '../vaultFactory/collectRewardFees.js';
import { makeParamManagerBuilder } from '@agoric/governance';
// import { makeVaultParamManager, makeElectorateParamManager } from './params.js';

const { details: X } = assert;

const FEE_PARAM = 'FEE';

const makeParamTerms = (number, invitationAmount) => {
  return harden({
    [FEE_PARAM]: makeGovernedNat(number),
    // [CONTRACT_ELECTORATE]: makeGovernedInvitation(invitationAmount),
  });
};

const makeParamManager = async (zoe, number, invitation) => {
  const builder = makeParamManagerBuilder(zoe).addNat(FEE_PARAM, number);
  // await builder.addInvitation(CONTRACT_ELECTORATE, invitation);
  return builder.build();
};
/**
 * @param {ContractFacet} zcf
 * @param {{feeMintAccess: FeeMintAccess}} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const {
    main: {
      [FEE_PARAM]: feeParam,
    },
    anchorBrand,
  } = zcf.getTerms();

  const { feeMintAccess } = privateArgs;
  const baseMint = await zcf.registerFeeMint('RUN', feeMintAccess);
  const { brand: runBrand } = baseMint.getIssuerRecord();
  zcf.setTestJig(() => ({
    runIssuerRecord: baseMint.getIssuerRecord(),
  }));

  const { zcfSeat: anchorPool } = zcf.makeEmptySeatKit();
  const { zcfSeat: feePool } = zcf.makeEmptySeatKit();
  const { zcfSeat: stage } = zcf.makeEmptySeatKit();
  const BASIS_POINTS = 10000n;
  const FEE_BP = 2n;
  // const withFee = makeRatio(BASIS_POINTS - FEE_BP, baseBrand, BASIS_POINTS);
  const feeRate = makeRatio(FEE_BP, runBrand, BASIS_POINTS);

  const swapHook = seat => {
    assertProposalShape(seat, {
      give: { In: null },
      want: { Out: null },
    });
    const {
      give: { In: given },
      want: { Out: wanted },
    } = seat.getProposal();
    if (given.brand === runBrand) {
      assert(wanted.brand === anchorBrand, X`Unexpected brand ${wanted}`);
      const fee = ceilMultiplyBy(given, feeRate);
      const afterFee = AmountMath.subtract(given, fee);
      const maxAnchor = AmountMath.make(wanted.brand, afterFee.value);
      assert(
        AmountMath.isGTE(maxAnchor, wanted),
        X`wanted ${wanted} is more then ${given} minus fees ${fee}`,
      );
      seat.decrementBy(stage.incrementBy({ RUN: afterFee }));
      seat.decrementBy(feePool.incrementBy({ RUN: fee }));
      seat.incrementBy(anchorPool.decrementBy({ Anchor: maxAnchor }));
      zcf.reallocate(seat, anchorPool, stage, feePool);
      baseMint.burnLosses({ RUN: afterFee }, stage);
    } else if (given.brand === anchorBrand) {
      assert(wanted.brand === runBrand, X`Unexpected brand ${wanted}`);
      const asBase = AmountMath.make(wanted.brand, given.value);
      const fee = ceilMultiplyBy(asBase, feeRate);
      const afterFee = AmountMath.subtract(asBase, fee);
      // TODO use the offer-safe check to be sure that reallocate will work?
      assert(
        AmountMath.isGTE(afterFee, wanted),
        X`wanted ${wanted} is more then ${given} minus fees ${fee}`,
      );
      baseMint.mintGains({ RUN: asBase }, stage);
      seat.decrementBy(anchorPool.incrementBy({ Anchor: given }));
      seat.incrementBy(stage.decrementBy({ RUN: afterFee }));
      feePool.incrementBy(stage.decrementBy({ RUN: fee }));
      try {
        zcf.reallocate(seat, anchorPool, stage, feePool);
      } catch (e) {
        baseMint.burnLosses({ RUN: asBase }, stage);
        throw e;
      }
    } else {
      throw Error(`unexpected brand ${given.brand}`);
    }
  };
  const makeSwapInvitation = () => zcf.makeInvitation(swapHook, 'swap');

  const { makeCollectFeesInvitation } = makeMakeCollectFeesInvitation(
    zcf,
    feePool,
    runBrand,
  );

  // Eventually the reward pool will live elsewhere. For now it's here for
  // bookkeeping. It's needed in tests.
  const getRewardAllocation = () => feePool.getCurrentAllocation();

  const publicFacet = Far('Parity Stability Module', {
    makeSwapInvitation,
    getContractGovernor: () => electionManager,
  });

  const creatorFacet = Far('Parity Stability Module', {
    getRewardAllocation,
    makeCollectFeesInvitation,
    getContractGovernor: () => electionManager,
  });

  return { creatorFacet, publicFacet };
};
