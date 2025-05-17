//@ts-nocheck
import {
  DecCoin,
  type DecCoinSDKType,
  Coin,
  type CoinSDKType,
} from '../../base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { Decimal } from '../../../decimals.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/** Params defines the set of params for the distribution module. */
export interface Params {
  communityTax: string;
  baseProposerReward: string;
  bonusProposerReward: string;
  withdrawAddrEnabled: boolean;
}
export interface ParamsProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.Params';
  value: Uint8Array;
}
/** Params defines the set of params for the distribution module. */
export interface ParamsSDKType {
  community_tax: string;
  base_proposer_reward: string;
  bonus_proposer_reward: string;
  withdraw_addr_enabled: boolean;
}
/**
 * ValidatorHistoricalRewards represents historical rewards for a validator.
 * Height is implicit within the store key.
 * Cumulative reward ratio is the sum from the zeroeth period
 * until this period of rewards / tokens, per the spec.
 * The reference count indicates the number of objects
 * which might need to reference this historical entry at any point.
 * ReferenceCount =
 *    number of outstanding delegations which ended the associated period (and
 *    might need to read that record)
 *  + number of slashes which ended the associated period (and might need to
 *  read that record)
 *  + one per validator for the zeroeth period, set on initialization
 */
export interface ValidatorHistoricalRewards {
  cumulativeRewardRatio: DecCoin[];
  referenceCount: number;
}
export interface ValidatorHistoricalRewardsProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.ValidatorHistoricalRewards';
  value: Uint8Array;
}
/**
 * ValidatorHistoricalRewards represents historical rewards for a validator.
 * Height is implicit within the store key.
 * Cumulative reward ratio is the sum from the zeroeth period
 * until this period of rewards / tokens, per the spec.
 * The reference count indicates the number of objects
 * which might need to reference this historical entry at any point.
 * ReferenceCount =
 *    number of outstanding delegations which ended the associated period (and
 *    might need to read that record)
 *  + number of slashes which ended the associated period (and might need to
 *  read that record)
 *  + one per validator for the zeroeth period, set on initialization
 */
export interface ValidatorHistoricalRewardsSDKType {
  cumulative_reward_ratio: DecCoinSDKType[];
  reference_count: number;
}
/**
 * ValidatorCurrentRewards represents current rewards and current
 * period for a validator kept as a running counter and incremented
 * each block as long as the validator's tokens remain constant.
 */
export interface ValidatorCurrentRewards {
  rewards: DecCoin[];
  period: bigint;
}
export interface ValidatorCurrentRewardsProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.ValidatorCurrentRewards';
  value: Uint8Array;
}
/**
 * ValidatorCurrentRewards represents current rewards and current
 * period for a validator kept as a running counter and incremented
 * each block as long as the validator's tokens remain constant.
 */
export interface ValidatorCurrentRewardsSDKType {
  rewards: DecCoinSDKType[];
  period: bigint;
}
/**
 * ValidatorAccumulatedCommission represents accumulated commission
 * for a validator kept as a running counter, can be withdrawn at any time.
 */
export interface ValidatorAccumulatedCommission {
  commission: DecCoin[];
}
export interface ValidatorAccumulatedCommissionProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.ValidatorAccumulatedCommission';
  value: Uint8Array;
}
/**
 * ValidatorAccumulatedCommission represents accumulated commission
 * for a validator kept as a running counter, can be withdrawn at any time.
 */
export interface ValidatorAccumulatedCommissionSDKType {
  commission: DecCoinSDKType[];
}
/**
 * ValidatorOutstandingRewards represents outstanding (un-withdrawn) rewards
 * for a validator inexpensive to track, allows simple sanity checks.
 */
export interface ValidatorOutstandingRewards {
  rewards: DecCoin[];
}
export interface ValidatorOutstandingRewardsProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.ValidatorOutstandingRewards';
  value: Uint8Array;
}
/**
 * ValidatorOutstandingRewards represents outstanding (un-withdrawn) rewards
 * for a validator inexpensive to track, allows simple sanity checks.
 */
export interface ValidatorOutstandingRewardsSDKType {
  rewards: DecCoinSDKType[];
}
/**
 * ValidatorSlashEvent represents a validator slash event.
 * Height is implicit within the store key.
 * This is needed to calculate appropriate amount of staking tokens
 * for delegations which are withdrawn after a slash has occurred.
 */
export interface ValidatorSlashEvent {
  validatorPeriod: bigint;
  fraction: string;
}
export interface ValidatorSlashEventProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.ValidatorSlashEvent';
  value: Uint8Array;
}
/**
 * ValidatorSlashEvent represents a validator slash event.
 * Height is implicit within the store key.
 * This is needed to calculate appropriate amount of staking tokens
 * for delegations which are withdrawn after a slash has occurred.
 */
export interface ValidatorSlashEventSDKType {
  validator_period: bigint;
  fraction: string;
}
/** ValidatorSlashEvents is a collection of ValidatorSlashEvent messages. */
export interface ValidatorSlashEvents {
  validatorSlashEvents: ValidatorSlashEvent[];
}
export interface ValidatorSlashEventsProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.ValidatorSlashEvents';
  value: Uint8Array;
}
/** ValidatorSlashEvents is a collection of ValidatorSlashEvent messages. */
export interface ValidatorSlashEventsSDKType {
  validator_slash_events: ValidatorSlashEventSDKType[];
}
/** FeePool is the global fee pool for distribution. */
export interface FeePool {
  communityPool: DecCoin[];
}
export interface FeePoolProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.FeePool';
  value: Uint8Array;
}
/** FeePool is the global fee pool for distribution. */
export interface FeePoolSDKType {
  community_pool: DecCoinSDKType[];
}
/**
 * CommunityPoolSpendProposal details a proposal for use of community funds,
 * together with how many coins are proposed to be spent, and to which
 * recipient account.
 */
export interface CommunityPoolSpendProposal {
  $typeUrl?: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal';
  title: string;
  description: string;
  recipient: string;
  amount: Coin[];
}
export interface CommunityPoolSpendProposalProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal';
  value: Uint8Array;
}
/**
 * CommunityPoolSpendProposal details a proposal for use of community funds,
 * together with how many coins are proposed to be spent, and to which
 * recipient account.
 */
export interface CommunityPoolSpendProposalSDKType {
  $typeUrl?: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal';
  title: string;
  description: string;
  recipient: string;
  amount: CoinSDKType[];
}
/**
 * DelegatorStartingInfo represents the starting info for a delegator reward
 * period. It tracks the previous validator period, the delegation's amount of
 * staking token, and the creation height (to check later on if any slashes have
 * occurred). NOTE: Even though validators are slashed to whole staking tokens,
 * the delegators within the validator may be left with less than a full token,
 * thus sdk.Dec is used.
 */
export interface DelegatorStartingInfo {
  previousPeriod: bigint;
  stake: string;
  height: bigint;
}
export interface DelegatorStartingInfoProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.DelegatorStartingInfo';
  value: Uint8Array;
}
/**
 * DelegatorStartingInfo represents the starting info for a delegator reward
 * period. It tracks the previous validator period, the delegation's amount of
 * staking token, and the creation height (to check later on if any slashes have
 * occurred). NOTE: Even though validators are slashed to whole staking tokens,
 * the delegators within the validator may be left with less than a full token,
 * thus sdk.Dec is used.
 */
export interface DelegatorStartingInfoSDKType {
  previous_period: bigint;
  stake: string;
  height: bigint;
}
/**
 * DelegationDelegatorReward represents the properties
 * of a delegator's delegation reward.
 */
export interface DelegationDelegatorReward {
  validatorAddress: string;
  reward: DecCoin[];
}
export interface DelegationDelegatorRewardProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.DelegationDelegatorReward';
  value: Uint8Array;
}
/**
 * DelegationDelegatorReward represents the properties
 * of a delegator's delegation reward.
 */
export interface DelegationDelegatorRewardSDKType {
  validator_address: string;
  reward: DecCoinSDKType[];
}
/**
 * CommunityPoolSpendProposalWithDeposit defines a CommunityPoolSpendProposal
 * with a deposit
 */
export interface CommunityPoolSpendProposalWithDeposit {
  $typeUrl?: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposalWithDeposit';
  title: string;
  description: string;
  recipient: string;
  amount: string;
  deposit: string;
}
export interface CommunityPoolSpendProposalWithDepositProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposalWithDeposit';
  value: Uint8Array;
}
/**
 * CommunityPoolSpendProposalWithDeposit defines a CommunityPoolSpendProposal
 * with a deposit
 */
export interface CommunityPoolSpendProposalWithDepositSDKType {
  $typeUrl?: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposalWithDeposit';
  title: string;
  description: string;
  recipient: string;
  amount: string;
  deposit: string;
}
function createBaseParams(): Params {
  return {
    communityTax: '',
    baseProposerReward: '',
    bonusProposerReward: '',
    withdrawAddrEnabled: false,
  };
}
export const Params = {
  typeUrl: '/cosmos.distribution.v1beta1.Params',
  encode(
    message: Params,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.communityTax !== '') {
      writer
        .uint32(10)
        .string(Decimal.fromUserInput(message.communityTax, 18).atomics);
    }
    if (message.baseProposerReward !== '') {
      writer
        .uint32(18)
        .string(Decimal.fromUserInput(message.baseProposerReward, 18).atomics);
    }
    if (message.bonusProposerReward !== '') {
      writer
        .uint32(26)
        .string(Decimal.fromUserInput(message.bonusProposerReward, 18).atomics);
    }
    if (message.withdrawAddrEnabled === true) {
      writer.uint32(32).bool(message.withdrawAddrEnabled);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Params {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.communityTax = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        case 2:
          message.baseProposerReward = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        case 3:
          message.bonusProposerReward = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        case 4:
          message.withdrawAddrEnabled = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Params {
    return {
      communityTax: isSet(object.communityTax)
        ? String(object.communityTax)
        : '',
      baseProposerReward: isSet(object.baseProposerReward)
        ? String(object.baseProposerReward)
        : '',
      bonusProposerReward: isSet(object.bonusProposerReward)
        ? String(object.bonusProposerReward)
        : '',
      withdrawAddrEnabled: isSet(object.withdrawAddrEnabled)
        ? Boolean(object.withdrawAddrEnabled)
        : false,
    };
  },
  toJSON(message: Params): JsonSafe<Params> {
    const obj: any = {};
    message.communityTax !== undefined &&
      (obj.communityTax = message.communityTax);
    message.baseProposerReward !== undefined &&
      (obj.baseProposerReward = message.baseProposerReward);
    message.bonusProposerReward !== undefined &&
      (obj.bonusProposerReward = message.bonusProposerReward);
    message.withdrawAddrEnabled !== undefined &&
      (obj.withdrawAddrEnabled = message.withdrawAddrEnabled);
    return obj;
  },
  fromPartial(object: Partial<Params>): Params {
    const message = createBaseParams();
    message.communityTax = object.communityTax ?? '';
    message.baseProposerReward = object.baseProposerReward ?? '';
    message.bonusProposerReward = object.bonusProposerReward ?? '';
    message.withdrawAddrEnabled = object.withdrawAddrEnabled ?? false;
    return message;
  },
  fromProtoMsg(message: ParamsProtoMsg): Params {
    return Params.decode(message.value);
  },
  toProto(message: Params): Uint8Array {
    return Params.encode(message).finish();
  },
  toProtoMsg(message: Params): ParamsProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.Params',
      value: Params.encode(message).finish(),
    };
  },
};
function createBaseValidatorHistoricalRewards(): ValidatorHistoricalRewards {
  return {
    cumulativeRewardRatio: [],
    referenceCount: 0,
  };
}
export const ValidatorHistoricalRewards = {
  typeUrl: '/cosmos.distribution.v1beta1.ValidatorHistoricalRewards',
  encode(
    message: ValidatorHistoricalRewards,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.cumulativeRewardRatio) {
      DecCoin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.referenceCount !== 0) {
      writer.uint32(16).uint32(message.referenceCount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ValidatorHistoricalRewards {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseValidatorHistoricalRewards();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.cumulativeRewardRatio.push(
            DecCoin.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.referenceCount = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ValidatorHistoricalRewards {
    return {
      cumulativeRewardRatio: Array.isArray(object?.cumulativeRewardRatio)
        ? object.cumulativeRewardRatio.map((e: any) => DecCoin.fromJSON(e))
        : [],
      referenceCount: isSet(object.referenceCount)
        ? Number(object.referenceCount)
        : 0,
    };
  },
  toJSON(
    message: ValidatorHistoricalRewards,
  ): JsonSafe<ValidatorHistoricalRewards> {
    const obj: any = {};
    if (message.cumulativeRewardRatio) {
      obj.cumulativeRewardRatio = message.cumulativeRewardRatio.map(e =>
        e ? DecCoin.toJSON(e) : undefined,
      );
    } else {
      obj.cumulativeRewardRatio = [];
    }
    message.referenceCount !== undefined &&
      (obj.referenceCount = Math.round(message.referenceCount));
    return obj;
  },
  fromPartial(
    object: Partial<ValidatorHistoricalRewards>,
  ): ValidatorHistoricalRewards {
    const message = createBaseValidatorHistoricalRewards();
    message.cumulativeRewardRatio =
      object.cumulativeRewardRatio?.map(e => DecCoin.fromPartial(e)) || [];
    message.referenceCount = object.referenceCount ?? 0;
    return message;
  },
  fromProtoMsg(
    message: ValidatorHistoricalRewardsProtoMsg,
  ): ValidatorHistoricalRewards {
    return ValidatorHistoricalRewards.decode(message.value);
  },
  toProto(message: ValidatorHistoricalRewards): Uint8Array {
    return ValidatorHistoricalRewards.encode(message).finish();
  },
  toProtoMsg(
    message: ValidatorHistoricalRewards,
  ): ValidatorHistoricalRewardsProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.ValidatorHistoricalRewards',
      value: ValidatorHistoricalRewards.encode(message).finish(),
    };
  },
};
function createBaseValidatorCurrentRewards(): ValidatorCurrentRewards {
  return {
    rewards: [],
    period: BigInt(0),
  };
}
export const ValidatorCurrentRewards = {
  typeUrl: '/cosmos.distribution.v1beta1.ValidatorCurrentRewards',
  encode(
    message: ValidatorCurrentRewards,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.rewards) {
      DecCoin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.period !== BigInt(0)) {
      writer.uint32(16).uint64(message.period);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ValidatorCurrentRewards {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseValidatorCurrentRewards();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.rewards.push(DecCoin.decode(reader, reader.uint32()));
          break;
        case 2:
          message.period = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ValidatorCurrentRewards {
    return {
      rewards: Array.isArray(object?.rewards)
        ? object.rewards.map((e: any) => DecCoin.fromJSON(e))
        : [],
      period: isSet(object.period)
        ? BigInt(object.period.toString())
        : BigInt(0),
    };
  },
  toJSON(message: ValidatorCurrentRewards): JsonSafe<ValidatorCurrentRewards> {
    const obj: any = {};
    if (message.rewards) {
      obj.rewards = message.rewards.map(e =>
        e ? DecCoin.toJSON(e) : undefined,
      );
    } else {
      obj.rewards = [];
    }
    message.period !== undefined &&
      (obj.period = (message.period || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<ValidatorCurrentRewards>,
  ): ValidatorCurrentRewards {
    const message = createBaseValidatorCurrentRewards();
    message.rewards = object.rewards?.map(e => DecCoin.fromPartial(e)) || [];
    message.period =
      object.period !== undefined && object.period !== null
        ? BigInt(object.period.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: ValidatorCurrentRewardsProtoMsg,
  ): ValidatorCurrentRewards {
    return ValidatorCurrentRewards.decode(message.value);
  },
  toProto(message: ValidatorCurrentRewards): Uint8Array {
    return ValidatorCurrentRewards.encode(message).finish();
  },
  toProtoMsg(
    message: ValidatorCurrentRewards,
  ): ValidatorCurrentRewardsProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.ValidatorCurrentRewards',
      value: ValidatorCurrentRewards.encode(message).finish(),
    };
  },
};
function createBaseValidatorAccumulatedCommission(): ValidatorAccumulatedCommission {
  return {
    commission: [],
  };
}
export const ValidatorAccumulatedCommission = {
  typeUrl: '/cosmos.distribution.v1beta1.ValidatorAccumulatedCommission',
  encode(
    message: ValidatorAccumulatedCommission,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.commission) {
      DecCoin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ValidatorAccumulatedCommission {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseValidatorAccumulatedCommission();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.commission.push(DecCoin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ValidatorAccumulatedCommission {
    return {
      commission: Array.isArray(object?.commission)
        ? object.commission.map((e: any) => DecCoin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: ValidatorAccumulatedCommission,
  ): JsonSafe<ValidatorAccumulatedCommission> {
    const obj: any = {};
    if (message.commission) {
      obj.commission = message.commission.map(e =>
        e ? DecCoin.toJSON(e) : undefined,
      );
    } else {
      obj.commission = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<ValidatorAccumulatedCommission>,
  ): ValidatorAccumulatedCommission {
    const message = createBaseValidatorAccumulatedCommission();
    message.commission =
      object.commission?.map(e => DecCoin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: ValidatorAccumulatedCommissionProtoMsg,
  ): ValidatorAccumulatedCommission {
    return ValidatorAccumulatedCommission.decode(message.value);
  },
  toProto(message: ValidatorAccumulatedCommission): Uint8Array {
    return ValidatorAccumulatedCommission.encode(message).finish();
  },
  toProtoMsg(
    message: ValidatorAccumulatedCommission,
  ): ValidatorAccumulatedCommissionProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.ValidatorAccumulatedCommission',
      value: ValidatorAccumulatedCommission.encode(message).finish(),
    };
  },
};
function createBaseValidatorOutstandingRewards(): ValidatorOutstandingRewards {
  return {
    rewards: [],
  };
}
export const ValidatorOutstandingRewards = {
  typeUrl: '/cosmos.distribution.v1beta1.ValidatorOutstandingRewards',
  encode(
    message: ValidatorOutstandingRewards,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.rewards) {
      DecCoin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ValidatorOutstandingRewards {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseValidatorOutstandingRewards();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.rewards.push(DecCoin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ValidatorOutstandingRewards {
    return {
      rewards: Array.isArray(object?.rewards)
        ? object.rewards.map((e: any) => DecCoin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: ValidatorOutstandingRewards,
  ): JsonSafe<ValidatorOutstandingRewards> {
    const obj: any = {};
    if (message.rewards) {
      obj.rewards = message.rewards.map(e =>
        e ? DecCoin.toJSON(e) : undefined,
      );
    } else {
      obj.rewards = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<ValidatorOutstandingRewards>,
  ): ValidatorOutstandingRewards {
    const message = createBaseValidatorOutstandingRewards();
    message.rewards = object.rewards?.map(e => DecCoin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: ValidatorOutstandingRewardsProtoMsg,
  ): ValidatorOutstandingRewards {
    return ValidatorOutstandingRewards.decode(message.value);
  },
  toProto(message: ValidatorOutstandingRewards): Uint8Array {
    return ValidatorOutstandingRewards.encode(message).finish();
  },
  toProtoMsg(
    message: ValidatorOutstandingRewards,
  ): ValidatorOutstandingRewardsProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.ValidatorOutstandingRewards',
      value: ValidatorOutstandingRewards.encode(message).finish(),
    };
  },
};
function createBaseValidatorSlashEvent(): ValidatorSlashEvent {
  return {
    validatorPeriod: BigInt(0),
    fraction: '',
  };
}
export const ValidatorSlashEvent = {
  typeUrl: '/cosmos.distribution.v1beta1.ValidatorSlashEvent',
  encode(
    message: ValidatorSlashEvent,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.validatorPeriod !== BigInt(0)) {
      writer.uint32(8).uint64(message.validatorPeriod);
    }
    if (message.fraction !== '') {
      writer
        .uint32(18)
        .string(Decimal.fromUserInput(message.fraction, 18).atomics);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ValidatorSlashEvent {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseValidatorSlashEvent();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.validatorPeriod = reader.uint64();
          break;
        case 2:
          message.fraction = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ValidatorSlashEvent {
    return {
      validatorPeriod: isSet(object.validatorPeriod)
        ? BigInt(object.validatorPeriod.toString())
        : BigInt(0),
      fraction: isSet(object.fraction) ? String(object.fraction) : '',
    };
  },
  toJSON(message: ValidatorSlashEvent): JsonSafe<ValidatorSlashEvent> {
    const obj: any = {};
    message.validatorPeriod !== undefined &&
      (obj.validatorPeriod = (message.validatorPeriod || BigInt(0)).toString());
    message.fraction !== undefined && (obj.fraction = message.fraction);
    return obj;
  },
  fromPartial(object: Partial<ValidatorSlashEvent>): ValidatorSlashEvent {
    const message = createBaseValidatorSlashEvent();
    message.validatorPeriod =
      object.validatorPeriod !== undefined && object.validatorPeriod !== null
        ? BigInt(object.validatorPeriod.toString())
        : BigInt(0);
    message.fraction = object.fraction ?? '';
    return message;
  },
  fromProtoMsg(message: ValidatorSlashEventProtoMsg): ValidatorSlashEvent {
    return ValidatorSlashEvent.decode(message.value);
  },
  toProto(message: ValidatorSlashEvent): Uint8Array {
    return ValidatorSlashEvent.encode(message).finish();
  },
  toProtoMsg(message: ValidatorSlashEvent): ValidatorSlashEventProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.ValidatorSlashEvent',
      value: ValidatorSlashEvent.encode(message).finish(),
    };
  },
};
function createBaseValidatorSlashEvents(): ValidatorSlashEvents {
  return {
    validatorSlashEvents: [],
  };
}
export const ValidatorSlashEvents = {
  typeUrl: '/cosmos.distribution.v1beta1.ValidatorSlashEvents',
  encode(
    message: ValidatorSlashEvents,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.validatorSlashEvents) {
      ValidatorSlashEvent.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ValidatorSlashEvents {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseValidatorSlashEvents();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.validatorSlashEvents.push(
            ValidatorSlashEvent.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ValidatorSlashEvents {
    return {
      validatorSlashEvents: Array.isArray(object?.validatorSlashEvents)
        ? object.validatorSlashEvents.map((e: any) =>
            ValidatorSlashEvent.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: ValidatorSlashEvents): JsonSafe<ValidatorSlashEvents> {
    const obj: any = {};
    if (message.validatorSlashEvents) {
      obj.validatorSlashEvents = message.validatorSlashEvents.map(e =>
        e ? ValidatorSlashEvent.toJSON(e) : undefined,
      );
    } else {
      obj.validatorSlashEvents = [];
    }
    return obj;
  },
  fromPartial(object: Partial<ValidatorSlashEvents>): ValidatorSlashEvents {
    const message = createBaseValidatorSlashEvents();
    message.validatorSlashEvents =
      object.validatorSlashEvents?.map(e =>
        ValidatorSlashEvent.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(message: ValidatorSlashEventsProtoMsg): ValidatorSlashEvents {
    return ValidatorSlashEvents.decode(message.value);
  },
  toProto(message: ValidatorSlashEvents): Uint8Array {
    return ValidatorSlashEvents.encode(message).finish();
  },
  toProtoMsg(message: ValidatorSlashEvents): ValidatorSlashEventsProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.ValidatorSlashEvents',
      value: ValidatorSlashEvents.encode(message).finish(),
    };
  },
};
function createBaseFeePool(): FeePool {
  return {
    communityPool: [],
  };
}
export const FeePool = {
  typeUrl: '/cosmos.distribution.v1beta1.FeePool',
  encode(
    message: FeePool,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.communityPool) {
      DecCoin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): FeePool {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFeePool();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.communityPool.push(DecCoin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): FeePool {
    return {
      communityPool: Array.isArray(object?.communityPool)
        ? object.communityPool.map((e: any) => DecCoin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: FeePool): JsonSafe<FeePool> {
    const obj: any = {};
    if (message.communityPool) {
      obj.communityPool = message.communityPool.map(e =>
        e ? DecCoin.toJSON(e) : undefined,
      );
    } else {
      obj.communityPool = [];
    }
    return obj;
  },
  fromPartial(object: Partial<FeePool>): FeePool {
    const message = createBaseFeePool();
    message.communityPool =
      object.communityPool?.map(e => DecCoin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: FeePoolProtoMsg): FeePool {
    return FeePool.decode(message.value);
  },
  toProto(message: FeePool): Uint8Array {
    return FeePool.encode(message).finish();
  },
  toProtoMsg(message: FeePool): FeePoolProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.FeePool',
      value: FeePool.encode(message).finish(),
    };
  },
};
function createBaseCommunityPoolSpendProposal(): CommunityPoolSpendProposal {
  return {
    $typeUrl: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal',
    title: '',
    description: '',
    recipient: '',
    amount: [],
  };
}
export const CommunityPoolSpendProposal = {
  typeUrl: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal',
  encode(
    message: CommunityPoolSpendProposal,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.title !== '') {
      writer.uint32(10).string(message.title);
    }
    if (message.description !== '') {
      writer.uint32(18).string(message.description);
    }
    if (message.recipient !== '') {
      writer.uint32(26).string(message.recipient);
    }
    for (const v of message.amount) {
      Coin.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): CommunityPoolSpendProposal {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCommunityPoolSpendProposal();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.title = reader.string();
          break;
        case 2:
          message.description = reader.string();
          break;
        case 3:
          message.recipient = reader.string();
          break;
        case 4:
          message.amount.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): CommunityPoolSpendProposal {
    return {
      title: isSet(object.title) ? String(object.title) : '',
      description: isSet(object.description) ? String(object.description) : '',
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
      amount: Array.isArray(object?.amount)
        ? object.amount.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: CommunityPoolSpendProposal,
  ): JsonSafe<CommunityPoolSpendProposal> {
    const obj: any = {};
    message.title !== undefined && (obj.title = message.title);
    message.description !== undefined &&
      (obj.description = message.description);
    message.recipient !== undefined && (obj.recipient = message.recipient);
    if (message.amount) {
      obj.amount = message.amount.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.amount = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<CommunityPoolSpendProposal>,
  ): CommunityPoolSpendProposal {
    const message = createBaseCommunityPoolSpendProposal();
    message.title = object.title ?? '';
    message.description = object.description ?? '';
    message.recipient = object.recipient ?? '';
    message.amount = object.amount?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: CommunityPoolSpendProposalProtoMsg,
  ): CommunityPoolSpendProposal {
    return CommunityPoolSpendProposal.decode(message.value);
  },
  toProto(message: CommunityPoolSpendProposal): Uint8Array {
    return CommunityPoolSpendProposal.encode(message).finish();
  },
  toProtoMsg(
    message: CommunityPoolSpendProposal,
  ): CommunityPoolSpendProposalProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposal',
      value: CommunityPoolSpendProposal.encode(message).finish(),
    };
  },
};
function createBaseDelegatorStartingInfo(): DelegatorStartingInfo {
  return {
    previousPeriod: BigInt(0),
    stake: '',
    height: BigInt(0),
  };
}
export const DelegatorStartingInfo = {
  typeUrl: '/cosmos.distribution.v1beta1.DelegatorStartingInfo',
  encode(
    message: DelegatorStartingInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.previousPeriod !== BigInt(0)) {
      writer.uint32(8).uint64(message.previousPeriod);
    }
    if (message.stake !== '') {
      writer
        .uint32(18)
        .string(Decimal.fromUserInput(message.stake, 18).atomics);
    }
    if (message.height !== BigInt(0)) {
      writer.uint32(24).uint64(message.height);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): DelegatorStartingInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDelegatorStartingInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.previousPeriod = reader.uint64();
          break;
        case 2:
          message.stake = Decimal.fromAtomics(reader.string(), 18).toString();
          break;
        case 3:
          message.height = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DelegatorStartingInfo {
    return {
      previousPeriod: isSet(object.previousPeriod)
        ? BigInt(object.previousPeriod.toString())
        : BigInt(0),
      stake: isSet(object.stake) ? String(object.stake) : '',
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
    };
  },
  toJSON(message: DelegatorStartingInfo): JsonSafe<DelegatorStartingInfo> {
    const obj: any = {};
    message.previousPeriod !== undefined &&
      (obj.previousPeriod = (message.previousPeriod || BigInt(0)).toString());
    message.stake !== undefined && (obj.stake = message.stake);
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<DelegatorStartingInfo>): DelegatorStartingInfo {
    const message = createBaseDelegatorStartingInfo();
    message.previousPeriod =
      object.previousPeriod !== undefined && object.previousPeriod !== null
        ? BigInt(object.previousPeriod.toString())
        : BigInt(0);
    message.stake = object.stake ?? '';
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: DelegatorStartingInfoProtoMsg): DelegatorStartingInfo {
    return DelegatorStartingInfo.decode(message.value);
  },
  toProto(message: DelegatorStartingInfo): Uint8Array {
    return DelegatorStartingInfo.encode(message).finish();
  },
  toProtoMsg(message: DelegatorStartingInfo): DelegatorStartingInfoProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.DelegatorStartingInfo',
      value: DelegatorStartingInfo.encode(message).finish(),
    };
  },
};
function createBaseDelegationDelegatorReward(): DelegationDelegatorReward {
  return {
    validatorAddress: '',
    reward: [],
  };
}
export const DelegationDelegatorReward = {
  typeUrl: '/cosmos.distribution.v1beta1.DelegationDelegatorReward',
  encode(
    message: DelegationDelegatorReward,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.validatorAddress !== '') {
      writer.uint32(10).string(message.validatorAddress);
    }
    for (const v of message.reward) {
      DecCoin.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): DelegationDelegatorReward {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDelegationDelegatorReward();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.validatorAddress = reader.string();
          break;
        case 2:
          message.reward.push(DecCoin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DelegationDelegatorReward {
    return {
      validatorAddress: isSet(object.validatorAddress)
        ? String(object.validatorAddress)
        : '',
      reward: Array.isArray(object?.reward)
        ? object.reward.map((e: any) => DecCoin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: DelegationDelegatorReward,
  ): JsonSafe<DelegationDelegatorReward> {
    const obj: any = {};
    message.validatorAddress !== undefined &&
      (obj.validatorAddress = message.validatorAddress);
    if (message.reward) {
      obj.reward = message.reward.map(e => (e ? DecCoin.toJSON(e) : undefined));
    } else {
      obj.reward = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<DelegationDelegatorReward>,
  ): DelegationDelegatorReward {
    const message = createBaseDelegationDelegatorReward();
    message.validatorAddress = object.validatorAddress ?? '';
    message.reward = object.reward?.map(e => DecCoin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: DelegationDelegatorRewardProtoMsg,
  ): DelegationDelegatorReward {
    return DelegationDelegatorReward.decode(message.value);
  },
  toProto(message: DelegationDelegatorReward): Uint8Array {
    return DelegationDelegatorReward.encode(message).finish();
  },
  toProtoMsg(
    message: DelegationDelegatorReward,
  ): DelegationDelegatorRewardProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.DelegationDelegatorReward',
      value: DelegationDelegatorReward.encode(message).finish(),
    };
  },
};
function createBaseCommunityPoolSpendProposalWithDeposit(): CommunityPoolSpendProposalWithDeposit {
  return {
    $typeUrl:
      '/cosmos.distribution.v1beta1.CommunityPoolSpendProposalWithDeposit',
    title: '',
    description: '',
    recipient: '',
    amount: '',
    deposit: '',
  };
}
export const CommunityPoolSpendProposalWithDeposit = {
  typeUrl: '/cosmos.distribution.v1beta1.CommunityPoolSpendProposalWithDeposit',
  encode(
    message: CommunityPoolSpendProposalWithDeposit,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.title !== '') {
      writer.uint32(10).string(message.title);
    }
    if (message.description !== '') {
      writer.uint32(18).string(message.description);
    }
    if (message.recipient !== '') {
      writer.uint32(26).string(message.recipient);
    }
    if (message.amount !== '') {
      writer.uint32(34).string(message.amount);
    }
    if (message.deposit !== '') {
      writer.uint32(42).string(message.deposit);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): CommunityPoolSpendProposalWithDeposit {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCommunityPoolSpendProposalWithDeposit();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.title = reader.string();
          break;
        case 2:
          message.description = reader.string();
          break;
        case 3:
          message.recipient = reader.string();
          break;
        case 4:
          message.amount = reader.string();
          break;
        case 5:
          message.deposit = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): CommunityPoolSpendProposalWithDeposit {
    return {
      title: isSet(object.title) ? String(object.title) : '',
      description: isSet(object.description) ? String(object.description) : '',
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
      amount: isSet(object.amount) ? String(object.amount) : '',
      deposit: isSet(object.deposit) ? String(object.deposit) : '',
    };
  },
  toJSON(
    message: CommunityPoolSpendProposalWithDeposit,
  ): JsonSafe<CommunityPoolSpendProposalWithDeposit> {
    const obj: any = {};
    message.title !== undefined && (obj.title = message.title);
    message.description !== undefined &&
      (obj.description = message.description);
    message.recipient !== undefined && (obj.recipient = message.recipient);
    message.amount !== undefined && (obj.amount = message.amount);
    message.deposit !== undefined && (obj.deposit = message.deposit);
    return obj;
  },
  fromPartial(
    object: Partial<CommunityPoolSpendProposalWithDeposit>,
  ): CommunityPoolSpendProposalWithDeposit {
    const message = createBaseCommunityPoolSpendProposalWithDeposit();
    message.title = object.title ?? '';
    message.description = object.description ?? '';
    message.recipient = object.recipient ?? '';
    message.amount = object.amount ?? '';
    message.deposit = object.deposit ?? '';
    return message;
  },
  fromProtoMsg(
    message: CommunityPoolSpendProposalWithDepositProtoMsg,
  ): CommunityPoolSpendProposalWithDeposit {
    return CommunityPoolSpendProposalWithDeposit.decode(message.value);
  },
  toProto(message: CommunityPoolSpendProposalWithDeposit): Uint8Array {
    return CommunityPoolSpendProposalWithDeposit.encode(message).finish();
  },
  toProtoMsg(
    message: CommunityPoolSpendProposalWithDeposit,
  ): CommunityPoolSpendProposalWithDepositProtoMsg {
    return {
      typeUrl:
        '/cosmos.distribution.v1beta1.CommunityPoolSpendProposalWithDeposit',
      value: CommunityPoolSpendProposalWithDeposit.encode(message).finish(),
    };
  },
};
