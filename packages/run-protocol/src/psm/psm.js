// @ts-check
import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';
import '@agoric/governance/src/exported';
import {
  assertProposalShape,
  ceilMultiplyBy,
  floorDivideBy,
  floorMultiplyBy,
  makeRatio,
} from '@agoric/zoe/src/contractSupport/index.js';
import { Far } from '@endo/marshal';
// import { CONTRACT_ELECTORATE } from '@agoric/governance';

import { AmountMath } from '@agoric/ertp';
import { makeMakeCollectFeesInvitation } from '../collectFees.js';

const { details: X } = assert;

const BASIS_POINTS = 10000n;

/**
 * Stage a transfer of a singe asset from one seat to another, with an optional
 * remapping of the Keywords. Check that the remapping is for the same amount.
 *
 * @param {ZCFSeat} from
 * @param {ZCFSeat} to
 * @param {AmountKeywordRecord} txFrom
 * @param {AmountKeywordRecord} txTo
 */
function stageTransfer(from, to, txFrom, txTo = txFrom) {
  assert(AmountMath.isEqual(Object.values(txFrom)[0], Object.values(txTo)[0]));
  from.decrementBy(txFrom);
  to.incrementBy(txTo);
}

/**
 * @param {ZCF<{
 *    anchorBrand: Brand,
 *    anchorPerStable: Ratio,
 *    main: {
 *      WantStableFeeBP: bigint,
 *      GiveStableFeeBP: bigint,
 *      MintLimit: Amount } }>
 * } zcf
 * @param {{feeMintAccess: FeeMintAccess}} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const { anchorBrand, anchorPerStable } = zcf.getTerms();

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
      main: { WantStableFeeBP, GiveStableFeeBP, MintLimit },
    } = zcf.getTerms();
    assert(
      AmountMath.isGTE(MintLimit, emptyAnchor),
      X`MintLimit ${MintLimit} must specificy a limit in ${anchorBrand}`,
    );
    return {
      getWantStableRate: () =>
        makeRatio(WantStableFeeBP, stableBrand, BASIS_POINTS),
      getGiveStableRate: () =>
        makeRatio(GiveStableFeeBP, stableBrand, BASIS_POINTS),
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

  const giveStable = (seat, given, wanted = emptyAnchor) => {
    const fee = ceilMultiplyBy(given, gov.getGiveStableRate());
    const afterFee = AmountMath.subtract(given, fee);
    const maxAnchor = floorMultiplyBy(afterFee, anchorPerStable);
    // TODO this prevents the reallocate from failing. Can this be tested otherwise?
    assert(
      AmountMath.isGTE(maxAnchor, wanted),
      X`wanted ${wanted} is more then ${given} minus fees ${fee}`,
    );
    stageTransfer(seat, stage, { In: afterFee }, { Stable: afterFee });
    stageTransfer(seat, feePool, { In: fee }, { Stable: fee });
    stageTransfer(anchorPool, seat, { Anchor: maxAnchor }, { Out: maxAnchor });
    zcf.reallocate(seat, anchorPool, stage, feePool);
    stableMint.burnLosses({ Stable: afterFee }, stage);
  };

  const wantStable = (seat, given, wanted = emptyStable) => {
    const anchorAfterTrade = AmountMath.add(
      anchorPool.getAmountAllocated('Anchor', anchorBrand),
      given,
    );
    assertUnderLimit(anchorAfterTrade);
    const asStable = floorDivideBy(given, anchorPerStable);
    const fee = ceilMultiplyBy(asStable, gov.getWantStableRate());
    const afterFee = AmountMath.subtract(asStable, fee);
    assert(
      AmountMath.isGTE(afterFee, wanted),
      X`wanted ${wanted} is more then ${given} minus fees ${fee}`,
    );
    stableMint.mintGains({ Stable: asStable }, stage);

    stageTransfer(seat, anchorPool, { In: given }, { Anchor: given });
    stageTransfer(stage, seat, { Stable: afterFee }, { Out: afterFee });
    stageTransfer(stage, feePool, { Stable: fee });
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

  const { makeCollectFeesInvitation } = makeMakeCollectFeesInvitation(
    zcf,
    feePool,
    stableBrand,
    'Stable',
  );
  const creatorFacet = Far('Parity Stability Module', {
    getRewardAllocation,
    makeCollectFeesInvitation,
    // getContractGovernor: () => electionManager,
  });

  return { creatorFacet, publicFacet };
};
