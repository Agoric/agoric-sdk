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
import {
  handleParamGovernance,
  ParamTypes,
  publicMixinAPI,
} from '@agoric/governance';
import { M, provide, vivifyFarInstance } from '@agoric/vat-data';
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
 * Metrics naming scheme is that nouns are present values and past-participles
 * are accumulative.
 *
 * @property {Amount<'nat'>} anchorPoolBalance  amount of Anchor token
 * available to be swapped
 * @property {Amount<'nat'>} feePoolBalance     amount of Stable token
 * fees available to be collected
 *
 * @property {Amount<'nat'>} totalAnchorProvided  running sum of Anchor
 * ever given by this contract
 * @property {Amount<'nat'>} totalStableProvided  running sum of Stable
 * ever given by this contract
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
  console.log('PSM Starting', anchorBrand, anchorPerStable);

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

  const { publicMixin, creatorMixin, makeFarGovernorFacet, params } =
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

  /**
   * Ensure that any leftovers from previous failed transactions are cleared out.
   */
  const ensureClearTxn = () => {
    stage.clear();
    anchorPool.clear();
    feePool.clear();
    // This could also burn anything sitting on stage pool, but that seems too aggresive
  };

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
   * @param {Amount<'nat'>} [wanted] defaults to maximum anchor (given exchange rate minus fees)
   */
  const giveStable = (seat, given, wanted = emptyAnchor) => {
    const fee = ceilMultiplyBy(given, params.getGiveStableFee());
    const afterFee = AmountMath.subtract(given, fee);
    const maxAnchor = floorMultiplyBy(afterFee, anchorPerStable);
    assert(
      AmountMath.isGTE(maxAnchor, wanted),
      X`wanted ${wanted} is more than ${given} minus fees ${fee}`,
    );
    ensureClearTxn();
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
      X`wanted ${wanted} is more than ${given} minus fees ${fee}`,
    );
    ensureClearTxn();
    stableMint.mintGains({ Stable: asStable }, stage);
    try {
      stageTransfer(seat, anchorPool, { In: given }, { Anchor: given });
      stageTransfer(stage, seat, { Stable: afterFee }, { Out: afterFee });
      stageTransfer(stage, feePool, { Stable: fee });
      zcf.reallocate(seat, anchorPool, stage, feePool);
    } catch (e) {
      // TODO(#6116) someday, reallocate should guarantee that this case cannot happen
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

  const [anchorAmountShape, stableAmountShape] = await Promise.all([
    E(anchorBrand).getAmountShape(),
    E(stableBrand).getAmountShape(),
  ]);

  const PSMI = M.interface('PSM', {
    getMetrics: M.call().returns(M.remotable('MetricsSubscriber')),
    getPoolBalance: M.call().returns(anchorAmountShape),
    makeWantStableInvitation: M.call().returns(M.promise()),
    makeGiveStableInvitation: M.call().returns(M.promise()),
    ...publicMixinAPI,
  });

  const methods = {
    getMetrics() {
      return metricsSubscriber;
    },
    getPoolBalance() {
      return anchorPool.getAmountAllocated('Anchor', anchorBrand);
    },
    makeWantStableInvitation() {
      return zcf.makeInvitation(
        wantStableHook,
        'wantStable',
        undefined,
        M.split({
          give: { In: anchorAmountShape },
          want: M.or({ Out: stableAmountShape }, {}),
        }),
      );
    },
    makeGiveStableInvitation() {
      return zcf.makeInvitation(
        giveStableHook,
        'giveStable',
        undefined,
        M.split({
          give: { In: stableAmountShape },
          want: M.or({ Out: anchorAmountShape }, {}),
        }),
      );
    },
    ...publicMixin,
  };
  const publicFacet = vivifyFarInstance(
    baggage,
    'Parity Stability Module',
    PSMI,
    methods,
  );

  const { makeCollectFeesInvitation } = makeMakeCollectFeesInvitation(
    zcf,
    feePool,
    stableBrand,
    'Stable',
  );

  // The creator facets are only accessibly to governance and bootstrap,
  // and so do not need interface protection at this time. Additionally,
  // all the operations take no arguments and so are largely defensive as is.
  const limitedCreatorFacet = Far('Parity Stability Module', {
    getRewardAllocation() {
      return feePool.getCurrentAllocation();
    },
    makeCollectFeesInvitation() {
      return makeCollectFeesInvitation();
    },
    ...creatorMixin,
  });

  const governorFacet = makeFarGovernorFacet(limitedCreatorFacet);
  return harden({
    creatorFacet: governorFacet,
    limitedCreatorFacet,
    publicFacet,
  });
};
