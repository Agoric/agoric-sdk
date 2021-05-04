// @ts-check

import { observeNotifier } from '@agoric/notifier';
import { E } from '@agoric/eventual-send';
import { natSafeMath } from '@agoric/zoe/src/contractSupport';
import { amountMath } from '@agoric/ertp';
import { Far } from '@agoric/marshal';

const { add, subtract, multiply, floorDivide } = natSafeMath;

// wrapper to take the treasury's creatorFacet, and make a function that will
// request an invitation and return a promise for a payment.
export function makeTreasuryFeeCollector(zoe, treasuryCreatorFacet) {
  /** @type FeeCollector */
  return Far('collectFees', {
    collectFees: () => {
      const invitation = E(treasuryCreatorFacet).makeCollectFeesInvitation();
      const collectFeesSeat = E(zoe).offer(invitation, undefined, undefined);
      return E(collectFeesSeat).getPayout('RUN');
    },
  });
}

// A distributor of fees from treasury to the Bank module, which has a mapping
// from accounts to purses. Each time the epochTimer signals the end of an
// Epoch, it will ask the bank's notifier for a fresh list of accounts and ask
// the treasury for the fees that have been collected to date. It will then
// divide the funds evenly amount the accounts, and send payments in batches of
// depositsPerUpdate every updateInterval. When the payment doesn't divide
// evenly among the accounts, it holds the remainder till the next epoch.

/** @type {BuildFeeDistributor} */
export function buildDistributor(treasury, bank, epochTimer, timer, params) {
  const {
    depositsPerUpdate,
    updateInterval,
    // By default, we assume the epochTimer fires once per epoch.
    epochInterval = 1n,
    runIssuer,
    runBrand,
  } = params;
  const accountsNotifier = E(bank).getAccountsNotifier();
  let leftOverPayment;
  let leftOverValue = 0n;
  const queuedAccounts = [];
  const queuedPayments = [];
  let lastWallTimeUpdate;
  const timerNotifier = E(timer).makeNotifier(0n, updateInterval);

  /**
   * @param {(pmt: Payment[]) => void} disposeRejectedPayments
   */
  async function scheduleDeposits(disposeRejectedPayments) {
    if (!queuedPayments.length) {
      return;
    }

    ({ updateCount: lastWallTimeUpdate } = await E(
      timerNotifier,
    ).getUpdateSince(lastWallTimeUpdate));

    // queuedPayments may have changed since the `await`.
    if (!queuedPayments.length) {
      return;
    }

    const accounts = queuedAccounts.splice(0, depositsPerUpdate);
    const payments = queuedPayments.splice(0, depositsPerUpdate);
    E(bank)
      .depositMultiple(accounts, payments)
      .then(settledResults => {
        const rejectedPayments = payments.filter(
          (_pmt, i) =>
            settledResults[i] && settledResults[i].status === 'rejected',
        );

        // Redeposit the payments.
        disposeRejectedPayments(rejectedPayments);
      });
    scheduleDeposits(disposeRejectedPayments);
  }

  async function schedulePayments() {
    let payment = E(treasury).collectFees();
    const [amount, { value: accounts }] = await Promise.all([
      E(runIssuer).getAmountOf(payment),
      E(accountsNotifier).getUpdateSince(),
    ]);
    const totalValue = add(leftOverValue, amount.value);
    const valuePerAccount = floorDivide(totalValue, accounts.length);

    const amounts = Array(accounts.length).fill(
      amountMath.make(runBrand, valuePerAccount),
    );
    if (leftOverValue) {
      payment = E(runIssuer).combine([payment, leftOverPayment]);
    }
    leftOverValue = subtract(
      totalValue,
      multiply(accounts.length, valuePerAccount),
    );
    amounts.push(amountMath.make(runBrand, leftOverValue));

    const manyPayments = await E(runIssuer).splitMany(payment, amounts);
    // manyPayments is hardened, so we can't use pop()
    leftOverPayment = manyPayments[manyPayments.length - 1];
    queuedPayments.push(...manyPayments.slice(0, manyPayments.length - 1));
    queuedAccounts.push(...accounts);

    scheduleDeposits(_pmts => {
      // TODO: Somehow reclaim the rejected payments.
    });
  }

  const timeObserver = {
    updateState: _ => schedulePayments(),
    fail: reason => {
      throw Error(`Treasury epoch timer failed: ${reason}`);
    },
    finish: done => {
      throw Error(`Treasury epoch timer died: ${done}`);
    },
  };

  const epochNotifier = E(epochTimer).makeNotifier(0n, epochInterval);
  return observeNotifier(epochNotifier, timeObserver);
}
