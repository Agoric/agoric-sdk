// @ts-check
import '@agoric/zoe/exported';

import { assert, details as X, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import {
  trade,
  assertProposalShape,
  divideBy,
  multiplyBy,
  getAmountOut,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport';
import { makeNotifierKit } from '@agoric/notifier';

import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';
import { amountMath } from '@agoric/ertp';
import { makeTracer } from './makeTracer';
import { makeInterestCalculator } from './interest';

// a Vault is an individual loan, using some collateralType as the
// collateral, and lending RUN to the borrower

/** @type {MakeVaultKit} */
export function makeVaultKit(
  zcf,
  manager,
  runMint,
  autoswap,
  priceAuthority,
  loanParams,
  startTimeStamp,
) {
  const trace = makeTracer('VV');
  const { updater: uiUpdater, notifier } = makeNotifierKit();

  let active = true; // liquidation halts all user actions

  function assertVaultIsOpen() {
    assert(active, 'vault must still be active');
  }

  const collateralBrand = manager.collateralBrand;
  // timestamp of most recent update to interest
  let latestInterestUpdate = startTimeStamp;

  // vaultSeat will hold the collateral until the loan is retired. The
  // payout from it will be handed to the user: if the vault dies early
  // (because the StableCoinMachine vat died), they'll get all their
  // collateral back. If that happens, the issuer for the RUN will be dead,
  // so their loan will be worthless.
  const { zcfSeat: vaultSeat, userSeat } = zcf.makeEmptySeatKit();

  trace('vaultSeat proposal', vaultSeat.getProposal());

  const { brand: runBrand } = runMint.getIssuerRecord();
  let runDebt = amountMath.makeEmpty(runBrand);
  const interestCalculator = makeInterestCalculator(
    runBrand,
    manager.getInterestRate(),
    loanParams.chargingPeriod,
    loanParams.recordingPeriod,
  );

  function getCollateralAllocated(seat) {
    return seat.getAmountAllocated('Collateral', collateralBrand);
  }
  function getRunAllocated(seat) {
    return seat.getAmountAllocated('RUN', runBrand);
  }

  function assertVaultHoldsNoRun() {
    assert(
      amountMath.isEmpty(getRunAllocated(vaultSeat)),
      X`Vault should be empty of RUN`,
    );
  }

  async function maxDebtFor(collateralAmount) {
    const quoteAmount = await E(priceAuthority).quoteGiven(
      collateralAmount,
      runBrand,
    );

    return divideBy(getAmountOut(quoteAmount), manager.getLiquidationMargin());
  }

  async function assertSufficientCollateral(collateralAmount, wantedRun) {
    const maxRun = await maxDebtFor(collateralAmount);
    assert(
      amountMath.isGTE(maxRun, wantedRun, runBrand),
      X`Requested ${q(wantedRun)} exceeds max ${q(maxRun)}`,
    );
  }

  function getCollateralAmount() {
    // getCollateralAllocated would return final allocations
    return vaultSeat.hasExited()
      ? amountMath.makeEmpty(collateralBrand)
      : getCollateralAllocated(vaultSeat);
  }

  async function getCollateralizationRatio() {
    const collateralAmount = getCollateralAmount();
    // TODO: allow Ratios to represent X/0.
    if (amountMath.isEmpty(runDebt)) {
      return makeRatio(collateralAmount.value, runBrand, 1n);
    }

    const quoteAmount = await E(priceAuthority).quoteGiven(
      collateralAmount,
      runBrand,
    );
    const collateralValueInRun = getAmountOut(quoteAmount);
    return makeRatioFromAmounts(collateralValueInRun, runDebt);
  }

  // call this whenever anything changes!
  async function updateUiState() {
    // TODO(123): track down all calls and ensure that they all update a
    // lastKnownCollateralizationRatio (since they all know) so we don't have to
    // await quoteGiven() here
    // [https://github.com/Agoric/dapp-token-economy/issues/123]
    const collateralizationRatio = await getCollateralizationRatio();
    /** @type {UIState} */
    const uiState = harden({
      interestRate: manager.getInterestRate(),
      liquidationRatio: manager.getLiquidationMargin(),
      locked: getCollateralAmount(),
      debt: runDebt,
      collateralizationRatio,
      liquidated: !active,
    });

    if (active) {
      uiUpdater.updateState(uiState);
    } else {
      uiUpdater.finish(uiState);
    }
  }

  function liquidated(newDebt) {
    runDebt = newDebt;
    active = false;
    updateUiState();
  }

  async function closeHook(seat) {
    assertVaultIsOpen();
    assertProposalShape(seat, {
      give: { RUN: null },
      want: { Collateral: null },
    });
    const {
      give: { RUN: runReturned },
      want: { Collateral: _collateralWanted },
    } = seat.getProposal();

    // you're paying off the debt, you get everything back. If you were
    // underwater, we should have liquidated some collateral earlier: we
    // missed our chance.

    // you must pay off the entire remainder but if you offer too much, we won't
    // take more than you owe
    assert(amountMath.isGTE(runReturned, runDebt));

    trade(
      zcf,
      {
        seat: vaultSeat,
        gains: { RUN: runDebt }, // return any overpayment
      },
      {
        seat,
        gains: { Collateral: getCollateralAllocated(vaultSeat) },
      },
    );
    seat.exit();
    runDebt = amountMath.makeEmpty(runBrand);
    active = false;
    updateUiState();

    runMint.burnLosses({ RUN: runDebt }, vaultSeat);
    vaultSeat.exit();

    return 'your loan is closed, thank you for your business';
  }

  function makeCloseInvitation() {
    assertVaultIsOpen();
    return zcf.makeInvitation(closeHook, 'CloseVault');
  }

  // The proposal is not allowed to include any keys other than these,
  // usually 'Collateral' and 'RUN'.
  function assertOnlyKeys(proposal, keys) {
    function onlyKeys(clause) {
      return Object.getOwnPropertyNames(clause).every(c => keys.includes(c));
    }

    assert(
      onlyKeys(proposal.give),
      X`extraneous terms in give: ${proposal.give}`,
    );
    assert(
      onlyKeys(proposal.want),
      X`extraneous terms in want: ${proposal.want}`,
    );
  }

  // Calculate the target level for Collateral for the vaultSeat and
  // clientSeat implied by the proposal. If the proposal wants Collateral,
  // transfer that amount from vault to client. If the proposal gives
  // Collateral, transfer the opposite direction. Otherwise, return the current level.
  function TargetCollateralLevels(seat) {
    const proposal = seat.getProposal();
    const startVaultAmount = getCollateralAllocated(vaultSeat);
    const startClientAmount = getCollateralAllocated(seat);
    if (proposal.want.Collateral) {
      return {
        vault: amountMath.subtract(startVaultAmount, proposal.want.Collateral),
        client: amountMath.add(startClientAmount, proposal.want.Collateral),
      };
    } else if (proposal.give.Collateral) {
      return {
        vault: amountMath.add(startVaultAmount, proposal.give.Collateral),
        client: amountMath.subtract(
          startClientAmount,
          proposal.give.Collateral,
        ),
      };
    } else {
      return {
        vault: startVaultAmount,
        client: startClientAmount,
      };
    }
  }

  // Calculate the target RUN level for the vaultSeat and clientSeat implied
  // by the proposal. If the proposal wants collateral, transfer that amount
  // from vault to client. If the proposal gives collateral, transfer the
  // opposite direction. Otherwise, return the current level.
  //
  // Since we don't allow the debt to go negative, we will reduce the amount we
  // accept when the proposal says to give more RUN than are owed.
  function targetRunLevels(seat) {
    const clientAllocation = getRunAllocated(seat);
    const proposal = seat.getProposal();
    if (proposal.want.RUN) {
      return {
        vault: amountMath.makeEmpty(runBrand),
        client: amountMath.add(clientAllocation, proposal.want.RUN),
      };
    } else if (proposal.give.RUN) {
      // We don't allow runDebt to be negative, so we'll refund overpayments
      const acceptedRun = amountMath.isGTE(proposal.give.RUN, runDebt)
        ? runDebt
        : proposal.give.RUN;

      return {
        vault: acceptedRun,
        client: amountMath.subtract(clientAllocation, acceptedRun),
      };
    } else {
      return {
        vault: amountMath.makeEmpty(runBrand),
        client: clientAllocation,
      };
    }
  }

  // Calculate the fee, the amount to mint and the resulting debt.
  function loanFee(proposal, runAfter) {
    let newDebt;
    let toMint = amountMath.makeEmpty(runBrand);
    let fee = amountMath.makeEmpty(runBrand);
    if (proposal.want.RUN) {
      fee = multiplyBy(proposal.want.RUN, manager.getLoanFee());
      toMint = amountMath.add(proposal.want.RUN, fee);
      newDebt = amountMath.add(runDebt, toMint);
    } else if (proposal.give.RUN) {
      newDebt = amountMath.subtract(runDebt, runAfter.vault);
    } else {
      newDebt = runDebt;
    }
    return { newDebt, toMint, fee };
  }

  /** @param {ZCFSeat} clientSeat */
  async function adjustBalancesHook(clientSeat) {
    assertVaultIsOpen();
    const proposal = clientSeat.getProposal();

    assertOnlyKeys(proposal, ['Collateral', 'RUN']);

    const targetCollateralAmount = TargetCollateralLevels(clientSeat).vault;
    // max debt supported by current Collateral as modified by proposal
    const maxDebtForOriginalTarget = await maxDebtFor(targetCollateralAmount);

    const priceOfCollateralInRun = makeRatioFromAmounts(
      maxDebtForOriginalTarget,
      targetCollateralAmount,
    );

    // After the AWAIT, we retrieve the vault's allocations again.
    const collateralAfter = TargetCollateralLevels(clientSeat);
    const runAfter = targetRunLevels(clientSeat);

    // Calculate the fee, the amount to mint and the resulting debt. We'll
    // verify that the target debt doesn't violate the collateralization ratio,
    // then mint, reallocate, and burn.
    const { fee, toMint, newDebt } = loanFee(proposal, runAfter);

    // Get new balances after calling the priceAuthority, so we can compare
    // to the debt limit based on the new values.
    const vaultCollateral =
      collateralAfter.vault || amountMath.makeEmpty(collateralBrand);

    // If the collateral decreased, we pro-rate maxDebt
    if (amountMath.isGTE(targetCollateralAmount, vaultCollateral)) {
      // We can pro-rate maxDebt because the quote is either linear (price is
      // unchanging) or super-linear (meaning it's an AMM. When the volume sold
      // falls, the proceeds fall less than linearly, so this is a conservative
      // choice.)
      const maxDebtAfter = multiplyBy(vaultCollateral, priceOfCollateralInRun);
      assert(
        amountMath.isGTE(maxDebtAfter, newDebt),
        X`The requested debt ${q(
          newDebt,
        )} is more than the collateralization ratio allows: ${q(maxDebtAfter)}`,
      );

      // When the re-checked collateral was larger than the original amount, we
      // should restart, unless the new debt is less than the original target
      // (in which case, we're fine to proceed with the reallocate)
    } else if (!amountMath.isGTE(maxDebtForOriginalTarget, newDebt)) {
      return adjustBalancesHook(clientSeat);
    }

    // mint to vaultSeat, then reallocate to reward and client, then burn from
    // vaultSeat. Would using a separate seat clarify the accounting?
    runMint.mintGains({ RUN: toMint }, vaultSeat);
    zcf.reallocate(
      vaultSeat.stage({
        Collateral: collateralAfter.vault,
        RUN: runAfter.vault,
      }),
      clientSeat.stage({
        Collateral: collateralAfter.client,
        RUN: runAfter.client,
      }),
      manager.stageReward(fee),
    );

    runDebt = newDebt;
    runMint.burnLosses({ RUN: runAfter.vault }, vaultSeat);

    assertVaultHoldsNoRun();

    updateUiState();
    clientSeat.exit();

    return 'We have adjusted your balances, thank you for your business';
  }

  function makeAdjustBalancesInvitation() {
    assertVaultIsOpen();
    return zcf.makeInvitation(adjustBalancesHook, 'AdjustBalances');
  }

  async function openLoan(seat) {
    assert(amountMath.isEmpty(runDebt), X`vault must be empty initially`);
    // get the payout to provide access to the collateral if the
    // contract abandons
    const {
      give: { Collateral: collateralAmount },
      want: { RUN: wantedRun },
    } = seat.getProposal();

    const collateralPayoutP = E(userSeat).getPayouts();

    // todo trigger process() check right away, in case the price dropped while we ran

    const fee = multiplyBy(wantedRun, manager.getLoanFee());
    if (amountMath.isEmpty(fee)) {
      throw seat.exit('loan requested is too small; cannot accrue interest');
    }

    runDebt = amountMath.add(wantedRun, fee);
    await assertSufficientCollateral(collateralAmount, runDebt);

    runMint.mintGains({ RUN: runDebt }, vaultSeat);
    const priorCollateral = getCollateralAllocated(vaultSeat);

    const collateralSeatStaging = vaultSeat.stage({
      Collateral: amountMath.add(priorCollateral, collateralAmount),
      RUN: amountMath.makeEmpty(runBrand),
    });
    const loanSeatStaging = seat.stage({
      RUN: wantedRun,
      Collateral: amountMath.makeEmpty(collateralBrand),
    });
    const stageReward = manager.stageReward(fee);
    zcf.reallocate(collateralSeatStaging, loanSeatStaging, stageReward);

    updateUiState();

    return { notifier, collateralPayoutP };
  }

  function accrueInterestAndAddToPool(currentTime) {
    const interestKit = interestCalculator.calculateReportingPeriod(
      {
        latestInterestUpdate,
        newDebt: runDebt,
        interest: amountMath.makeEmpty(runBrand),
      },
      currentTime,
    );

    if (interestKit.latestInterestUpdate === latestInterestUpdate) {
      return amountMath.makeEmpty(runBrand);
    }

    ({ latestInterestUpdate, newDebt: runDebt } = interestKit);
    updateUiState();
    return interestKit.interest;
  }

  function getDebtAmount() {
    return runDebt;
  }

  /** @type {Vault} */
  const vault = harden({
    makeAdjustBalancesInvitation,
    makeCloseInvitation,

    // for status/debugging
    getCollateralAmount,
    getDebtAmount,
  });

  return harden({
    vault,
    openLoan,
    accrueInterestAndAddToPool,
    vaultSeat,
    liquidated,
  });
}
