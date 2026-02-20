//@ts-nocheck
import {
  DelegationRecord,
  type DelegationRecordSDKType,
  UnbondingRecord,
  type UnbondingRecordSDKType,
  RedemptionRecord,
  type RedemptionRecordSDKType,
} from './stakedym.js';
import { Coin, type CoinSDKType } from '../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { type JsonSafe } from '../../json-safe.js';
import { Decimal } from '../../decimals.js';
export enum OverwritableRecordType {
  RECORD_TYPE_DELEGATION = 0,
  RECORD_TYPE_UNBONDING = 1,
  RECORD_TYPE_REDEMPTION = 2,
  UNRECOGNIZED = -1,
}
export const OverwritableRecordTypeSDKType = OverwritableRecordType;
export function overwritableRecordTypeFromJSON(
  object: any,
): OverwritableRecordType {
  switch (object) {
    case 0:
    case 'RECORD_TYPE_DELEGATION':
      return OverwritableRecordType.RECORD_TYPE_DELEGATION;
    case 1:
    case 'RECORD_TYPE_UNBONDING':
      return OverwritableRecordType.RECORD_TYPE_UNBONDING;
    case 2:
    case 'RECORD_TYPE_REDEMPTION':
      return OverwritableRecordType.RECORD_TYPE_REDEMPTION;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return OverwritableRecordType.UNRECOGNIZED;
  }
}
export function overwritableRecordTypeToJSON(
  object: OverwritableRecordType,
): string {
  switch (object) {
    case OverwritableRecordType.RECORD_TYPE_DELEGATION:
      return 'RECORD_TYPE_DELEGATION';
    case OverwritableRecordType.RECORD_TYPE_UNBONDING:
      return 'RECORD_TYPE_UNBONDING';
    case OverwritableRecordType.RECORD_TYPE_REDEMPTION:
      return 'RECORD_TYPE_REDEMPTION';
    case OverwritableRecordType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/**
 * LiquidStake
 * @name MsgLiquidStake
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgLiquidStake
 */
export interface MsgLiquidStake {
  staker: string;
  nativeAmount: string;
}
export interface MsgLiquidStakeProtoMsg {
  typeUrl: '/stride.stakedym.MsgLiquidStake';
  value: Uint8Array;
}
/**
 * LiquidStake
 * @name MsgLiquidStakeSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgLiquidStake
 */
export interface MsgLiquidStakeSDKType {
  staker: string;
  native_amount: string;
}
/**
 * @name MsgLiquidStakeResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgLiquidStakeResponse
 */
export interface MsgLiquidStakeResponse {
  stToken: Coin;
}
export interface MsgLiquidStakeResponseProtoMsg {
  typeUrl: '/stride.stakedym.MsgLiquidStakeResponse';
  value: Uint8Array;
}
/**
 * @name MsgLiquidStakeResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgLiquidStakeResponse
 */
export interface MsgLiquidStakeResponseSDKType {
  st_token: CoinSDKType;
}
/**
 * RedeemStake
 * @name MsgRedeemStake
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgRedeemStake
 */
export interface MsgRedeemStake {
  redeemer: string;
  stTokenAmount: string;
}
export interface MsgRedeemStakeProtoMsg {
  typeUrl: '/stride.stakedym.MsgRedeemStake';
  value: Uint8Array;
}
/**
 * RedeemStake
 * @name MsgRedeemStakeSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgRedeemStake
 */
export interface MsgRedeemStakeSDKType {
  redeemer: string;
  st_token_amount: string;
}
/**
 * @name MsgRedeemStakeResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgRedeemStakeResponse
 */
export interface MsgRedeemStakeResponse {
  nativeToken: Coin;
}
export interface MsgRedeemStakeResponseProtoMsg {
  typeUrl: '/stride.stakedym.MsgRedeemStakeResponse';
  value: Uint8Array;
}
/**
 * @name MsgRedeemStakeResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgRedeemStakeResponse
 */
export interface MsgRedeemStakeResponseSDKType {
  native_token: CoinSDKType;
}
/**
 * ConfirmDelegation
 * @name MsgConfirmDelegation
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmDelegation
 */
export interface MsgConfirmDelegation {
  operator: string;
  recordId: bigint;
  txHash: string;
}
export interface MsgConfirmDelegationProtoMsg {
  typeUrl: '/stride.stakedym.MsgConfirmDelegation';
  value: Uint8Array;
}
/**
 * ConfirmDelegation
 * @name MsgConfirmDelegationSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmDelegation
 */
export interface MsgConfirmDelegationSDKType {
  operator: string;
  record_id: bigint;
  tx_hash: string;
}
/**
 * @name MsgConfirmDelegationResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmDelegationResponse
 */
export interface MsgConfirmDelegationResponse {}
export interface MsgConfirmDelegationResponseProtoMsg {
  typeUrl: '/stride.stakedym.MsgConfirmDelegationResponse';
  value: Uint8Array;
}
/**
 * @name MsgConfirmDelegationResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmDelegationResponse
 */
export interface MsgConfirmDelegationResponseSDKType {}
/**
 * ConfirmUndelegation
 * @name MsgConfirmUndelegation
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmUndelegation
 */
export interface MsgConfirmUndelegation {
  operator: string;
  recordId: bigint;
  txHash: string;
}
export interface MsgConfirmUndelegationProtoMsg {
  typeUrl: '/stride.stakedym.MsgConfirmUndelegation';
  value: Uint8Array;
}
/**
 * ConfirmUndelegation
 * @name MsgConfirmUndelegationSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmUndelegation
 */
export interface MsgConfirmUndelegationSDKType {
  operator: string;
  record_id: bigint;
  tx_hash: string;
}
/**
 * @name MsgConfirmUndelegationResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmUndelegationResponse
 */
export interface MsgConfirmUndelegationResponse {}
export interface MsgConfirmUndelegationResponseProtoMsg {
  typeUrl: '/stride.stakedym.MsgConfirmUndelegationResponse';
  value: Uint8Array;
}
/**
 * @name MsgConfirmUndelegationResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmUndelegationResponse
 */
export interface MsgConfirmUndelegationResponseSDKType {}
/**
 * ConfirmUnbondedTokenSweep
 * @name MsgConfirmUnbondedTokenSweep
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmUnbondedTokenSweep
 */
export interface MsgConfirmUnbondedTokenSweep {
  operator: string;
  recordId: bigint;
  txHash: string;
}
export interface MsgConfirmUnbondedTokenSweepProtoMsg {
  typeUrl: '/stride.stakedym.MsgConfirmUnbondedTokenSweep';
  value: Uint8Array;
}
/**
 * ConfirmUnbondedTokenSweep
 * @name MsgConfirmUnbondedTokenSweepSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmUnbondedTokenSweep
 */
export interface MsgConfirmUnbondedTokenSweepSDKType {
  operator: string;
  record_id: bigint;
  tx_hash: string;
}
/**
 * @name MsgConfirmUnbondedTokenSweepResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmUnbondedTokenSweepResponse
 */
export interface MsgConfirmUnbondedTokenSweepResponse {}
export interface MsgConfirmUnbondedTokenSweepResponseProtoMsg {
  typeUrl: '/stride.stakedym.MsgConfirmUnbondedTokenSweepResponse';
  value: Uint8Array;
}
/**
 * @name MsgConfirmUnbondedTokenSweepResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmUnbondedTokenSweepResponse
 */
export interface MsgConfirmUnbondedTokenSweepResponseSDKType {}
/**
 * AdjustDelegatedBalance
 * @name MsgAdjustDelegatedBalance
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgAdjustDelegatedBalance
 */
export interface MsgAdjustDelegatedBalance {
  operator: string;
  delegationOffset: string;
  validatorAddress: string;
}
export interface MsgAdjustDelegatedBalanceProtoMsg {
  typeUrl: '/stride.stakedym.MsgAdjustDelegatedBalance';
  value: Uint8Array;
}
/**
 * AdjustDelegatedBalance
 * @name MsgAdjustDelegatedBalanceSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgAdjustDelegatedBalance
 */
export interface MsgAdjustDelegatedBalanceSDKType {
  operator: string;
  delegation_offset: string;
  validator_address: string;
}
/**
 * @name MsgAdjustDelegatedBalanceResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgAdjustDelegatedBalanceResponse
 */
export interface MsgAdjustDelegatedBalanceResponse {}
export interface MsgAdjustDelegatedBalanceResponseProtoMsg {
  typeUrl: '/stride.stakedym.MsgAdjustDelegatedBalanceResponse';
  value: Uint8Array;
}
/**
 * @name MsgAdjustDelegatedBalanceResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgAdjustDelegatedBalanceResponse
 */
export interface MsgAdjustDelegatedBalanceResponseSDKType {}
/**
 * UpdateInnerRedemptionRate
 * @name MsgUpdateInnerRedemptionRateBounds
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgUpdateInnerRedemptionRateBounds
 */
export interface MsgUpdateInnerRedemptionRateBounds {
  creator: string;
  minInnerRedemptionRate: string;
  maxInnerRedemptionRate: string;
}
export interface MsgUpdateInnerRedemptionRateBoundsProtoMsg {
  typeUrl: '/stride.stakedym.MsgUpdateInnerRedemptionRateBounds';
  value: Uint8Array;
}
/**
 * UpdateInnerRedemptionRate
 * @name MsgUpdateInnerRedemptionRateBoundsSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgUpdateInnerRedemptionRateBounds
 */
export interface MsgUpdateInnerRedemptionRateBoundsSDKType {
  creator: string;
  min_inner_redemption_rate: string;
  max_inner_redemption_rate: string;
}
/**
 * @name MsgUpdateInnerRedemptionRateBoundsResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgUpdateInnerRedemptionRateBoundsResponse
 */
export interface MsgUpdateInnerRedemptionRateBoundsResponse {}
export interface MsgUpdateInnerRedemptionRateBoundsResponseProtoMsg {
  typeUrl: '/stride.stakedym.MsgUpdateInnerRedemptionRateBoundsResponse';
  value: Uint8Array;
}
/**
 * @name MsgUpdateInnerRedemptionRateBoundsResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgUpdateInnerRedemptionRateBoundsResponse
 */
export interface MsgUpdateInnerRedemptionRateBoundsResponseSDKType {}
/**
 * ResumeHostZone
 * @name MsgResumeHostZone
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgResumeHostZone
 */
export interface MsgResumeHostZone {
  creator: string;
}
export interface MsgResumeHostZoneProtoMsg {
  typeUrl: '/stride.stakedym.MsgResumeHostZone';
  value: Uint8Array;
}
/**
 * ResumeHostZone
 * @name MsgResumeHostZoneSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgResumeHostZone
 */
export interface MsgResumeHostZoneSDKType {
  creator: string;
}
/**
 * @name MsgResumeHostZoneResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgResumeHostZoneResponse
 */
export interface MsgResumeHostZoneResponse {}
export interface MsgResumeHostZoneResponseProtoMsg {
  typeUrl: '/stride.stakedym.MsgResumeHostZoneResponse';
  value: Uint8Array;
}
/**
 * @name MsgResumeHostZoneResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgResumeHostZoneResponse
 */
export interface MsgResumeHostZoneResponseSDKType {}
/**
 * RefreshRedemptionRate
 * @name MsgRefreshRedemptionRate
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgRefreshRedemptionRate
 */
export interface MsgRefreshRedemptionRate {
  creator: string;
}
export interface MsgRefreshRedemptionRateProtoMsg {
  typeUrl: '/stride.stakedym.MsgRefreshRedemptionRate';
  value: Uint8Array;
}
/**
 * RefreshRedemptionRate
 * @name MsgRefreshRedemptionRateSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgRefreshRedemptionRate
 */
export interface MsgRefreshRedemptionRateSDKType {
  creator: string;
}
/**
 * @name MsgRefreshRedemptionRateResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgRefreshRedemptionRateResponse
 */
export interface MsgRefreshRedemptionRateResponse {}
export interface MsgRefreshRedemptionRateResponseProtoMsg {
  typeUrl: '/stride.stakedym.MsgRefreshRedemptionRateResponse';
  value: Uint8Array;
}
/**
 * @name MsgRefreshRedemptionRateResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgRefreshRedemptionRateResponse
 */
export interface MsgRefreshRedemptionRateResponseSDKType {}
/**
 * OverwriteDelegationRecord
 * @name MsgOverwriteDelegationRecord
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteDelegationRecord
 */
export interface MsgOverwriteDelegationRecord {
  creator: string;
  delegationRecord?: DelegationRecord;
}
export interface MsgOverwriteDelegationRecordProtoMsg {
  typeUrl: '/stride.stakedym.MsgOverwriteDelegationRecord';
  value: Uint8Array;
}
/**
 * OverwriteDelegationRecord
 * @name MsgOverwriteDelegationRecordSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteDelegationRecord
 */
export interface MsgOverwriteDelegationRecordSDKType {
  creator: string;
  delegation_record?: DelegationRecordSDKType;
}
/**
 * @name MsgOverwriteDelegationRecordResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteDelegationRecordResponse
 */
export interface MsgOverwriteDelegationRecordResponse {}
export interface MsgOverwriteDelegationRecordResponseProtoMsg {
  typeUrl: '/stride.stakedym.MsgOverwriteDelegationRecordResponse';
  value: Uint8Array;
}
/**
 * @name MsgOverwriteDelegationRecordResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteDelegationRecordResponse
 */
export interface MsgOverwriteDelegationRecordResponseSDKType {}
/**
 * OverwriteUnbondingRecord
 * @name MsgOverwriteUnbondingRecord
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteUnbondingRecord
 */
export interface MsgOverwriteUnbondingRecord {
  creator: string;
  unbondingRecord?: UnbondingRecord;
}
export interface MsgOverwriteUnbondingRecordProtoMsg {
  typeUrl: '/stride.stakedym.MsgOverwriteUnbondingRecord';
  value: Uint8Array;
}
/**
 * OverwriteUnbondingRecord
 * @name MsgOverwriteUnbondingRecordSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteUnbondingRecord
 */
export interface MsgOverwriteUnbondingRecordSDKType {
  creator: string;
  unbonding_record?: UnbondingRecordSDKType;
}
/**
 * @name MsgOverwriteUnbondingRecordResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteUnbondingRecordResponse
 */
export interface MsgOverwriteUnbondingRecordResponse {}
export interface MsgOverwriteUnbondingRecordResponseProtoMsg {
  typeUrl: '/stride.stakedym.MsgOverwriteUnbondingRecordResponse';
  value: Uint8Array;
}
/**
 * @name MsgOverwriteUnbondingRecordResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteUnbondingRecordResponse
 */
export interface MsgOverwriteUnbondingRecordResponseSDKType {}
/**
 * OverwriteRedemptionRecord
 * @name MsgOverwriteRedemptionRecord
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteRedemptionRecord
 */
export interface MsgOverwriteRedemptionRecord {
  creator: string;
  redemptionRecord?: RedemptionRecord;
}
export interface MsgOverwriteRedemptionRecordProtoMsg {
  typeUrl: '/stride.stakedym.MsgOverwriteRedemptionRecord';
  value: Uint8Array;
}
/**
 * OverwriteRedemptionRecord
 * @name MsgOverwriteRedemptionRecordSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteRedemptionRecord
 */
export interface MsgOverwriteRedemptionRecordSDKType {
  creator: string;
  redemption_record?: RedemptionRecordSDKType;
}
/**
 * @name MsgOverwriteRedemptionRecordResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteRedemptionRecordResponse
 */
export interface MsgOverwriteRedemptionRecordResponse {}
export interface MsgOverwriteRedemptionRecordResponseProtoMsg {
  typeUrl: '/stride.stakedym.MsgOverwriteRedemptionRecordResponse';
  value: Uint8Array;
}
/**
 * @name MsgOverwriteRedemptionRecordResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteRedemptionRecordResponse
 */
export interface MsgOverwriteRedemptionRecordResponseSDKType {}
/**
 * SetOperatorAddress
 * @name MsgSetOperatorAddress
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgSetOperatorAddress
 */
export interface MsgSetOperatorAddress {
  signer: string;
  operator: string;
}
export interface MsgSetOperatorAddressProtoMsg {
  typeUrl: '/stride.stakedym.MsgSetOperatorAddress';
  value: Uint8Array;
}
/**
 * SetOperatorAddress
 * @name MsgSetOperatorAddressSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgSetOperatorAddress
 */
export interface MsgSetOperatorAddressSDKType {
  signer: string;
  operator: string;
}
/**
 * @name MsgSetOperatorAddressResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgSetOperatorAddressResponse
 */
export interface MsgSetOperatorAddressResponse {}
export interface MsgSetOperatorAddressResponseProtoMsg {
  typeUrl: '/stride.stakedym.MsgSetOperatorAddressResponse';
  value: Uint8Array;
}
/**
 * @name MsgSetOperatorAddressResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgSetOperatorAddressResponse
 */
export interface MsgSetOperatorAddressResponseSDKType {}
function createBaseMsgLiquidStake(): MsgLiquidStake {
  return {
    staker: '',
    nativeAmount: '',
  };
}
/**
 * LiquidStake
 * @name MsgLiquidStake
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgLiquidStake
 */
export const MsgLiquidStake = {
  typeUrl: '/stride.stakedym.MsgLiquidStake' as const,
  aminoType: 'stakedym/MsgLiquidStake' as const,
  is(o: any): o is MsgLiquidStake {
    return (
      o &&
      (o.$typeUrl === MsgLiquidStake.typeUrl ||
        (typeof o.staker === 'string' && typeof o.nativeAmount === 'string'))
    );
  },
  isSDK(o: any): o is MsgLiquidStakeSDKType {
    return (
      o &&
      (o.$typeUrl === MsgLiquidStake.typeUrl ||
        (typeof o.staker === 'string' && typeof o.native_amount === 'string'))
    );
  },
  encode(
    message: MsgLiquidStake,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.staker !== '') {
      writer.uint32(10).string(message.staker);
    }
    if (message.nativeAmount !== '') {
      writer.uint32(18).string(message.nativeAmount);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgLiquidStake {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLiquidStake();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.staker = reader.string();
          break;
        case 2:
          message.nativeAmount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgLiquidStake {
    return {
      staker: isSet(object.staker) ? String(object.staker) : '',
      nativeAmount: isSet(object.nativeAmount)
        ? String(object.nativeAmount)
        : '',
    };
  },
  toJSON(message: MsgLiquidStake): JsonSafe<MsgLiquidStake> {
    const obj: any = {};
    message.staker !== undefined && (obj.staker = message.staker);
    message.nativeAmount !== undefined &&
      (obj.nativeAmount = message.nativeAmount);
    return obj;
  },
  fromPartial(object: Partial<MsgLiquidStake>): MsgLiquidStake {
    const message = createBaseMsgLiquidStake();
    message.staker = object.staker ?? '';
    message.nativeAmount = object.nativeAmount ?? '';
    return message;
  },
  fromProtoMsg(message: MsgLiquidStakeProtoMsg): MsgLiquidStake {
    return MsgLiquidStake.decode(message.value);
  },
  toProto(message: MsgLiquidStake): Uint8Array {
    return MsgLiquidStake.encode(message).finish();
  },
  toProtoMsg(message: MsgLiquidStake): MsgLiquidStakeProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgLiquidStake',
      value: MsgLiquidStake.encode(message).finish(),
    };
  },
};
function createBaseMsgLiquidStakeResponse(): MsgLiquidStakeResponse {
  return {
    stToken: Coin.fromPartial({}),
  };
}
/**
 * @name MsgLiquidStakeResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgLiquidStakeResponse
 */
export const MsgLiquidStakeResponse = {
  typeUrl: '/stride.stakedym.MsgLiquidStakeResponse' as const,
  is(o: any): o is MsgLiquidStakeResponse {
    return (
      o && (o.$typeUrl === MsgLiquidStakeResponse.typeUrl || Coin.is(o.stToken))
    );
  },
  isSDK(o: any): o is MsgLiquidStakeResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgLiquidStakeResponse.typeUrl || Coin.isSDK(o.st_token))
    );
  },
  encode(
    message: MsgLiquidStakeResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.stToken !== undefined) {
      Coin.encode(message.stToken, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgLiquidStakeResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLiquidStakeResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.stToken = Coin.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgLiquidStakeResponse {
    return {
      stToken: isSet(object.stToken)
        ? Coin.fromJSON(object.stToken)
        : undefined,
    };
  },
  toJSON(message: MsgLiquidStakeResponse): JsonSafe<MsgLiquidStakeResponse> {
    const obj: any = {};
    message.stToken !== undefined &&
      (obj.stToken = message.stToken
        ? Coin.toJSON(message.stToken)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgLiquidStakeResponse>): MsgLiquidStakeResponse {
    const message = createBaseMsgLiquidStakeResponse();
    message.stToken =
      object.stToken !== undefined && object.stToken !== null
        ? Coin.fromPartial(object.stToken)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: MsgLiquidStakeResponseProtoMsg,
  ): MsgLiquidStakeResponse {
    return MsgLiquidStakeResponse.decode(message.value);
  },
  toProto(message: MsgLiquidStakeResponse): Uint8Array {
    return MsgLiquidStakeResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgLiquidStakeResponse): MsgLiquidStakeResponseProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgLiquidStakeResponse',
      value: MsgLiquidStakeResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgRedeemStake(): MsgRedeemStake {
  return {
    redeemer: '',
    stTokenAmount: '',
  };
}
/**
 * RedeemStake
 * @name MsgRedeemStake
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgRedeemStake
 */
export const MsgRedeemStake = {
  typeUrl: '/stride.stakedym.MsgRedeemStake' as const,
  aminoType: 'stakedym/MsgRedeemStake' as const,
  is(o: any): o is MsgRedeemStake {
    return (
      o &&
      (o.$typeUrl === MsgRedeemStake.typeUrl ||
        (typeof o.redeemer === 'string' && typeof o.stTokenAmount === 'string'))
    );
  },
  isSDK(o: any): o is MsgRedeemStakeSDKType {
    return (
      o &&
      (o.$typeUrl === MsgRedeemStake.typeUrl ||
        (typeof o.redeemer === 'string' &&
          typeof o.st_token_amount === 'string'))
    );
  },
  encode(
    message: MsgRedeemStake,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.redeemer !== '') {
      writer.uint32(10).string(message.redeemer);
    }
    if (message.stTokenAmount !== '') {
      writer.uint32(18).string(message.stTokenAmount);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgRedeemStake {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRedeemStake();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.redeemer = reader.string();
          break;
        case 2:
          message.stTokenAmount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRedeemStake {
    return {
      redeemer: isSet(object.redeemer) ? String(object.redeemer) : '',
      stTokenAmount: isSet(object.stTokenAmount)
        ? String(object.stTokenAmount)
        : '',
    };
  },
  toJSON(message: MsgRedeemStake): JsonSafe<MsgRedeemStake> {
    const obj: any = {};
    message.redeemer !== undefined && (obj.redeemer = message.redeemer);
    message.stTokenAmount !== undefined &&
      (obj.stTokenAmount = message.stTokenAmount);
    return obj;
  },
  fromPartial(object: Partial<MsgRedeemStake>): MsgRedeemStake {
    const message = createBaseMsgRedeemStake();
    message.redeemer = object.redeemer ?? '';
    message.stTokenAmount = object.stTokenAmount ?? '';
    return message;
  },
  fromProtoMsg(message: MsgRedeemStakeProtoMsg): MsgRedeemStake {
    return MsgRedeemStake.decode(message.value);
  },
  toProto(message: MsgRedeemStake): Uint8Array {
    return MsgRedeemStake.encode(message).finish();
  },
  toProtoMsg(message: MsgRedeemStake): MsgRedeemStakeProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgRedeemStake',
      value: MsgRedeemStake.encode(message).finish(),
    };
  },
};
function createBaseMsgRedeemStakeResponse(): MsgRedeemStakeResponse {
  return {
    nativeToken: Coin.fromPartial({}),
  };
}
/**
 * @name MsgRedeemStakeResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgRedeemStakeResponse
 */
export const MsgRedeemStakeResponse = {
  typeUrl: '/stride.stakedym.MsgRedeemStakeResponse' as const,
  is(o: any): o is MsgRedeemStakeResponse {
    return (
      o &&
      (o.$typeUrl === MsgRedeemStakeResponse.typeUrl || Coin.is(o.nativeToken))
    );
  },
  isSDK(o: any): o is MsgRedeemStakeResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgRedeemStakeResponse.typeUrl ||
        Coin.isSDK(o.native_token))
    );
  },
  encode(
    message: MsgRedeemStakeResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.nativeToken !== undefined) {
      Coin.encode(message.nativeToken, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRedeemStakeResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRedeemStakeResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nativeToken = Coin.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRedeemStakeResponse {
    return {
      nativeToken: isSet(object.nativeToken)
        ? Coin.fromJSON(object.nativeToken)
        : undefined,
    };
  },
  toJSON(message: MsgRedeemStakeResponse): JsonSafe<MsgRedeemStakeResponse> {
    const obj: any = {};
    message.nativeToken !== undefined &&
      (obj.nativeToken = message.nativeToken
        ? Coin.toJSON(message.nativeToken)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgRedeemStakeResponse>): MsgRedeemStakeResponse {
    const message = createBaseMsgRedeemStakeResponse();
    message.nativeToken =
      object.nativeToken !== undefined && object.nativeToken !== null
        ? Coin.fromPartial(object.nativeToken)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: MsgRedeemStakeResponseProtoMsg,
  ): MsgRedeemStakeResponse {
    return MsgRedeemStakeResponse.decode(message.value);
  },
  toProto(message: MsgRedeemStakeResponse): Uint8Array {
    return MsgRedeemStakeResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgRedeemStakeResponse): MsgRedeemStakeResponseProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgRedeemStakeResponse',
      value: MsgRedeemStakeResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgConfirmDelegation(): MsgConfirmDelegation {
  return {
    operator: '',
    recordId: BigInt(0),
    txHash: '',
  };
}
/**
 * ConfirmDelegation
 * @name MsgConfirmDelegation
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmDelegation
 */
export const MsgConfirmDelegation = {
  typeUrl: '/stride.stakedym.MsgConfirmDelegation' as const,
  aminoType: 'stakedym/MsgConfirmDelegation' as const,
  is(o: any): o is MsgConfirmDelegation {
    return (
      o &&
      (o.$typeUrl === MsgConfirmDelegation.typeUrl ||
        (typeof o.operator === 'string' &&
          typeof o.recordId === 'bigint' &&
          typeof o.txHash === 'string'))
    );
  },
  isSDK(o: any): o is MsgConfirmDelegationSDKType {
    return (
      o &&
      (o.$typeUrl === MsgConfirmDelegation.typeUrl ||
        (typeof o.operator === 'string' &&
          typeof o.record_id === 'bigint' &&
          typeof o.tx_hash === 'string'))
    );
  },
  encode(
    message: MsgConfirmDelegation,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.operator !== '') {
      writer.uint32(10).string(message.operator);
    }
    if (message.recordId !== BigInt(0)) {
      writer.uint32(16).uint64(message.recordId);
    }
    if (message.txHash !== '') {
      writer.uint32(26).string(message.txHash);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgConfirmDelegation {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgConfirmDelegation();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.operator = reader.string();
          break;
        case 2:
          message.recordId = reader.uint64();
          break;
        case 3:
          message.txHash = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgConfirmDelegation {
    return {
      operator: isSet(object.operator) ? String(object.operator) : '',
      recordId: isSet(object.recordId)
        ? BigInt(object.recordId.toString())
        : BigInt(0),
      txHash: isSet(object.txHash) ? String(object.txHash) : '',
    };
  },
  toJSON(message: MsgConfirmDelegation): JsonSafe<MsgConfirmDelegation> {
    const obj: any = {};
    message.operator !== undefined && (obj.operator = message.operator);
    message.recordId !== undefined &&
      (obj.recordId = (message.recordId || BigInt(0)).toString());
    message.txHash !== undefined && (obj.txHash = message.txHash);
    return obj;
  },
  fromPartial(object: Partial<MsgConfirmDelegation>): MsgConfirmDelegation {
    const message = createBaseMsgConfirmDelegation();
    message.operator = object.operator ?? '';
    message.recordId =
      object.recordId !== undefined && object.recordId !== null
        ? BigInt(object.recordId.toString())
        : BigInt(0);
    message.txHash = object.txHash ?? '';
    return message;
  },
  fromProtoMsg(message: MsgConfirmDelegationProtoMsg): MsgConfirmDelegation {
    return MsgConfirmDelegation.decode(message.value);
  },
  toProto(message: MsgConfirmDelegation): Uint8Array {
    return MsgConfirmDelegation.encode(message).finish();
  },
  toProtoMsg(message: MsgConfirmDelegation): MsgConfirmDelegationProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgConfirmDelegation',
      value: MsgConfirmDelegation.encode(message).finish(),
    };
  },
};
function createBaseMsgConfirmDelegationResponse(): MsgConfirmDelegationResponse {
  return {};
}
/**
 * @name MsgConfirmDelegationResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmDelegationResponse
 */
export const MsgConfirmDelegationResponse = {
  typeUrl: '/stride.stakedym.MsgConfirmDelegationResponse' as const,
  is(o: any): o is MsgConfirmDelegationResponse {
    return o && o.$typeUrl === MsgConfirmDelegationResponse.typeUrl;
  },
  isSDK(o: any): o is MsgConfirmDelegationResponseSDKType {
    return o && o.$typeUrl === MsgConfirmDelegationResponse.typeUrl;
  },
  encode(
    _: MsgConfirmDelegationResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgConfirmDelegationResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgConfirmDelegationResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgConfirmDelegationResponse {
    return {};
  },
  toJSON(
    _: MsgConfirmDelegationResponse,
  ): JsonSafe<MsgConfirmDelegationResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgConfirmDelegationResponse>,
  ): MsgConfirmDelegationResponse {
    const message = createBaseMsgConfirmDelegationResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgConfirmDelegationResponseProtoMsg,
  ): MsgConfirmDelegationResponse {
    return MsgConfirmDelegationResponse.decode(message.value);
  },
  toProto(message: MsgConfirmDelegationResponse): Uint8Array {
    return MsgConfirmDelegationResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgConfirmDelegationResponse,
  ): MsgConfirmDelegationResponseProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgConfirmDelegationResponse',
      value: MsgConfirmDelegationResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgConfirmUndelegation(): MsgConfirmUndelegation {
  return {
    operator: '',
    recordId: BigInt(0),
    txHash: '',
  };
}
/**
 * ConfirmUndelegation
 * @name MsgConfirmUndelegation
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmUndelegation
 */
export const MsgConfirmUndelegation = {
  typeUrl: '/stride.stakedym.MsgConfirmUndelegation' as const,
  aminoType: 'stakedym/MsgConfirmUndelegation' as const,
  is(o: any): o is MsgConfirmUndelegation {
    return (
      o &&
      (o.$typeUrl === MsgConfirmUndelegation.typeUrl ||
        (typeof o.operator === 'string' &&
          typeof o.recordId === 'bigint' &&
          typeof o.txHash === 'string'))
    );
  },
  isSDK(o: any): o is MsgConfirmUndelegationSDKType {
    return (
      o &&
      (o.$typeUrl === MsgConfirmUndelegation.typeUrl ||
        (typeof o.operator === 'string' &&
          typeof o.record_id === 'bigint' &&
          typeof o.tx_hash === 'string'))
    );
  },
  encode(
    message: MsgConfirmUndelegation,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.operator !== '') {
      writer.uint32(10).string(message.operator);
    }
    if (message.recordId !== BigInt(0)) {
      writer.uint32(16).uint64(message.recordId);
    }
    if (message.txHash !== '') {
      writer.uint32(26).string(message.txHash);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgConfirmUndelegation {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgConfirmUndelegation();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.operator = reader.string();
          break;
        case 2:
          message.recordId = reader.uint64();
          break;
        case 3:
          message.txHash = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgConfirmUndelegation {
    return {
      operator: isSet(object.operator) ? String(object.operator) : '',
      recordId: isSet(object.recordId)
        ? BigInt(object.recordId.toString())
        : BigInt(0),
      txHash: isSet(object.txHash) ? String(object.txHash) : '',
    };
  },
  toJSON(message: MsgConfirmUndelegation): JsonSafe<MsgConfirmUndelegation> {
    const obj: any = {};
    message.operator !== undefined && (obj.operator = message.operator);
    message.recordId !== undefined &&
      (obj.recordId = (message.recordId || BigInt(0)).toString());
    message.txHash !== undefined && (obj.txHash = message.txHash);
    return obj;
  },
  fromPartial(object: Partial<MsgConfirmUndelegation>): MsgConfirmUndelegation {
    const message = createBaseMsgConfirmUndelegation();
    message.operator = object.operator ?? '';
    message.recordId =
      object.recordId !== undefined && object.recordId !== null
        ? BigInt(object.recordId.toString())
        : BigInt(0);
    message.txHash = object.txHash ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgConfirmUndelegationProtoMsg,
  ): MsgConfirmUndelegation {
    return MsgConfirmUndelegation.decode(message.value);
  },
  toProto(message: MsgConfirmUndelegation): Uint8Array {
    return MsgConfirmUndelegation.encode(message).finish();
  },
  toProtoMsg(message: MsgConfirmUndelegation): MsgConfirmUndelegationProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgConfirmUndelegation',
      value: MsgConfirmUndelegation.encode(message).finish(),
    };
  },
};
function createBaseMsgConfirmUndelegationResponse(): MsgConfirmUndelegationResponse {
  return {};
}
/**
 * @name MsgConfirmUndelegationResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmUndelegationResponse
 */
export const MsgConfirmUndelegationResponse = {
  typeUrl: '/stride.stakedym.MsgConfirmUndelegationResponse' as const,
  is(o: any): o is MsgConfirmUndelegationResponse {
    return o && o.$typeUrl === MsgConfirmUndelegationResponse.typeUrl;
  },
  isSDK(o: any): o is MsgConfirmUndelegationResponseSDKType {
    return o && o.$typeUrl === MsgConfirmUndelegationResponse.typeUrl;
  },
  encode(
    _: MsgConfirmUndelegationResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgConfirmUndelegationResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgConfirmUndelegationResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgConfirmUndelegationResponse {
    return {};
  },
  toJSON(
    _: MsgConfirmUndelegationResponse,
  ): JsonSafe<MsgConfirmUndelegationResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgConfirmUndelegationResponse>,
  ): MsgConfirmUndelegationResponse {
    const message = createBaseMsgConfirmUndelegationResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgConfirmUndelegationResponseProtoMsg,
  ): MsgConfirmUndelegationResponse {
    return MsgConfirmUndelegationResponse.decode(message.value);
  },
  toProto(message: MsgConfirmUndelegationResponse): Uint8Array {
    return MsgConfirmUndelegationResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgConfirmUndelegationResponse,
  ): MsgConfirmUndelegationResponseProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgConfirmUndelegationResponse',
      value: MsgConfirmUndelegationResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgConfirmUnbondedTokenSweep(): MsgConfirmUnbondedTokenSweep {
  return {
    operator: '',
    recordId: BigInt(0),
    txHash: '',
  };
}
/**
 * ConfirmUnbondedTokenSweep
 * @name MsgConfirmUnbondedTokenSweep
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmUnbondedTokenSweep
 */
export const MsgConfirmUnbondedTokenSweep = {
  typeUrl: '/stride.stakedym.MsgConfirmUnbondedTokenSweep' as const,
  aminoType: 'stakedym/MsgConfirmUnbondedTokenSweep' as const,
  is(o: any): o is MsgConfirmUnbondedTokenSweep {
    return (
      o &&
      (o.$typeUrl === MsgConfirmUnbondedTokenSweep.typeUrl ||
        (typeof o.operator === 'string' &&
          typeof o.recordId === 'bigint' &&
          typeof o.txHash === 'string'))
    );
  },
  isSDK(o: any): o is MsgConfirmUnbondedTokenSweepSDKType {
    return (
      o &&
      (o.$typeUrl === MsgConfirmUnbondedTokenSweep.typeUrl ||
        (typeof o.operator === 'string' &&
          typeof o.record_id === 'bigint' &&
          typeof o.tx_hash === 'string'))
    );
  },
  encode(
    message: MsgConfirmUnbondedTokenSweep,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.operator !== '') {
      writer.uint32(10).string(message.operator);
    }
    if (message.recordId !== BigInt(0)) {
      writer.uint32(16).uint64(message.recordId);
    }
    if (message.txHash !== '') {
      writer.uint32(26).string(message.txHash);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgConfirmUnbondedTokenSweep {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgConfirmUnbondedTokenSweep();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.operator = reader.string();
          break;
        case 2:
          message.recordId = reader.uint64();
          break;
        case 3:
          message.txHash = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgConfirmUnbondedTokenSweep {
    return {
      operator: isSet(object.operator) ? String(object.operator) : '',
      recordId: isSet(object.recordId)
        ? BigInt(object.recordId.toString())
        : BigInt(0),
      txHash: isSet(object.txHash) ? String(object.txHash) : '',
    };
  },
  toJSON(
    message: MsgConfirmUnbondedTokenSweep,
  ): JsonSafe<MsgConfirmUnbondedTokenSweep> {
    const obj: any = {};
    message.operator !== undefined && (obj.operator = message.operator);
    message.recordId !== undefined &&
      (obj.recordId = (message.recordId || BigInt(0)).toString());
    message.txHash !== undefined && (obj.txHash = message.txHash);
    return obj;
  },
  fromPartial(
    object: Partial<MsgConfirmUnbondedTokenSweep>,
  ): MsgConfirmUnbondedTokenSweep {
    const message = createBaseMsgConfirmUnbondedTokenSweep();
    message.operator = object.operator ?? '';
    message.recordId =
      object.recordId !== undefined && object.recordId !== null
        ? BigInt(object.recordId.toString())
        : BigInt(0);
    message.txHash = object.txHash ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgConfirmUnbondedTokenSweepProtoMsg,
  ): MsgConfirmUnbondedTokenSweep {
    return MsgConfirmUnbondedTokenSweep.decode(message.value);
  },
  toProto(message: MsgConfirmUnbondedTokenSweep): Uint8Array {
    return MsgConfirmUnbondedTokenSweep.encode(message).finish();
  },
  toProtoMsg(
    message: MsgConfirmUnbondedTokenSweep,
  ): MsgConfirmUnbondedTokenSweepProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgConfirmUnbondedTokenSweep',
      value: MsgConfirmUnbondedTokenSweep.encode(message).finish(),
    };
  },
};
function createBaseMsgConfirmUnbondedTokenSweepResponse(): MsgConfirmUnbondedTokenSweepResponse {
  return {};
}
/**
 * @name MsgConfirmUnbondedTokenSweepResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgConfirmUnbondedTokenSweepResponse
 */
export const MsgConfirmUnbondedTokenSweepResponse = {
  typeUrl: '/stride.stakedym.MsgConfirmUnbondedTokenSweepResponse' as const,
  is(o: any): o is MsgConfirmUnbondedTokenSweepResponse {
    return o && o.$typeUrl === MsgConfirmUnbondedTokenSweepResponse.typeUrl;
  },
  isSDK(o: any): o is MsgConfirmUnbondedTokenSweepResponseSDKType {
    return o && o.$typeUrl === MsgConfirmUnbondedTokenSweepResponse.typeUrl;
  },
  encode(
    _: MsgConfirmUnbondedTokenSweepResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgConfirmUnbondedTokenSweepResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgConfirmUnbondedTokenSweepResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgConfirmUnbondedTokenSweepResponse {
    return {};
  },
  toJSON(
    _: MsgConfirmUnbondedTokenSweepResponse,
  ): JsonSafe<MsgConfirmUnbondedTokenSweepResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgConfirmUnbondedTokenSweepResponse>,
  ): MsgConfirmUnbondedTokenSweepResponse {
    const message = createBaseMsgConfirmUnbondedTokenSweepResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgConfirmUnbondedTokenSweepResponseProtoMsg,
  ): MsgConfirmUnbondedTokenSweepResponse {
    return MsgConfirmUnbondedTokenSweepResponse.decode(message.value);
  },
  toProto(message: MsgConfirmUnbondedTokenSweepResponse): Uint8Array {
    return MsgConfirmUnbondedTokenSweepResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgConfirmUnbondedTokenSweepResponse,
  ): MsgConfirmUnbondedTokenSweepResponseProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgConfirmUnbondedTokenSweepResponse',
      value: MsgConfirmUnbondedTokenSweepResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgAdjustDelegatedBalance(): MsgAdjustDelegatedBalance {
  return {
    operator: '',
    delegationOffset: '',
    validatorAddress: '',
  };
}
/**
 * AdjustDelegatedBalance
 * @name MsgAdjustDelegatedBalance
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgAdjustDelegatedBalance
 */
export const MsgAdjustDelegatedBalance = {
  typeUrl: '/stride.stakedym.MsgAdjustDelegatedBalance' as const,
  aminoType: 'stakedym/MsgAdjustDelegatedBalance' as const,
  is(o: any): o is MsgAdjustDelegatedBalance {
    return (
      o &&
      (o.$typeUrl === MsgAdjustDelegatedBalance.typeUrl ||
        (typeof o.operator === 'string' &&
          typeof o.delegationOffset === 'string' &&
          typeof o.validatorAddress === 'string'))
    );
  },
  isSDK(o: any): o is MsgAdjustDelegatedBalanceSDKType {
    return (
      o &&
      (o.$typeUrl === MsgAdjustDelegatedBalance.typeUrl ||
        (typeof o.operator === 'string' &&
          typeof o.delegation_offset === 'string' &&
          typeof o.validator_address === 'string'))
    );
  },
  encode(
    message: MsgAdjustDelegatedBalance,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.operator !== '') {
      writer.uint32(10).string(message.operator);
    }
    if (message.delegationOffset !== '') {
      writer.uint32(18).string(message.delegationOffset);
    }
    if (message.validatorAddress !== '') {
      writer.uint32(26).string(message.validatorAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgAdjustDelegatedBalance {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAdjustDelegatedBalance();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.operator = reader.string();
          break;
        case 2:
          message.delegationOffset = reader.string();
          break;
        case 3:
          message.validatorAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgAdjustDelegatedBalance {
    return {
      operator: isSet(object.operator) ? String(object.operator) : '',
      delegationOffset: isSet(object.delegationOffset)
        ? String(object.delegationOffset)
        : '',
      validatorAddress: isSet(object.validatorAddress)
        ? String(object.validatorAddress)
        : '',
    };
  },
  toJSON(
    message: MsgAdjustDelegatedBalance,
  ): JsonSafe<MsgAdjustDelegatedBalance> {
    const obj: any = {};
    message.operator !== undefined && (obj.operator = message.operator);
    message.delegationOffset !== undefined &&
      (obj.delegationOffset = message.delegationOffset);
    message.validatorAddress !== undefined &&
      (obj.validatorAddress = message.validatorAddress);
    return obj;
  },
  fromPartial(
    object: Partial<MsgAdjustDelegatedBalance>,
  ): MsgAdjustDelegatedBalance {
    const message = createBaseMsgAdjustDelegatedBalance();
    message.operator = object.operator ?? '';
    message.delegationOffset = object.delegationOffset ?? '';
    message.validatorAddress = object.validatorAddress ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgAdjustDelegatedBalanceProtoMsg,
  ): MsgAdjustDelegatedBalance {
    return MsgAdjustDelegatedBalance.decode(message.value);
  },
  toProto(message: MsgAdjustDelegatedBalance): Uint8Array {
    return MsgAdjustDelegatedBalance.encode(message).finish();
  },
  toProtoMsg(
    message: MsgAdjustDelegatedBalance,
  ): MsgAdjustDelegatedBalanceProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgAdjustDelegatedBalance',
      value: MsgAdjustDelegatedBalance.encode(message).finish(),
    };
  },
};
function createBaseMsgAdjustDelegatedBalanceResponse(): MsgAdjustDelegatedBalanceResponse {
  return {};
}
/**
 * @name MsgAdjustDelegatedBalanceResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgAdjustDelegatedBalanceResponse
 */
export const MsgAdjustDelegatedBalanceResponse = {
  typeUrl: '/stride.stakedym.MsgAdjustDelegatedBalanceResponse' as const,
  is(o: any): o is MsgAdjustDelegatedBalanceResponse {
    return o && o.$typeUrl === MsgAdjustDelegatedBalanceResponse.typeUrl;
  },
  isSDK(o: any): o is MsgAdjustDelegatedBalanceResponseSDKType {
    return o && o.$typeUrl === MsgAdjustDelegatedBalanceResponse.typeUrl;
  },
  encode(
    _: MsgAdjustDelegatedBalanceResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgAdjustDelegatedBalanceResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAdjustDelegatedBalanceResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgAdjustDelegatedBalanceResponse {
    return {};
  },
  toJSON(
    _: MsgAdjustDelegatedBalanceResponse,
  ): JsonSafe<MsgAdjustDelegatedBalanceResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgAdjustDelegatedBalanceResponse>,
  ): MsgAdjustDelegatedBalanceResponse {
    const message = createBaseMsgAdjustDelegatedBalanceResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgAdjustDelegatedBalanceResponseProtoMsg,
  ): MsgAdjustDelegatedBalanceResponse {
    return MsgAdjustDelegatedBalanceResponse.decode(message.value);
  },
  toProto(message: MsgAdjustDelegatedBalanceResponse): Uint8Array {
    return MsgAdjustDelegatedBalanceResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgAdjustDelegatedBalanceResponse,
  ): MsgAdjustDelegatedBalanceResponseProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgAdjustDelegatedBalanceResponse',
      value: MsgAdjustDelegatedBalanceResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateInnerRedemptionRateBounds(): MsgUpdateInnerRedemptionRateBounds {
  return {
    creator: '',
    minInnerRedemptionRate: '',
    maxInnerRedemptionRate: '',
  };
}
/**
 * UpdateInnerRedemptionRate
 * @name MsgUpdateInnerRedemptionRateBounds
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgUpdateInnerRedemptionRateBounds
 */
export const MsgUpdateInnerRedemptionRateBounds = {
  typeUrl: '/stride.stakedym.MsgUpdateInnerRedemptionRateBounds' as const,
  aminoType: 'stakedym/MsgUpdateRedemptionRateBounds' as const,
  is(o: any): o is MsgUpdateInnerRedemptionRateBounds {
    return (
      o &&
      (o.$typeUrl === MsgUpdateInnerRedemptionRateBounds.typeUrl ||
        (typeof o.creator === 'string' &&
          typeof o.minInnerRedemptionRate === 'string' &&
          typeof o.maxInnerRedemptionRate === 'string'))
    );
  },
  isSDK(o: any): o is MsgUpdateInnerRedemptionRateBoundsSDKType {
    return (
      o &&
      (o.$typeUrl === MsgUpdateInnerRedemptionRateBounds.typeUrl ||
        (typeof o.creator === 'string' &&
          typeof o.min_inner_redemption_rate === 'string' &&
          typeof o.max_inner_redemption_rate === 'string'))
    );
  },
  encode(
    message: MsgUpdateInnerRedemptionRateBounds,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.creator !== '') {
      writer.uint32(10).string(message.creator);
    }
    if (message.minInnerRedemptionRate !== '') {
      writer
        .uint32(18)
        .string(
          Decimal.fromUserInput(message.minInnerRedemptionRate, 18).atomics,
        );
    }
    if (message.maxInnerRedemptionRate !== '') {
      writer
        .uint32(26)
        .string(
          Decimal.fromUserInput(message.maxInnerRedemptionRate, 18).atomics,
        );
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateInnerRedemptionRateBounds {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateInnerRedemptionRateBounds();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.creator = reader.string();
          break;
        case 2:
          message.minInnerRedemptionRate = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        case 3:
          message.maxInnerRedemptionRate = Decimal.fromAtomics(
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
  fromJSON(object: any): MsgUpdateInnerRedemptionRateBounds {
    return {
      creator: isSet(object.creator) ? String(object.creator) : '',
      minInnerRedemptionRate: isSet(object.minInnerRedemptionRate)
        ? String(object.minInnerRedemptionRate)
        : '',
      maxInnerRedemptionRate: isSet(object.maxInnerRedemptionRate)
        ? String(object.maxInnerRedemptionRate)
        : '',
    };
  },
  toJSON(
    message: MsgUpdateInnerRedemptionRateBounds,
  ): JsonSafe<MsgUpdateInnerRedemptionRateBounds> {
    const obj: any = {};
    message.creator !== undefined && (obj.creator = message.creator);
    message.minInnerRedemptionRate !== undefined &&
      (obj.minInnerRedemptionRate = message.minInnerRedemptionRate);
    message.maxInnerRedemptionRate !== undefined &&
      (obj.maxInnerRedemptionRate = message.maxInnerRedemptionRate);
    return obj;
  },
  fromPartial(
    object: Partial<MsgUpdateInnerRedemptionRateBounds>,
  ): MsgUpdateInnerRedemptionRateBounds {
    const message = createBaseMsgUpdateInnerRedemptionRateBounds();
    message.creator = object.creator ?? '';
    message.minInnerRedemptionRate = object.minInnerRedemptionRate ?? '';
    message.maxInnerRedemptionRate = object.maxInnerRedemptionRate ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateInnerRedemptionRateBoundsProtoMsg,
  ): MsgUpdateInnerRedemptionRateBounds {
    return MsgUpdateInnerRedemptionRateBounds.decode(message.value);
  },
  toProto(message: MsgUpdateInnerRedemptionRateBounds): Uint8Array {
    return MsgUpdateInnerRedemptionRateBounds.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateInnerRedemptionRateBounds,
  ): MsgUpdateInnerRedemptionRateBoundsProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgUpdateInnerRedemptionRateBounds',
      value: MsgUpdateInnerRedemptionRateBounds.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateInnerRedemptionRateBoundsResponse(): MsgUpdateInnerRedemptionRateBoundsResponse {
  return {};
}
/**
 * @name MsgUpdateInnerRedemptionRateBoundsResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgUpdateInnerRedemptionRateBoundsResponse
 */
export const MsgUpdateInnerRedemptionRateBoundsResponse = {
  typeUrl:
    '/stride.stakedym.MsgUpdateInnerRedemptionRateBoundsResponse' as const,
  is(o: any): o is MsgUpdateInnerRedemptionRateBoundsResponse {
    return (
      o && o.$typeUrl === MsgUpdateInnerRedemptionRateBoundsResponse.typeUrl
    );
  },
  isSDK(o: any): o is MsgUpdateInnerRedemptionRateBoundsResponseSDKType {
    return (
      o && o.$typeUrl === MsgUpdateInnerRedemptionRateBoundsResponse.typeUrl
    );
  },
  encode(
    _: MsgUpdateInnerRedemptionRateBoundsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateInnerRedemptionRateBoundsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateInnerRedemptionRateBoundsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgUpdateInnerRedemptionRateBoundsResponse {
    return {};
  },
  toJSON(
    _: MsgUpdateInnerRedemptionRateBoundsResponse,
  ): JsonSafe<MsgUpdateInnerRedemptionRateBoundsResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUpdateInnerRedemptionRateBoundsResponse>,
  ): MsgUpdateInnerRedemptionRateBoundsResponse {
    const message = createBaseMsgUpdateInnerRedemptionRateBoundsResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateInnerRedemptionRateBoundsResponseProtoMsg,
  ): MsgUpdateInnerRedemptionRateBoundsResponse {
    return MsgUpdateInnerRedemptionRateBoundsResponse.decode(message.value);
  },
  toProto(message: MsgUpdateInnerRedemptionRateBoundsResponse): Uint8Array {
    return MsgUpdateInnerRedemptionRateBoundsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateInnerRedemptionRateBoundsResponse,
  ): MsgUpdateInnerRedemptionRateBoundsResponseProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgUpdateInnerRedemptionRateBoundsResponse',
      value:
        MsgUpdateInnerRedemptionRateBoundsResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgResumeHostZone(): MsgResumeHostZone {
  return {
    creator: '',
  };
}
/**
 * ResumeHostZone
 * @name MsgResumeHostZone
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgResumeHostZone
 */
export const MsgResumeHostZone = {
  typeUrl: '/stride.stakedym.MsgResumeHostZone' as const,
  aminoType: 'stakedym/MsgResumeHostZone' as const,
  is(o: any): o is MsgResumeHostZone {
    return (
      o &&
      (o.$typeUrl === MsgResumeHostZone.typeUrl ||
        typeof o.creator === 'string')
    );
  },
  isSDK(o: any): o is MsgResumeHostZoneSDKType {
    return (
      o &&
      (o.$typeUrl === MsgResumeHostZone.typeUrl ||
        typeof o.creator === 'string')
    );
  },
  encode(
    message: MsgResumeHostZone,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.creator !== '') {
      writer.uint32(10).string(message.creator);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgResumeHostZone {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgResumeHostZone();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.creator = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgResumeHostZone {
    return {
      creator: isSet(object.creator) ? String(object.creator) : '',
    };
  },
  toJSON(message: MsgResumeHostZone): JsonSafe<MsgResumeHostZone> {
    const obj: any = {};
    message.creator !== undefined && (obj.creator = message.creator);
    return obj;
  },
  fromPartial(object: Partial<MsgResumeHostZone>): MsgResumeHostZone {
    const message = createBaseMsgResumeHostZone();
    message.creator = object.creator ?? '';
    return message;
  },
  fromProtoMsg(message: MsgResumeHostZoneProtoMsg): MsgResumeHostZone {
    return MsgResumeHostZone.decode(message.value);
  },
  toProto(message: MsgResumeHostZone): Uint8Array {
    return MsgResumeHostZone.encode(message).finish();
  },
  toProtoMsg(message: MsgResumeHostZone): MsgResumeHostZoneProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgResumeHostZone',
      value: MsgResumeHostZone.encode(message).finish(),
    };
  },
};
function createBaseMsgResumeHostZoneResponse(): MsgResumeHostZoneResponse {
  return {};
}
/**
 * @name MsgResumeHostZoneResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgResumeHostZoneResponse
 */
export const MsgResumeHostZoneResponse = {
  typeUrl: '/stride.stakedym.MsgResumeHostZoneResponse' as const,
  is(o: any): o is MsgResumeHostZoneResponse {
    return o && o.$typeUrl === MsgResumeHostZoneResponse.typeUrl;
  },
  isSDK(o: any): o is MsgResumeHostZoneResponseSDKType {
    return o && o.$typeUrl === MsgResumeHostZoneResponse.typeUrl;
  },
  encode(
    _: MsgResumeHostZoneResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgResumeHostZoneResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgResumeHostZoneResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgResumeHostZoneResponse {
    return {};
  },
  toJSON(_: MsgResumeHostZoneResponse): JsonSafe<MsgResumeHostZoneResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgResumeHostZoneResponse>,
  ): MsgResumeHostZoneResponse {
    const message = createBaseMsgResumeHostZoneResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgResumeHostZoneResponseProtoMsg,
  ): MsgResumeHostZoneResponse {
    return MsgResumeHostZoneResponse.decode(message.value);
  },
  toProto(message: MsgResumeHostZoneResponse): Uint8Array {
    return MsgResumeHostZoneResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgResumeHostZoneResponse,
  ): MsgResumeHostZoneResponseProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgResumeHostZoneResponse',
      value: MsgResumeHostZoneResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgRefreshRedemptionRate(): MsgRefreshRedemptionRate {
  return {
    creator: '',
  };
}
/**
 * RefreshRedemptionRate
 * @name MsgRefreshRedemptionRate
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgRefreshRedemptionRate
 */
export const MsgRefreshRedemptionRate = {
  typeUrl: '/stride.stakedym.MsgRefreshRedemptionRate' as const,
  aminoType: 'stakedym/MsgRefreshRedemptionRate' as const,
  is(o: any): o is MsgRefreshRedemptionRate {
    return (
      o &&
      (o.$typeUrl === MsgRefreshRedemptionRate.typeUrl ||
        typeof o.creator === 'string')
    );
  },
  isSDK(o: any): o is MsgRefreshRedemptionRateSDKType {
    return (
      o &&
      (o.$typeUrl === MsgRefreshRedemptionRate.typeUrl ||
        typeof o.creator === 'string')
    );
  },
  encode(
    message: MsgRefreshRedemptionRate,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.creator !== '') {
      writer.uint32(10).string(message.creator);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRefreshRedemptionRate {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRefreshRedemptionRate();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.creator = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRefreshRedemptionRate {
    return {
      creator: isSet(object.creator) ? String(object.creator) : '',
    };
  },
  toJSON(
    message: MsgRefreshRedemptionRate,
  ): JsonSafe<MsgRefreshRedemptionRate> {
    const obj: any = {};
    message.creator !== undefined && (obj.creator = message.creator);
    return obj;
  },
  fromPartial(
    object: Partial<MsgRefreshRedemptionRate>,
  ): MsgRefreshRedemptionRate {
    const message = createBaseMsgRefreshRedemptionRate();
    message.creator = object.creator ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgRefreshRedemptionRateProtoMsg,
  ): MsgRefreshRedemptionRate {
    return MsgRefreshRedemptionRate.decode(message.value);
  },
  toProto(message: MsgRefreshRedemptionRate): Uint8Array {
    return MsgRefreshRedemptionRate.encode(message).finish();
  },
  toProtoMsg(
    message: MsgRefreshRedemptionRate,
  ): MsgRefreshRedemptionRateProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgRefreshRedemptionRate',
      value: MsgRefreshRedemptionRate.encode(message).finish(),
    };
  },
};
function createBaseMsgRefreshRedemptionRateResponse(): MsgRefreshRedemptionRateResponse {
  return {};
}
/**
 * @name MsgRefreshRedemptionRateResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgRefreshRedemptionRateResponse
 */
export const MsgRefreshRedemptionRateResponse = {
  typeUrl: '/stride.stakedym.MsgRefreshRedemptionRateResponse' as const,
  is(o: any): o is MsgRefreshRedemptionRateResponse {
    return o && o.$typeUrl === MsgRefreshRedemptionRateResponse.typeUrl;
  },
  isSDK(o: any): o is MsgRefreshRedemptionRateResponseSDKType {
    return o && o.$typeUrl === MsgRefreshRedemptionRateResponse.typeUrl;
  },
  encode(
    _: MsgRefreshRedemptionRateResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRefreshRedemptionRateResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRefreshRedemptionRateResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgRefreshRedemptionRateResponse {
    return {};
  },
  toJSON(
    _: MsgRefreshRedemptionRateResponse,
  ): JsonSafe<MsgRefreshRedemptionRateResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgRefreshRedemptionRateResponse>,
  ): MsgRefreshRedemptionRateResponse {
    const message = createBaseMsgRefreshRedemptionRateResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgRefreshRedemptionRateResponseProtoMsg,
  ): MsgRefreshRedemptionRateResponse {
    return MsgRefreshRedemptionRateResponse.decode(message.value);
  },
  toProto(message: MsgRefreshRedemptionRateResponse): Uint8Array {
    return MsgRefreshRedemptionRateResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgRefreshRedemptionRateResponse,
  ): MsgRefreshRedemptionRateResponseProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgRefreshRedemptionRateResponse',
      value: MsgRefreshRedemptionRateResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgOverwriteDelegationRecord(): MsgOverwriteDelegationRecord {
  return {
    creator: '',
    delegationRecord: undefined,
  };
}
/**
 * OverwriteDelegationRecord
 * @name MsgOverwriteDelegationRecord
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteDelegationRecord
 */
export const MsgOverwriteDelegationRecord = {
  typeUrl: '/stride.stakedym.MsgOverwriteDelegationRecord' as const,
  aminoType: 'stakedym/MsgOverwriteDelegationRecord' as const,
  is(o: any): o is MsgOverwriteDelegationRecord {
    return (
      o &&
      (o.$typeUrl === MsgOverwriteDelegationRecord.typeUrl ||
        typeof o.creator === 'string')
    );
  },
  isSDK(o: any): o is MsgOverwriteDelegationRecordSDKType {
    return (
      o &&
      (o.$typeUrl === MsgOverwriteDelegationRecord.typeUrl ||
        typeof o.creator === 'string')
    );
  },
  encode(
    message: MsgOverwriteDelegationRecord,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.creator !== '') {
      writer.uint32(10).string(message.creator);
    }
    if (message.delegationRecord !== undefined) {
      DelegationRecord.encode(
        message.delegationRecord,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgOverwriteDelegationRecord {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgOverwriteDelegationRecord();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.creator = reader.string();
          break;
        case 2:
          message.delegationRecord = DelegationRecord.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgOverwriteDelegationRecord {
    return {
      creator: isSet(object.creator) ? String(object.creator) : '',
      delegationRecord: isSet(object.delegationRecord)
        ? DelegationRecord.fromJSON(object.delegationRecord)
        : undefined,
    };
  },
  toJSON(
    message: MsgOverwriteDelegationRecord,
  ): JsonSafe<MsgOverwriteDelegationRecord> {
    const obj: any = {};
    message.creator !== undefined && (obj.creator = message.creator);
    message.delegationRecord !== undefined &&
      (obj.delegationRecord = message.delegationRecord
        ? DelegationRecord.toJSON(message.delegationRecord)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<MsgOverwriteDelegationRecord>,
  ): MsgOverwriteDelegationRecord {
    const message = createBaseMsgOverwriteDelegationRecord();
    message.creator = object.creator ?? '';
    message.delegationRecord =
      object.delegationRecord !== undefined && object.delegationRecord !== null
        ? DelegationRecord.fromPartial(object.delegationRecord)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: MsgOverwriteDelegationRecordProtoMsg,
  ): MsgOverwriteDelegationRecord {
    return MsgOverwriteDelegationRecord.decode(message.value);
  },
  toProto(message: MsgOverwriteDelegationRecord): Uint8Array {
    return MsgOverwriteDelegationRecord.encode(message).finish();
  },
  toProtoMsg(
    message: MsgOverwriteDelegationRecord,
  ): MsgOverwriteDelegationRecordProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgOverwriteDelegationRecord',
      value: MsgOverwriteDelegationRecord.encode(message).finish(),
    };
  },
};
function createBaseMsgOverwriteDelegationRecordResponse(): MsgOverwriteDelegationRecordResponse {
  return {};
}
/**
 * @name MsgOverwriteDelegationRecordResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteDelegationRecordResponse
 */
export const MsgOverwriteDelegationRecordResponse = {
  typeUrl: '/stride.stakedym.MsgOverwriteDelegationRecordResponse' as const,
  is(o: any): o is MsgOverwriteDelegationRecordResponse {
    return o && o.$typeUrl === MsgOverwriteDelegationRecordResponse.typeUrl;
  },
  isSDK(o: any): o is MsgOverwriteDelegationRecordResponseSDKType {
    return o && o.$typeUrl === MsgOverwriteDelegationRecordResponse.typeUrl;
  },
  encode(
    _: MsgOverwriteDelegationRecordResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgOverwriteDelegationRecordResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgOverwriteDelegationRecordResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgOverwriteDelegationRecordResponse {
    return {};
  },
  toJSON(
    _: MsgOverwriteDelegationRecordResponse,
  ): JsonSafe<MsgOverwriteDelegationRecordResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgOverwriteDelegationRecordResponse>,
  ): MsgOverwriteDelegationRecordResponse {
    const message = createBaseMsgOverwriteDelegationRecordResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgOverwriteDelegationRecordResponseProtoMsg,
  ): MsgOverwriteDelegationRecordResponse {
    return MsgOverwriteDelegationRecordResponse.decode(message.value);
  },
  toProto(message: MsgOverwriteDelegationRecordResponse): Uint8Array {
    return MsgOverwriteDelegationRecordResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgOverwriteDelegationRecordResponse,
  ): MsgOverwriteDelegationRecordResponseProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgOverwriteDelegationRecordResponse',
      value: MsgOverwriteDelegationRecordResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgOverwriteUnbondingRecord(): MsgOverwriteUnbondingRecord {
  return {
    creator: '',
    unbondingRecord: undefined,
  };
}
/**
 * OverwriteUnbondingRecord
 * @name MsgOverwriteUnbondingRecord
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteUnbondingRecord
 */
export const MsgOverwriteUnbondingRecord = {
  typeUrl: '/stride.stakedym.MsgOverwriteUnbondingRecord' as const,
  aminoType: 'stakedym/MsgOverwriteUnbondingRecord' as const,
  is(o: any): o is MsgOverwriteUnbondingRecord {
    return (
      o &&
      (o.$typeUrl === MsgOverwriteUnbondingRecord.typeUrl ||
        typeof o.creator === 'string')
    );
  },
  isSDK(o: any): o is MsgOverwriteUnbondingRecordSDKType {
    return (
      o &&
      (o.$typeUrl === MsgOverwriteUnbondingRecord.typeUrl ||
        typeof o.creator === 'string')
    );
  },
  encode(
    message: MsgOverwriteUnbondingRecord,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.creator !== '') {
      writer.uint32(10).string(message.creator);
    }
    if (message.unbondingRecord !== undefined) {
      UnbondingRecord.encode(
        message.unbondingRecord,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgOverwriteUnbondingRecord {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgOverwriteUnbondingRecord();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.creator = reader.string();
          break;
        case 2:
          message.unbondingRecord = UnbondingRecord.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgOverwriteUnbondingRecord {
    return {
      creator: isSet(object.creator) ? String(object.creator) : '',
      unbondingRecord: isSet(object.unbondingRecord)
        ? UnbondingRecord.fromJSON(object.unbondingRecord)
        : undefined,
    };
  },
  toJSON(
    message: MsgOverwriteUnbondingRecord,
  ): JsonSafe<MsgOverwriteUnbondingRecord> {
    const obj: any = {};
    message.creator !== undefined && (obj.creator = message.creator);
    message.unbondingRecord !== undefined &&
      (obj.unbondingRecord = message.unbondingRecord
        ? UnbondingRecord.toJSON(message.unbondingRecord)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<MsgOverwriteUnbondingRecord>,
  ): MsgOverwriteUnbondingRecord {
    const message = createBaseMsgOverwriteUnbondingRecord();
    message.creator = object.creator ?? '';
    message.unbondingRecord =
      object.unbondingRecord !== undefined && object.unbondingRecord !== null
        ? UnbondingRecord.fromPartial(object.unbondingRecord)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: MsgOverwriteUnbondingRecordProtoMsg,
  ): MsgOverwriteUnbondingRecord {
    return MsgOverwriteUnbondingRecord.decode(message.value);
  },
  toProto(message: MsgOverwriteUnbondingRecord): Uint8Array {
    return MsgOverwriteUnbondingRecord.encode(message).finish();
  },
  toProtoMsg(
    message: MsgOverwriteUnbondingRecord,
  ): MsgOverwriteUnbondingRecordProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgOverwriteUnbondingRecord',
      value: MsgOverwriteUnbondingRecord.encode(message).finish(),
    };
  },
};
function createBaseMsgOverwriteUnbondingRecordResponse(): MsgOverwriteUnbondingRecordResponse {
  return {};
}
/**
 * @name MsgOverwriteUnbondingRecordResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteUnbondingRecordResponse
 */
export const MsgOverwriteUnbondingRecordResponse = {
  typeUrl: '/stride.stakedym.MsgOverwriteUnbondingRecordResponse' as const,
  is(o: any): o is MsgOverwriteUnbondingRecordResponse {
    return o && o.$typeUrl === MsgOverwriteUnbondingRecordResponse.typeUrl;
  },
  isSDK(o: any): o is MsgOverwriteUnbondingRecordResponseSDKType {
    return o && o.$typeUrl === MsgOverwriteUnbondingRecordResponse.typeUrl;
  },
  encode(
    _: MsgOverwriteUnbondingRecordResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgOverwriteUnbondingRecordResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgOverwriteUnbondingRecordResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgOverwriteUnbondingRecordResponse {
    return {};
  },
  toJSON(
    _: MsgOverwriteUnbondingRecordResponse,
  ): JsonSafe<MsgOverwriteUnbondingRecordResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgOverwriteUnbondingRecordResponse>,
  ): MsgOverwriteUnbondingRecordResponse {
    const message = createBaseMsgOverwriteUnbondingRecordResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgOverwriteUnbondingRecordResponseProtoMsg,
  ): MsgOverwriteUnbondingRecordResponse {
    return MsgOverwriteUnbondingRecordResponse.decode(message.value);
  },
  toProto(message: MsgOverwriteUnbondingRecordResponse): Uint8Array {
    return MsgOverwriteUnbondingRecordResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgOverwriteUnbondingRecordResponse,
  ): MsgOverwriteUnbondingRecordResponseProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgOverwriteUnbondingRecordResponse',
      value: MsgOverwriteUnbondingRecordResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgOverwriteRedemptionRecord(): MsgOverwriteRedemptionRecord {
  return {
    creator: '',
    redemptionRecord: undefined,
  };
}
/**
 * OverwriteRedemptionRecord
 * @name MsgOverwriteRedemptionRecord
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteRedemptionRecord
 */
export const MsgOverwriteRedemptionRecord = {
  typeUrl: '/stride.stakedym.MsgOverwriteRedemptionRecord' as const,
  aminoType: 'stakedym/MsgOverwriteRedemptionRecord' as const,
  is(o: any): o is MsgOverwriteRedemptionRecord {
    return (
      o &&
      (o.$typeUrl === MsgOverwriteRedemptionRecord.typeUrl ||
        typeof o.creator === 'string')
    );
  },
  isSDK(o: any): o is MsgOverwriteRedemptionRecordSDKType {
    return (
      o &&
      (o.$typeUrl === MsgOverwriteRedemptionRecord.typeUrl ||
        typeof o.creator === 'string')
    );
  },
  encode(
    message: MsgOverwriteRedemptionRecord,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.creator !== '') {
      writer.uint32(10).string(message.creator);
    }
    if (message.redemptionRecord !== undefined) {
      RedemptionRecord.encode(
        message.redemptionRecord,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgOverwriteRedemptionRecord {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgOverwriteRedemptionRecord();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.creator = reader.string();
          break;
        case 2:
          message.redemptionRecord = RedemptionRecord.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgOverwriteRedemptionRecord {
    return {
      creator: isSet(object.creator) ? String(object.creator) : '',
      redemptionRecord: isSet(object.redemptionRecord)
        ? RedemptionRecord.fromJSON(object.redemptionRecord)
        : undefined,
    };
  },
  toJSON(
    message: MsgOverwriteRedemptionRecord,
  ): JsonSafe<MsgOverwriteRedemptionRecord> {
    const obj: any = {};
    message.creator !== undefined && (obj.creator = message.creator);
    message.redemptionRecord !== undefined &&
      (obj.redemptionRecord = message.redemptionRecord
        ? RedemptionRecord.toJSON(message.redemptionRecord)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<MsgOverwriteRedemptionRecord>,
  ): MsgOverwriteRedemptionRecord {
    const message = createBaseMsgOverwriteRedemptionRecord();
    message.creator = object.creator ?? '';
    message.redemptionRecord =
      object.redemptionRecord !== undefined && object.redemptionRecord !== null
        ? RedemptionRecord.fromPartial(object.redemptionRecord)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: MsgOverwriteRedemptionRecordProtoMsg,
  ): MsgOverwriteRedemptionRecord {
    return MsgOverwriteRedemptionRecord.decode(message.value);
  },
  toProto(message: MsgOverwriteRedemptionRecord): Uint8Array {
    return MsgOverwriteRedemptionRecord.encode(message).finish();
  },
  toProtoMsg(
    message: MsgOverwriteRedemptionRecord,
  ): MsgOverwriteRedemptionRecordProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgOverwriteRedemptionRecord',
      value: MsgOverwriteRedemptionRecord.encode(message).finish(),
    };
  },
};
function createBaseMsgOverwriteRedemptionRecordResponse(): MsgOverwriteRedemptionRecordResponse {
  return {};
}
/**
 * @name MsgOverwriteRedemptionRecordResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgOverwriteRedemptionRecordResponse
 */
export const MsgOverwriteRedemptionRecordResponse = {
  typeUrl: '/stride.stakedym.MsgOverwriteRedemptionRecordResponse' as const,
  is(o: any): o is MsgOverwriteRedemptionRecordResponse {
    return o && o.$typeUrl === MsgOverwriteRedemptionRecordResponse.typeUrl;
  },
  isSDK(o: any): o is MsgOverwriteRedemptionRecordResponseSDKType {
    return o && o.$typeUrl === MsgOverwriteRedemptionRecordResponse.typeUrl;
  },
  encode(
    _: MsgOverwriteRedemptionRecordResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgOverwriteRedemptionRecordResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgOverwriteRedemptionRecordResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgOverwriteRedemptionRecordResponse {
    return {};
  },
  toJSON(
    _: MsgOverwriteRedemptionRecordResponse,
  ): JsonSafe<MsgOverwriteRedemptionRecordResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgOverwriteRedemptionRecordResponse>,
  ): MsgOverwriteRedemptionRecordResponse {
    const message = createBaseMsgOverwriteRedemptionRecordResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgOverwriteRedemptionRecordResponseProtoMsg,
  ): MsgOverwriteRedemptionRecordResponse {
    return MsgOverwriteRedemptionRecordResponse.decode(message.value);
  },
  toProto(message: MsgOverwriteRedemptionRecordResponse): Uint8Array {
    return MsgOverwriteRedemptionRecordResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgOverwriteRedemptionRecordResponse,
  ): MsgOverwriteRedemptionRecordResponseProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgOverwriteRedemptionRecordResponse',
      value: MsgOverwriteRedemptionRecordResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgSetOperatorAddress(): MsgSetOperatorAddress {
  return {
    signer: '',
    operator: '',
  };
}
/**
 * SetOperatorAddress
 * @name MsgSetOperatorAddress
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgSetOperatorAddress
 */
export const MsgSetOperatorAddress = {
  typeUrl: '/stride.stakedym.MsgSetOperatorAddress' as const,
  aminoType: 'stakedym/MsgSetOperatorAddress' as const,
  is(o: any): o is MsgSetOperatorAddress {
    return (
      o &&
      (o.$typeUrl === MsgSetOperatorAddress.typeUrl ||
        (typeof o.signer === 'string' && typeof o.operator === 'string'))
    );
  },
  isSDK(o: any): o is MsgSetOperatorAddressSDKType {
    return (
      o &&
      (o.$typeUrl === MsgSetOperatorAddress.typeUrl ||
        (typeof o.signer === 'string' && typeof o.operator === 'string'))
    );
  },
  encode(
    message: MsgSetOperatorAddress,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.operator !== '') {
      writer.uint32(18).string(message.operator);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetOperatorAddress {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetOperatorAddress();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.operator = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSetOperatorAddress {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      operator: isSet(object.operator) ? String(object.operator) : '',
    };
  },
  toJSON(message: MsgSetOperatorAddress): JsonSafe<MsgSetOperatorAddress> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.operator !== undefined && (obj.operator = message.operator);
    return obj;
  },
  fromPartial(object: Partial<MsgSetOperatorAddress>): MsgSetOperatorAddress {
    const message = createBaseMsgSetOperatorAddress();
    message.signer = object.signer ?? '';
    message.operator = object.operator ?? '';
    return message;
  },
  fromProtoMsg(message: MsgSetOperatorAddressProtoMsg): MsgSetOperatorAddress {
    return MsgSetOperatorAddress.decode(message.value);
  },
  toProto(message: MsgSetOperatorAddress): Uint8Array {
    return MsgSetOperatorAddress.encode(message).finish();
  },
  toProtoMsg(message: MsgSetOperatorAddress): MsgSetOperatorAddressProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgSetOperatorAddress',
      value: MsgSetOperatorAddress.encode(message).finish(),
    };
  },
};
function createBaseMsgSetOperatorAddressResponse(): MsgSetOperatorAddressResponse {
  return {};
}
/**
 * @name MsgSetOperatorAddressResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.MsgSetOperatorAddressResponse
 */
export const MsgSetOperatorAddressResponse = {
  typeUrl: '/stride.stakedym.MsgSetOperatorAddressResponse' as const,
  is(o: any): o is MsgSetOperatorAddressResponse {
    return o && o.$typeUrl === MsgSetOperatorAddressResponse.typeUrl;
  },
  isSDK(o: any): o is MsgSetOperatorAddressResponseSDKType {
    return o && o.$typeUrl === MsgSetOperatorAddressResponse.typeUrl;
  },
  encode(
    _: MsgSetOperatorAddressResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetOperatorAddressResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetOperatorAddressResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgSetOperatorAddressResponse {
    return {};
  },
  toJSON(
    _: MsgSetOperatorAddressResponse,
  ): JsonSafe<MsgSetOperatorAddressResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgSetOperatorAddressResponse>,
  ): MsgSetOperatorAddressResponse {
    const message = createBaseMsgSetOperatorAddressResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgSetOperatorAddressResponseProtoMsg,
  ): MsgSetOperatorAddressResponse {
    return MsgSetOperatorAddressResponse.decode(message.value);
  },
  toProto(message: MsgSetOperatorAddressResponse): Uint8Array {
    return MsgSetOperatorAddressResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSetOperatorAddressResponse,
  ): MsgSetOperatorAddressResponseProtoMsg {
    return {
      typeUrl: '/stride.stakedym.MsgSetOperatorAddressResponse',
      value: MsgSetOperatorAddressResponse.encode(message).finish(),
    };
  },
};
