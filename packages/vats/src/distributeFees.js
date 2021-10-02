// @ts-check

import { observeNotifier } from '@agoric/notifier';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

// wrapper to take the treasury's creatorFacet, and make a function that will
// request an invitation and return a promise for a payment.
export function makeTreasuryFeeCollector(zoe, treasuryCreatorFacet) {
  /** @type {FeeCollector} */
  return Far('collectFees', {
    collectFees: () => {
      const invitation = E(treasuryCreatorFacet).makeCollectFeesInvitation();
      const collectFeesSeat = E(zoe).offer(invitation, undefined, undefined);
      return E(collectFeesSeat).getPayout('RUN');
    },
  });
}

/**
 * A distributor of fees from treasury to the Bank module. Each time the
 * epochTimer signals the end of an Epoch, it will ask the treasury for the fees
 * that have been collected to date and send that payment to the depositFacet.
 *
 * @type {BuildFeeDistributor}
 */
export async function buildDistributor(
  treasury,
  feeDepositFacet,
  epochTimer,
  params,
) {
  const {
    // By default, we assume the epochTimer fires once per epoch.
    epochInterval = 1n,
  } = params;

  async function schedulePayments() {
    const payment = await E(treasury).collectFees();
    return E(feeDepositFacet).receive(payment);
  }

  const timeObserver = {
    updateState: _ =>
      schedulePayments().catch(e => {
        console.error('failed with', e);
        throw e;
      }),
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
