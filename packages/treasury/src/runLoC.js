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

export const CreditTerms = {
  CollateralPrice: 'CollateralPrice',
  CollateralizationRate: 'CollateralizationRate',
  // TODO: InterestRate
  // TODO: LoanFee
};

const minAmt = (x, y) => (AmountMath.isGTE(x, y) ? y : x);

/**
 * @param {ContractFacet} zcf
 * @param {ZCFSeat} vaultSeat
 * @param {CreditPolicy} creditPolicy
 * @param {Amount} initialDebtAmount
 * @param {Amount} attestationGiven
 * @param {Amount} amountLiened
 * @param { ZCFMint['burnLosses'] } burnRun
 * @typedef { ReturnType<makeCreditPolicy>} CreditPolicy
 * @typedef { 'active' | 'closed' } LineOfCreditState
 */
const makeLineOfCreditKit = (
  zcf,
  vaultSeat,
  creditPolicy,
  initialDebtAmount,
  attestationGiven,
  amountLiened,
  burnRun,
) => {
  let debtAmount = initialDebtAmount;

  const runBrand = initialDebtAmount.brand;
  const zeroRun = AmountMath.makeEmpty(runBrand);

  /** @type { LineOfCreditState } */
  let vaultState = 'active'; // ISSUE: OK to use "vault" for a RUN line of credit?
  function assertVaultIsOpen() {
    assert(vaultState === 'active', X`line of credit must still be active`);
  }

  const { updater: uiUpdater, notifier } = makeNotifierKit();

  // call this whenever anything changes!
  const updateUiState = async () => {
    const { collateralizationRate } = creditPolicy.getCurrentTerms();

    const uiState = harden({
      // TODO: interestRate: manager.getInterestRate(),
      liened: amountLiened,
      debt: debtAmount,
      collateralizationRatio: collateralizationRate,
      vaultState,
    });

    switch (vaultState) {
      case 'active':
        uiUpdater.updateState(uiState);
        break;
      case 'closed':
        uiUpdater.finish(uiState);
        break;
      default:
        throw Error(`unreachable vaultState: ${vaultState}`);
    }
  };

  /** @type {OfferHandler} */
  const adjustBalances = seat => {
    assertVaultIsOpen();
    assertProposalShape(seat, {
      give: { RUN: null },
      want: { Attestation: null },
    });
    updateUiState();
    assert.fail('not implemented @@@TODO');
  };

  // ISSUE: close() is not yet tested
  /**
   * Given sufficient RUN payoff, refund the attestation.
   *
   * @type {OfferHandler}
   */
  const close = seat => {
    assertVaultIsOpen();
    assertProposalShape(seat, {
      give: { RUN: null },
      want: { Attestation: null },
    });
    const { zcfSeat: burnSeat } = zcf.makeEmptySeatKit();
    seat.incrementBy(
      vaultSeat.decrementBy(harden({ Attestation: attestationGiven })),
    );
    const runDebt = harden({ RUN: debtAmount });
    burnSeat.incrementBy(seat.decrementBy(runDebt));
    zcf.reallocate(seat, vaultSeat, burnSeat);

    burnRun(runDebt, burnSeat);
    seat.exit();
    burnSeat.exit();
    vaultState = 'closed';
    debtAmount = zeroRun;
    updateUiState();
    return 'RUN line of credit closed';
  };

  const vault = Far('line of credit', {
    makeAdjustBalancesInvitation: () =>
      zcf.makeInvitation(adjustBalances, 'Adjust Balances'),
    makeCloseInvitation: () => zcf.makeInvitation(close, 'Close'),
    getAmountLiened: () => amountLiened, // ISSUE: getCollateralAmount?
    getDebtAmount: () => debtAmount,
  });

  updateUiState();
  return harden({
    uiNotifier: notifier,
    invitationMakers: Far('invitation makers', {
      AdjustBalances: vault.makeAdjustBalancesInvitation,
      CloseVault: vault.makeCloseInvitation,
    }),
    vault,
  });
};

/**
 * @param {{ RUN: Brand, Attestation: Brand }} brands
 * @param {(name: string) => unknown} getParamValue
 */
const makeCreditPolicy = (brands, getParamValue) => {
  /** @param { string } name */
  const getRatio = name => {
    const x = getParamValue(name);
    assertIsRatio(x);
    return /** @type { Ratio } */ (x);
  };

  return harden({
    getCurrentTerms: () => ({
      collateralPrice: getRatio(CreditTerms.CollateralPrice),
      collateralizationRate: getRatio(CreditTerms.CollateralizationRate),
    }),
    /** @param { ZCFSeat } seat */
    checkProposal: seat => {
      const collateralPrice = getRatio(CreditTerms.CollateralPrice);
      const collateralizationRate = getRatio(CreditTerms.CollateralizationRate);
      assert(
        collateralPrice.numerator.brand === brands.RUN,
        X`${collateralPrice} not in RUN`,
      );

      assertProposalShape(seat, {
        give: { Attestation: null },
        want: { RUN: null },
      });
      const {
        give: { Attestation: attAmt },
        want: { RUN: runWanted },
      } = seat.getProposal();

      assert(
        attAmt.brand === brands.Attestation,
        X`Invalid Attestation ${attAmt}. Expected brand ${brands.Attestation}`,
      );
      assert(
        Array.isArray(attAmt.value) && attAmt.value.length === 1,
        X`expected SET value with 1 item; found ${attAmt.value}`,
      );
      // NOTE: we accept any address
      const [{ address, amountLiened }] = attAmt.value;
      const maxAvailable = floorMultiplyBy(amountLiened, collateralPrice);
      const collateralizedRun = ceilMultiplyBy(
        runWanted,
        collateralizationRate,
      );
      assert(
        AmountMath.isGTE(maxAvailable, collateralizedRun),
        X`${amountLiened} at price ${collateralPrice} not enough to borrow ${runWanted} with ${collateralizationRate}`,
      );

      return { runWanted, attestationGiven: attAmt, amountLiened };
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
    const {
      runWanted,
      attestationGiven,
      amountLiened,
    } = creditPolicy.checkProposal(seat);

    const { zcfSeat: vaultSeat } = zcf.makeEmptySeatKit();
    runMint.mintGains(harden({ RUN: runWanted }), seat);
    vaultSeat.incrementBy(
      seat.decrementBy(harden({ Attestation: attestationGiven })),
    );
    zcf.reallocate(seat, vaultSeat);
    seat.exit();

    return makeLineOfCreditKit(
      zcf,
      vaultSeat,
      creditPolicy,
      runWanted,
      attestationGiven,
      amountLiened,
      runMint.burnLosses,
    );
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
