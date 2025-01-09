/**
 * @file core eval script to collect fees.
 *
 * USAGE: edit the config record and then submit.
 */

const config = harden({
  /** fees to withdraw and distribute, in uusdc */
  fees: 1_000_000n,
  destinationAddress: 'agoric1feeRecipient-REPLACE-ME',
});

/* global globalThis */
/**
 * @import {EProxy} from '@endo/eventual-send';
 * @import {DepositFacet} from '@agoric/ertp';
 * @import {FastUSDCCorePowers} from '@agoric/fast-usdc/src/fast-usdc.start.js';
 */

const kwUSDC = 'USDC'; // keyword in AmountKeywordRecord
const issUSDC = 'USDC'; // issuer name

const trace = (...args) => console.log('FUCF', ...args);
trace('config', config);

// NOTE: not defensive as in @agoric/ertp
const AmountMath = {
  /**
   * @param {Brand<'nat'>} brand
   * @param {NatValue} value
   */
  make: (brand, value) => harden({ brand, value }),
  /**
   * @param {Amount} x
   * @param {Amount} y
   */
  isEqual: (x, y) => x.brand === y.brand && x.value === y.value,
};

/**
 * @param {BootstrapPowers & FastUSDCCorePowers } permittedPowers
 * @param {unknown} _config
 * @param {EProxy} E provide static typing for implicit global
 */
const distributeFees = async (permittedPowers, _config, E) => {
  trace('distributeFees...');

  E ||= globalThis.E; // core eval is endowed with E
  trace({ E });

  const { agoricNames, namesByAddress, zoe } = permittedPowers.consume;
  /** @type {Brand<'nat'>} */
  const usdcBrand = await E(agoricNames).lookup('brand', issUSDC);
  const proposal = harden({
    want: { [kwUSDC]: AmountMath.make(usdcBrand, config.fees) },
  });

  /** @type {DepositFacet} */
  const depositFacet = await E(namesByAddress).lookup(
    config.destinationAddress,
    'depositFacet',
  );
  trace('to:', config.destinationAddress, depositFacet);

  const { creatorFacet } = await permittedPowers.consume.fastUsdcKit;
  const toWithdraw = await E(creatorFacet).makeWithdrawFeesInvitation();
  trace('invitation:', toWithdraw, 'proposal:', proposal);
  const seat = E(zoe).offer(toWithdraw, proposal);
  const result = await E(seat).getOfferResult();
  trace('offer result', result);
  const payout = await E(seat).getPayout(kwUSDC);
  const rxd = await E(depositFacet).receive(payout);
  trace('received', rxd);
  if (!AmountMath.isEqual(rxd, proposal.want[kwUSDC])) {
    trace('🚨 expected', proposal.want[kwUSDC], 'got', rxd);
  }
  trace('done');
};
harden(distributeFees);

trace('defined', distributeFees);

distributeFees;
