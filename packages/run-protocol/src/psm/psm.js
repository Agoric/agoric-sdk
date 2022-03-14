// @ts-check
import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';
import '@agoric/governance/src/exported';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';
import {
  ceilMultiplyBy,
  makeRatio,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { Far } from '@endo/marshal';
// import { CONTRACT_ELECTORATE } from '@agoric/governance';

import { AmountMath } from '@agoric/ertp';
import { makeMakeCollectFeesInvitation } from '../vaultFactory/collectRewardFees.js';

const { details: X } = assert;

const BASIS_POINTS = 10000n;

/**
 * @param {ContractFacet} zcf
 * @param {{feeMintAccess: FeeMintAccess}} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const { anchorBrand } = zcf.getTerms();

  const { feeMintAccess } = privateArgs;
  // TODO should this know that the name is 'Stable'
  // TODO get the RUN magic out of here so the contract is more reusable
  const stableMint = await zcf.registerFeeMint('Stable', feeMintAccess);
  const { brand: stableBrand } = stableMint.getIssuerRecord();
  zcf.setTestJig(() => ({
    stableIssuerRecord: stableMint.getIssuerRecord(),
  }));
  const emptyStable = AmountMath.makeEmpty(stableBrand);
  const emptyAnchor = AmountMath.makeEmpty(anchorBrand);

  // HACK for simple governance API
  const getGovernance = _ => {
    const {
      main: { FeeBP, MintLimit },
    } = zcf.getTerms();
    assert(FeeBP > 0n, X`FeeBP ${FeeBP} must be > 0n`);
    assert(
      AmountMath.isGTE(MintLimit, emptyAnchor),
      X`MintLimit ${MintLimit} must specificy a limit in ${anchorBrand}`,
    );
    return {
      getFeeBP: () => FeeBP,
      getMintLimit: () => MintLimit,
    };
  };

  const gov = getGovernance(zcf);

  const { zcfSeat: anchorPool } = zcf.makeEmptySeatKit();
  const { zcfSeat: feePool } = zcf.makeEmptySeatKit();
  const { zcfSeat: stage } = zcf.makeEmptySeatKit();

  const assertUnderLimit = anchorAmount => {
    assert(
      AmountMath.isGTE(gov.getMintLimit(), anchorAmount),
      X`Request would exceed mint limit`,
    );
  };

  const getFeeRate = () => {
    return makeRatio(gov.getFeeBP(), stableBrand, BASIS_POINTS);
  };

  const giveStable = (seat, given, wanted = emptyAnchor) => {
    const feeRate = getFeeRate();
    const fee = ceilMultiplyBy(given, feeRate);
    const afterFee = AmountMath.subtract(given, fee);
    const maxAnchor = AmountMath.make(anchorBrand, afterFee.value);
    // TODO this prevents the reallocate from failing. Can this be tested otherwise?
    assert(
      AmountMath.isGTE(maxAnchor, wanted),
      X`wanted ${wanted} is more then ${given} minus fees ${fee}`,
    );
    seat.decrementBy({ In: afterFee });
    stage.incrementBy({ Stable: afterFee });
    seat.decrementBy({ In: fee });
    feePool.incrementBy({ Stable: fee });
    anchorPool.decrementBy({ Anchor: maxAnchor });
    seat.incrementBy({ Out: maxAnchor });
    zcf.reallocate(seat, anchorPool, stage, feePool);
    stableMint.burnLosses({ Stable: afterFee }, stage);
  };

  const wantStable = (seat, given, wanted = emptyStable) => {
    const anchorAfterTrade = AmountMath.add(
      anchorPool.getAmountAllocated('Anchor', anchorBrand),
      given,
    );
    assertUnderLimit(anchorAfterTrade);
    const feeRate = getFeeRate();
    const asStable = AmountMath.make(stableBrand, given.value);
    const fee = ceilMultiplyBy(asStable, feeRate);
    const afterFee = AmountMath.subtract(asStable, fee);
    // TODO use the offer-safe check to be sure that reallocate will work?
    assert(
      AmountMath.isGTE(afterFee, wanted),
      X`wanted ${wanted} is more then ${given} minus fees ${fee}`,
    );
    stableMint.mintGains({ Stable: asStable }, stage);
    seat.decrementBy({ In: given });
    anchorPool.incrementBy({ Anchor: given });
    stage.decrementBy({ Stable: afterFee });
    seat.incrementBy({ Out: afterFee });
    feePool.incrementBy(stage.decrementBy({ Stable: fee }));
    try {
      zcf.reallocate(seat, anchorPool, stage, feePool);
    } catch (e) {
      // TODO reallocate should guarantee that this case cannot happen
      stableMint.burnLosses({ Stable: asStable }, stage);
      throw e;
    }
  };

  const swapHook = seat => {
    assertProposalShape(seat, {
      give: { In: null },
    });
    const {
      give: { In: given },
      want: { Out: wanted } = { Out: undefined },
    } = seat.getProposal();
    if (given.brand === stableBrand) {
      giveStable(seat, given, wanted);
    } else if (given.brand === anchorBrand) {
      wantStable(seat, given, wanted);
    } else {
      throw Error(`unexpected brand ${given.brand}`);
    }
    seat.exit();
  };
  const makeSwapInvitation = () => zcf.makeInvitation(swapHook, 'swap');

  // Eventually the reward pool will live elsewhere. For now it's here for
  // bookkeeping. It's needed in tests.
  const getRewardAllocation = () => feePool.getCurrentAllocation();

  const publicFacet = Far('Parity Stability Module', {
    getCurrentLiquidity: () =>
      anchorPool.getAmountAllocated('Anchor', anchorBrand),
    makeSwapInvitation,
    // getContractGovernor: () => electionManager,
  });

  const creatorFacet = Far('Parity Stability Module', {
    getRewardAllocation,
    makeCollectFeesInvitation: () =>
      makeMakeCollectFeesInvitation(zcf, feePool, stableBrand),
    // getContractGovernor: () => electionManager,
  });

  return { creatorFacet, publicFacet };
};
/** @typedef {ReturnType<typeof start>} PSM */
