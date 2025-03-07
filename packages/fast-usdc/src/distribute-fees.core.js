/** @file core eval module to collect fees. */
import { AmountMath } from '@agoric/ertp';
import { floorMultiplyBy } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';
import { makeTracer } from '@agoric/internal';
import { fromExternalConfig } from './utils/config-marshal.js';

/**
 * @import {Amount, Brand, DepositFacet, Ratio} from '@agoric/ertp';
 * @import {FastUSDCCorePowers} from '@agoric/fast-usdc/src/start-fast-usdc.core.js';
 * @import {CopyRecord} from '@endo/pass-style'
 * @import {BootstrapManifestPermit} from '@agoric/vats/src/core/lib-boot.js'
 * @import {LegibleCapData} from './utils/config-marshal.js'
 */

/**
 * @typedef {{ destinationAddress: string } &
 *  ({ feePortion: Ratio} | {fixedFees: Amount<'nat'>}) &
 *  CopyRecord
 * } FeeDistributionTerms
 */

const kwUSDC = 'USDC'; // keyword in AmountKeywordRecord
const issUSDC = 'USDC'; // issuer name

const trace = makeTracer('FUCF', true);

/**
 * @param {BootstrapPowers & FastUSDCCorePowers } permittedPowers
 * @param {{ options: LegibleCapData<{ feeTerms: FeeDistributionTerms}> }} config
 */
export const distributeFees = async (permittedPowers, config) => {
  trace('distributeFees...', config.options);

  const { agoricNames, namesByAddress, zoe } = permittedPowers.consume;
  /** @type {Brand<'nat'>} */
  const usdcBrand = await E(agoricNames).lookup('brand', issUSDC);
  /** @type {{ feeTerms: FeeDistributionTerms}} */
  const { feeTerms: terms } = fromExternalConfig(config.options, {
    USDC: usdcBrand,
  });

  const { creatorFacet } = await permittedPowers.consume.fastUsdcKit;
  const want = {
    [kwUSDC]: await ('fixedFees' in terms
      ? terms.fixedFees
      : E(creatorFacet)
          .getContractFeeBalance()
          .then(balance => floorMultiplyBy(balance, terms.feePortion))),
  };
  const proposal = harden({ want });

  /** @type {DepositFacet} */
  const depositFacet = await E(namesByAddress).lookup(
    terms.destinationAddress,
    'depositFacet',
  );
  trace('to:', terms.destinationAddress, depositFacet);

  const toWithdraw = await E(creatorFacet).makeWithdrawFeesInvitation();
  trace('invitation:', toWithdraw, 'proposal:', proposal);
  const seat = E(zoe).offer(toWithdraw, proposal);
  const result = await E(seat).getOfferResult();
  trace('offer result', result);
  const payout = await E(seat).getPayout(kwUSDC);
  /** @type {Amount<'nat'>} */
  // @ts-expect-error USDC is a nat brand
  const rxd = await E(depositFacet).receive(payout);
  trace('received', rxd);
  if (!AmountMath.isGTE(rxd, proposal.want[kwUSDC])) {
    trace('🚨 expected', proposal.want[kwUSDC], 'got', rxd);
  }
  trace('done');
};
harden(distributeFees);

/** @satisfies {BootstrapManifestPermit} */
const permit = {
  consume: {
    fastUsdcKit: true,
    agoricNames: true,
    namesByAddress: true,
    zoe: true,
  },
};

/**
 * @param {unknown} _utils
 * @param {Parameters<typeof distributeFees>[1]} config
 */
export const getManifestForDistributeFees = (_utils, { options }) => {
  return { manifest: { [distributeFees.name]: permit }, options };
};
