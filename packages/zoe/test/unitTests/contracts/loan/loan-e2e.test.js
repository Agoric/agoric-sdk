// @ts-nocheck
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import path from 'path';

import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';
import bundleSource from '@endo/bundle-source';
import { makeNotifierKit } from '@agoric/notifier';

import { checkDetails, checkPayout } from './helpers.js';
import { setup } from '../../setupBasicMints.js';
import { makeFakePriceAuthority } from '../../../../tools/fakePriceAuthority.js';
import buildManualTimer from '../../../../tools/manualTimer.js';
import { makeRatio } from '../../../../src/contractSupport/index.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const loanRoot = `${dirname}/../../../../src/contracts/loan/`;
const autoswapRoot = `${dirname}/../../../../src/contracts/autoswap`;

test.todo('loan - no mmr');
test.todo('loan - bad mmr');
test.todo('loan - no priceAuthority');
test.todo('loan - badPriceAuthority');
test.todo('loan - bad autoswap, no autoswap');
test.todo('loan - wrong keywords');

test.todo('loan - lend - wrong exit rule');
test.todo('loan - lend - must want nothing');

test('loan - lend - exit before borrow', async t => {
  const {
    moolaKit: collateralKit,
    simoleanKit: loanKit,
    zoe,
    vatAdminState,
  } = setup();
  const bundle = await bundleSource(loanRoot);
  vatAdminState.installBundle('b1-loan', bundle);
  const installation = await E(zoe).installBundleID('b1-loan');

  // Create autoswap installation and instance
  const autoswapBundle = await bundleSource(autoswapRoot);
  vatAdminState.installBundle('b1-autoswap', autoswapBundle);
  const autoswapInstallation = await E(zoe).installBundleID('b1-autoswap');

  const { instance: autoswapInstance } = await E(zoe).startInstance(
    autoswapInstallation,
    harden({ Central: collateralKit.issuer, Secondary: loanKit.issuer }),
  );

  const issuerKeywordRecord = harden({
    Collateral: collateralKit.issuer,
    Loan: loanKit.issuer,
  });

  const timer = buildManualTimer(t.log);

  const priceAuthority = await makeFakePriceAuthority({
    priceList: [],
    timer,
    actualBrandIn: collateralKit.brand,
    actualBrandOut: loanKit.brand,
  });

  const { notifier: periodNotifier } = makeNotifierKit();

  const terms = {
    mmr: makeRatio(150n, loanKit.brand),
    autoswapInstance,
    priceAuthority,
    periodNotifier,
    interestRate: 5n,
    interestPeriod: 10n,
  };

  const { creatorInvitation: lendInvitation, instance } = await E(
    zoe,
  ).startInstance(installation, issuerKeywordRecord, terms);

  const maxLoan = AmountMath.make(loanKit.brand, 1000n);

  // Alice is willing to lend Loan tokens
  const proposal = harden({
    give: { Loan: maxLoan },
  });

  const payments = harden({
    Loan: loanKit.mint.mintPayment(maxLoan),
  });

  const lenderSeat = await E(zoe).offer(lendInvitation, proposal, payments);

  const borrowInvitation = await E(lenderSeat).getOfferResult();

  await checkDetails(t, zoe, borrowInvitation, {
    description: 'borrow',
    handle: null,
    installation,
    instance,
    customDetails: {
      maxLoan,
    },
  });

  await E(lenderSeat).tryExit();

  // Usually, the payout is received when either 1) the loan is repaid or 2) the
  // collateral is liquidated.
  await checkPayout(t, lenderSeat, 'Loan', loanKit, maxLoan);
});
