import { Description, type DescriptionSDKType, CommissionRates, type CommissionRatesSDKType, Params, type ParamsSDKType } from './staking.js';
import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import { Timestamp, type TimestampSDKType } from '../../../google/protobuf/timestamp.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgCreateValidator defines a SDK message for creating a new validator.
 * @name MsgCreateValidator
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgCreateValidator
 */
export interface MsgCreateValidator {
    description: Description;
    commission: CommissionRates;
    minSelfDelegation: string;
    /**
     * Deprecated: Use of Delegator Address in MsgCreateValidator is deprecated.
     * The validator address bytes and delegator address bytes refer to the same account while creating validator (defer
     * only in bech32 notation).
     * @deprecated
     */
    delegatorAddress: string;
    validatorAddress: string;
    pubkey?: Any | undefined;
    value: Coin;
}
export interface MsgCreateValidatorProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.MsgCreateValidator';
    value: Uint8Array;
}
/**
 * MsgCreateValidator defines a SDK message for creating a new validator.
 * @name MsgCreateValidatorSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgCreateValidator
 */
export interface MsgCreateValidatorSDKType {
    description: DescriptionSDKType;
    commission: CommissionRatesSDKType;
    min_self_delegation: string;
    /**
     * @deprecated
     */
    delegator_address: string;
    validator_address: string;
    pubkey?: AnySDKType | undefined;
    value: CoinSDKType;
}
/**
 * MsgCreateValidatorResponse defines the Msg/CreateValidator response type.
 * @name MsgCreateValidatorResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgCreateValidatorResponse
 */
export interface MsgCreateValidatorResponse {
}
export interface MsgCreateValidatorResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.MsgCreateValidatorResponse';
    value: Uint8Array;
}
/**
 * MsgCreateValidatorResponse defines the Msg/CreateValidator response type.
 * @name MsgCreateValidatorResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgCreateValidatorResponse
 */
export interface MsgCreateValidatorResponseSDKType {
}
/**
 * MsgEditValidator defines a SDK message for editing an existing validator.
 * @name MsgEditValidator
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgEditValidator
 */
export interface MsgEditValidator {
    description: Description;
    validatorAddress: string;
    /**
     * We pass a reference to the new commission rate and min self delegation as
     * it's not mandatory to update. If not updated, the deserialized rate will be
     * zero with no way to distinguish if an update was intended.
     * REF: #2373
     */
    commissionRate: string;
    minSelfDelegation: string;
}
export interface MsgEditValidatorProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.MsgEditValidator';
    value: Uint8Array;
}
/**
 * MsgEditValidator defines a SDK message for editing an existing validator.
 * @name MsgEditValidatorSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgEditValidator
 */
export interface MsgEditValidatorSDKType {
    description: DescriptionSDKType;
    validator_address: string;
    commission_rate: string;
    min_self_delegation: string;
}
/**
 * MsgEditValidatorResponse defines the Msg/EditValidator response type.
 * @name MsgEditValidatorResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgEditValidatorResponse
 */
export interface MsgEditValidatorResponse {
}
export interface MsgEditValidatorResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.MsgEditValidatorResponse';
    value: Uint8Array;
}
/**
 * MsgEditValidatorResponse defines the Msg/EditValidator response type.
 * @name MsgEditValidatorResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgEditValidatorResponse
 */
export interface MsgEditValidatorResponseSDKType {
}
/**
 * MsgDelegate defines a SDK message for performing a delegation of coins
 * from a delegator to a validator.
 * @name MsgDelegate
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgDelegate
 */
export interface MsgDelegate {
    delegatorAddress: string;
    validatorAddress: string;
    amount: Coin;
}
export interface MsgDelegateProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.MsgDelegate';
    value: Uint8Array;
}
/**
 * MsgDelegate defines a SDK message for performing a delegation of coins
 * from a delegator to a validator.
 * @name MsgDelegateSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgDelegate
 */
export interface MsgDelegateSDKType {
    delegator_address: string;
    validator_address: string;
    amount: CoinSDKType;
}
/**
 * MsgDelegateResponse defines the Msg/Delegate response type.
 * @name MsgDelegateResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgDelegateResponse
 */
export interface MsgDelegateResponse {
}
export interface MsgDelegateResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.MsgDelegateResponse';
    value: Uint8Array;
}
/**
 * MsgDelegateResponse defines the Msg/Delegate response type.
 * @name MsgDelegateResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgDelegateResponse
 */
export interface MsgDelegateResponseSDKType {
}
/**
 * MsgBeginRedelegate defines a SDK message for performing a redelegation
 * of coins from a delegator and source validator to a destination validator.
 * @name MsgBeginRedelegate
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgBeginRedelegate
 */
export interface MsgBeginRedelegate {
    delegatorAddress: string;
    validatorSrcAddress: string;
    validatorDstAddress: string;
    amount: Coin;
}
export interface MsgBeginRedelegateProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate';
    value: Uint8Array;
}
/**
 * MsgBeginRedelegate defines a SDK message for performing a redelegation
 * of coins from a delegator and source validator to a destination validator.
 * @name MsgBeginRedelegateSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgBeginRedelegate
 */
export interface MsgBeginRedelegateSDKType {
    delegator_address: string;
    validator_src_address: string;
    validator_dst_address: string;
    amount: CoinSDKType;
}
/**
 * MsgBeginRedelegateResponse defines the Msg/BeginRedelegate response type.
 * @name MsgBeginRedelegateResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgBeginRedelegateResponse
 */
export interface MsgBeginRedelegateResponse {
    completionTime: Timestamp;
}
export interface MsgBeginRedelegateResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegateResponse';
    value: Uint8Array;
}
/**
 * MsgBeginRedelegateResponse defines the Msg/BeginRedelegate response type.
 * @name MsgBeginRedelegateResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgBeginRedelegateResponse
 */
export interface MsgBeginRedelegateResponseSDKType {
    completion_time: TimestampSDKType;
}
/**
 * MsgUndelegate defines a SDK message for performing an undelegation from a
 * delegate and a validator.
 * @name MsgUndelegate
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgUndelegate
 */
export interface MsgUndelegate {
    delegatorAddress: string;
    validatorAddress: string;
    amount: Coin;
}
export interface MsgUndelegateProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate';
    value: Uint8Array;
}
/**
 * MsgUndelegate defines a SDK message for performing an undelegation from a
 * delegate and a validator.
 * @name MsgUndelegateSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgUndelegate
 */
export interface MsgUndelegateSDKType {
    delegator_address: string;
    validator_address: string;
    amount: CoinSDKType;
}
/**
 * MsgUndelegateResponse defines the Msg/Undelegate response type.
 * @name MsgUndelegateResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgUndelegateResponse
 */
export interface MsgUndelegateResponse {
    completionTime: Timestamp;
    /**
     * amount returns the amount of undelegated coins
     *
     * Since: cosmos-sdk 0.50
     */
    amount: Coin;
}
export interface MsgUndelegateResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.MsgUndelegateResponse';
    value: Uint8Array;
}
/**
 * MsgUndelegateResponse defines the Msg/Undelegate response type.
 * @name MsgUndelegateResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgUndelegateResponse
 */
export interface MsgUndelegateResponseSDKType {
    completion_time: TimestampSDKType;
    amount: CoinSDKType;
}
/**
 * MsgCancelUnbondingDelegation defines the SDK message for performing a cancel unbonding delegation for delegator
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUnbondingDelegation
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgCancelUnbondingDelegation
 */
export interface MsgCancelUnbondingDelegation {
    delegatorAddress: string;
    validatorAddress: string;
    /**
     * amount is always less than or equal to unbonding delegation entry balance
     */
    amount: Coin;
    /**
     * creation_height is the height which the unbonding took place.
     */
    creationHeight: bigint;
}
export interface MsgCancelUnbondingDelegationProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation';
    value: Uint8Array;
}
/**
 * MsgCancelUnbondingDelegation defines the SDK message for performing a cancel unbonding delegation for delegator
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUnbondingDelegationSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgCancelUnbondingDelegation
 */
export interface MsgCancelUnbondingDelegationSDKType {
    delegator_address: string;
    validator_address: string;
    amount: CoinSDKType;
    creation_height: bigint;
}
/**
 * MsgCancelUnbondingDelegationResponse
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUnbondingDelegationResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgCancelUnbondingDelegationResponse
 */
export interface MsgCancelUnbondingDelegationResponse {
}
export interface MsgCancelUnbondingDelegationResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegationResponse';
    value: Uint8Array;
}
/**
 * MsgCancelUnbondingDelegationResponse
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUnbondingDelegationResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgCancelUnbondingDelegationResponse
 */
export interface MsgCancelUnbondingDelegationResponseSDKType {
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParams
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgUpdateParams
 */
export interface MsgUpdateParams {
    /**
     * authority is the address that controls the module (defaults to x/gov unless overwritten).
     */
    authority: string;
    /**
     * params defines the x/staking parameters to update.
     *
     * NOTE: All parameters must be supplied.
     */
    params: Params;
}
export interface MsgUpdateParamsProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.MsgUpdateParams';
    value: Uint8Array;
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParamsSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgUpdateParams
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
 * @name MsgUpdateParamsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponse {
}
export interface MsgUpdateParamsResponseProtoMsg {
    typeUrl: '/cosmos.staking.v1beta1.MsgUpdateParamsResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParamsResponseSDKType
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponseSDKType {
}
/**
 * MsgCreateValidator defines a SDK message for creating a new validator.
 * @name MsgCreateValidator
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgCreateValidator
 */
export declare const MsgCreateValidator: {
    typeUrl: "/cosmos.staking.v1beta1.MsgCreateValidator";
    aminoType: "cosmos-sdk/MsgCreateValidator";
    is(o: any): o is MsgCreateValidator;
    isSDK(o: any): o is MsgCreateValidatorSDKType;
    encode(message: MsgCreateValidator, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateValidator;
    fromJSON(object: any): MsgCreateValidator;
    toJSON(message: MsgCreateValidator): JsonSafe<MsgCreateValidator>;
    fromPartial(object: Partial<MsgCreateValidator>): MsgCreateValidator;
    fromProtoMsg(message: MsgCreateValidatorProtoMsg): MsgCreateValidator;
    toProto(message: MsgCreateValidator): Uint8Array;
    toProtoMsg(message: MsgCreateValidator): MsgCreateValidatorProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCreateValidatorResponse defines the Msg/CreateValidator response type.
 * @name MsgCreateValidatorResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgCreateValidatorResponse
 */
export declare const MsgCreateValidatorResponse: {
    typeUrl: "/cosmos.staking.v1beta1.MsgCreateValidatorResponse";
    aminoType: "cosmos-sdk/MsgCreateValidatorResponse";
    is(o: any): o is MsgCreateValidatorResponse;
    isSDK(o: any): o is MsgCreateValidatorResponseSDKType;
    encode(_: MsgCreateValidatorResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateValidatorResponse;
    fromJSON(_: any): MsgCreateValidatorResponse;
    toJSON(_: MsgCreateValidatorResponse): JsonSafe<MsgCreateValidatorResponse>;
    fromPartial(_: Partial<MsgCreateValidatorResponse>): MsgCreateValidatorResponse;
    fromProtoMsg(message: MsgCreateValidatorResponseProtoMsg): MsgCreateValidatorResponse;
    toProto(message: MsgCreateValidatorResponse): Uint8Array;
    toProtoMsg(message: MsgCreateValidatorResponse): MsgCreateValidatorResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgEditValidator defines a SDK message for editing an existing validator.
 * @name MsgEditValidator
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgEditValidator
 */
export declare const MsgEditValidator: {
    typeUrl: "/cosmos.staking.v1beta1.MsgEditValidator";
    aminoType: "cosmos-sdk/MsgEditValidator";
    is(o: any): o is MsgEditValidator;
    isSDK(o: any): o is MsgEditValidatorSDKType;
    encode(message: MsgEditValidator, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgEditValidator;
    fromJSON(object: any): MsgEditValidator;
    toJSON(message: MsgEditValidator): JsonSafe<MsgEditValidator>;
    fromPartial(object: Partial<MsgEditValidator>): MsgEditValidator;
    fromProtoMsg(message: MsgEditValidatorProtoMsg): MsgEditValidator;
    toProto(message: MsgEditValidator): Uint8Array;
    toProtoMsg(message: MsgEditValidator): MsgEditValidatorProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgEditValidatorResponse defines the Msg/EditValidator response type.
 * @name MsgEditValidatorResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgEditValidatorResponse
 */
export declare const MsgEditValidatorResponse: {
    typeUrl: "/cosmos.staking.v1beta1.MsgEditValidatorResponse";
    aminoType: "cosmos-sdk/MsgEditValidatorResponse";
    is(o: any): o is MsgEditValidatorResponse;
    isSDK(o: any): o is MsgEditValidatorResponseSDKType;
    encode(_: MsgEditValidatorResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgEditValidatorResponse;
    fromJSON(_: any): MsgEditValidatorResponse;
    toJSON(_: MsgEditValidatorResponse): JsonSafe<MsgEditValidatorResponse>;
    fromPartial(_: Partial<MsgEditValidatorResponse>): MsgEditValidatorResponse;
    fromProtoMsg(message: MsgEditValidatorResponseProtoMsg): MsgEditValidatorResponse;
    toProto(message: MsgEditValidatorResponse): Uint8Array;
    toProtoMsg(message: MsgEditValidatorResponse): MsgEditValidatorResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgDelegate defines a SDK message for performing a delegation of coins
 * from a delegator to a validator.
 * @name MsgDelegate
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgDelegate
 */
export declare const MsgDelegate: {
    typeUrl: "/cosmos.staking.v1beta1.MsgDelegate";
    aminoType: "cosmos-sdk/MsgDelegate";
    is(o: any): o is MsgDelegate;
    isSDK(o: any): o is MsgDelegateSDKType;
    encode(message: MsgDelegate, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDelegate;
    fromJSON(object: any): MsgDelegate;
    toJSON(message: MsgDelegate): JsonSafe<MsgDelegate>;
    fromPartial(object: Partial<MsgDelegate>): MsgDelegate;
    fromProtoMsg(message: MsgDelegateProtoMsg): MsgDelegate;
    toProto(message: MsgDelegate): Uint8Array;
    toProtoMsg(message: MsgDelegate): MsgDelegateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgDelegateResponse defines the Msg/Delegate response type.
 * @name MsgDelegateResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgDelegateResponse
 */
export declare const MsgDelegateResponse: {
    typeUrl: "/cosmos.staking.v1beta1.MsgDelegateResponse";
    aminoType: "cosmos-sdk/MsgDelegateResponse";
    is(o: any): o is MsgDelegateResponse;
    isSDK(o: any): o is MsgDelegateResponseSDKType;
    encode(_: MsgDelegateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDelegateResponse;
    fromJSON(_: any): MsgDelegateResponse;
    toJSON(_: MsgDelegateResponse): JsonSafe<MsgDelegateResponse>;
    fromPartial(_: Partial<MsgDelegateResponse>): MsgDelegateResponse;
    fromProtoMsg(message: MsgDelegateResponseProtoMsg): MsgDelegateResponse;
    toProto(message: MsgDelegateResponse): Uint8Array;
    toProtoMsg(message: MsgDelegateResponse): MsgDelegateResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgBeginRedelegate defines a SDK message for performing a redelegation
 * of coins from a delegator and source validator to a destination validator.
 * @name MsgBeginRedelegate
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgBeginRedelegate
 */
export declare const MsgBeginRedelegate: {
    typeUrl: "/cosmos.staking.v1beta1.MsgBeginRedelegate";
    aminoType: "cosmos-sdk/MsgBeginRedelegate";
    is(o: any): o is MsgBeginRedelegate;
    isSDK(o: any): o is MsgBeginRedelegateSDKType;
    encode(message: MsgBeginRedelegate, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgBeginRedelegate;
    fromJSON(object: any): MsgBeginRedelegate;
    toJSON(message: MsgBeginRedelegate): JsonSafe<MsgBeginRedelegate>;
    fromPartial(object: Partial<MsgBeginRedelegate>): MsgBeginRedelegate;
    fromProtoMsg(message: MsgBeginRedelegateProtoMsg): MsgBeginRedelegate;
    toProto(message: MsgBeginRedelegate): Uint8Array;
    toProtoMsg(message: MsgBeginRedelegate): MsgBeginRedelegateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgBeginRedelegateResponse defines the Msg/BeginRedelegate response type.
 * @name MsgBeginRedelegateResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgBeginRedelegateResponse
 */
export declare const MsgBeginRedelegateResponse: {
    typeUrl: "/cosmos.staking.v1beta1.MsgBeginRedelegateResponse";
    aminoType: "cosmos-sdk/MsgBeginRedelegateResponse";
    is(o: any): o is MsgBeginRedelegateResponse;
    isSDK(o: any): o is MsgBeginRedelegateResponseSDKType;
    encode(message: MsgBeginRedelegateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgBeginRedelegateResponse;
    fromJSON(object: any): MsgBeginRedelegateResponse;
    toJSON(message: MsgBeginRedelegateResponse): JsonSafe<MsgBeginRedelegateResponse>;
    fromPartial(object: Partial<MsgBeginRedelegateResponse>): MsgBeginRedelegateResponse;
    fromProtoMsg(message: MsgBeginRedelegateResponseProtoMsg): MsgBeginRedelegateResponse;
    toProto(message: MsgBeginRedelegateResponse): Uint8Array;
    toProtoMsg(message: MsgBeginRedelegateResponse): MsgBeginRedelegateResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUndelegate defines a SDK message for performing an undelegation from a
 * delegate and a validator.
 * @name MsgUndelegate
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgUndelegate
 */
export declare const MsgUndelegate: {
    typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate";
    aminoType: "cosmos-sdk/MsgUndelegate";
    is(o: any): o is MsgUndelegate;
    isSDK(o: any): o is MsgUndelegateSDKType;
    encode(message: MsgUndelegate, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUndelegate;
    fromJSON(object: any): MsgUndelegate;
    toJSON(message: MsgUndelegate): JsonSafe<MsgUndelegate>;
    fromPartial(object: Partial<MsgUndelegate>): MsgUndelegate;
    fromProtoMsg(message: MsgUndelegateProtoMsg): MsgUndelegate;
    toProto(message: MsgUndelegate): Uint8Array;
    toProtoMsg(message: MsgUndelegate): MsgUndelegateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUndelegateResponse defines the Msg/Undelegate response type.
 * @name MsgUndelegateResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgUndelegateResponse
 */
export declare const MsgUndelegateResponse: {
    typeUrl: "/cosmos.staking.v1beta1.MsgUndelegateResponse";
    aminoType: "cosmos-sdk/MsgUndelegateResponse";
    is(o: any): o is MsgUndelegateResponse;
    isSDK(o: any): o is MsgUndelegateResponseSDKType;
    encode(message: MsgUndelegateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUndelegateResponse;
    fromJSON(object: any): MsgUndelegateResponse;
    toJSON(message: MsgUndelegateResponse): JsonSafe<MsgUndelegateResponse>;
    fromPartial(object: Partial<MsgUndelegateResponse>): MsgUndelegateResponse;
    fromProtoMsg(message: MsgUndelegateResponseProtoMsg): MsgUndelegateResponse;
    toProto(message: MsgUndelegateResponse): Uint8Array;
    toProtoMsg(message: MsgUndelegateResponse): MsgUndelegateResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCancelUnbondingDelegation defines the SDK message for performing a cancel unbonding delegation for delegator
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUnbondingDelegation
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgCancelUnbondingDelegation
 */
export declare const MsgCancelUnbondingDelegation: {
    typeUrl: "/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation";
    aminoType: "cosmos-sdk/MsgCancelUnbondingDelegation";
    is(o: any): o is MsgCancelUnbondingDelegation;
    isSDK(o: any): o is MsgCancelUnbondingDelegationSDKType;
    encode(message: MsgCancelUnbondingDelegation, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCancelUnbondingDelegation;
    fromJSON(object: any): MsgCancelUnbondingDelegation;
    toJSON(message: MsgCancelUnbondingDelegation): JsonSafe<MsgCancelUnbondingDelegation>;
    fromPartial(object: Partial<MsgCancelUnbondingDelegation>): MsgCancelUnbondingDelegation;
    fromProtoMsg(message: MsgCancelUnbondingDelegationProtoMsg): MsgCancelUnbondingDelegation;
    toProto(message: MsgCancelUnbondingDelegation): Uint8Array;
    toProtoMsg(message: MsgCancelUnbondingDelegation): MsgCancelUnbondingDelegationProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCancelUnbondingDelegationResponse
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCancelUnbondingDelegationResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgCancelUnbondingDelegationResponse
 */
export declare const MsgCancelUnbondingDelegationResponse: {
    typeUrl: "/cosmos.staking.v1beta1.MsgCancelUnbondingDelegationResponse";
    aminoType: "cosmos-sdk/MsgCancelUnbondingDelegationResponse";
    is(o: any): o is MsgCancelUnbondingDelegationResponse;
    isSDK(o: any): o is MsgCancelUnbondingDelegationResponseSDKType;
    encode(_: MsgCancelUnbondingDelegationResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCancelUnbondingDelegationResponse;
    fromJSON(_: any): MsgCancelUnbondingDelegationResponse;
    toJSON(_: MsgCancelUnbondingDelegationResponse): JsonSafe<MsgCancelUnbondingDelegationResponse>;
    fromPartial(_: Partial<MsgCancelUnbondingDelegationResponse>): MsgCancelUnbondingDelegationResponse;
    fromProtoMsg(message: MsgCancelUnbondingDelegationResponseProtoMsg): MsgCancelUnbondingDelegationResponse;
    toProto(message: MsgCancelUnbondingDelegationResponse): Uint8Array;
    toProtoMsg(message: MsgCancelUnbondingDelegationResponse): MsgCancelUnbondingDelegationResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParams
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgUpdateParams
 */
export declare const MsgUpdateParams: {
    typeUrl: "/cosmos.staking.v1beta1.MsgUpdateParams";
    aminoType: "cosmos-sdk/x/staking/MsgUpdateParams";
    is(o: any): o is MsgUpdateParams;
    isSDK(o: any): o is MsgUpdateParamsSDKType;
    encode(message: MsgUpdateParams, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateParams;
    fromJSON(object: any): MsgUpdateParams;
    toJSON(message: MsgUpdateParams): JsonSafe<MsgUpdateParams>;
    fromPartial(object: Partial<MsgUpdateParams>): MsgUpdateParams;
    fromProtoMsg(message: MsgUpdateParamsProtoMsg): MsgUpdateParams;
    toProto(message: MsgUpdateParams): Uint8Array;
    toProtoMsg(message: MsgUpdateParams): MsgUpdateParamsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParamsResponse
 * @package cosmos.staking.v1beta1
 * @see proto type: cosmos.staking.v1beta1.MsgUpdateParamsResponse
 */
export declare const MsgUpdateParamsResponse: {
    typeUrl: "/cosmos.staking.v1beta1.MsgUpdateParamsResponse";
    aminoType: "cosmos-sdk/MsgUpdateParamsResponse";
    is(o: any): o is MsgUpdateParamsResponse;
    isSDK(o: any): o is MsgUpdateParamsResponseSDKType;
    encode(_: MsgUpdateParamsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateParamsResponse;
    fromJSON(_: any): MsgUpdateParamsResponse;
    toJSON(_: MsgUpdateParamsResponse): JsonSafe<MsgUpdateParamsResponse>;
    fromPartial(_: Partial<MsgUpdateParamsResponse>): MsgUpdateParamsResponse;
    fromProtoMsg(message: MsgUpdateParamsResponseProtoMsg): MsgUpdateParamsResponse;
    toProto(message: MsgUpdateParamsResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateParamsResponse): MsgUpdateParamsResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map