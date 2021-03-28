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
// collateral, and lending Scones to the borrower

/** @type {MakeVaultKit} */
export function makeVaultKit(
  zcf,
  manager,
  sconeMint,
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
  // collateral back. If that happens, the issuer for the Scones will be dead,
  // so their loan will be worthless.
  const { zcfSeat: vaultSeat, userSeat } = zcf.makeEmptySeatKit();

  trace('vaultSeat proposal', vaultSeat.getProposal());

  const { brand: sconeBrand } = sconeMint.getIssuerRecord();
  let sconeDebt = amountMath.makeEmpty(sconeBrand);
  const interestCalculator = makeInterestCalculator(
    sconeBrand,
    manager.getInterestRate(),
    loanParams.chargingPeriod,
    loanParams.recordingPeriod,
  );

  function getCollateralAllocated(seat) {
    return seat.getAmountAllocated('Collateral', collateralBrand);
  }
  function getSconesAllocated(seat) {
    return seat.getAmountAllocated('Scones', sconeBrand);
  }

  function assertVaultHoldsNoScones() {
    assert(
      amountMath.isEmpty(getSconesAllocated(vaultSeat)),
      X`Vault should be empty of Scones`,
    );
  }

  async function maxDebtFor(collateralAmount) {
    const quoteAmount = await E(priceAuthority).quoteGiven(
      collateralAmount,
      sconeBrand,
    );

    return divideBy(getAmountOut(quoteAmount), manager.getInitialMargin());
  }

  async function assertSufficientCollateral(collateralAmount, sconesWanted) {
    const maxScones = await maxDebtFor(collateralAmount);
    assert(
      amountMath.isGTE(maxScones, sconesWanted, sconeBrand),
      X`Requested ${q(sconesWanted)} exceeds max ${q(maxScones)}`,
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
    if (amountMath.isEmpty(sconeDebt)) {
      return makeRatio(collateralAmount.value, sconeBrand, 1n);
    }

    const quoteAmount = await E(priceAuthority).quoteGiven(
      collateralAmount,
      sconeBrand,
    );
    const collateralValueInScones = getAmountOut(quoteAmount);
    return makeRatioFromAmounts(collateralValueInScones, sconeDebt);
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
      debt: sconeDebt,
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
    sconeDebt = newDebt;
    active = false;
    updateUiState();
  }

  async function closeHook(seat) {
    assertVaultIsOpen();
    assertProposalShape(seat, {
      give: { Scones: null },
      want: { Collateral: null },
    });
    const {
      give: { Scones: sconesReturned },
      want: { Collateral: _collateralWanted },
    } = seat.getProposal();

    // you're paying off the debt, you get everything back. If you were
    // underwater, we should have liquidated some collateral earlier: we
    // missed our chance.

    // you must pay off the entire remainder but if you offer too much, we won't
    // take more than you owe
    assert(amountMath.isGTE(sconesReturned, sconeDebt));

    trade(
      zcf,
      {
        seat: vaultSeat,
        gains: { Scones: sconeDebt }, // return any overpayment
      },
      {
        seat,
        gains: { Collateral: getCollateralAllocated(vaultSeat) },
      },
    );
    seat.exit();
    sconeDebt = amountMath.makeEmpty(sconeBrand);
    active = false;
    updateUiState();

    sconeMint.burnLosses({ Scones: sconeDebt }, vaultSeat);
    vaultSeat.exit();

    return 'your loan is closed, thank you for your business';
  }

  function makeCloseInvitation() {
    assertVaultIsOpen();
    return zcf.makeInvitation(closeHook, 'pay off entire loan and close Vault');
  }

  // The proposal is not allowed to include any keys other than these,
  // usually 'Collateral' and 'Scones'.
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
  function collateralTargets(seat) {
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

  // Calculate the target scone level for the vaultSeat and clientSeat implied
  // by the proposal. If the proposal wants collateral, transfer that amount
  // from vault to client. If the proposal gives collateral, transfer the
  // opposite direction. Otherwise, return the current level.
  //
  // Since we don't allow the debt to go negative, we will reduce the amount we
  // accept when the proposal says to give more scones than are owed.
  function sconeTargets(seat) {
    const clientAllocation = getSconesAllocated(seat);
    const proposal = seat.getProposal();
    if (proposal.want.Scones) {
      return {
        vault: amountMath.makeEmpty(sconeBrand),
        client: amountMath.add(clientAllocation, proposal.want.Scones),
      };
    } else if (proposal.give.Scones) {
      // We don't allow sconeDebt to be negative, so we'll refund overpayments
      const acceptedScones = amountMath.isGTE(proposal.give.Scones, sconeDebt)
        ? sconeDebt
        : proposal.give.Scones;

      return {
        vault: acceptedScones,
        client: amountMath.subtract(clientAllocation, acceptedScones),
      };
    } else {
      return {
        vault: amountMath.makeEmpty(sconeBrand),
        client: clientAllocation,
      };
    }
  }

  // Calculate the fee, the amount to mint and the resulting debt.
  function loanFee(proposal, sconesAfter) {
    let newDebt;
    let toMint = amountMath.makeEmpty(sconeBrand);
    let fee = amountMath.makeEmpty(sconeBrand);
    if (proposal.want.Scones) {
      fee = multiplyBy(proposal.want.Scones, manager.getLoanFee());
      toMint = amountMath.add(proposal.want.Scones, fee);
      newDebt = amountMath.add(sconeDebt, toMint);
    } else if (proposal.give.Scones) {
      newDebt = amountMath.subtract(sconeDebt, sconesAfter.vault);
    } else {
      newDebt = sconeDebt;
    }
    return { newDebt, toMint, fee };
  }

  /** @param {ZCFSeat} clientSeat */
  async function adjustBalancesHook(clientSeat) {
    assertVaultIsOpen();
    const proposal = clientSeat.getProposal();

    assertOnlyKeys(proposal, ['Collateral', 'Scones']);

    const targetCollateralAmount = collateralTargets(clientSeat).vault;
    // max debt supported by current Collateral as modified by proposal
    const maxDebtForOriginalTarget = await maxDebtFor(targetCollateralAmount);

    const sconePriceOfCollateral = makeRatioFromAmounts(
      maxDebtForOriginalTarget,
      targetCollateralAmount,
    );

    // After the AWAIT, we retrieve the vault's allocations again.
    const collateralAfter = collateralTargets(clientSeat);
    const sconesAfter = sconeTargets(clientSeat);

    // Calculate the fee, the amount to mint and the resulting debt. We'll
    // verify that the target debt doesn't violate the collateralization ratio,
    // then mint, reallocate, and burn.
    const { fee, toMint, newDebt } = loanFee(proposal, sconesAfter);

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
      const maxDebtAfter = multiplyBy(vaultCollateral, sconePriceOfCollateral);
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
    sconeMint.mintGains({ Scones: toMint }, vaultSeat);
    zcf.reallocate(
      vaultSeat.stage({
        Collateral: collateralAfter.vault,
        Scones: sconesAfter.vault,
      }),
      clientSeat.stage({
        Collateral: collateralAfter.client,
        Scones: sconesAfter.client,
      }),
      manager.stageReward(fee),
    );

    sconeDebt = newDebt;
    sconeMint.burnLosses({ Scones: sconesAfter.vault }, vaultSeat);

    assertVaultHoldsNoScones();

    updateUiState();
    clientSeat.exit();

    return 'We have adjusted your balances, thank you for your business';
  }

  function makeAdjustBalancesInvitation() {
    assertVaultIsOpen();
    return zcf.makeInvitation(adjustBalancesHook, 'adjustBalances');
  }

  async function openLoan(seat) {
    assert(amountMath.isEmpty(sconeDebt), X`vault must be empty initially`);
    // get the payout to provide access to the collateral if the
    // contract abandons
    const {
      give: { Collateral: collateralAmount },
      want: { Scones: sconesWanted },
    } = seat.getProposal();

    const collateralPayoutP = E(userSeat).getPayouts();
    await assertSufficientCollateral(collateralAmount, sconesWanted);

    // todo trigger process() check right away, in case the price dropped while we ran

    const fee = multiplyBy(sconesWanted, manager.getLoanFee());
    if (amountMath.isEmpty(fee)) {
      throw seat.exit('loan requested is too small; cannot accrue interest');
    }

    sconeDebt = amountMath.add(sconesWanted, fee);
    sconeMint.mintGains({ Scones: sconeDebt }, vaultSeat);
    const priorCollateral = getCollateralAllocated(vaultSeat);

    const collateralSeatStaging = vaultSeat.stage({
      Collateral: amountMath.add(priorCollateral, collateralAmount),
      Scones: amountMath.makeEmpty(sconeBrand),
    });
    const loanSeatStaging = seat.stage({
      Scones: sconesWanted,
      Collateral: amountMath.makeEmpty(collateralBrand),
    });
    const stageReward = manager.stageReward(fee);
    zcf.reallocate(collateralSeatStaging, loanSeatStaging, stageReward);

    updateUiState();

    return { notifier, collateralPayoutP };
  }

  function accrueInterestAndAddToPool(currentTime) {
    const interestKit = interestCalculator.calculateReportingPeriod(
      { latestInterestUpdate, currentDebt: sconeDebt },
      currentTime,
    );

    if (interestKit.latestInterestUpdate === latestInterestUpdate) {
      return amountMath.makeEmpty(sconeBrand);
    }

    ({ latestInterestUpdate, newDebt: sconeDebt } = interestKit);
    updateUiState();
    return interestKit.interest;
  }

  // todo: add liquidateSome(collateralAmount): sells some collateral, reduces some debt

  function getDebtAmount() {
    return sconeDebt;
  }

  /** @type {Vault} */
  const vault = harden({
    makeAdjustBalancesInvitation,
    makeCloseInvitation,
    // repay, borrowMore, recapitalize, withdrawCollateral, close

    // for status/debugging
    getCollateralAmount,
    getDebtAmount,
    // getFeeAmount,
  });

  return harden({
    vault,
    openLoan,
    accrueInterestAndAddToPool,
    vaultSeat,
    liquidated,
  });
}

// payback could be split into:
// * returnScones: reduces sconeDebt
// * withdrawSomeCollateral: do margin check, remove collateral
// * close: do margin check, remove all collateral, close Vault
//
// the downside is that a buggy vault contract could accept returnScones()
// but break before withdrawSomeCollateral() finishes

// consider payback() and close()
