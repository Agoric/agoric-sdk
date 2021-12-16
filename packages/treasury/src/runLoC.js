// @ts-check
import { AmountMath } from '@agoric/ertp';
import { handleParamGovernance } from '@agoric/governance';
import { Far } from '@agoric/marshal';
import { makeNotifierKit } from '@agoric/notifier';
import { HIGH_FEE, LONG_EXP } from '@agoric/zoe/src/constants.js';
import {
  assertIsRatio,
  assertProposalShape,
  ceilMultiplyBy,
  floorMultiplyBy,
} from '@agoric/zoe/src/contractSupport/index.js';

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
  const {
    runWanted,
    attestationGiven,
    amountLiened,
  } = creditPolicy.checkOpenProposal(startSeat);
  let closed = false;

  const { zcfSeat: vaultSeat } = zcf.makeEmptySeatKit();
  vaultSeat.incrementBy(
    startSeat.decrementBy(harden({ Attestation: attestationGiven })),
  );
  /** NOTE: debtAmount corresponds exactly to minted RUN. */
  runMint.mintGains(harden({ RUN: runWanted }), startSeat);
  let debtAmount = runWanted;
  zcf.reallocate(startSeat, vaultSeat);
  startSeat.exit();

  /** @type {NotifierRecord<BaseUIState>} */
  const { updater: uiUpdater, notifier } = makeNotifierKit();

  /** call this whenever anything changes! */
  const updateUiState = async () => {
    const { collateralizationRatio } = creditPolicy.getCurrentTerms();

    const uiState = harden({
      // TODO: interestRate: manager.getInterestRate(),
      locked: amountLiened,
      debt: debtAmount,
      collateralizationRatio,
    });

    if (closed) {
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
    assert(!closed, X`line of credit must still be active`);

    const proposal = seat.getProposal();
    if (proposal.want.RUN) {
      debtAmount = creditPolicy.checkBorrow(
        vaultSeat.getAmountAllocated('Attestation'),
        AmountMath.add(debtAmount, proposal.want.RUN),
      ).runWanted;
      runMint.mintGains(proposal.want, seat);
    } else if (proposal.give.RUN) {
      const toPay = minAmt(proposal.give.RUN, debtAmount);
      runMint.burnLosses(harden({ RUN: toPay }), seat);
      debtAmount = AmountMath.subtract(debtAmount, toPay);
    } else {
      throw seat.fail(Error('only RUN balance can be adjusted'));
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
    assert(!closed, X`line of credit must still be active`);
    assertProposalShape(seat, {
      give: { RUN: null },
      want: { Attestation: null },
    });

    vaultSeat.incrementBy(seat.decrementBy(harden({ RUN: debtAmount })));
    seat.incrementBy(
      vaultSeat.decrementBy(harden({ Attestation: attestationGiven })),
    );

    zcf.reallocate(seat, vaultSeat);

    runMint.burnLosses(harden({ RUN: debtAmount }), vaultSeat);
    seat.exit();
    debtAmount = AmountMath.makeEmpty(runBrand);
    closed = true;
    updateUiState();

    return 'RUN line of credit closed';
  };

  const vault = Far('line of credit', {
    getCollateralAmount: () => amountLiened,
    getDebtAmount: () => debtAmount,
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
 * @param {{ RUN: Brand, Attestation: Brand }} brands
 * @param {(name: string) => unknown} getParamValue
 */
const makeCreditPolicy = (brands, getParamValue) => {
  // TODO: consolidate getRatio with updated governance API
  /** @param { string } name */
  const getRatio = name => {
    const x = getParamValue(name);
    assertIsRatio(x);
    return /** @type { Ratio } */ (x);
  };

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
    assert(
      Array.isArray(attestationGiven.value) &&
        attestationGiven.value.length === 1,
      X`expected SET value with 1 item; found ${attestationGiven.value}`,
    );
    const [{ amountLiened }] = attestationGiven.value;
    const maxAvailable = floorMultiplyBy(amountLiened, collateralPrice);
    const collateralizedRun = ceilMultiplyBy(runWanted, collateralizationRatio);
    assert(
      AmountMath.isGTE(maxAvailable, collateralizedRun),
      X`${amountLiened} at price ${collateralPrice} not enough to borrow ${runWanted} with ${collateralizationRatio}`,
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
 * @param {{ feeMintAccess: FeeMintAccess }} privateArgs
 */
const start = async (zcf, { feeMintAccess }) => {
  const {
    main: initialValue,
    brands: { Attestation: attestBrand },
  } = zcf.getTerms();

  const {
    wrapPublicFacet,
    wrapCreatorFacet,
    getParamValue,
  } = handleParamGovernance(zcf, harden(initialValue));

  const runMint = await zcf.registerFeeMint('RUN', feeMintAccess);
  const { brand: runBrand, issuer: runIssuer } = runMint.getIssuerRecord();
  const creditPolicy = makeCreditPolicy(
    { Attestation: attestBrand, RUN: runBrand },
    getParamValue,
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
    Far('Line of Credit Public API', {
      makeLoanInvitation: () =>
        zcf.makeInvitation(
          makeLineOfCreditHook,
          'make line of credit',
          undefined,
          HIGH_FEE,
          LONG_EXP,
        ),
    }),
  );

  return { publicFacet, creatorFacet: wrapCreatorFacet(undefined) };
};

harden(start);
export { start };
