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
 * @param { ZCFMint } runMint
 * @typedef { ReturnType<makeCreditPolicy>} CreditPolicy
 * @typedef { 'active' | 'closed' } LineOfCreditState
 * @typedef {{
 *   liened: Amount,
 *   debt: Amount,
 *   collateralizationRatio: Ratio,
 *   vaultState: LineOfCreditState,
 * }} RunLoCUIState
 */
export const makeLineOfCreditKit = (
  zcf,
  vaultSeat,
  creditPolicy,
  initialDebtAmount,
  attestationGiven,
  amountLiened,
  runMint,
) => {
  let debtAmount = initialDebtAmount;

  const runBrand = initialDebtAmount.brand;
  const zeroRun = AmountMath.makeEmpty(runBrand);

  /** @type { LineOfCreditState } */
  let vaultState = 'active'; // ISSUE: OK to use "vault" for a RUN line of credit?
  function assertVaultIsOpen() {
    assert(vaultState === 'active', X`line of credit must still be active`);
  }

  /** @type {NotifierRecord<RunLoCUIState>} */
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
    const proposal = seat.getProposal();
    if (proposal.want.RUN) {
      creditPolicy.checkBorrow(
        vaultSeat.getAmountAllocated('Attestation'),
        AmountMath.add(debtAmount, proposal.want.RUN),
      );
      debtAmount = AmountMath.add(debtAmount, proposal.want.RUN);
      runMint.mintGains(proposal.want, seat);
      seat.exit();
    } else if (proposal.give.RUN) {
      const toPay = minAmt(proposal.give.RUN, debtAmount);
      debtAmount = AmountMath.subtract(debtAmount, toPay);
      runMint.burnLosses(harden({ RUN: toPay }), seat);
      seat.exit();
    } else {
      throw seat.fail(Error('not implemented @@@TODO'));
    }
    updateUiState();
    return 'balance adjusted';
  };

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

    vaultSeat.incrementBy(seat.decrementBy(harden({ RUN: debtAmount })));
    seat.incrementBy(
      vaultSeat.decrementBy(harden({ Attestation: attestationGiven })),
    );

    zcf.reallocate(seat, vaultSeat); // COMMIT POINT

    runMint.burnLosses(harden({ RUN: debtAmount }), vaultSeat);
    seat.exit();
    debtAmount = zeroRun;
    vaultState = 'closed';
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

  /**
   * @param {Amount} attestationGiven
   * @param {Amount} runWanted
   */
  const checkBorrow = (attestationGiven, runWanted) => {
    const collateralPrice = getRatio(CreditTerms.CollateralPrice);
    const collateralizationRate = getRatio(CreditTerms.CollateralizationRate);
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
    // NOTE: we accept any address
    const [{ address, amountLiened }] = attestationGiven.value;
    const maxAvailable = floorMultiplyBy(amountLiened, collateralPrice);
    const collateralizedRun = ceilMultiplyBy(runWanted, collateralizationRate);
    assert(
      AmountMath.isGTE(maxAvailable, collateralizedRun),
      X`${amountLiened} at price ${collateralPrice} not enough to borrow ${runWanted} with ${collateralizationRate}`,
    );

    return { runWanted, attestationGiven, amountLiened };
  };

  return harden({
    getCurrentTerms: () => ({
      collateralPrice: getRatio(CreditTerms.CollateralPrice),
      collateralizationRate: getRatio(CreditTerms.CollateralizationRate),
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
    const {
      runWanted,
      attestationGiven,
      amountLiened,
    } = creditPolicy.checkOpenProposal(seat);

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
      runMint,
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
