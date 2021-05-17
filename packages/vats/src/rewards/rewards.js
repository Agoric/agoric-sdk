// @ts-check

import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { AmountMath } from '@agoric/ertp';
import { makeStore } from '@agoric/store';
import {
  natSafeMath,
  multiplyBy,
  makeRatio,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport';

import { E } from '@agoric/eventual-send';
import { makeValidator } from './validator';
import { makeDelegator } from './delegator';

const { add, subtract, multiply, floorDivide } = natSafeMath;
const PROPOSER_SHARE = 5;

/**
 * Track rewards for tendermint blocks.
 *
 * @param {ToCosmos} toCosmos
 * @param {Timer} epochTimer
 * @param {Timer} blockTimer
 * @param {Disburser} disburser
 * @param {Issuer} issuer
 * @param brand
 * @returns {FromCosmos} apiFromCosmos
 */
export function makeRewards(
  toCosmos,
  epochTimer,
  blockTimer,
  disburser,
  issuer,
  brand,
) {
  const allValidators = [];
  const activeValidators = [];
  const validatorsByAddr = makeStore('validatorAddr');
  const delegatorsByAddr = makeStore('delegatorAddr');

  function createValidator(
    commission,
    minSelfDelegation,
    validatorAddr,
    delegatorAddr,
    value,
  ) {
    const validator = makeValidator(validatorAddr, value, commission);
    allValidators.push(validator);

    // TODO(cth) this is only here for the short term
    validator.setBonded();
    activeValidators.push(validator);

    validatorsByAddr.init(validator.getValidatorID(), validator);
  }

  function editValidator(validatorAddr, commissionRate, minSelfDelegation) {
    allValidators.get(validatorAddr).update(commissionRate, minSelfDelegation);
  }

  function getOrCreateDelegator(delegatorAddr, stake) {
    let delegator;
    if (delegatorsByAddr.has(delegatorAddr)) {
      delegator = delegatorsByAddr.get(delegatorAddr);
    } else {
      delegator = makeDelegator(delegatorAddr, stake);
      delegatorsByAddr.init(delegatorAddr, delegator);
    }
    return delegator;
  }

  function delegate(delegatorAddr, validatorAddr, shares) {
    const delegator = getOrCreateDelegator(delegatorAddr, shares);
    const validator = validatorsByAddr.get(validatorAddr);
    assert(validator, X`validator is unknown: ${validatorAddr}`);
    validator.addDelegation(delegator, shares);
  }

  function undelegate(
    delegatorAddr,
    validatorAddr,
    unbondShares,
    completionTime,
  ) {
    const delegator = getOrCreateDelegator(delegatorAddr);
    const validator = validatorsByAddr.get(validatorAddr);
    assert(validator, X`validator is unknown: ${validatorAddr}`);

    // find delegation from delegator and validator

    delegator.unbond(delegation);
    const { replacement } = delegator.unbond(delegation, delta, height);
    delegation.getValidator().unbond(replacement, delegation, delta);
  }

  function redelegate(
    delegatorAddr,
    srcValidatorAddr,
    dstValidatorAddr,
    completionTime,
    shares,
  ) {
    const srcValidator = validatorsByAddr.get(srcValidatorAddr);
    const dstValidator = validatorsByAddr.get(dstValidatorAddr);
    const delegator = getOrCreateDelegator(delegatorAddr);

    // TODO(hibbert): get one delegation for now. Fix to divide up delegations later
    // When we're doing it right, Eerror if insufficient shares to redelegate
    const delegation = srcValidator.getDelegation(delegator, shares);
    const delta =
      delegation.getStake() < shares ? delegation.getStake() : shares;

    const { redelegation, replacement } = delegator.redelegate(
      delegation,
      dstValidator,
      delta,
      completionTime,
    );
    srcValidator.redelegateReduce(redelegation, delegation, replacement);
    dstValidator.redelegate(redelegation);
  }

  function validatorBonded(ValidatorSigningInfo) {}

  function slash(validatorAddress, validatorPower, reason, jailed, fraction) {}

  function validatorUnbonding(validatorAddress) {}
  function validatorDeleted(validatorAddress) {}

  function snapshotValidators(proposer, blockReward, totalPower) {
    const now = blockTimer.getCurrentTimestamp();
    const totalStaked = activeValidators.reduce((total, v) => {
      return add(total, v.totalStaked());
    }, 0);
    assert(
      totalStaked === totalPower,
      X`totalStaked (${totalStaked} should equal totalPower ${totalPower}`,
    );

    const staked = AmountMath.make(brand, totalStaked);
    const share = makeRatioFromAmounts(blockReward, staked);
    let decliningRewardPool = blockReward;
    activeValidators.forEach(v => {
      const stake = v.totalStaked(now);
      if (stake > 0 && v !== proposer) {
        const validatorStake = AmountMath.make(brand, v.totalStaked());
        const reward = multiplyBy(validatorStake, share);
        decliningRewardPool = AmountMath.subtract(decliningRewardPool, reward);
        toCosmos.rewards(reward, v);
      }
    });
    toCosmos.rewards(decliningRewardPool, proposer);
  }

  function validatorPowerShares() {
    const validatorToPower = [];
    let totalStaked = 0n;
    const now = blockTimer.getCurrentTimestamp();
    activeValidators.forEach(v => {
      const stake = v.totalStaked(now);
      totalStaked += stake;
      validatorToPower.push({ v, stake });
    });
    return { totalStaked, validatorToPower };
  }

  // validate totalBonding and sumValidatorPower.
  // communityTax and proposerCommissionRate should already be known

  // sumPrecommitPower is the subset of total power that signed the previous
  // block
  async function endBlock(
    rewards,
    proposerAddr,
    sumPrecommitPower,
    totalPower,
    communityTax,
  ) {
    // TODO: subtract commision for each validotor; charge communityTax
    const rewardsAmount = AmountMath.make(brand, rewards);
    const proposer = validatorsByAddr.get(proposerAddr);
    if (!validatorsByAddr.has(proposer.getValidatorID())) {
      throw Error(`Not an active validator: ${proposer.getValidatorID()}`);
    }
    const { totalStaked, validatorToPower } = validatorPowerShares();
    assert(
      totalStaked === totalPower,
      X`totalStaked (${totalStaked} should equal totalPower ${totalPower}`,
    );

    // we know the reward for the block, and the proposer's bonus share. To
    // ensure that the allocation balances, we'll calculate each share rounding
    // down, then assign the excess to the proposer.
    const proposerShare = makeRatio(PROPOSER_SHARE, brand);
    const proposerReward = multiplyBy(rewardsAmount, proposerShare);
    const remainingReward = AmountMath.subtract(rewardsAmount, proposerReward);
    const validatorRatio = makeRatio(remainingReward.value, brand, totalStaked);

    const validatorRewards = [];
    let totalAssigned = AmountMath.makeEmpty(brand);
    validatorToPower.forEach(({ v, stake }) => {
      const reward = multiplyBy(AmountMath.make(stake, brand), validatorRatio);
      validatorRewards.push({ v, reward });
      totalAssigned = AmountMath.add(totalAssigned, reward);
    });
    // add the remainder to the end of the array for the proposer; split purse
    const proposerAmount = AmountMath.subtract(rewardsAmount, totalAssigned);
    validatorRewards.push({ v: proposerAddr, reward: proposerAmount });
    const payoutPurse = disburser.getRewardAllocation(rewardsAmount);
    const payments = await E(issuer).splitMany(
      payoutPurse,
      validatorRewards.map(({ _, reward }) => reward),
    );

    // separate out the proposer reward. payments is hardened, so can't use pop
    const proposerPayment = payments[payments.length - 1];
    const validatorPayments = payments.slice(0, payments.length - 1);

    validatorRewards
      .slice(0, validatorRewards.length - 1)
      .forEach(({ v }, index) => {
        toCosmos.rewards(validatorPayments[index], v.getValidatorID());
      });
    toCosmos.proposerReward(proposerAddr, proposerPayment);
  }

  /** @type {FromCosmos} */
  const apiFromCosmos = Far('Rewards API from Cosmos', {
    endBlock,
    createValidator,
    editValidator,
    delegate,
    undelegate,
    redelegate,
    validatorBonded,
    slash,
    validatorUnbonding,
    validatorDeleted,
  });

  return { apiFromCosmos };
}
