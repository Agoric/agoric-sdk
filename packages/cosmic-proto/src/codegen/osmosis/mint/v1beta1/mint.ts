//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { Decimal } from '@cosmjs/math';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/** Minter represents the minting state. */
export interface Minter {
  /** epoch_provisions represent rewards for the current epoch. */
  epochProvisions: string;
}
export interface MinterProtoMsg {
  typeUrl: '/osmosis.mint.v1beta1.Minter';
  value: Uint8Array;
}
/** Minter represents the minting state. */
export interface MinterSDKType {
  epoch_provisions: string;
}
/**
 * WeightedAddress represents an address with a weight assigned to it.
 * The weight is used to determine the proportion of the total minted
 * tokens to be minted to the address.
 */
export interface WeightedAddress {
  address: string;
  weight: string;
}
export interface WeightedAddressProtoMsg {
  typeUrl: '/osmosis.mint.v1beta1.WeightedAddress';
  value: Uint8Array;
}
/**
 * WeightedAddress represents an address with a weight assigned to it.
 * The weight is used to determine the proportion of the total minted
 * tokens to be minted to the address.
 */
export interface WeightedAddressSDKType {
  address: string;
  weight: string;
}
/**
 * DistributionProportions defines the distribution proportions of the minted
 * denom. In other words, defines which stakeholders will receive the minted
 * denoms and how much.
 */
export interface DistributionProportions {
  /**
   * staking defines the proportion of the minted mint_denom that is to be
   * allocated as staking rewards.
   */
  staking: string;
  /**
   * pool_incentives defines the proportion of the minted mint_denom that is
   * to be allocated as pool incentives.
   */
  poolIncentives: string;
  /**
   * developer_rewards defines the proportion of the minted mint_denom that is
   * to be allocated to developer rewards address.
   */
  developerRewards: string;
  /**
   * community_pool defines the proportion of the minted mint_denom that is
   * to be allocated to the community pool.
   */
  communityPool: string;
}
export interface DistributionProportionsProtoMsg {
  typeUrl: '/osmosis.mint.v1beta1.DistributionProportions';
  value: Uint8Array;
}
/**
 * DistributionProportions defines the distribution proportions of the minted
 * denom. In other words, defines which stakeholders will receive the minted
 * denoms and how much.
 */
export interface DistributionProportionsSDKType {
  staking: string;
  pool_incentives: string;
  developer_rewards: string;
  community_pool: string;
}
/** Params holds parameters for the x/mint module. */
export interface Params {
  /** mint_denom is the denom of the coin to mint. */
  mintDenom: string;
  /** genesis_epoch_provisions epoch provisions from the first epoch. */
  genesisEpochProvisions: string;
  /** epoch_identifier mint epoch identifier e.g. (day, week). */
  epochIdentifier: string;
  /**
   * reduction_period_in_epochs the number of epochs it takes
   * to reduce the rewards.
   */
  reductionPeriodInEpochs: bigint;
  /**
   * reduction_factor is the reduction multiplier to execute
   * at the end of each period set by reduction_period_in_epochs.
   */
  reductionFactor: string;
  /**
   * distribution_proportions defines the distribution proportions of the minted
   * denom. In other words, defines which stakeholders will receive the minted
   * denoms and how much.
   */
  distributionProportions: DistributionProportions;
  /**
   * weighted_developer_rewards_receivers is the address to receive developer
   * rewards with weights assignedt to each address. The final amount that each
   * address receives is: epoch_provisions *
   * distribution_proportions.developer_rewards * Address's Weight.
   */
  weightedDeveloperRewardsReceivers: WeightedAddress[];
  /**
   * minting_rewards_distribution_start_epoch start epoch to distribute minting
   * rewards
   */
  mintingRewardsDistributionStartEpoch: bigint;
}
export interface ParamsProtoMsg {
  typeUrl: '/osmosis.mint.v1beta1.Params';
  value: Uint8Array;
}
/** Params holds parameters for the x/mint module. */
export interface ParamsSDKType {
  mint_denom: string;
  genesis_epoch_provisions: string;
  epoch_identifier: string;
  reduction_period_in_epochs: bigint;
  reduction_factor: string;
  distribution_proportions: DistributionProportionsSDKType;
  weighted_developer_rewards_receivers: WeightedAddressSDKType[];
  minting_rewards_distribution_start_epoch: bigint;
}
function createBaseMinter(): Minter {
  return {
    epochProvisions: '',
  };
}
export const Minter = {
  typeUrl: '/osmosis.mint.v1beta1.Minter',
  encode(
    message: Minter,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.epochProvisions !== '') {
      writer
        .uint32(10)
        .string(Decimal.fromUserInput(message.epochProvisions, 18).atomics);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Minter {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMinter();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.epochProvisions = Decimal.fromAtomics(
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
  fromJSON(object: any): Minter {
    return {
      epochProvisions: isSet(object.epochProvisions)
        ? String(object.epochProvisions)
        : '',
    };
  },
  toJSON(message: Minter): JsonSafe<Minter> {
    const obj: any = {};
    message.epochProvisions !== undefined &&
      (obj.epochProvisions = message.epochProvisions);
    return obj;
  },
  fromPartial(object: Partial<Minter>): Minter {
    const message = createBaseMinter();
    message.epochProvisions = object.epochProvisions ?? '';
    return message;
  },
  fromProtoMsg(message: MinterProtoMsg): Minter {
    return Minter.decode(message.value);
  },
  toProto(message: Minter): Uint8Array {
    return Minter.encode(message).finish();
  },
  toProtoMsg(message: Minter): MinterProtoMsg {
    return {
      typeUrl: '/osmosis.mint.v1beta1.Minter',
      value: Minter.encode(message).finish(),
    };
  },
};
function createBaseWeightedAddress(): WeightedAddress {
  return {
    address: '',
    weight: '',
  };
}
export const WeightedAddress = {
  typeUrl: '/osmosis.mint.v1beta1.WeightedAddress',
  encode(
    message: WeightedAddress,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address !== '') {
      writer.uint32(10).string(message.address);
    }
    if (message.weight !== '') {
      writer
        .uint32(18)
        .string(Decimal.fromUserInput(message.weight, 18).atomics);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): WeightedAddress {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseWeightedAddress();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        case 2:
          message.weight = Decimal.fromAtomics(reader.string(), 18).toString();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): WeightedAddress {
    return {
      address: isSet(object.address) ? String(object.address) : '',
      weight: isSet(object.weight) ? String(object.weight) : '',
    };
  },
  toJSON(message: WeightedAddress): JsonSafe<WeightedAddress> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    message.weight !== undefined && (obj.weight = message.weight);
    return obj;
  },
  fromPartial(object: Partial<WeightedAddress>): WeightedAddress {
    const message = createBaseWeightedAddress();
    message.address = object.address ?? '';
    message.weight = object.weight ?? '';
    return message;
  },
  fromProtoMsg(message: WeightedAddressProtoMsg): WeightedAddress {
    return WeightedAddress.decode(message.value);
  },
  toProto(message: WeightedAddress): Uint8Array {
    return WeightedAddress.encode(message).finish();
  },
  toProtoMsg(message: WeightedAddress): WeightedAddressProtoMsg {
    return {
      typeUrl: '/osmosis.mint.v1beta1.WeightedAddress',
      value: WeightedAddress.encode(message).finish(),
    };
  },
};
function createBaseDistributionProportions(): DistributionProportions {
  return {
    staking: '',
    poolIncentives: '',
    developerRewards: '',
    communityPool: '',
  };
}
export const DistributionProportions = {
  typeUrl: '/osmosis.mint.v1beta1.DistributionProportions',
  encode(
    message: DistributionProportions,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.staking !== '') {
      writer
        .uint32(10)
        .string(Decimal.fromUserInput(message.staking, 18).atomics);
    }
    if (message.poolIncentives !== '') {
      writer
        .uint32(18)
        .string(Decimal.fromUserInput(message.poolIncentives, 18).atomics);
    }
    if (message.developerRewards !== '') {
      writer
        .uint32(26)
        .string(Decimal.fromUserInput(message.developerRewards, 18).atomics);
    }
    if (message.communityPool !== '') {
      writer
        .uint32(34)
        .string(Decimal.fromUserInput(message.communityPool, 18).atomics);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): DistributionProportions {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDistributionProportions();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.staking = Decimal.fromAtomics(reader.string(), 18).toString();
          break;
        case 2:
          message.poolIncentives = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        case 3:
          message.developerRewards = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        case 4:
          message.communityPool = Decimal.fromAtomics(
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
  fromJSON(object: any): DistributionProportions {
    return {
      staking: isSet(object.staking) ? String(object.staking) : '',
      poolIncentives: isSet(object.poolIncentives)
        ? String(object.poolIncentives)
        : '',
      developerRewards: isSet(object.developerRewards)
        ? String(object.developerRewards)
        : '',
      communityPool: isSet(object.communityPool)
        ? String(object.communityPool)
        : '',
    };
  },
  toJSON(message: DistributionProportions): JsonSafe<DistributionProportions> {
    const obj: any = {};
    message.staking !== undefined && (obj.staking = message.staking);
    message.poolIncentives !== undefined &&
      (obj.poolIncentives = message.poolIncentives);
    message.developerRewards !== undefined &&
      (obj.developerRewards = message.developerRewards);
    message.communityPool !== undefined &&
      (obj.communityPool = message.communityPool);
    return obj;
  },
  fromPartial(
    object: Partial<DistributionProportions>,
  ): DistributionProportions {
    const message = createBaseDistributionProportions();
    message.staking = object.staking ?? '';
    message.poolIncentives = object.poolIncentives ?? '';
    message.developerRewards = object.developerRewards ?? '';
    message.communityPool = object.communityPool ?? '';
    return message;
  },
  fromProtoMsg(
    message: DistributionProportionsProtoMsg,
  ): DistributionProportions {
    return DistributionProportions.decode(message.value);
  },
  toProto(message: DistributionProportions): Uint8Array {
    return DistributionProportions.encode(message).finish();
  },
  toProtoMsg(
    message: DistributionProportions,
  ): DistributionProportionsProtoMsg {
    return {
      typeUrl: '/osmosis.mint.v1beta1.DistributionProportions',
      value: DistributionProportions.encode(message).finish(),
    };
  },
};
function createBaseParams(): Params {
  return {
    mintDenom: '',
    genesisEpochProvisions: '',
    epochIdentifier: '',
    reductionPeriodInEpochs: BigInt(0),
    reductionFactor: '',
    distributionProportions: DistributionProportions.fromPartial({}),
    weightedDeveloperRewardsReceivers: [],
    mintingRewardsDistributionStartEpoch: BigInt(0),
  };
}
export const Params = {
  typeUrl: '/osmosis.mint.v1beta1.Params',
  encode(
    message: Params,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.mintDenom !== '') {
      writer.uint32(10).string(message.mintDenom);
    }
    if (message.genesisEpochProvisions !== '') {
      writer
        .uint32(18)
        .string(
          Decimal.fromUserInput(message.genesisEpochProvisions, 18).atomics,
        );
    }
    if (message.epochIdentifier !== '') {
      writer.uint32(26).string(message.epochIdentifier);
    }
    if (message.reductionPeriodInEpochs !== BigInt(0)) {
      writer.uint32(32).int64(message.reductionPeriodInEpochs);
    }
    if (message.reductionFactor !== '') {
      writer
        .uint32(42)
        .string(Decimal.fromUserInput(message.reductionFactor, 18).atomics);
    }
    if (message.distributionProportions !== undefined) {
      DistributionProportions.encode(
        message.distributionProportions,
        writer.uint32(50).fork(),
      ).ldelim();
    }
    for (const v of message.weightedDeveloperRewardsReceivers) {
      WeightedAddress.encode(v!, writer.uint32(58).fork()).ldelim();
    }
    if (message.mintingRewardsDistributionStartEpoch !== BigInt(0)) {
      writer.uint32(64).int64(message.mintingRewardsDistributionStartEpoch);
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
          message.mintDenom = reader.string();
          break;
        case 2:
          message.genesisEpochProvisions = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        case 3:
          message.epochIdentifier = reader.string();
          break;
        case 4:
          message.reductionPeriodInEpochs = reader.int64();
          break;
        case 5:
          message.reductionFactor = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        case 6:
          message.distributionProportions = DistributionProportions.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 7:
          message.weightedDeveloperRewardsReceivers.push(
            WeightedAddress.decode(reader, reader.uint32()),
          );
          break;
        case 8:
          message.mintingRewardsDistributionStartEpoch = reader.int64();
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
      mintDenom: isSet(object.mintDenom) ? String(object.mintDenom) : '',
      genesisEpochProvisions: isSet(object.genesisEpochProvisions)
        ? String(object.genesisEpochProvisions)
        : '',
      epochIdentifier: isSet(object.epochIdentifier)
        ? String(object.epochIdentifier)
        : '',
      reductionPeriodInEpochs: isSet(object.reductionPeriodInEpochs)
        ? BigInt(object.reductionPeriodInEpochs.toString())
        : BigInt(0),
      reductionFactor: isSet(object.reductionFactor)
        ? String(object.reductionFactor)
        : '',
      distributionProportions: isSet(object.distributionProportions)
        ? DistributionProportions.fromJSON(object.distributionProportions)
        : undefined,
      weightedDeveloperRewardsReceivers: Array.isArray(
        object?.weightedDeveloperRewardsReceivers,
      )
        ? object.weightedDeveloperRewardsReceivers.map((e: any) =>
            WeightedAddress.fromJSON(e),
          )
        : [],
      mintingRewardsDistributionStartEpoch: isSet(
        object.mintingRewardsDistributionStartEpoch,
      )
        ? BigInt(object.mintingRewardsDistributionStartEpoch.toString())
        : BigInt(0),
    };
  },
  toJSON(message: Params): JsonSafe<Params> {
    const obj: any = {};
    message.mintDenom !== undefined && (obj.mintDenom = message.mintDenom);
    message.genesisEpochProvisions !== undefined &&
      (obj.genesisEpochProvisions = message.genesisEpochProvisions);
    message.epochIdentifier !== undefined &&
      (obj.epochIdentifier = message.epochIdentifier);
    message.reductionPeriodInEpochs !== undefined &&
      (obj.reductionPeriodInEpochs = (
        message.reductionPeriodInEpochs || BigInt(0)
      ).toString());
    message.reductionFactor !== undefined &&
      (obj.reductionFactor = message.reductionFactor);
    message.distributionProportions !== undefined &&
      (obj.distributionProportions = message.distributionProportions
        ? DistributionProportions.toJSON(message.distributionProportions)
        : undefined);
    if (message.weightedDeveloperRewardsReceivers) {
      obj.weightedDeveloperRewardsReceivers =
        message.weightedDeveloperRewardsReceivers.map(e =>
          e ? WeightedAddress.toJSON(e) : undefined,
        );
    } else {
      obj.weightedDeveloperRewardsReceivers = [];
    }
    message.mintingRewardsDistributionStartEpoch !== undefined &&
      (obj.mintingRewardsDistributionStartEpoch = (
        message.mintingRewardsDistributionStartEpoch || BigInt(0)
      ).toString());
    return obj;
  },
  fromPartial(object: Partial<Params>): Params {
    const message = createBaseParams();
    message.mintDenom = object.mintDenom ?? '';
    message.genesisEpochProvisions = object.genesisEpochProvisions ?? '';
    message.epochIdentifier = object.epochIdentifier ?? '';
    message.reductionPeriodInEpochs =
      object.reductionPeriodInEpochs !== undefined &&
      object.reductionPeriodInEpochs !== null
        ? BigInt(object.reductionPeriodInEpochs.toString())
        : BigInt(0);
    message.reductionFactor = object.reductionFactor ?? '';
    message.distributionProportions =
      object.distributionProportions !== undefined &&
      object.distributionProportions !== null
        ? DistributionProportions.fromPartial(object.distributionProportions)
        : undefined;
    message.weightedDeveloperRewardsReceivers =
      object.weightedDeveloperRewardsReceivers?.map(e =>
        WeightedAddress.fromPartial(e),
      ) || [];
    message.mintingRewardsDistributionStartEpoch =
      object.mintingRewardsDistributionStartEpoch !== undefined &&
      object.mintingRewardsDistributionStartEpoch !== null
        ? BigInt(object.mintingRewardsDistributionStartEpoch.toString())
        : BigInt(0);
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
      typeUrl: '/osmosis.mint.v1beta1.Params',
      value: Params.encode(message).finish(),
    };
  },
};
