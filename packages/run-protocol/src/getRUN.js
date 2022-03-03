// @ts-check
import { AmountMath } from '@agoric/ertp';
import {
  CONTRACT_ELECTORATE,
  handleParamGovernance,
  makeParamManagerBuilder,
} from '@agoric/governance';
import { makeNotifierKit } from '@agoric/notifier';
import { E } from '@endo/far';
import { Far } from '@endo/marshal';
import {
  assertProposalShape,
  ceilMultiplyBy,
  floorMultiplyBy,
} from '@agoric/zoe/src/contractSupport/index.js';
import { fit, getCopyBagEntries, M } from '@agoric/store';
import { makeAttestationFacets } from './attestation/attestation.js';
import { collectBrandInfo, makeFormatter } from './amountFormat.js';

const { details: X } = assert;

/** CreditTerms are the parameters subject to governance. */
export const CreditTerms = {
  CollateralPrice: 'CollateralPrice',
  CollateralizationRatio: 'CollateralizationRatio',
  // TODO: InterestRate
  // TODO: LoanFee
};

/**
 * @param {Amount} x
 * @param {Amount} y
 */
const minAmt = (x, y) => (AmountMath.isGTE(x, y) ? y : x);

/**
 * Make line of credit subject to creditPolicy.
 *
 * @param {ContractFacet} zcf
 * @param {ZCFSeat} startSeat
 * @param {ReturnType<makeCreditPolicy>} creditPolicy
 * @param { ZCFMint } runMint
 * @param { Brand } runBrand
 * @returns { LineOfCreditKit } following the wallet invitationMakers pattern
 * @throws if startSeat proposal is not consistent with creditPolicy
 */
export const makeLineOfCreditKit = (
  zcf,
  startSeat,
  creditPolicy,
  runMint,
  runBrand,
) => {
  const { runWanted, attestationGiven, amountLiened } =
    creditPolicy.checkOpenProposal(startSeat);

  const { zcfSeat: vaultSeat } = zcf.makeEmptySeatKit();
  vaultSeat.incrementBy(
    startSeat.decrementBy(harden({ Attestation: attestationGiven })),
  );
  runMint.mintGains(harden({ RUN: runWanted }), startSeat);
  // NOTE: this record is mutable by design, anticipating
  // the durable objects API.
  const state = {
    closed: false,
    /** NOTE: debtAmount corresponds exactly to minted RUN. */
    debtAmount: runWanted,
  };

  zcf.reallocate(startSeat, vaultSeat);
  startSeat.exit();

  /** @type {NotifierRecord<BaseUIState>} */
  const { updater: uiUpdater, notifier } = makeNotifierKit();

  /** call this whenever anything changes! */
  const updateUiState = async () => {
    const { collateralizationRatio } = creditPolicy.getCurrentTerms();

    const uiState = harden({
      // TODO: interestRate: manager.getInterestRate(),
      debt: state.debtAmount,
      collateralizationRatio,
    });

    if (state.closed) {
      uiUpdater.finish(uiState);
    } else {
      uiUpdater.updateState(uiState);
    }
  };

  /**
   * Adjust RUN balance up (subject to credit limit) or down.
   *
   * @type {OfferHandler}
   */
  const adjustBalances = seat => {
    assert(!state.closed, X`line of credit must still be active`);
    const proposal = seat.getProposal();

    if (proposal.want.RUN) {
      const currentAttestation = vaultSeat.getAmountAllocated('Attestation');
      const totalAttestation = proposal.give.Attestation
        ? AmountMath.add(currentAttestation, proposal.give.Attestation)
        : currentAttestation;
      state.debtAmount = creditPolicy.checkBorrow(
        totalAttestation,
        AmountMath.add(state.debtAmount, proposal.want.RUN),
      ).runWanted;
      // COMMIT
      runMint.mintGains(proposal.want, seat);
      vaultSeat.incrementBy(
        seat.decrementBy({ Attestation: proposal.give.Attestation }),
      );
      zcf.reallocate(vaultSeat, seat);
    } else if (proposal.give.RUN) {
      const toPay = minAmt(proposal.give.RUN, state.debtAmount);
      runMint.burnLosses(harden({ RUN: toPay }), seat);
      state.debtAmount = AmountMath.subtract(state.debtAmount, toPay);
    } else if (proposal.want.Attestation) {
      const currentAttestation = vaultSeat.getAmountAllocated('Attestation');
      const remainingAttestation = AmountMath.subtract(
        currentAttestation,
        proposal.want.Attestation,
      );
      creditPolicy.checkBorrow(remainingAttestation, state.debtAmount);
      // COMMIT
      seat.incrementBy(
        vaultSeat.decrementBy({ Attestation: proposal.want.Attestation }),
      );
      zcf.reallocate(vaultSeat, seat);
    } else {
      assert.fail(X`proposal not understood`);
    }

    seat.exit();
    updateUiState();
    return 'balance adjusted';
  };

  /**
   * Given sufficient RUN payoff, refund the attestation.
   *
   * @type {OfferHandler}
   */
  const close = seat => {
    assert(!state.closed, X`line of credit must still be active`);
    assertProposalShape(seat, {
      give: { RUN: null },
      want: { Attestation: null },
    });

    vaultSeat.incrementBy(seat.decrementBy(harden({ RUN: state.debtAmount })));
    // BUG!!! TODO: track attestation balance as it gets adjusted.
    seat.incrementBy(
      vaultSeat.decrementBy(harden({ Attestation: attestationGiven })),
    );

    zcf.reallocate(seat, vaultSeat);

    runMint.burnLosses(harden({ RUN: state.debtAmount }), vaultSeat);
    seat.exit();
    state.debtAmount = AmountMath.makeEmpty(runBrand);
    state.closed = true;
    updateUiState();

    return 'RUN line of credit closed';
  };

  const vault = Far('line of credit', {
    getCollateralAmount: () => amountLiened,
    getDebtAmount: () => state.debtAmount,
  });

  updateUiState();
  return harden({
    uiNotifier: notifier,
    invitationMakers: Far('invitation makers', {
      AdjustBalances: () =>
        zcf.makeInvitation(adjustBalances, 'AdjustBalances'),
      CloseVault: () => zcf.makeInvitation(close, 'CloseVault'),
    }),
    vault,
  });
};

/**
 * @param {{ RUN: Brand, Attestation: Brand, Stake: Brand }} brands
 * @param {(name: string) => Ratio} getRatio
 * @param {import('./amountFormat.js').BrandInfo} brandInfo
 */
const makeCreditPolicy = (brands, getRatio, brandInfo) => {
  const fmt = makeFormatter(brandInfo);
  /**
   * @param {Amount} attestationGiven
   * @param {Amount} runWanted
   */
  const checkBorrow = (attestationGiven, runWanted) => {
    const collateralPrice = getRatio(CreditTerms.CollateralPrice);
    const collateralizationRatio = getRatio(CreditTerms.CollateralizationRatio);
    assert(
      collateralPrice.numerator.brand === brands.RUN,
      X`${collateralPrice} not in RUN`,
    );

    assert(
      attestationGiven.brand === brands.Attestation,
      X`Invalid Attestation ${attestationGiven}. Expected brand ${brands.Attestation}`,
    );
    // TODO: what to do if more than 1 address is given???
    fit(attestationGiven.value, M.bagOf([M.string(), M.bigint()]));
    const [[_addr, valueLiened]] = getCopyBagEntries(attestationGiven.value);
    const amountLiened = AmountMath.make(brands.Stake, valueLiened);
    const maxAvailable = floorMultiplyBy(amountLiened, collateralPrice);
    const collateralizedRun = ceilMultiplyBy(runWanted, collateralizationRatio);
    assert(
      AmountMath.isGTE(maxAvailable, collateralizedRun),
      X`${fmt.amount(amountLiened)} at price ${fmt.ratio(
        collateralPrice,
      )} not enough to borrow ${fmt.amount(runWanted)} with ${fmt.ratio(
        collateralizationRatio,
      )}`,
    );

    return { runWanted, attestationGiven, amountLiened };
  };

  return harden({
    getCurrentTerms: () => ({
      collateralPrice: getRatio(CreditTerms.CollateralPrice),
      collateralizationRatio: getRatio(CreditTerms.CollateralizationRatio),
    }),
    checkBorrow,
    /** @param { ZCFSeat } seat */
    checkOpenProposal: seat => {
      assertProposalShape(seat, {
        give: { Attestation: null },
        want: { RUN: null },
      });
      const {
        give: { Attestation: attAmt },
        want: { RUN: runWanted },
      } = seat.getProposal();

      return checkBorrow(attAmt, runWanted);
    },
  });
};

/**
 * @param { ContractFacet } zcf
 * @param {{
 *   feeMintAccess: FeeMintAccess,
 *   initialPoserInvitation: Invitation,
 *   lienBridge: ERef<StakingAuthority>,
 * }} privateArgs
 */
const start = async (
  zcf,
  { feeMintAccess, initialPoserInvitation, lienBridge },
) => {
  const {
    main: initialValue,
    brands: { Stake: stakeBrand },
    lienAttestationName = 'BldLienAtt',
  } = zcf.getTerms();

  const att = await makeAttestationFacets(
    zcf,
    stakeBrand,
    lienAttestationName,
    lienBridge,
  );
  const attestBrand = await E(att.publicFacet).getBrand();

  const builder = makeParamManagerBuilder(zcf.getZoeService())
    .addBrandedRatio(
      CreditTerms.CollateralPrice,
      initialValue[CreditTerms.CollateralPrice].value,
    )
    .addBrandedRatio(
      CreditTerms.CollateralizationRatio,
      initialValue[CreditTerms.CollateralizationRatio].value,
    );
  await builder.addInvitation(CONTRACT_ELECTORATE, initialPoserInvitation);
  const paramManager = builder.build();
  const { wrapPublicFacet, wrapCreatorFacet, getRatio } = handleParamGovernance(
    zcf,
    paramManager,
  );

  const runMint = await zcf.registerFeeMint('RUN', feeMintAccess);
  const { brand: runBrand, issuer: runIssuer } = runMint.getIssuerRecord();
  const brandInfo = await collectBrandInfo([runBrand, stakeBrand, attestBrand]);
  const creditPolicy = makeCreditPolicy(
    { Attestation: attestBrand, RUN: runBrand, Stake: stakeBrand },
    getRatio,
    brandInfo,
  );

  const revealRunBrandToTest = () => {
    return harden({ runMint, runBrand, runIssuer });
  };
  zcf.setTestJig(revealRunBrandToTest);

  /** @type { OfferHandler } */
  const makeLineOfCreditHook = seat => {
    return makeLineOfCreditKit(zcf, seat, creditPolicy, runMint, runBrand);
  };

  const publicFacet = wrapPublicFacet(
    Far('getRUN Public API', {
      getIssuer: att.publicFacet.getIssuer,
      getBrand: () => att.publicFacet.getBrand,
      makeReturnAttInvitation: att.publicFacet.makeReturnAttInvitation,
      makeLoanInvitation: () =>
        zcf.makeInvitation(
          makeLineOfCreditHook,
          'make line of credit',
          undefined,
        ),
    }),
  );

  return { publicFacet, creatorFacet: wrapCreatorFacet(att.creatorFacet) };
};

harden(start);
export { start };
