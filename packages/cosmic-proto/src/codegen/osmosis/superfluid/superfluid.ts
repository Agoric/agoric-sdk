//@ts-nocheck
import { Coin, CoinSDKType } from '../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { JsonSafe } from '../../json-safe.js';
import { Decimal } from '@cosmjs/math';
/**
 * SuperfluidAssetType indicates whether the superfluid asset is
 * a native token itself or the lp share of a pool.
 */
export enum SuperfluidAssetType {
  SuperfluidAssetTypeNative = 0,
  SuperfluidAssetTypeLPShare = 1,
  UNRECOGNIZED = -1,
}
export const SuperfluidAssetTypeSDKType = SuperfluidAssetType;
export function superfluidAssetTypeFromJSON(object: any): SuperfluidAssetType {
  switch (object) {
    case 0:
    case 'SuperfluidAssetTypeNative':
      return SuperfluidAssetType.SuperfluidAssetTypeNative;
    case 1:
    case 'SuperfluidAssetTypeLPShare':
      return SuperfluidAssetType.SuperfluidAssetTypeLPShare;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return SuperfluidAssetType.UNRECOGNIZED;
  }
}
export function superfluidAssetTypeToJSON(object: SuperfluidAssetType): string {
  switch (object) {
    case SuperfluidAssetType.SuperfluidAssetTypeNative:
      return 'SuperfluidAssetTypeNative';
    case SuperfluidAssetType.SuperfluidAssetTypeLPShare:
      return 'SuperfluidAssetTypeLPShare';
    case SuperfluidAssetType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/** SuperfluidAsset stores the pair of superfluid asset type and denom pair */
export interface SuperfluidAsset {
  denom: string;
  /**
   * AssetType indicates whether the superfluid asset is a native token or an lp
   * share
   */
  assetType: SuperfluidAssetType;
}
export interface SuperfluidAssetProtoMsg {
  typeUrl: '/osmosis.superfluid.SuperfluidAsset';
  value: Uint8Array;
}
/** SuperfluidAsset stores the pair of superfluid asset type and denom pair */
export interface SuperfluidAssetSDKType {
  denom: string;
  asset_type: SuperfluidAssetType;
}
/**
 * SuperfluidIntermediaryAccount takes the role of intermediary between LP token
 * and OSMO tokens for superfluid staking. The intermediary account is the
 * actual account responsible for delegation, not the validator account itself.
 */
export interface SuperfluidIntermediaryAccount {
  /** Denom indicates the denom of the superfluid asset. */
  denom: string;
  valAddr: string;
  /** perpetual gauge for rewards distribution */
  gaugeId: bigint;
}
export interface SuperfluidIntermediaryAccountProtoMsg {
  typeUrl: '/osmosis.superfluid.SuperfluidIntermediaryAccount';
  value: Uint8Array;
}
/**
 * SuperfluidIntermediaryAccount takes the role of intermediary between LP token
 * and OSMO tokens for superfluid staking. The intermediary account is the
 * actual account responsible for delegation, not the validator account itself.
 */
export interface SuperfluidIntermediaryAccountSDKType {
  denom: string;
  val_addr: string;
  gauge_id: bigint;
}
/**
 * The Osmo-Equivalent-Multiplier Record for epoch N refers to the osmo worth we
 * treat an LP share as having, for all of epoch N. Eventually this is intended
 * to be set as the Time-weighted-average-osmo-backing for the entire duration
 * of epoch N-1. (Thereby locking whats in use for epoch N as based on the prior
 * epochs rewards) However for now, this is not the TWAP but instead the spot
 * price at the boundary. For different types of assets in the future, it could
 * change.
 */
export interface OsmoEquivalentMultiplierRecord {
  epochNumber: bigint;
  /** superfluid asset denom, can be LP token or native token */
  denom: string;
  multiplier: string;
}
export interface OsmoEquivalentMultiplierRecordProtoMsg {
  typeUrl: '/osmosis.superfluid.OsmoEquivalentMultiplierRecord';
  value: Uint8Array;
}
/**
 * The Osmo-Equivalent-Multiplier Record for epoch N refers to the osmo worth we
 * treat an LP share as having, for all of epoch N. Eventually this is intended
 * to be set as the Time-weighted-average-osmo-backing for the entire duration
 * of epoch N-1. (Thereby locking whats in use for epoch N as based on the prior
 * epochs rewards) However for now, this is not the TWAP but instead the spot
 * price at the boundary. For different types of assets in the future, it could
 * change.
 */
export interface OsmoEquivalentMultiplierRecordSDKType {
  epoch_number: bigint;
  denom: string;
  multiplier: string;
}
/**
 * SuperfluidDelegationRecord is a struct used to indicate superfluid
 * delegations of an account in the state machine in a user friendly form.
 */
export interface SuperfluidDelegationRecord {
  delegatorAddress: string;
  validatorAddress: string;
  delegationAmount: Coin;
  equivalentStakedAmount?: Coin;
}
export interface SuperfluidDelegationRecordProtoMsg {
  typeUrl: '/osmosis.superfluid.SuperfluidDelegationRecord';
  value: Uint8Array;
}
/**
 * SuperfluidDelegationRecord is a struct used to indicate superfluid
 * delegations of an account in the state machine in a user friendly form.
 */
export interface SuperfluidDelegationRecordSDKType {
  delegator_address: string;
  validator_address: string;
  delegation_amount: CoinSDKType;
  equivalent_staked_amount?: CoinSDKType;
}
/**
 * LockIdIntermediaryAccountConnection is a struct used to indicate the
 * relationship between the underlying lock id and superfluid delegation done
 * via lp shares.
 */
export interface LockIdIntermediaryAccountConnection {
  lockId: bigint;
  intermediaryAccount: string;
}
export interface LockIdIntermediaryAccountConnectionProtoMsg {
  typeUrl: '/osmosis.superfluid.LockIdIntermediaryAccountConnection';
  value: Uint8Array;
}
/**
 * LockIdIntermediaryAccountConnection is a struct used to indicate the
 * relationship between the underlying lock id and superfluid delegation done
 * via lp shares.
 */
export interface LockIdIntermediaryAccountConnectionSDKType {
  lock_id: bigint;
  intermediary_account: string;
}
export interface UnpoolWhitelistedPools {
  ids: bigint[];
}
export interface UnpoolWhitelistedPoolsProtoMsg {
  typeUrl: '/osmosis.superfluid.UnpoolWhitelistedPools';
  value: Uint8Array;
}
export interface UnpoolWhitelistedPoolsSDKType {
  ids: bigint[];
}
function createBaseSuperfluidAsset(): SuperfluidAsset {
  return {
    denom: '',
    assetType: 0,
  };
}
export const SuperfluidAsset = {
  typeUrl: '/osmosis.superfluid.SuperfluidAsset',
  encode(
    message: SuperfluidAsset,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.denom !== '') {
      writer.uint32(10).string(message.denom);
    }
    if (message.assetType !== 0) {
      writer.uint32(16).int32(message.assetType);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): SuperfluidAsset {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSuperfluidAsset();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = reader.string();
          break;
        case 2:
          message.assetType = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SuperfluidAsset {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
      assetType: isSet(object.assetType)
        ? superfluidAssetTypeFromJSON(object.assetType)
        : -1,
    };
  },
  toJSON(message: SuperfluidAsset): JsonSafe<SuperfluidAsset> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    message.assetType !== undefined &&
      (obj.assetType = superfluidAssetTypeToJSON(message.assetType));
    return obj;
  },
  fromPartial(object: Partial<SuperfluidAsset>): SuperfluidAsset {
    const message = createBaseSuperfluidAsset();
    message.denom = object.denom ?? '';
    message.assetType = object.assetType ?? 0;
    return message;
  },
  fromProtoMsg(message: SuperfluidAssetProtoMsg): SuperfluidAsset {
    return SuperfluidAsset.decode(message.value);
  },
  toProto(message: SuperfluidAsset): Uint8Array {
    return SuperfluidAsset.encode(message).finish();
  },
  toProtoMsg(message: SuperfluidAsset): SuperfluidAssetProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.SuperfluidAsset',
      value: SuperfluidAsset.encode(message).finish(),
    };
  },
};
function createBaseSuperfluidIntermediaryAccount(): SuperfluidIntermediaryAccount {
  return {
    denom: '',
    valAddr: '',
    gaugeId: BigInt(0),
  };
}
export const SuperfluidIntermediaryAccount = {
  typeUrl: '/osmosis.superfluid.SuperfluidIntermediaryAccount',
  encode(
    message: SuperfluidIntermediaryAccount,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.denom !== '') {
      writer.uint32(10).string(message.denom);
    }
    if (message.valAddr !== '') {
      writer.uint32(18).string(message.valAddr);
    }
    if (message.gaugeId !== BigInt(0)) {
      writer.uint32(24).uint64(message.gaugeId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SuperfluidIntermediaryAccount {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSuperfluidIntermediaryAccount();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = reader.string();
          break;
        case 2:
          message.valAddr = reader.string();
          break;
        case 3:
          message.gaugeId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SuperfluidIntermediaryAccount {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
      valAddr: isSet(object.valAddr) ? String(object.valAddr) : '',
      gaugeId: isSet(object.gaugeId)
        ? BigInt(object.gaugeId.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: SuperfluidIntermediaryAccount,
  ): JsonSafe<SuperfluidIntermediaryAccount> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    message.valAddr !== undefined && (obj.valAddr = message.valAddr);
    message.gaugeId !== undefined &&
      (obj.gaugeId = (message.gaugeId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<SuperfluidIntermediaryAccount>,
  ): SuperfluidIntermediaryAccount {
    const message = createBaseSuperfluidIntermediaryAccount();
    message.denom = object.denom ?? '';
    message.valAddr = object.valAddr ?? '';
    message.gaugeId =
      object.gaugeId !== undefined && object.gaugeId !== null
        ? BigInt(object.gaugeId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: SuperfluidIntermediaryAccountProtoMsg,
  ): SuperfluidIntermediaryAccount {
    return SuperfluidIntermediaryAccount.decode(message.value);
  },
  toProto(message: SuperfluidIntermediaryAccount): Uint8Array {
    return SuperfluidIntermediaryAccount.encode(message).finish();
  },
  toProtoMsg(
    message: SuperfluidIntermediaryAccount,
  ): SuperfluidIntermediaryAccountProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.SuperfluidIntermediaryAccount',
      value: SuperfluidIntermediaryAccount.encode(message).finish(),
    };
  },
};
function createBaseOsmoEquivalentMultiplierRecord(): OsmoEquivalentMultiplierRecord {
  return {
    epochNumber: BigInt(0),
    denom: '',
    multiplier: '',
  };
}
export const OsmoEquivalentMultiplierRecord = {
  typeUrl: '/osmosis.superfluid.OsmoEquivalentMultiplierRecord',
  encode(
    message: OsmoEquivalentMultiplierRecord,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.epochNumber !== BigInt(0)) {
      writer.uint32(8).int64(message.epochNumber);
    }
    if (message.denom !== '') {
      writer.uint32(18).string(message.denom);
    }
    if (message.multiplier !== '') {
      writer
        .uint32(26)
        .string(Decimal.fromUserInput(message.multiplier, 18).atomics);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): OsmoEquivalentMultiplierRecord {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOsmoEquivalentMultiplierRecord();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.epochNumber = reader.int64();
          break;
        case 2:
          message.denom = reader.string();
          break;
        case 3:
          message.multiplier = Decimal.fromAtomics(
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
  fromJSON(object: any): OsmoEquivalentMultiplierRecord {
    return {
      epochNumber: isSet(object.epochNumber)
        ? BigInt(object.epochNumber.toString())
        : BigInt(0),
      denom: isSet(object.denom) ? String(object.denom) : '',
      multiplier: isSet(object.multiplier) ? String(object.multiplier) : '',
    };
  },
  toJSON(
    message: OsmoEquivalentMultiplierRecord,
  ): JsonSafe<OsmoEquivalentMultiplierRecord> {
    const obj: any = {};
    message.epochNumber !== undefined &&
      (obj.epochNumber = (message.epochNumber || BigInt(0)).toString());
    message.denom !== undefined && (obj.denom = message.denom);
    message.multiplier !== undefined && (obj.multiplier = message.multiplier);
    return obj;
  },
  fromPartial(
    object: Partial<OsmoEquivalentMultiplierRecord>,
  ): OsmoEquivalentMultiplierRecord {
    const message = createBaseOsmoEquivalentMultiplierRecord();
    message.epochNumber =
      object.epochNumber !== undefined && object.epochNumber !== null
        ? BigInt(object.epochNumber.toString())
        : BigInt(0);
    message.denom = object.denom ?? '';
    message.multiplier = object.multiplier ?? '';
    return message;
  },
  fromProtoMsg(
    message: OsmoEquivalentMultiplierRecordProtoMsg,
  ): OsmoEquivalentMultiplierRecord {
    return OsmoEquivalentMultiplierRecord.decode(message.value);
  },
  toProto(message: OsmoEquivalentMultiplierRecord): Uint8Array {
    return OsmoEquivalentMultiplierRecord.encode(message).finish();
  },
  toProtoMsg(
    message: OsmoEquivalentMultiplierRecord,
  ): OsmoEquivalentMultiplierRecordProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.OsmoEquivalentMultiplierRecord',
      value: OsmoEquivalentMultiplierRecord.encode(message).finish(),
    };
  },
};
function createBaseSuperfluidDelegationRecord(): SuperfluidDelegationRecord {
  return {
    delegatorAddress: '',
    validatorAddress: '',
    delegationAmount: Coin.fromPartial({}),
    equivalentStakedAmount: undefined,
  };
}
export const SuperfluidDelegationRecord = {
  typeUrl: '/osmosis.superfluid.SuperfluidDelegationRecord',
  encode(
    message: SuperfluidDelegationRecord,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.delegatorAddress !== '') {
      writer.uint32(10).string(message.delegatorAddress);
    }
    if (message.validatorAddress !== '') {
      writer.uint32(18).string(message.validatorAddress);
    }
    if (message.delegationAmount !== undefined) {
      Coin.encode(message.delegationAmount, writer.uint32(26).fork()).ldelim();
    }
    if (message.equivalentStakedAmount !== undefined) {
      Coin.encode(
        message.equivalentStakedAmount,
        writer.uint32(34).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SuperfluidDelegationRecord {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSuperfluidDelegationRecord();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.delegatorAddress = reader.string();
          break;
        case 2:
          message.validatorAddress = reader.string();
          break;
        case 3:
          message.delegationAmount = Coin.decode(reader, reader.uint32());
          break;
        case 4:
          message.equivalentStakedAmount = Coin.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SuperfluidDelegationRecord {
    return {
      delegatorAddress: isSet(object.delegatorAddress)
        ? String(object.delegatorAddress)
        : '',
      validatorAddress: isSet(object.validatorAddress)
        ? String(object.validatorAddress)
        : '',
      delegationAmount: isSet(object.delegationAmount)
        ? Coin.fromJSON(object.delegationAmount)
        : undefined,
      equivalentStakedAmount: isSet(object.equivalentStakedAmount)
        ? Coin.fromJSON(object.equivalentStakedAmount)
        : undefined,
    };
  },
  toJSON(
    message: SuperfluidDelegationRecord,
  ): JsonSafe<SuperfluidDelegationRecord> {
    const obj: any = {};
    message.delegatorAddress !== undefined &&
      (obj.delegatorAddress = message.delegatorAddress);
    message.validatorAddress !== undefined &&
      (obj.validatorAddress = message.validatorAddress);
    message.delegationAmount !== undefined &&
      (obj.delegationAmount = message.delegationAmount
        ? Coin.toJSON(message.delegationAmount)
        : undefined);
    message.equivalentStakedAmount !== undefined &&
      (obj.equivalentStakedAmount = message.equivalentStakedAmount
        ? Coin.toJSON(message.equivalentStakedAmount)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<SuperfluidDelegationRecord>,
  ): SuperfluidDelegationRecord {
    const message = createBaseSuperfluidDelegationRecord();
    message.delegatorAddress = object.delegatorAddress ?? '';
    message.validatorAddress = object.validatorAddress ?? '';
    message.delegationAmount =
      object.delegationAmount !== undefined && object.delegationAmount !== null
        ? Coin.fromPartial(object.delegationAmount)
        : undefined;
    message.equivalentStakedAmount =
      object.equivalentStakedAmount !== undefined &&
      object.equivalentStakedAmount !== null
        ? Coin.fromPartial(object.equivalentStakedAmount)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: SuperfluidDelegationRecordProtoMsg,
  ): SuperfluidDelegationRecord {
    return SuperfluidDelegationRecord.decode(message.value);
  },
  toProto(message: SuperfluidDelegationRecord): Uint8Array {
    return SuperfluidDelegationRecord.encode(message).finish();
  },
  toProtoMsg(
    message: SuperfluidDelegationRecord,
  ): SuperfluidDelegationRecordProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.SuperfluidDelegationRecord',
      value: SuperfluidDelegationRecord.encode(message).finish(),
    };
  },
};
function createBaseLockIdIntermediaryAccountConnection(): LockIdIntermediaryAccountConnection {
  return {
    lockId: BigInt(0),
    intermediaryAccount: '',
  };
}
export const LockIdIntermediaryAccountConnection = {
  typeUrl: '/osmosis.superfluid.LockIdIntermediaryAccountConnection',
  encode(
    message: LockIdIntermediaryAccountConnection,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.lockId !== BigInt(0)) {
      writer.uint32(8).uint64(message.lockId);
    }
    if (message.intermediaryAccount !== '') {
      writer.uint32(18).string(message.intermediaryAccount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): LockIdIntermediaryAccountConnection {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLockIdIntermediaryAccountConnection();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.lockId = reader.uint64();
          break;
        case 2:
          message.intermediaryAccount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): LockIdIntermediaryAccountConnection {
    return {
      lockId: isSet(object.lockId)
        ? BigInt(object.lockId.toString())
        : BigInt(0),
      intermediaryAccount: isSet(object.intermediaryAccount)
        ? String(object.intermediaryAccount)
        : '',
    };
  },
  toJSON(
    message: LockIdIntermediaryAccountConnection,
  ): JsonSafe<LockIdIntermediaryAccountConnection> {
    const obj: any = {};
    message.lockId !== undefined &&
      (obj.lockId = (message.lockId || BigInt(0)).toString());
    message.intermediaryAccount !== undefined &&
      (obj.intermediaryAccount = message.intermediaryAccount);
    return obj;
  },
  fromPartial(
    object: Partial<LockIdIntermediaryAccountConnection>,
  ): LockIdIntermediaryAccountConnection {
    const message = createBaseLockIdIntermediaryAccountConnection();
    message.lockId =
      object.lockId !== undefined && object.lockId !== null
        ? BigInt(object.lockId.toString())
        : BigInt(0);
    message.intermediaryAccount = object.intermediaryAccount ?? '';
    return message;
  },
  fromProtoMsg(
    message: LockIdIntermediaryAccountConnectionProtoMsg,
  ): LockIdIntermediaryAccountConnection {
    return LockIdIntermediaryAccountConnection.decode(message.value);
  },
  toProto(message: LockIdIntermediaryAccountConnection): Uint8Array {
    return LockIdIntermediaryAccountConnection.encode(message).finish();
  },
  toProtoMsg(
    message: LockIdIntermediaryAccountConnection,
  ): LockIdIntermediaryAccountConnectionProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.LockIdIntermediaryAccountConnection',
      value: LockIdIntermediaryAccountConnection.encode(message).finish(),
    };
  },
};
function createBaseUnpoolWhitelistedPools(): UnpoolWhitelistedPools {
  return {
    ids: [],
  };
}
export const UnpoolWhitelistedPools = {
  typeUrl: '/osmosis.superfluid.UnpoolWhitelistedPools',
  encode(
    message: UnpoolWhitelistedPools,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    writer.uint32(10).fork();
    for (const v of message.ids) {
      writer.uint64(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): UnpoolWhitelistedPools {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUnpoolWhitelistedPools();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.ids.push(reader.uint64());
            }
          } else {
            message.ids.push(reader.uint64());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): UnpoolWhitelistedPools {
    return {
      ids: Array.isArray(object?.ids)
        ? object.ids.map((e: any) => BigInt(e.toString()))
        : [],
    };
  },
  toJSON(message: UnpoolWhitelistedPools): JsonSafe<UnpoolWhitelistedPools> {
    const obj: any = {};
    if (message.ids) {
      obj.ids = message.ids.map(e => (e || BigInt(0)).toString());
    } else {
      obj.ids = [];
    }
    return obj;
  },
  fromPartial(object: Partial<UnpoolWhitelistedPools>): UnpoolWhitelistedPools {
    const message = createBaseUnpoolWhitelistedPools();
    message.ids = object.ids?.map(e => BigInt(e.toString())) || [];
    return message;
  },
  fromProtoMsg(
    message: UnpoolWhitelistedPoolsProtoMsg,
  ): UnpoolWhitelistedPools {
    return UnpoolWhitelistedPools.decode(message.value);
  },
  toProto(message: UnpoolWhitelistedPools): Uint8Array {
    return UnpoolWhitelistedPools.encode(message).finish();
  },
  toProtoMsg(message: UnpoolWhitelistedPools): UnpoolWhitelistedPoolsProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.UnpoolWhitelistedPools',
      value: UnpoolWhitelistedPools.encode(message).finish(),
    };
  },
};
