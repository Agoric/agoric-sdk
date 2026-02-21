import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import { Params, type ParamsSDKType } from './distribution.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgSetWithdrawAddress sets the withdraw address for
 * a delegator (or validator self-delegation).
 * @name MsgSetWithdrawAddress
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgSetWithdrawAddress
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
 * @name MsgSetWithdrawAddressSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgSetWithdrawAddress
 */
export interface MsgSetWithdrawAddressSDKType {
    delegator_address: string;
    withdraw_address: string;
}
/**
 * MsgSetWithdrawAddressResponse defines the Msg/SetWithdrawAddress response
 * type.
 * @name MsgSetWithdrawAddressResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgSetWithdrawAddressResponse
 */
export interface MsgSetWithdrawAddressResponse {
}
export interface MsgSetWithdrawAddressResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.MsgSetWithdrawAddressResponse';
    value: Uint8Array;
}
/**
 * MsgSetWithdrawAddressResponse defines the Msg/SetWithdrawAddress response
 * type.
 * @name MsgSetWithdrawAddressResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgSetWithdrawAddressResponse
 */
export interface MsgSetWithdrawAddressResponseSDKType {
}
/**
 * MsgWithdrawDelegatorReward represents delegation withdrawal to a delegator
 * from a single validator.
 * @name MsgWithdrawDelegatorReward
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward
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
 * @name MsgWithdrawDelegatorRewardSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward
 */
export interface MsgWithdrawDelegatorRewardSDKType {
    delegator_address: string;
    validator_address: string;
}
/**
 * MsgWithdrawDelegatorRewardResponse defines the Msg/WithdrawDelegatorReward
 * response type.
 * @name MsgWithdrawDelegatorRewardResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgWithdrawDelegatorRewardResponse
 */
export interface MsgWithdrawDelegatorRewardResponse {
    /**
     * Since: cosmos-sdk 0.46
     */
    amount: Coin[];
}
export interface MsgWithdrawDelegatorRewardResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorRewardResponse';
    value: Uint8Array;
}
/**
 * MsgWithdrawDelegatorRewardResponse defines the Msg/WithdrawDelegatorReward
 * response type.
 * @name MsgWithdrawDelegatorRewardResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgWithdrawDelegatorRewardResponse
 */
export interface MsgWithdrawDelegatorRewardResponseSDKType {
    amount: CoinSDKType[];
}
/**
 * MsgWithdrawValidatorCommission withdraws the full commission to the validator
 * address.
 * @name MsgWithdrawValidatorCommission
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission
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
 * @name MsgWithdrawValidatorCommissionSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission
 */
export interface MsgWithdrawValidatorCommissionSDKType {
    validator_address: string;
}
/**
 * MsgWithdrawValidatorCommissionResponse defines the
 * Msg/WithdrawValidatorCommission response type.
 * @name MsgWithdrawValidatorCommissionResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgWithdrawValidatorCommissionResponse
 */
export interface MsgWithdrawValidatorCommissionResponse {
    /**
     * Since: cosmos-sdk 0.46
     */
    amount: Coin[];
}
export interface MsgWithdrawValidatorCommissionResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommissionResponse';
    value: Uint8Array;
}
/**
 * MsgWithdrawValidatorCommissionResponse defines the
 * Msg/WithdrawValidatorCommission response type.
 * @name MsgWithdrawValidatorCommissionResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgWithdrawValidatorCommissionResponse
 */
export interface MsgWithdrawValidatorCommissionResponseSDKType {
    amount: CoinSDKType[];
}
/**
 * MsgFundCommunityPool allows an account to directly
 * fund the community pool.
 * @name MsgFundCommunityPool
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgFundCommunityPool
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
 * @name MsgFundCommunityPoolSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgFundCommunityPool
 */
export interface MsgFundCommunityPoolSDKType {
    amount: CoinSDKType[];
    depositor: string;
}
/**
 * MsgFundCommunityPoolResponse defines the Msg/FundCommunityPool response type.
 * @name MsgFundCommunityPoolResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgFundCommunityPoolResponse
 */
export interface MsgFundCommunityPoolResponse {
}
export interface MsgFundCommunityPoolResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.MsgFundCommunityPoolResponse';
    value: Uint8Array;
}
/**
 * MsgFundCommunityPoolResponse defines the Msg/FundCommunityPool response type.
 * @name MsgFundCommunityPoolResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgFundCommunityPoolResponse
 */
export interface MsgFundCommunityPoolResponseSDKType {
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParams
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgUpdateParams
 */
export interface MsgUpdateParams {
    /**
     * authority is the address that controls the module (defaults to x/gov unless overwritten).
     */
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
 * @name MsgUpdateParamsSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgUpdateParams
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
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponse {
}
export interface MsgUpdateParamsResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.MsgUpdateParamsResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParamsResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponseSDKType {
}
/**
 * MsgCommunityPoolSpend defines a message for sending tokens from the community
 * pool to another account. This message is typically executed via a governance
 * proposal with the governance module being the executing authority.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgCommunityPoolSpend
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgCommunityPoolSpend
 */
export interface MsgCommunityPoolSpend {
    /**
     * authority is the address that controls the module (defaults to x/gov unless overwritten).
     */
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
 * @name MsgCommunityPoolSpendSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgCommunityPoolSpend
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
 * @name MsgCommunityPoolSpendResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgCommunityPoolSpendResponse
 */
export interface MsgCommunityPoolSpendResponse {
}
export interface MsgCommunityPoolSpendResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.MsgCommunityPoolSpendResponse';
    value: Uint8Array;
}
/**
 * MsgCommunityPoolSpendResponse defines the response to executing a
 * MsgCommunityPoolSpend message.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgCommunityPoolSpendResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgCommunityPoolSpendResponse
 */
export interface MsgCommunityPoolSpendResponseSDKType {
}
/**
 * DepositValidatorRewardsPool defines the request structure to provide
 * additional rewards to delegators from a specific validator.
 *
 * Since: cosmos-sdk 0.50
 * @name MsgDepositValidatorRewardsPool
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPool
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
 * @name MsgDepositValidatorRewardsPoolSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPool
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
 * @name MsgDepositValidatorRewardsPoolResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPoolResponse
 */
export interface MsgDepositValidatorRewardsPoolResponse {
}
export interface MsgDepositValidatorRewardsPoolResponseProtoMsg {
    typeUrl: '/cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPoolResponse';
    value: Uint8Array;
}
/**
 * MsgDepositValidatorRewardsPoolResponse defines the response to executing a
 * MsgDepositValidatorRewardsPool message.
 *
 * Since: cosmos-sdk 0.50
 * @name MsgDepositValidatorRewardsPoolResponseSDKType
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPoolResponse
 */
export interface MsgDepositValidatorRewardsPoolResponseSDKType {
}
/**
 * MsgSetWithdrawAddress sets the withdraw address for
 * a delegator (or validator self-delegation).
 * @name MsgSetWithdrawAddress
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgSetWithdrawAddress
 */
export declare const MsgSetWithdrawAddress: {
    typeUrl: "/cosmos.distribution.v1beta1.MsgSetWithdrawAddress";
    aminoType: "cosmos-sdk/MsgModifyWithdrawAddress";
    is(o: any): o is MsgSetWithdrawAddress;
    isSDK(o: any): o is MsgSetWithdrawAddressSDKType;
    encode(message: MsgSetWithdrawAddress, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSetWithdrawAddress;
    fromJSON(object: any): MsgSetWithdrawAddress;
    toJSON(message: MsgSetWithdrawAddress): JsonSafe<MsgSetWithdrawAddress>;
    fromPartial(object: Partial<MsgSetWithdrawAddress>): MsgSetWithdrawAddress;
    fromProtoMsg(message: MsgSetWithdrawAddressProtoMsg): MsgSetWithdrawAddress;
    toProto(message: MsgSetWithdrawAddress): Uint8Array;
    toProtoMsg(message: MsgSetWithdrawAddress): MsgSetWithdrawAddressProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgSetWithdrawAddressResponse defines the Msg/SetWithdrawAddress response
 * type.
 * @name MsgSetWithdrawAddressResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgSetWithdrawAddressResponse
 */
export declare const MsgSetWithdrawAddressResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.MsgSetWithdrawAddressResponse";
    aminoType: "cosmos-sdk/MsgSetWithdrawAddressResponse";
    is(o: any): o is MsgSetWithdrawAddressResponse;
    isSDK(o: any): o is MsgSetWithdrawAddressResponseSDKType;
    encode(_: MsgSetWithdrawAddressResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSetWithdrawAddressResponse;
    fromJSON(_: any): MsgSetWithdrawAddressResponse;
    toJSON(_: MsgSetWithdrawAddressResponse): JsonSafe<MsgSetWithdrawAddressResponse>;
    fromPartial(_: Partial<MsgSetWithdrawAddressResponse>): MsgSetWithdrawAddressResponse;
    fromProtoMsg(message: MsgSetWithdrawAddressResponseProtoMsg): MsgSetWithdrawAddressResponse;
    toProto(message: MsgSetWithdrawAddressResponse): Uint8Array;
    toProtoMsg(message: MsgSetWithdrawAddressResponse): MsgSetWithdrawAddressResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgWithdrawDelegatorReward represents delegation withdrawal to a delegator
 * from a single validator.
 * @name MsgWithdrawDelegatorReward
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward
 */
export declare const MsgWithdrawDelegatorReward: {
    typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward";
    aminoType: "cosmos-sdk/MsgWithdrawDelegationReward";
    is(o: any): o is MsgWithdrawDelegatorReward;
    isSDK(o: any): o is MsgWithdrawDelegatorRewardSDKType;
    encode(message: MsgWithdrawDelegatorReward, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgWithdrawDelegatorReward;
    fromJSON(object: any): MsgWithdrawDelegatorReward;
    toJSON(message: MsgWithdrawDelegatorReward): JsonSafe<MsgWithdrawDelegatorReward>;
    fromPartial(object: Partial<MsgWithdrawDelegatorReward>): MsgWithdrawDelegatorReward;
    fromProtoMsg(message: MsgWithdrawDelegatorRewardProtoMsg): MsgWithdrawDelegatorReward;
    toProto(message: MsgWithdrawDelegatorReward): Uint8Array;
    toProtoMsg(message: MsgWithdrawDelegatorReward): MsgWithdrawDelegatorRewardProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgWithdrawDelegatorRewardResponse defines the Msg/WithdrawDelegatorReward
 * response type.
 * @name MsgWithdrawDelegatorRewardResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgWithdrawDelegatorRewardResponse
 */
export declare const MsgWithdrawDelegatorRewardResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorRewardResponse";
    aminoType: "cosmos-sdk/MsgWithdrawDelegatorRewardResponse";
    is(o: any): o is MsgWithdrawDelegatorRewardResponse;
    isSDK(o: any): o is MsgWithdrawDelegatorRewardResponseSDKType;
    encode(message: MsgWithdrawDelegatorRewardResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgWithdrawDelegatorRewardResponse;
    fromJSON(object: any): MsgWithdrawDelegatorRewardResponse;
    toJSON(message: MsgWithdrawDelegatorRewardResponse): JsonSafe<MsgWithdrawDelegatorRewardResponse>;
    fromPartial(object: Partial<MsgWithdrawDelegatorRewardResponse>): MsgWithdrawDelegatorRewardResponse;
    fromProtoMsg(message: MsgWithdrawDelegatorRewardResponseProtoMsg): MsgWithdrawDelegatorRewardResponse;
    toProto(message: MsgWithdrawDelegatorRewardResponse): Uint8Array;
    toProtoMsg(message: MsgWithdrawDelegatorRewardResponse): MsgWithdrawDelegatorRewardResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgWithdrawValidatorCommission withdraws the full commission to the validator
 * address.
 * @name MsgWithdrawValidatorCommission
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission
 */
export declare const MsgWithdrawValidatorCommission: {
    typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission";
    aminoType: "cosmos-sdk/MsgWithdrawValidatorCommission";
    is(o: any): o is MsgWithdrawValidatorCommission;
    isSDK(o: any): o is MsgWithdrawValidatorCommissionSDKType;
    encode(message: MsgWithdrawValidatorCommission, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgWithdrawValidatorCommission;
    fromJSON(object: any): MsgWithdrawValidatorCommission;
    toJSON(message: MsgWithdrawValidatorCommission): JsonSafe<MsgWithdrawValidatorCommission>;
    fromPartial(object: Partial<MsgWithdrawValidatorCommission>): MsgWithdrawValidatorCommission;
    fromProtoMsg(message: MsgWithdrawValidatorCommissionProtoMsg): MsgWithdrawValidatorCommission;
    toProto(message: MsgWithdrawValidatorCommission): Uint8Array;
    toProtoMsg(message: MsgWithdrawValidatorCommission): MsgWithdrawValidatorCommissionProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgWithdrawValidatorCommissionResponse defines the
 * Msg/WithdrawValidatorCommission response type.
 * @name MsgWithdrawValidatorCommissionResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgWithdrawValidatorCommissionResponse
 */
export declare const MsgWithdrawValidatorCommissionResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommissionResponse";
    aminoType: "cosmos-sdk/MsgWithdrawValidatorCommissionResponse";
    is(o: any): o is MsgWithdrawValidatorCommissionResponse;
    isSDK(o: any): o is MsgWithdrawValidatorCommissionResponseSDKType;
    encode(message: MsgWithdrawValidatorCommissionResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgWithdrawValidatorCommissionResponse;
    fromJSON(object: any): MsgWithdrawValidatorCommissionResponse;
    toJSON(message: MsgWithdrawValidatorCommissionResponse): JsonSafe<MsgWithdrawValidatorCommissionResponse>;
    fromPartial(object: Partial<MsgWithdrawValidatorCommissionResponse>): MsgWithdrawValidatorCommissionResponse;
    fromProtoMsg(message: MsgWithdrawValidatorCommissionResponseProtoMsg): MsgWithdrawValidatorCommissionResponse;
    toProto(message: MsgWithdrawValidatorCommissionResponse): Uint8Array;
    toProtoMsg(message: MsgWithdrawValidatorCommissionResponse): MsgWithdrawValidatorCommissionResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgFundCommunityPool allows an account to directly
 * fund the community pool.
 * @name MsgFundCommunityPool
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgFundCommunityPool
 */
export declare const MsgFundCommunityPool: {
    typeUrl: "/cosmos.distribution.v1beta1.MsgFundCommunityPool";
    aminoType: "cosmos-sdk/MsgFundCommunityPool";
    is(o: any): o is MsgFundCommunityPool;
    isSDK(o: any): o is MsgFundCommunityPoolSDKType;
    encode(message: MsgFundCommunityPool, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgFundCommunityPool;
    fromJSON(object: any): MsgFundCommunityPool;
    toJSON(message: MsgFundCommunityPool): JsonSafe<MsgFundCommunityPool>;
    fromPartial(object: Partial<MsgFundCommunityPool>): MsgFundCommunityPool;
    fromProtoMsg(message: MsgFundCommunityPoolProtoMsg): MsgFundCommunityPool;
    toProto(message: MsgFundCommunityPool): Uint8Array;
    toProtoMsg(message: MsgFundCommunityPool): MsgFundCommunityPoolProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgFundCommunityPoolResponse defines the Msg/FundCommunityPool response type.
 * @name MsgFundCommunityPoolResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgFundCommunityPoolResponse
 */
export declare const MsgFundCommunityPoolResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.MsgFundCommunityPoolResponse";
    aminoType: "cosmos-sdk/MsgFundCommunityPoolResponse";
    is(o: any): o is MsgFundCommunityPoolResponse;
    isSDK(o: any): o is MsgFundCommunityPoolResponseSDKType;
    encode(_: MsgFundCommunityPoolResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgFundCommunityPoolResponse;
    fromJSON(_: any): MsgFundCommunityPoolResponse;
    toJSON(_: MsgFundCommunityPoolResponse): JsonSafe<MsgFundCommunityPoolResponse>;
    fromPartial(_: Partial<MsgFundCommunityPoolResponse>): MsgFundCommunityPoolResponse;
    fromProtoMsg(message: MsgFundCommunityPoolResponseProtoMsg): MsgFundCommunityPoolResponse;
    toProto(message: MsgFundCommunityPoolResponse): Uint8Array;
    toProtoMsg(message: MsgFundCommunityPoolResponse): MsgFundCommunityPoolResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParams
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgUpdateParams
 */
export declare const MsgUpdateParams: {
    typeUrl: "/cosmos.distribution.v1beta1.MsgUpdateParams";
    aminoType: "cosmos-sdk/distribution/MsgUpdateParams";
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
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgUpdateParamsResponse
 */
export declare const MsgUpdateParamsResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.MsgUpdateParamsResponse";
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
/**
 * MsgCommunityPoolSpend defines a message for sending tokens from the community
 * pool to another account. This message is typically executed via a governance
 * proposal with the governance module being the executing authority.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgCommunityPoolSpend
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgCommunityPoolSpend
 */
export declare const MsgCommunityPoolSpend: {
    typeUrl: "/cosmos.distribution.v1beta1.MsgCommunityPoolSpend";
    aminoType: "cosmos-sdk/distr/MsgCommunityPoolSpend";
    is(o: any): o is MsgCommunityPoolSpend;
    isSDK(o: any): o is MsgCommunityPoolSpendSDKType;
    encode(message: MsgCommunityPoolSpend, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCommunityPoolSpend;
    fromJSON(object: any): MsgCommunityPoolSpend;
    toJSON(message: MsgCommunityPoolSpend): JsonSafe<MsgCommunityPoolSpend>;
    fromPartial(object: Partial<MsgCommunityPoolSpend>): MsgCommunityPoolSpend;
    fromProtoMsg(message: MsgCommunityPoolSpendProtoMsg): MsgCommunityPoolSpend;
    toProto(message: MsgCommunityPoolSpend): Uint8Array;
    toProtoMsg(message: MsgCommunityPoolSpend): MsgCommunityPoolSpendProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCommunityPoolSpendResponse defines the response to executing a
 * MsgCommunityPoolSpend message.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgCommunityPoolSpendResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgCommunityPoolSpendResponse
 */
export declare const MsgCommunityPoolSpendResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.MsgCommunityPoolSpendResponse";
    aminoType: "cosmos-sdk/MsgCommunityPoolSpendResponse";
    is(o: any): o is MsgCommunityPoolSpendResponse;
    isSDK(o: any): o is MsgCommunityPoolSpendResponseSDKType;
    encode(_: MsgCommunityPoolSpendResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCommunityPoolSpendResponse;
    fromJSON(_: any): MsgCommunityPoolSpendResponse;
    toJSON(_: MsgCommunityPoolSpendResponse): JsonSafe<MsgCommunityPoolSpendResponse>;
    fromPartial(_: Partial<MsgCommunityPoolSpendResponse>): MsgCommunityPoolSpendResponse;
    fromProtoMsg(message: MsgCommunityPoolSpendResponseProtoMsg): MsgCommunityPoolSpendResponse;
    toProto(message: MsgCommunityPoolSpendResponse): Uint8Array;
    toProtoMsg(message: MsgCommunityPoolSpendResponse): MsgCommunityPoolSpendResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * DepositValidatorRewardsPool defines the request structure to provide
 * additional rewards to delegators from a specific validator.
 *
 * Since: cosmos-sdk 0.50
 * @name MsgDepositValidatorRewardsPool
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPool
 */
export declare const MsgDepositValidatorRewardsPool: {
    typeUrl: "/cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPool";
    aminoType: "cosmos-sdk/distr/MsgDepositValRewards";
    is(o: any): o is MsgDepositValidatorRewardsPool;
    isSDK(o: any): o is MsgDepositValidatorRewardsPoolSDKType;
    encode(message: MsgDepositValidatorRewardsPool, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDepositValidatorRewardsPool;
    fromJSON(object: any): MsgDepositValidatorRewardsPool;
    toJSON(message: MsgDepositValidatorRewardsPool): JsonSafe<MsgDepositValidatorRewardsPool>;
    fromPartial(object: Partial<MsgDepositValidatorRewardsPool>): MsgDepositValidatorRewardsPool;
    fromProtoMsg(message: MsgDepositValidatorRewardsPoolProtoMsg): MsgDepositValidatorRewardsPool;
    toProto(message: MsgDepositValidatorRewardsPool): Uint8Array;
    toProtoMsg(message: MsgDepositValidatorRewardsPool): MsgDepositValidatorRewardsPoolProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgDepositValidatorRewardsPoolResponse defines the response to executing a
 * MsgDepositValidatorRewardsPool message.
 *
 * Since: cosmos-sdk 0.50
 * @name MsgDepositValidatorRewardsPoolResponse
 * @package cosmos.distribution.v1beta1
 * @see proto type: cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPoolResponse
 */
export declare const MsgDepositValidatorRewardsPoolResponse: {
    typeUrl: "/cosmos.distribution.v1beta1.MsgDepositValidatorRewardsPoolResponse";
    aminoType: "cosmos-sdk/MsgDepositValidatorRewardsPoolResponse";
    is(o: any): o is MsgDepositValidatorRewardsPoolResponse;
    isSDK(o: any): o is MsgDepositValidatorRewardsPoolResponseSDKType;
    encode(_: MsgDepositValidatorRewardsPoolResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDepositValidatorRewardsPoolResponse;
    fromJSON(_: any): MsgDepositValidatorRewardsPoolResponse;
    toJSON(_: MsgDepositValidatorRewardsPoolResponse): JsonSafe<MsgDepositValidatorRewardsPoolResponse>;
    fromPartial(_: Partial<MsgDepositValidatorRewardsPoolResponse>): MsgDepositValidatorRewardsPoolResponse;
    fromProtoMsg(message: MsgDepositValidatorRewardsPoolResponseProtoMsg): MsgDepositValidatorRewardsPoolResponse;
    toProto(message: MsgDepositValidatorRewardsPoolResponse): Uint8Array;
    toProtoMsg(message: MsgDepositValidatorRewardsPoolResponse): MsgDepositValidatorRewardsPoolResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map