// @ts-check

import { observeNotifier } from '@agoric/notifier';
import { E } from '@agoric/eventual-send';
import { natSafeMath } from '@agoric/zoe/src/contractSupport';
import { AmountMath } from '@agoric/ertp';
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
// divide the funds evenly among the accounts, and send payments.
// When the payment doesn't divide evenly among the accounts, it holds the
// remainder till the next epoch.

/** @type {BuildFeeDistributor} */
export function buildDistributor(treasury, bank, epochTimer, params) {
  const {
    // By default, we assume the epochTimer fires once per epoch.
    epochInterval = 1n,
    runIssuer,
    runBrand,
  } = params;
  const accountsNotifier = E(bank).getAccountsNotifier();
  let leftOverPayment;
  let leftOverValue = 0n;

  async function schedulePayments() {
    let payment = E(treasury).collectFees();
    const [amount, { value: accounts }] = await Promise.all([
      E(runIssuer).getAmountOf(payment),
      E(accountsNotifier).getUpdateSince(),
    ]);
    const totalValue = add(leftOverValue, amount.value);
    const valuePerAccount = floorDivide(totalValue, accounts.length);

    const amounts = Array(accounts.length).fill(
      AmountMath.make(runBrand, valuePerAccount),
    );
    if (leftOverValue) {
      payment = E(runIssuer).combine([payment, leftOverPayment]);
    }
    leftOverValue = subtract(
      totalValue,
      multiply(accounts.length, valuePerAccount),
    );
    amounts.push(AmountMath.make(runBrand, leftOverValue));

    const manyPayments = await E(runIssuer).splitMany(payment, amounts);
    // manyPayments is hardened, so we can't use pop()
    leftOverPayment = manyPayments[manyPayments.length - 1];
    const actualPayments = manyPayments.slice(0, manyPayments.length - 1);

    // eslint-disable-next-line no-unused-vars
    const settledResultsP = Promise.allSettled(
      // The scheduler will decide how fast to process the deposits.
      accounts.map((acct, i) =>
        E(bank).deposit(runBrand, acct, actualPayments[i]),
      ),
    );

    // TODO: examine settledResultsP for failures, and reclaim those payments.
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
