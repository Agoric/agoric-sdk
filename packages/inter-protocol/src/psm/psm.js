// @ts-check
import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';
import '@agoric/governance/src/exported.js';

import { E } from '@endo/eventual-send';
import {
  ceilMultiplyBy,
  floorDivideBy,
  floorMultiplyBy,
} from '@agoric/zoe/src/contractSupport/index.js';
import { Far } from '@endo/marshal';
import { handleParamGovernance, ParamTypes } from '@agoric/governance';
import { provide, vivifyKindMulti, M } from '@agoric/vat-data';
import { AmountMath } from '@agoric/ertp';

import { makeMakeCollectFeesInvitation } from '../collectFees.js';
import { makeMetricsPublishKit } from '../contractSupport.js';

const { details: X } = assert;

/**
 * @file The Parity Stability Module supports efficiently minting/burning a
 * stable token at a specified fixed ratio to a reference stable token, which
 * thereby acts as an anchor to provide additional stability. For flexible
 * economic policies, the fee percentage for trading into and out of the stable
 * token are specified separately.
 *
 */

/**
 * @typedef {object} MetricsNotification
 * Metrics naming scheme is that nouns are present values and past-participles are accumulative.
 *
 * @property {Amount<'nat'>} anchorPoolBalance  amount of Anchor token available to be swapped
 * @property {Amount<'nat'>} feePoolBalance     amount of Stable token fees available to be collected
 *
 * @property {Amount<'nat'>} totalAnchorProvided  running sum of Anchor ever given by this contract
 * @property {Amount<'nat'>} totalStableProvided  running sum of Stable ever given by this contract
 */

/**
 * Stage a transfer of a single asset from one seat to another, with an optional
 * remapping of the Keywords. Check that the remapping is for the same amount.
 *
 * @param {ZCFSeat} from
 * @param {ZCFSeat} to
 * @param {AmountKeywordRecord} txFrom
 * @param {AmountKeywordRecord} txTo
 */
const stageTransfer = (from, to, txFrom, txTo = txFrom) => {
  assert(AmountMath.isEqual(Object.values(txFrom)[0], Object.values(txTo)[0]));
  from.decrementBy(txFrom);
  to.incrementBy(txTo);
};

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * @param {ZCF<GovernanceTerms<{
 *    GiveStableFee: 'ratio',
 *    WantStableFee: 'ratio',
 *    MintLimit: 'amount',
 *   }> & {
 *    anchorBrand: Brand,
 *    anchorPerStable: Ratio,
 * }>} zcf
 * @param {{feeMintAccess: FeeMintAccess, initialPoserInvitation: Invitation, storageNode: StorageNode, marshaller: Marshaller}} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { anchorBrand, anchorPerStable } = zcf.getTerms();

  const stableMint = await zcf.registerFeeMint(
    'Stable',
    privateArgs.feeMintAccess,
  );
  const { brand: stableBrand } = stableMint.getIssuerRecord();
  assert(
    anchorPerStable.numerator.brand === anchorBrand &&
      anchorPerStable.denominator.brand === stableBrand,
    X`Ratio ${anchorPerStable} is not consistent with brands ${anchorBrand} and ${stableBrand}`,
  );

  zcf.setTestJig(() => ({
    stableIssuerRecord: stableMint.getIssuerRecord(),
  }));
  const emptyStable = AmountMath.makeEmpty(stableBrand);
  const emptyAnchor = AmountMath.makeEmpty(anchorBrand);

  const { augmentVirtualPublicFacet, makeVirtualGovernorFacet, params } =
    await handleParamGovernance(
      zcf,
      privateArgs.initialPoserInvitation,
      {
        GiveStableFee: ParamTypes.RATIO,
        MintLimit: ParamTypes.AMOUNT,
        WantStableFee: ParamTypes.RATIO,
      },
      privateArgs.storageNode,
      privateArgs.marshaller,
    );

  const provideEmptyZcfSeat = name => {
    return provide(baggage, name, () => zcf.makeEmptySeatKit().zcfSeat);
  };

  const anchorPool = provideEmptyZcfSeat('anchorPoolSeat');
  const feePool = provideEmptyZcfSeat('feePoolSeat');
  const stage = provideEmptyZcfSeat('stageSeat');
  let totalAnchorProvided = provide(baggage, 'totalAnchorProvided', () =>
    AmountMath.makeEmpty(anchorBrand),
  );
  let totalStableProvided = provide(baggage, 'totalStableProvided', () =>
    AmountMath.makeEmpty(stableBrand),
  );

  /** @type {import('../contractSupport.js').MetricsPublishKit<MetricsNotification>} */
  const { metricsPublisher, metricsSubscriber } = makeMetricsPublishKit(
    privateArgs.storageNode,
    privateArgs.marshaller,
  );
  const updateMetrics = () => {
    metricsPublisher.publish(
      harden({
        anchorPoolBalance: anchorPool.getAmountAllocated('Anchor', anchorBrand),
        feePoolBalance: feePool.getAmountAllocated('Stable', stableBrand),
        totalAnchorProvided,
        totalStableProvided,
      }),
    );
  };
  updateMetrics();

  /**
   * @param {Amount<'nat'>} given
   */
  const assertUnderLimit = given => {
    const anchorAfterTrade = AmountMath.add(
      anchorPool.getAmountAllocated('Anchor', anchorBrand),
      given,
    );
    assert(
      AmountMath.isGTE(params.getMintLimit(), anchorAfterTrade),
      X`Request would exceed mint limit`,
    );
  };

  /**
   * @param {ZCFSeat} seat
   * @param {Amount<'nat'>} given
   * @param {Amount<'nat'>} [wanted]
   */
  const giveStable = (seat, given, wanted = emptyAnchor) => {
    const fee = ceilMultiplyBy(given, params.getGiveStableFee());
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
    totalAnchorProvided = AmountMath.add(totalAnchorProvided, maxAnchor);
  };

  /**
   * @param {ZCFSeat} seat
   * @param {Amount<'nat'>} given
   * @param {Amount<'nat'>} [wanted]
   */
  const wantStable = (seat, given, wanted = emptyStable) => {
    assertUnderLimit(given);
    const asStable = floorDivideBy(given, anchorPerStable);
    const fee = ceilMultiplyBy(asStable, params.getWantStableFee());
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
      // NOTE someday, reallocate should guarantee that this case cannot happen
      stableMint.burnLosses({ Stable: asStable }, stage);
      throw e;
    }
    totalStableProvided = AmountMath.add(totalStableProvided, asStable);
  };

  /** @param {ZCFSeat} seat */
  const giveStableHook = seat => {
    const {
      give: { In: given },
      want: { Out: wanted } = { Out: undefined },
    } = seat.getProposal();
    giveStable(seat, given, wanted);
    seat.exit();
    updateMetrics();
  };

  /** @param {ZCFSeat} seat */
  const wantStableHook = seat => {
    const {
      give: { In: given },
      want: { Out: wanted } = { Out: undefined },
    } = seat.getProposal();
    wantStable(seat, given, wanted);
    seat.exit();
    updateMetrics();
  };

  const [anchorAmountSchema, stableAmountSchema] = await Promise.all([
    E(anchorBrand).getAmountSchema(),
    E(stableBrand).getAmountSchema(),
  ]);
  const makeWantStableInvitation = () =>
    zcf.makeInvitation(
      wantStableHook,
      'wantStable',
      undefined,
      M.split({ give: { In: anchorAmountSchema } }),
    );
  const makeGiveStableInvitation = () =>
    zcf.makeInvitation(
      giveStableHook,
      'giveStable',
      undefined,
      M.split({ give: { In: stableAmountSchema } }),
    );

  const publicFacet = Far('Parity Stability Module', {
    getMetrics: () => metricsSubscriber,
    getPoolBalance: () => anchorPool.getAmountAllocated('Anchor', anchorBrand),
    makeWantStableInvitation,
    makeGiveStableInvitation,
  });

  const getRewardAllocation = () => feePool.getCurrentAllocation();
  const { makeCollectFeesInvitation } = makeMakeCollectFeesInvitation(
    zcf,
    feePool,
    stableBrand,
    'Stable',
  );
  const creatorFacet = Far('Parity Stability Module', {
    getRewardAllocation,
    makeCollectFeesInvitation,
  });

  const { limitedCreatorFacet, governorFacet } =
    // @ts-expect-error over-determined decl of creatorFacet
    makeVirtualGovernorFacet(creatorFacet);
  const makePSM = vivifyKindMulti(baggage, 'PSM', () => ({}), {
    creatorFacet: governorFacet,
    limitedCreatorFacet,
    publicFacet: augmentVirtualPublicFacet(publicFacet),
  });
  return makePSM();
};
