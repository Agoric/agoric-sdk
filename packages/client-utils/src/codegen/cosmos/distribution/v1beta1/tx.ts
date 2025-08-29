//@ts-nocheck
import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import { Params, type ParamsSDKType } from './distribution.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgSetWithdrawAddress sets the withdraw address for
 * a delegator (or validator self-delegation).
 */
export interface MsgSetWithdrawAddress {
  delegatorAddress: string;
  withdrawAddress: string;
}
export interface MsgSetWithdrawAddressProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.MsgSetWithdrawAddress';
  value: Uint8Array;
}
/**
 * MsgSetWithdrawAddress sets the withdraw address for
 * a delegator (or validator self-delegation).
 */
export interface MsgSetWithdrawAddressSDKType {
  delegator_address: string;
  withdraw_address: string;
}
/**
 * MsgSetWithdrawAddressResponse defines the Msg/SetWithdrawAddress response
 * type.
 */
export interface MsgSetWithdrawAddressResponse {}
export interface MsgSetWithdrawAddressResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.MsgSetWithdrawAddressResponse';
  value: Uint8Array;
}
/**
 * MsgSetWithdrawAddressResponse defines the Msg/SetWithdrawAddress response
 * type.
 */
export interface MsgSetWithdrawAddressResponseSDKType {}
/**
 * MsgWithdrawDelegatorReward represents delegation withdrawal to a delegator
 * from a single validator.
 */
export interface MsgWithdrawDelegatorReward {
  delegatorAddress: string;
  validatorAddress: string;
}
export interface MsgWithdrawDelegatorRewardProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward';
  value: Uint8Array;
}
/**
 * MsgWithdrawDelegatorReward represents delegation withdrawal to a delegator
 * from a single validator.
 */
export interface MsgWithdrawDelegatorRewardSDKType {
  delegator_address: string;
  validator_address: string;
}
/**
 * MsgWithdrawDelegatorRewardResponse defines the Msg/WithdrawDelegatorReward
 * response type.
 */
export interface MsgWithdrawDelegatorRewardResponse {
  /** Since: cosmos-sdk 0.46 */
  amount: Coin[];
}
export interface MsgWithdrawDelegatorRewardResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorRewardResponse';
  value: Uint8Array;
}
/**
 * MsgWithdrawDelegatorRewardResponse defines the Msg/WithdrawDelegatorReward
 * response type.
 */
export interface MsgWithdrawDelegatorRewardResponseSDKType {
  amount: CoinSDKType[];
}
/**
 * MsgWithdrawValidatorCommission withdraws the full commission to the validator
 * address.
 */
export interface MsgWithdrawValidatorCommission {
  validatorAddress: string;
}
export interface MsgWithdrawValidatorCommissionProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission';
  value: Uint8Array;
}
/**
 * MsgWithdrawValidatorCommission withdraws the full commission to the validator
 * address.
 */
export interface MsgWithdrawValidatorCommissionSDKType {
  validator_address: string;
}
/**
 * MsgWithdrawValidatorCommissionResponse defines the
 * Msg/WithdrawValidatorCommission response type.
 */
export interface MsgWithdrawValidatorCommissionResponse {
  /** Since: cosmos-sdk 0.46 */
  amount: Coin[];
}
export interface MsgWithdrawValidatorCommissionResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommissionResponse';
  value: Uint8Array;
}
/**
 * MsgWithdrawValidatorCommissionResponse defines the
 * Msg/WithdrawValidatorCommission response type.
 */
export interface MsgWithdrawValidatorCommissionResponseSDKType {
  amount: CoinSDKType[];
}
/**
 * MsgFundCommunityPool allows an account to directly
 * fund the community pool.
 */
export interface MsgFundCommunityPool {
  amount: Coin[];
  depositor: string;
}
export interface MsgFundCommunityPoolProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.MsgFundCommunityPool';
  value: Uint8Array;
}
/**
 * MsgFundCommunityPool allows an account to directly
 * fund the community pool.
 */
export interface MsgFundCommunityPoolSDKType {
  amount: CoinSDKType[];
  depositor: string;
}
/** MsgFundCommunityPoolResponse defines the Msg/FundCommunityPool response type. */
export interface MsgFundCommunityPoolResponse {}
export interface MsgFundCommunityPoolResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.MsgFundCommunityPoolResponse';
  value: Uint8Array;
}
/** MsgFundCommunityPoolResponse defines the Msg/FundCommunityPool response type. */
export interface MsgFundCommunityPoolResponseSDKType {}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 *
 * Since: cosmos-sdk 0.47
 */
export interface MsgUpdateParams {
  /** authority is the address that controls the module (defaults to x/gov unless overwritten). */
  authority: string;
  /**
   * params defines the x/distribution parameters to update.
   *
   * NOTE: All parameters must be supplied.
   */
  params: Params;
}
export interface MsgUpdateParamsProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.MsgUpdateParams';
  value: Uint8Array;
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 *
 * Since: cosmos-sdk 0.47
 */
export interface MsgUpdateParamsSDKType {
  authority: string;
  params: ParamsSDKType;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 *
 * Since: cosmos-sdk 0.47
 */
export interface MsgUpdateParamsResponse {}
export interface MsgUpdateParamsResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.MsgUpdateParamsResponse';
  value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 *
 * Since: cosmos-sdk 0.47
 */
export interface MsgUpdateParamsResponseSDKType {}
/**
 * MsgCommunityPoolSpend defines a message for sending tokens from the community
 * pool to another account. This message is typically executed via a governance
 * proposal with the governance module being the executing authority.
 *
 * Since: cosmos-sdk 0.47
 */
export interface MsgCommunityPoolSpend {
  /** authority is the address that controls the module (defaults to x/gov unless overwritten). */
  authority: string;
  recipient: string;
  amount: Coin[];
}
export interface MsgCommunityPoolSpendProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.MsgCommunityPoolSpend';
  value: Uint8Array;
}
/**
 * MsgCommunityPoolSpend defines a message for sending tokens from the community
 * pool to another account. This message is typically executed via a governance
 * proposal with the governance module being the executing authority.
 *
 * Since: cosmos-sdk 0.47
 */
export interface MsgCommunityPoolSpendSDKType {
  authority: string;
  recipient: string;
  amount: CoinSDKType[];
}
/**
 * MsgCommunityPoolSpendResponse defines the response to executing a
 * MsgCommunityPoolSpend message.
 *
 * Since: cosmos-sdk 0.47
 */
export interface MsgCommunityPoolSpendResponse {}
export interface MsgCommunityPoolSpendResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.MsgCommunityPoolSpendResponse';
  value: Uint8Array;
}
/**
 * MsgCommunityPoolSpendResponse defines the response to executing a
 * MsgCommunityPoolSpend message.
 *
 * Since: cosmos-sdk 0.47
 */
export interface MsgCommunityPoolSpendResponseSDKType {}
/**
 * DepositValidatorRewardsPool defines the request structure to provide
 * additional rewards to delegators from a specific validator.
 *
 * Since: cosmos-sdk 0.50
 */
export interface MsgDepositValidatorRewardsPool {
  depositor: string;
  validatorAddress: string;
  amount: Coin[];
}
export interface MsgDepositValidatorRewardsPoolProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPool';
  value: Uint8Array;
}
/**
 * DepositValidatorRewardsPool defines the request structure to provide
 * additional rewards to delegators from a specific validator.
 *
 * Since: cosmos-sdk 0.50
 */
export interface MsgDepositValidatorRewardsPoolSDKType {
  depositor: string;
  validator_address: string;
  amount: CoinSDKType[];
}
/**
 * MsgDepositValidatorRewardsPoolResponse defines the response to executing a
 * MsgDepositValidatorRewardsPool message.
 *
 * Since: cosmos-sdk 0.50
 */
export interface MsgDepositValidatorRewardsPoolResponse {}
export interface MsgDepositValidatorRewardsPoolResponseProtoMsg {
  typeUrl: '/cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPoolResponse';
  value: Uint8Array;
}
/**
 * MsgDepositValidatorRewardsPoolResponse defines the response to executing a
 * MsgDepositValidatorRewardsPool message.
 *
 * Since: cosmos-sdk 0.50
 */
export interface MsgDepositValidatorRewardsPoolResponseSDKType {}
function createBaseMsgSetWithdrawAddress(): MsgSetWithdrawAddress {
  return {
    delegatorAddress: '',
    withdrawAddress: '',
  };
}
export const MsgSetWithdrawAddress = {
  typeUrl: '/cosmos.distribution.v1beta1.MsgSetWithdrawAddress',
  encode(
    message: MsgSetWithdrawAddress,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.delegatorAddress !== '') {
      writer.uint32(10).string(message.delegatorAddress);
    }
    if (message.withdrawAddress !== '') {
      writer.uint32(18).string(message.withdrawAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetWithdrawAddress {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetWithdrawAddress();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.delegatorAddress = reader.string();
          break;
        case 2:
          message.withdrawAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSetWithdrawAddress {
    return {
      delegatorAddress: isSet(object.delegatorAddress)
        ? String(object.delegatorAddress)
        : '',
      withdrawAddress: isSet(object.withdrawAddress)
        ? String(object.withdrawAddress)
        : '',
    };
  },
  toJSON(message: MsgSetWithdrawAddress): JsonSafe<MsgSetWithdrawAddress> {
    const obj: any = {};
    message.delegatorAddress !== undefined &&
      (obj.delegatorAddress = message.delegatorAddress);
    message.withdrawAddress !== undefined &&
      (obj.withdrawAddress = message.withdrawAddress);
    return obj;
  },
  fromPartial(object: Partial<MsgSetWithdrawAddress>): MsgSetWithdrawAddress {
    const message = createBaseMsgSetWithdrawAddress();
    message.delegatorAddress = object.delegatorAddress ?? '';
    message.withdrawAddress = object.withdrawAddress ?? '';
    return message;
  },
  fromProtoMsg(message: MsgSetWithdrawAddressProtoMsg): MsgSetWithdrawAddress {
    return MsgSetWithdrawAddress.decode(message.value);
  },
  toProto(message: MsgSetWithdrawAddress): Uint8Array {
    return MsgSetWithdrawAddress.encode(message).finish();
  },
  toProtoMsg(message: MsgSetWithdrawAddress): MsgSetWithdrawAddressProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.MsgSetWithdrawAddress',
      value: MsgSetWithdrawAddress.encode(message).finish(),
    };
  },
};
function createBaseMsgSetWithdrawAddressResponse(): MsgSetWithdrawAddressResponse {
  return {};
}
export const MsgSetWithdrawAddressResponse = {
  typeUrl: '/cosmos.distribution.v1beta1.MsgSetWithdrawAddressResponse',
  encode(
    _: MsgSetWithdrawAddressResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetWithdrawAddressResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetWithdrawAddressResponse();
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
  fromJSON(_: any): MsgSetWithdrawAddressResponse {
    return {};
  },
  toJSON(
    _: MsgSetWithdrawAddressResponse,
  ): JsonSafe<MsgSetWithdrawAddressResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgSetWithdrawAddressResponse>,
  ): MsgSetWithdrawAddressResponse {
    const message = createBaseMsgSetWithdrawAddressResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgSetWithdrawAddressResponseProtoMsg,
  ): MsgSetWithdrawAddressResponse {
    return MsgSetWithdrawAddressResponse.decode(message.value);
  },
  toProto(message: MsgSetWithdrawAddressResponse): Uint8Array {
    return MsgSetWithdrawAddressResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSetWithdrawAddressResponse,
  ): MsgSetWithdrawAddressResponseProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.MsgSetWithdrawAddressResponse',
      value: MsgSetWithdrawAddressResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgWithdrawDelegatorReward(): MsgWithdrawDelegatorReward {
  return {
    delegatorAddress: '',
    validatorAddress: '',
  };
}
export const MsgWithdrawDelegatorReward = {
  typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
  encode(
    message: MsgWithdrawDelegatorReward,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.delegatorAddress !== '') {
      writer.uint32(10).string(message.delegatorAddress);
    }
    if (message.validatorAddress !== '') {
      writer.uint32(18).string(message.validatorAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgWithdrawDelegatorReward {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWithdrawDelegatorReward();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.delegatorAddress = reader.string();
          break;
        case 2:
          message.validatorAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgWithdrawDelegatorReward {
    return {
      delegatorAddress: isSet(object.delegatorAddress)
        ? String(object.delegatorAddress)
        : '',
      validatorAddress: isSet(object.validatorAddress)
        ? String(object.validatorAddress)
        : '',
    };
  },
  toJSON(
    message: MsgWithdrawDelegatorReward,
  ): JsonSafe<MsgWithdrawDelegatorReward> {
    const obj: any = {};
    message.delegatorAddress !== undefined &&
      (obj.delegatorAddress = message.delegatorAddress);
    message.validatorAddress !== undefined &&
      (obj.validatorAddress = message.validatorAddress);
    return obj;
  },
  fromPartial(
    object: Partial<MsgWithdrawDelegatorReward>,
  ): MsgWithdrawDelegatorReward {
    const message = createBaseMsgWithdrawDelegatorReward();
    message.delegatorAddress = object.delegatorAddress ?? '';
    message.validatorAddress = object.validatorAddress ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgWithdrawDelegatorRewardProtoMsg,
  ): MsgWithdrawDelegatorReward {
    return MsgWithdrawDelegatorReward.decode(message.value);
  },
  toProto(message: MsgWithdrawDelegatorReward): Uint8Array {
    return MsgWithdrawDelegatorReward.encode(message).finish();
  },
  toProtoMsg(
    message: MsgWithdrawDelegatorReward,
  ): MsgWithdrawDelegatorRewardProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
      value: MsgWithdrawDelegatorReward.encode(message).finish(),
    };
  },
};
function createBaseMsgWithdrawDelegatorRewardResponse(): MsgWithdrawDelegatorRewardResponse {
  return {
    amount: [],
  };
}
export const MsgWithdrawDelegatorRewardResponse = {
  typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorRewardResponse',
  encode(
    message: MsgWithdrawDelegatorRewardResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.amount) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgWithdrawDelegatorRewardResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWithdrawDelegatorRewardResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.amount.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgWithdrawDelegatorRewardResponse {
    return {
      amount: Array.isArray(object?.amount)
        ? object.amount.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: MsgWithdrawDelegatorRewardResponse,
  ): JsonSafe<MsgWithdrawDelegatorRewardResponse> {
    const obj: any = {};
    if (message.amount) {
      obj.amount = message.amount.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.amount = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<MsgWithdrawDelegatorRewardResponse>,
  ): MsgWithdrawDelegatorRewardResponse {
    const message = createBaseMsgWithdrawDelegatorRewardResponse();
    message.amount = object.amount?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: MsgWithdrawDelegatorRewardResponseProtoMsg,
  ): MsgWithdrawDelegatorRewardResponse {
    return MsgWithdrawDelegatorRewardResponse.decode(message.value);
  },
  toProto(message: MsgWithdrawDelegatorRewardResponse): Uint8Array {
    return MsgWithdrawDelegatorRewardResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgWithdrawDelegatorRewardResponse,
  ): MsgWithdrawDelegatorRewardResponseProtoMsg {
    return {
      typeUrl:
        '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorRewardResponse',
      value: MsgWithdrawDelegatorRewardResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgWithdrawValidatorCommission(): MsgWithdrawValidatorCommission {
  return {
    validatorAddress: '',
  };
}
export const MsgWithdrawValidatorCommission = {
  typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission',
  encode(
    message: MsgWithdrawValidatorCommission,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.validatorAddress !== '') {
      writer.uint32(10).string(message.validatorAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgWithdrawValidatorCommission {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWithdrawValidatorCommission();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.validatorAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgWithdrawValidatorCommission {
    return {
      validatorAddress: isSet(object.validatorAddress)
        ? String(object.validatorAddress)
        : '',
    };
  },
  toJSON(
    message: MsgWithdrawValidatorCommission,
  ): JsonSafe<MsgWithdrawValidatorCommission> {
    const obj: any = {};
    message.validatorAddress !== undefined &&
      (obj.validatorAddress = message.validatorAddress);
    return obj;
  },
  fromPartial(
    object: Partial<MsgWithdrawValidatorCommission>,
  ): MsgWithdrawValidatorCommission {
    const message = createBaseMsgWithdrawValidatorCommission();
    message.validatorAddress = object.validatorAddress ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgWithdrawValidatorCommissionProtoMsg,
  ): MsgWithdrawValidatorCommission {
    return MsgWithdrawValidatorCommission.decode(message.value);
  },
  toProto(message: MsgWithdrawValidatorCommission): Uint8Array {
    return MsgWithdrawValidatorCommission.encode(message).finish();
  },
  toProtoMsg(
    message: MsgWithdrawValidatorCommission,
  ): MsgWithdrawValidatorCommissionProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission',
      value: MsgWithdrawValidatorCommission.encode(message).finish(),
    };
  },
};
function createBaseMsgWithdrawValidatorCommissionResponse(): MsgWithdrawValidatorCommissionResponse {
  return {
    amount: [],
  };
}
export const MsgWithdrawValidatorCommissionResponse = {
  typeUrl:
    '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommissionResponse',
  encode(
    message: MsgWithdrawValidatorCommissionResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.amount) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgWithdrawValidatorCommissionResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWithdrawValidatorCommissionResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.amount.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgWithdrawValidatorCommissionResponse {
    return {
      amount: Array.isArray(object?.amount)
        ? object.amount.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: MsgWithdrawValidatorCommissionResponse,
  ): JsonSafe<MsgWithdrawValidatorCommissionResponse> {
    const obj: any = {};
    if (message.amount) {
      obj.amount = message.amount.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.amount = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<MsgWithdrawValidatorCommissionResponse>,
  ): MsgWithdrawValidatorCommissionResponse {
    const message = createBaseMsgWithdrawValidatorCommissionResponse();
    message.amount = object.amount?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: MsgWithdrawValidatorCommissionResponseProtoMsg,
  ): MsgWithdrawValidatorCommissionResponse {
    return MsgWithdrawValidatorCommissionResponse.decode(message.value);
  },
  toProto(message: MsgWithdrawValidatorCommissionResponse): Uint8Array {
    return MsgWithdrawValidatorCommissionResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgWithdrawValidatorCommissionResponse,
  ): MsgWithdrawValidatorCommissionResponseProtoMsg {
    return {
      typeUrl:
        '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommissionResponse',
      value: MsgWithdrawValidatorCommissionResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgFundCommunityPool(): MsgFundCommunityPool {
  return {
    amount: [],
    depositor: '',
  };
}
export const MsgFundCommunityPool = {
  typeUrl: '/cosmos.distribution.v1beta1.MsgFundCommunityPool',
  encode(
    message: MsgFundCommunityPool,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.amount) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.depositor !== '') {
      writer.uint32(18).string(message.depositor);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgFundCommunityPool {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgFundCommunityPool();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.amount.push(Coin.decode(reader, reader.uint32()));
          break;
        case 2:
          message.depositor = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgFundCommunityPool {
    return {
      amount: Array.isArray(object?.amount)
        ? object.amount.map((e: any) => Coin.fromJSON(e))
        : [],
      depositor: isSet(object.depositor) ? String(object.depositor) : '',
    };
  },
  toJSON(message: MsgFundCommunityPool): JsonSafe<MsgFundCommunityPool> {
    const obj: any = {};
    if (message.amount) {
      obj.amount = message.amount.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.amount = [];
    }
    message.depositor !== undefined && (obj.depositor = message.depositor);
    return obj;
  },
  fromPartial(object: Partial<MsgFundCommunityPool>): MsgFundCommunityPool {
    const message = createBaseMsgFundCommunityPool();
    message.amount = object.amount?.map(e => Coin.fromPartial(e)) || [];
    message.depositor = object.depositor ?? '';
    return message;
  },
  fromProtoMsg(message: MsgFundCommunityPoolProtoMsg): MsgFundCommunityPool {
    return MsgFundCommunityPool.decode(message.value);
  },
  toProto(message: MsgFundCommunityPool): Uint8Array {
    return MsgFundCommunityPool.encode(message).finish();
  },
  toProtoMsg(message: MsgFundCommunityPool): MsgFundCommunityPoolProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.MsgFundCommunityPool',
      value: MsgFundCommunityPool.encode(message).finish(),
    };
  },
};
function createBaseMsgFundCommunityPoolResponse(): MsgFundCommunityPoolResponse {
  return {};
}
export const MsgFundCommunityPoolResponse = {
  typeUrl: '/cosmos.distribution.v1beta1.MsgFundCommunityPoolResponse',
  encode(
    _: MsgFundCommunityPoolResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgFundCommunityPoolResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgFundCommunityPoolResponse();
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
  fromJSON(_: any): MsgFundCommunityPoolResponse {
    return {};
  },
  toJSON(
    _: MsgFundCommunityPoolResponse,
  ): JsonSafe<MsgFundCommunityPoolResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgFundCommunityPoolResponse>,
  ): MsgFundCommunityPoolResponse {
    const message = createBaseMsgFundCommunityPoolResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgFundCommunityPoolResponseProtoMsg,
  ): MsgFundCommunityPoolResponse {
    return MsgFundCommunityPoolResponse.decode(message.value);
  },
  toProto(message: MsgFundCommunityPoolResponse): Uint8Array {
    return MsgFundCommunityPoolResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgFundCommunityPoolResponse,
  ): MsgFundCommunityPoolResponseProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.MsgFundCommunityPoolResponse',
      value: MsgFundCommunityPoolResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateParams(): MsgUpdateParams {
  return {
    authority: '',
    params: Params.fromPartial({}),
  };
}
export const MsgUpdateParams = {
  typeUrl: '/cosmos.distribution.v1beta1.MsgUpdateParams',
  encode(
    message: MsgUpdateParams,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authority !== '') {
      writer.uint32(10).string(message.authority);
    }
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateParams {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          message.params = Params.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateParams {
    return {
      authority: isSet(object.authority) ? String(object.authority) : '',
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
    };
  },
  toJSON(message: MsgUpdateParams): JsonSafe<MsgUpdateParams> {
    const obj: any = {};
    message.authority !== undefined && (obj.authority = message.authority);
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgUpdateParams>): MsgUpdateParams {
    const message = createBaseMsgUpdateParams();
    message.authority = object.authority ?? '';
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    return message;
  },
  fromProtoMsg(message: MsgUpdateParamsProtoMsg): MsgUpdateParams {
    return MsgUpdateParams.decode(message.value);
  },
  toProto(message: MsgUpdateParams): Uint8Array {
    return MsgUpdateParams.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateParams): MsgUpdateParamsProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.MsgUpdateParams',
      value: MsgUpdateParams.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateParamsResponse(): MsgUpdateParamsResponse {
  return {};
}
export const MsgUpdateParamsResponse = {
  typeUrl: '/cosmos.distribution.v1beta1.MsgUpdateParamsResponse',
  encode(
    _: MsgUpdateParamsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateParamsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateParamsResponse();
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
  fromJSON(_: any): MsgUpdateParamsResponse {
    return {};
  },
  toJSON(_: MsgUpdateParamsResponse): JsonSafe<MsgUpdateParamsResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgUpdateParamsResponse>): MsgUpdateParamsResponse {
    const message = createBaseMsgUpdateParamsResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateParamsResponseProtoMsg,
  ): MsgUpdateParamsResponse {
    return MsgUpdateParamsResponse.decode(message.value);
  },
  toProto(message: MsgUpdateParamsResponse): Uint8Array {
    return MsgUpdateParamsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateParamsResponse,
  ): MsgUpdateParamsResponseProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.MsgUpdateParamsResponse',
      value: MsgUpdateParamsResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgCommunityPoolSpend(): MsgCommunityPoolSpend {
  return {
    authority: '',
    recipient: '',
    amount: [],
  };
}
export const MsgCommunityPoolSpend = {
  typeUrl: '/cosmos.distribution.v1beta1.MsgCommunityPoolSpend',
  encode(
    message: MsgCommunityPoolSpend,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authority !== '') {
      writer.uint32(10).string(message.authority);
    }
    if (message.recipient !== '') {
      writer.uint32(18).string(message.recipient);
    }
    for (const v of message.amount) {
      Coin.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCommunityPoolSpend {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCommunityPoolSpend();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          message.recipient = reader.string();
          break;
        case 3:
          message.amount.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCommunityPoolSpend {
    return {
      authority: isSet(object.authority) ? String(object.authority) : '',
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
      amount: Array.isArray(object?.amount)
        ? object.amount.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgCommunityPoolSpend): JsonSafe<MsgCommunityPoolSpend> {
    const obj: any = {};
    message.authority !== undefined && (obj.authority = message.authority);
    message.recipient !== undefined && (obj.recipient = message.recipient);
    if (message.amount) {
      obj.amount = message.amount.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.amount = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgCommunityPoolSpend>): MsgCommunityPoolSpend {
    const message = createBaseMsgCommunityPoolSpend();
    message.authority = object.authority ?? '';
    message.recipient = object.recipient ?? '';
    message.amount = object.amount?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: MsgCommunityPoolSpendProtoMsg): MsgCommunityPoolSpend {
    return MsgCommunityPoolSpend.decode(message.value);
  },
  toProto(message: MsgCommunityPoolSpend): Uint8Array {
    return MsgCommunityPoolSpend.encode(message).finish();
  },
  toProtoMsg(message: MsgCommunityPoolSpend): MsgCommunityPoolSpendProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.MsgCommunityPoolSpend',
      value: MsgCommunityPoolSpend.encode(message).finish(),
    };
  },
};
function createBaseMsgCommunityPoolSpendResponse(): MsgCommunityPoolSpendResponse {
  return {};
}
export const MsgCommunityPoolSpendResponse = {
  typeUrl: '/cosmos.distribution.v1beta1.MsgCommunityPoolSpendResponse',
  encode(
    _: MsgCommunityPoolSpendResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCommunityPoolSpendResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCommunityPoolSpendResponse();
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
  fromJSON(_: any): MsgCommunityPoolSpendResponse {
    return {};
  },
  toJSON(
    _: MsgCommunityPoolSpendResponse,
  ): JsonSafe<MsgCommunityPoolSpendResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgCommunityPoolSpendResponse>,
  ): MsgCommunityPoolSpendResponse {
    const message = createBaseMsgCommunityPoolSpendResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgCommunityPoolSpendResponseProtoMsg,
  ): MsgCommunityPoolSpendResponse {
    return MsgCommunityPoolSpendResponse.decode(message.value);
  },
  toProto(message: MsgCommunityPoolSpendResponse): Uint8Array {
    return MsgCommunityPoolSpendResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgCommunityPoolSpendResponse,
  ): MsgCommunityPoolSpendResponseProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.MsgCommunityPoolSpendResponse',
      value: MsgCommunityPoolSpendResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgDepositValidatorRewardsPool(): MsgDepositValidatorRewardsPool {
  return {
    depositor: '',
    validatorAddress: '',
    amount: [],
  };
}
export const MsgDepositValidatorRewardsPool = {
  typeUrl: '/cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPool',
  encode(
    message: MsgDepositValidatorRewardsPool,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.depositor !== '') {
      writer.uint32(10).string(message.depositor);
    }
    if (message.validatorAddress !== '') {
      writer.uint32(18).string(message.validatorAddress);
    }
    for (const v of message.amount) {
      Coin.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgDepositValidatorRewardsPool {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDepositValidatorRewardsPool();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.depositor = reader.string();
          break;
        case 2:
          message.validatorAddress = reader.string();
          break;
        case 3:
          message.amount.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgDepositValidatorRewardsPool {
    return {
      depositor: isSet(object.depositor) ? String(object.depositor) : '',
      validatorAddress: isSet(object.validatorAddress)
        ? String(object.validatorAddress)
        : '',
      amount: Array.isArray(object?.amount)
        ? object.amount.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: MsgDepositValidatorRewardsPool,
  ): JsonSafe<MsgDepositValidatorRewardsPool> {
    const obj: any = {};
    message.depositor !== undefined && (obj.depositor = message.depositor);
    message.validatorAddress !== undefined &&
      (obj.validatorAddress = message.validatorAddress);
    if (message.amount) {
      obj.amount = message.amount.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.amount = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<MsgDepositValidatorRewardsPool>,
  ): MsgDepositValidatorRewardsPool {
    const message = createBaseMsgDepositValidatorRewardsPool();
    message.depositor = object.depositor ?? '';
    message.validatorAddress = object.validatorAddress ?? '';
    message.amount = object.amount?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: MsgDepositValidatorRewardsPoolProtoMsg,
  ): MsgDepositValidatorRewardsPool {
    return MsgDepositValidatorRewardsPool.decode(message.value);
  },
  toProto(message: MsgDepositValidatorRewardsPool): Uint8Array {
    return MsgDepositValidatorRewardsPool.encode(message).finish();
  },
  toProtoMsg(
    message: MsgDepositValidatorRewardsPool,
  ): MsgDepositValidatorRewardsPoolProtoMsg {
    return {
      typeUrl: '/cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPool',
      value: MsgDepositValidatorRewardsPool.encode(message).finish(),
    };
  },
};
function createBaseMsgDepositValidatorRewardsPoolResponse(): MsgDepositValidatorRewardsPoolResponse {
  return {};
}
export const MsgDepositValidatorRewardsPoolResponse = {
  typeUrl:
    '/cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPoolResponse',
  encode(
    _: MsgDepositValidatorRewardsPoolResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgDepositValidatorRewardsPoolResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDepositValidatorRewardsPoolResponse();
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
  fromJSON(_: any): MsgDepositValidatorRewardsPoolResponse {
    return {};
  },
  toJSON(
    _: MsgDepositValidatorRewardsPoolResponse,
  ): JsonSafe<MsgDepositValidatorRewardsPoolResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgDepositValidatorRewardsPoolResponse>,
  ): MsgDepositValidatorRewardsPoolResponse {
    const message = createBaseMsgDepositValidatorRewardsPoolResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgDepositValidatorRewardsPoolResponseProtoMsg,
  ): MsgDepositValidatorRewardsPoolResponse {
    return MsgDepositValidatorRewardsPoolResponse.decode(message.value);
  },
  toProto(message: MsgDepositValidatorRewardsPoolResponse): Uint8Array {
    return MsgDepositValidatorRewardsPoolResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgDepositValidatorRewardsPoolResponse,
  ): MsgDepositValidatorRewardsPoolResponseProtoMsg {
    return {
      typeUrl:
        '/cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPoolResponse',
      value: MsgDepositValidatorRewardsPoolResponse.encode(message).finish(),
    };
  },
};
