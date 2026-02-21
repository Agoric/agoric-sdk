import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import { Period, type PeriodSDKType } from './vesting.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgCreateVestingAccount defines a message that enables creating a vesting
 * account.
 * @name MsgCreateVestingAccount
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreateVestingAccount
 */
export interface MsgCreateVestingAccount {
    fromAddress: string;
    toAddress: string;
    amount: Coin[];
    /**
     * end of vesting as unix time (in seconds).
     */
    endTime: bigint;
    delayed: boolean;
}
export interface MsgCreateVestingAccountProtoMsg {
    typeUrl: '/cosmos.vesting.v1beta1.MsgCreateVestingAccount';
    value: Uint8Array;
}
/**
 * MsgCreateVestingAccount defines a message that enables creating a vesting
 * account.
 * @name MsgCreateVestingAccountSDKType
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreateVestingAccount
 */
export interface MsgCreateVestingAccountSDKType {
    from_address: string;
    to_address: string;
    amount: CoinSDKType[];
    end_time: bigint;
    delayed: boolean;
}
/**
 * MsgCreateVestingAccountResponse defines the Msg/CreateVestingAccount response type.
 * @name MsgCreateVestingAccountResponse
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreateVestingAccountResponse
 */
export interface MsgCreateVestingAccountResponse {
}
export interface MsgCreateVestingAccountResponseProtoMsg {
    typeUrl: '/cosmos.vesting.v1beta1.MsgCreateVestingAccountResponse';
    value: Uint8Array;
}
/**
 * MsgCreateVestingAccountResponse defines the Msg/CreateVestingAccount response type.
 * @name MsgCreateVestingAccountResponseSDKType
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreateVestingAccountResponse
 */
export interface MsgCreateVestingAccountResponseSDKType {
}
/**
 * MsgCreatePermanentLockedAccount defines a message that enables creating a permanent
 * locked account.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCreatePermanentLockedAccount
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreatePermanentLockedAccount
 */
export interface MsgCreatePermanentLockedAccount {
    fromAddress: string;
    toAddress: string;
    amount: Coin[];
}
export interface MsgCreatePermanentLockedAccountProtoMsg {
    typeUrl: '/cosmos.vesting.v1beta1.MsgCreatePermanentLockedAccount';
    value: Uint8Array;
}
/**
 * MsgCreatePermanentLockedAccount defines a message that enables creating a permanent
 * locked account.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCreatePermanentLockedAccountSDKType
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreatePermanentLockedAccount
 */
export interface MsgCreatePermanentLockedAccountSDKType {
    from_address: string;
    to_address: string;
    amount: CoinSDKType[];
}
/**
 * MsgCreatePermanentLockedAccountResponse defines the Msg/CreatePermanentLockedAccount response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCreatePermanentLockedAccountResponse
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreatePermanentLockedAccountResponse
 */
export interface MsgCreatePermanentLockedAccountResponse {
}
export interface MsgCreatePermanentLockedAccountResponseProtoMsg {
    typeUrl: '/cosmos.vesting.v1beta1.MsgCreatePermanentLockedAccountResponse';
    value: Uint8Array;
}
/**
 * MsgCreatePermanentLockedAccountResponse defines the Msg/CreatePermanentLockedAccount response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCreatePermanentLockedAccountResponseSDKType
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreatePermanentLockedAccountResponse
 */
export interface MsgCreatePermanentLockedAccountResponseSDKType {
}
/**
 * MsgCreateVestingAccount defines a message that enables creating a vesting
 * account.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCreatePeriodicVestingAccount
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreatePeriodicVestingAccount
 */
export interface MsgCreatePeriodicVestingAccount {
    fromAddress: string;
    toAddress: string;
    /**
     * start of vesting as unix time (in seconds).
     */
    startTime: bigint;
    vestingPeriods: Period[];
    /**
     * If true, merge this new grant into an existing PeriodicVestingAccount,
     * or create it if it does not exist. If false, creates a new account,
     * or fails if an account already exists
     */
    merge: boolean;
}
export interface MsgCreatePeriodicVestingAccountProtoMsg {
    typeUrl: '/cosmos.vesting.v1beta1.MsgCreatePeriodicVestingAccount';
    value: Uint8Array;
}
/**
 * MsgCreateVestingAccount defines a message that enables creating a vesting
 * account.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCreatePeriodicVestingAccountSDKType
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreatePeriodicVestingAccount
 */
export interface MsgCreatePeriodicVestingAccountSDKType {
    from_address: string;
    to_address: string;
    start_time: bigint;
    vesting_periods: PeriodSDKType[];
    merge: boolean;
}
/**
 * MsgCreateVestingAccountResponse defines the Msg/CreatePeriodicVestingAccount
 * response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCreatePeriodicVestingAccountResponse
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreatePeriodicVestingAccountResponse
 */
export interface MsgCreatePeriodicVestingAccountResponse {
}
export interface MsgCreatePeriodicVestingAccountResponseProtoMsg {
    typeUrl: '/cosmos.vesting.v1beta1.MsgCreatePeriodicVestingAccountResponse';
    value: Uint8Array;
}
/**
 * MsgCreateVestingAccountResponse defines the Msg/CreatePeriodicVestingAccount
 * response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCreatePeriodicVestingAccountResponseSDKType
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreatePeriodicVestingAccountResponse
 */
export interface MsgCreatePeriodicVestingAccountResponseSDKType {
}
/**
 * MsgCreateClawbackVestingAccount defines a message that enables creating a ClawbackVestingAccount.
 * @name MsgCreateClawbackVestingAccount
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreateClawbackVestingAccount
 */
export interface MsgCreateClawbackVestingAccount {
    /**
     * Address of the account providing the funds, which must also sign the request.
     */
    fromAddress: string;
    /**
     * Address of the account to receive the funds.
     */
    toAddress: string;
    /**
     * Start time of the vesting. Periods start relative to this time.
     */
    startTime: bigint;
    /**
     * Unlocking events as a sequence of durations and amounts, starting relative to start_time.
     */
    lockupPeriods: Period[];
    /**
     * Vesting events as a sequence of durations and amounts, starting relative to start_time.
     */
    vestingPeriods: Period[];
    /**
     * If true, merge this new grant into an existing ClawbackVestingAccount,
     * or create it if it does not exist. If false, creates a new account.
     * New grants to an existing account must be from the same from_address.
     */
    merge: boolean;
}
export interface MsgCreateClawbackVestingAccountProtoMsg {
    typeUrl: '/cosmos.vesting.v1beta1.MsgCreateClawbackVestingAccount';
    value: Uint8Array;
}
/**
 * MsgCreateClawbackVestingAccount defines a message that enables creating a ClawbackVestingAccount.
 * @name MsgCreateClawbackVestingAccountSDKType
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreateClawbackVestingAccount
 */
export interface MsgCreateClawbackVestingAccountSDKType {
    from_address: string;
    to_address: string;
    start_time: bigint;
    lockup_periods: PeriodSDKType[];
    vesting_periods: PeriodSDKType[];
    merge: boolean;
}
/**
 * MsgCreateClawbackVestingAccountResponse defines the MsgCreateClawbackVestingAccount response type.
 * @name MsgCreateClawbackVestingAccountResponse
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreateClawbackVestingAccountResponse
 */
export interface MsgCreateClawbackVestingAccountResponse {
}
export interface MsgCreateClawbackVestingAccountResponseProtoMsg {
    typeUrl: '/cosmos.vesting.v1beta1.MsgCreateClawbackVestingAccountResponse';
    value: Uint8Array;
}
/**
 * MsgCreateClawbackVestingAccountResponse defines the MsgCreateClawbackVestingAccount response type.
 * @name MsgCreateClawbackVestingAccountResponseSDKType
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreateClawbackVestingAccountResponse
 */
export interface MsgCreateClawbackVestingAccountResponseSDKType {
}
/**
 * MsgClawback defines a message that removes unvested tokens from a ClawbackVestingAccount.
 * @name MsgClawback
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgClawback
 */
export interface MsgClawback {
    /**
     * funder_address is the address which funded the account
     */
    funderAddress: string;
    /**
     * address is the address of the ClawbackVestingAccount to claw back from.
     */
    address: string;
    /**
     * dest_address specifies where the clawed-back tokens should be transferred.
     * If empty, the tokens will be transferred back to the original funder of the account.
     */
    destAddress: string;
}
export interface MsgClawbackProtoMsg {
    typeUrl: '/cosmos.vesting.v1beta1.MsgClawback';
    value: Uint8Array;
}
/**
 * MsgClawback defines a message that removes unvested tokens from a ClawbackVestingAccount.
 * @name MsgClawbackSDKType
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgClawback
 */
export interface MsgClawbackSDKType {
    funder_address: string;
    address: string;
    dest_address: string;
}
/**
 * MsgClawbackResponse defines the MsgClawback response type.
 * @name MsgClawbackResponse
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgClawbackResponse
 */
export interface MsgClawbackResponse {
}
export interface MsgClawbackResponseProtoMsg {
    typeUrl: '/cosmos.vesting.v1beta1.MsgClawbackResponse';
    value: Uint8Array;
}
/**
 * MsgClawbackResponse defines the MsgClawback response type.
 * @name MsgClawbackResponseSDKType
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgClawbackResponse
 */
export interface MsgClawbackResponseSDKType {
}
/**
 * MsgReturnGrants defines a message for a grantee to return all granted assets,
 * including delegated, undelegated and unbonding, vested and unvested,
 * are transferred to the original funder of the account. Might not be complete if
 * some vested assets have been transferred out of the account. Currently only applies to
 * ClawbackVesting accounts.
 * @name MsgReturnGrants
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgReturnGrants
 */
export interface MsgReturnGrants {
    /**
     * address is the address of the grantee account returning the grant.
     */
    address: string;
}
export interface MsgReturnGrantsProtoMsg {
    typeUrl: '/cosmos.vesting.v1beta1.MsgReturnGrants';
    value: Uint8Array;
}
/**
 * MsgReturnGrants defines a message for a grantee to return all granted assets,
 * including delegated, undelegated and unbonding, vested and unvested,
 * are transferred to the original funder of the account. Might not be complete if
 * some vested assets have been transferred out of the account. Currently only applies to
 * ClawbackVesting accounts.
 * @name MsgReturnGrantsSDKType
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgReturnGrants
 */
export interface MsgReturnGrantsSDKType {
    address: string;
}
/**
 * MsgReturnGrantsResponse defines the ReturnGrants response type.
 * @name MsgReturnGrantsResponse
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgReturnGrantsResponse
 */
export interface MsgReturnGrantsResponse {
}
export interface MsgReturnGrantsResponseProtoMsg {
    typeUrl: '/cosmos.vesting.v1beta1.MsgReturnGrantsResponse';
    value: Uint8Array;
}
/**
 * MsgReturnGrantsResponse defines the ReturnGrants response type.
 * @name MsgReturnGrantsResponseSDKType
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgReturnGrantsResponse
 */
export interface MsgReturnGrantsResponseSDKType {
}
/**
 * MsgCreateVestingAccount defines a message that enables creating a vesting
 * account.
 * @name MsgCreateVestingAccount
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreateVestingAccount
 */
export declare const MsgCreateVestingAccount: {
    typeUrl: "/cosmos.vesting.v1beta1.MsgCreateVestingAccount";
    aminoType: "cosmos-sdk/MsgCreateVestingAccount";
    is(o: any): o is MsgCreateVestingAccount;
    isSDK(o: any): o is MsgCreateVestingAccountSDKType;
    encode(message: MsgCreateVestingAccount, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateVestingAccount;
    fromJSON(object: any): MsgCreateVestingAccount;
    toJSON(message: MsgCreateVestingAccount): JsonSafe<MsgCreateVestingAccount>;
    fromPartial(object: Partial<MsgCreateVestingAccount>): MsgCreateVestingAccount;
    fromProtoMsg(message: MsgCreateVestingAccountProtoMsg): MsgCreateVestingAccount;
    toProto(message: MsgCreateVestingAccount): Uint8Array;
    toProtoMsg(message: MsgCreateVestingAccount): MsgCreateVestingAccountProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCreateVestingAccountResponse defines the Msg/CreateVestingAccount response type.
 * @name MsgCreateVestingAccountResponse
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreateVestingAccountResponse
 */
export declare const MsgCreateVestingAccountResponse: {
    typeUrl: "/cosmos.vesting.v1beta1.MsgCreateVestingAccountResponse";
    aminoType: "cosmos-sdk/MsgCreateVestingAccountResponse";
    is(o: any): o is MsgCreateVestingAccountResponse;
    isSDK(o: any): o is MsgCreateVestingAccountResponseSDKType;
    encode(_: MsgCreateVestingAccountResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateVestingAccountResponse;
    fromJSON(_: any): MsgCreateVestingAccountResponse;
    toJSON(_: MsgCreateVestingAccountResponse): JsonSafe<MsgCreateVestingAccountResponse>;
    fromPartial(_: Partial<MsgCreateVestingAccountResponse>): MsgCreateVestingAccountResponse;
    fromProtoMsg(message: MsgCreateVestingAccountResponseProtoMsg): MsgCreateVestingAccountResponse;
    toProto(message: MsgCreateVestingAccountResponse): Uint8Array;
    toProtoMsg(message: MsgCreateVestingAccountResponse): MsgCreateVestingAccountResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCreatePermanentLockedAccount defines a message that enables creating a permanent
 * locked account.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCreatePermanentLockedAccount
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreatePermanentLockedAccount
 */
export declare const MsgCreatePermanentLockedAccount: {
    typeUrl: "/cosmos.vesting.v1beta1.MsgCreatePermanentLockedAccount";
    aminoType: "cosmos-sdk/MsgCreatePermLockedAccount";
    is(o: any): o is MsgCreatePermanentLockedAccount;
    isSDK(o: any): o is MsgCreatePermanentLockedAccountSDKType;
    encode(message: MsgCreatePermanentLockedAccount, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreatePermanentLockedAccount;
    fromJSON(object: any): MsgCreatePermanentLockedAccount;
    toJSON(message: MsgCreatePermanentLockedAccount): JsonSafe<MsgCreatePermanentLockedAccount>;
    fromPartial(object: Partial<MsgCreatePermanentLockedAccount>): MsgCreatePermanentLockedAccount;
    fromProtoMsg(message: MsgCreatePermanentLockedAccountProtoMsg): MsgCreatePermanentLockedAccount;
    toProto(message: MsgCreatePermanentLockedAccount): Uint8Array;
    toProtoMsg(message: MsgCreatePermanentLockedAccount): MsgCreatePermanentLockedAccountProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCreatePermanentLockedAccountResponse defines the Msg/CreatePermanentLockedAccount response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCreatePermanentLockedAccountResponse
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreatePermanentLockedAccountResponse
 */
export declare const MsgCreatePermanentLockedAccountResponse: {
    typeUrl: "/cosmos.vesting.v1beta1.MsgCreatePermanentLockedAccountResponse";
    aminoType: "cosmos-sdk/MsgCreatePermanentLockedAccountResponse";
    is(o: any): o is MsgCreatePermanentLockedAccountResponse;
    isSDK(o: any): o is MsgCreatePermanentLockedAccountResponseSDKType;
    encode(_: MsgCreatePermanentLockedAccountResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreatePermanentLockedAccountResponse;
    fromJSON(_: any): MsgCreatePermanentLockedAccountResponse;
    toJSON(_: MsgCreatePermanentLockedAccountResponse): JsonSafe<MsgCreatePermanentLockedAccountResponse>;
    fromPartial(_: Partial<MsgCreatePermanentLockedAccountResponse>): MsgCreatePermanentLockedAccountResponse;
    fromProtoMsg(message: MsgCreatePermanentLockedAccountResponseProtoMsg): MsgCreatePermanentLockedAccountResponse;
    toProto(message: MsgCreatePermanentLockedAccountResponse): Uint8Array;
    toProtoMsg(message: MsgCreatePermanentLockedAccountResponse): MsgCreatePermanentLockedAccountResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCreateVestingAccount defines a message that enables creating a vesting
 * account.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCreatePeriodicVestingAccount
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreatePeriodicVestingAccount
 */
export declare const MsgCreatePeriodicVestingAccount: {
    typeUrl: "/cosmos.vesting.v1beta1.MsgCreatePeriodicVestingAccount";
    aminoType: "cosmos-sdk/MsgCreatePeriodVestAccount";
    is(o: any): o is MsgCreatePeriodicVestingAccount;
    isSDK(o: any): o is MsgCreatePeriodicVestingAccountSDKType;
    encode(message: MsgCreatePeriodicVestingAccount, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreatePeriodicVestingAccount;
    fromJSON(object: any): MsgCreatePeriodicVestingAccount;
    toJSON(message: MsgCreatePeriodicVestingAccount): JsonSafe<MsgCreatePeriodicVestingAccount>;
    fromPartial(object: Partial<MsgCreatePeriodicVestingAccount>): MsgCreatePeriodicVestingAccount;
    fromProtoMsg(message: MsgCreatePeriodicVestingAccountProtoMsg): MsgCreatePeriodicVestingAccount;
    toProto(message: MsgCreatePeriodicVestingAccount): Uint8Array;
    toProtoMsg(message: MsgCreatePeriodicVestingAccount): MsgCreatePeriodicVestingAccountProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCreateVestingAccountResponse defines the Msg/CreatePeriodicVestingAccount
 * response type.
 *
 * Since: cosmos-sdk 0.46
 * @name MsgCreatePeriodicVestingAccountResponse
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreatePeriodicVestingAccountResponse
 */
export declare const MsgCreatePeriodicVestingAccountResponse: {
    typeUrl: "/cosmos.vesting.v1beta1.MsgCreatePeriodicVestingAccountResponse";
    aminoType: "cosmos-sdk/MsgCreatePeriodicVestingAccountResponse";
    is(o: any): o is MsgCreatePeriodicVestingAccountResponse;
    isSDK(o: any): o is MsgCreatePeriodicVestingAccountResponseSDKType;
    encode(_: MsgCreatePeriodicVestingAccountResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreatePeriodicVestingAccountResponse;
    fromJSON(_: any): MsgCreatePeriodicVestingAccountResponse;
    toJSON(_: MsgCreatePeriodicVestingAccountResponse): JsonSafe<MsgCreatePeriodicVestingAccountResponse>;
    fromPartial(_: Partial<MsgCreatePeriodicVestingAccountResponse>): MsgCreatePeriodicVestingAccountResponse;
    fromProtoMsg(message: MsgCreatePeriodicVestingAccountResponseProtoMsg): MsgCreatePeriodicVestingAccountResponse;
    toProto(message: MsgCreatePeriodicVestingAccountResponse): Uint8Array;
    toProtoMsg(message: MsgCreatePeriodicVestingAccountResponse): MsgCreatePeriodicVestingAccountResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCreateClawbackVestingAccount defines a message that enables creating a ClawbackVestingAccount.
 * @name MsgCreateClawbackVestingAccount
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreateClawbackVestingAccount
 */
export declare const MsgCreateClawbackVestingAccount: {
    typeUrl: "/cosmos.vesting.v1beta1.MsgCreateClawbackVestingAccount";
    aminoType: "cosmos-sdk/MsgCreateClawbackVestingAccount";
    is(o: any): o is MsgCreateClawbackVestingAccount;
    isSDK(o: any): o is MsgCreateClawbackVestingAccountSDKType;
    encode(message: MsgCreateClawbackVestingAccount, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateClawbackVestingAccount;
    fromJSON(object: any): MsgCreateClawbackVestingAccount;
    toJSON(message: MsgCreateClawbackVestingAccount): JsonSafe<MsgCreateClawbackVestingAccount>;
    fromPartial(object: Partial<MsgCreateClawbackVestingAccount>): MsgCreateClawbackVestingAccount;
    fromProtoMsg(message: MsgCreateClawbackVestingAccountProtoMsg): MsgCreateClawbackVestingAccount;
    toProto(message: MsgCreateClawbackVestingAccount): Uint8Array;
    toProtoMsg(message: MsgCreateClawbackVestingAccount): MsgCreateClawbackVestingAccountProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgCreateClawbackVestingAccountResponse defines the MsgCreateClawbackVestingAccount response type.
 * @name MsgCreateClawbackVestingAccountResponse
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgCreateClawbackVestingAccountResponse
 */
export declare const MsgCreateClawbackVestingAccountResponse: {
    typeUrl: "/cosmos.vesting.v1beta1.MsgCreateClawbackVestingAccountResponse";
    aminoType: "cosmos-sdk/MsgCreateClawbackVestingAccountResponse";
    is(o: any): o is MsgCreateClawbackVestingAccountResponse;
    isSDK(o: any): o is MsgCreateClawbackVestingAccountResponseSDKType;
    encode(_: MsgCreateClawbackVestingAccountResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateClawbackVestingAccountResponse;
    fromJSON(_: any): MsgCreateClawbackVestingAccountResponse;
    toJSON(_: MsgCreateClawbackVestingAccountResponse): JsonSafe<MsgCreateClawbackVestingAccountResponse>;
    fromPartial(_: Partial<MsgCreateClawbackVestingAccountResponse>): MsgCreateClawbackVestingAccountResponse;
    fromProtoMsg(message: MsgCreateClawbackVestingAccountResponseProtoMsg): MsgCreateClawbackVestingAccountResponse;
    toProto(message: MsgCreateClawbackVestingAccountResponse): Uint8Array;
    toProtoMsg(message: MsgCreateClawbackVestingAccountResponse): MsgCreateClawbackVestingAccountResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgClawback defines a message that removes unvested tokens from a ClawbackVestingAccount.
 * @name MsgClawback
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgClawback
 */
export declare const MsgClawback: {
    typeUrl: "/cosmos.vesting.v1beta1.MsgClawback";
    aminoType: "cosmos-sdk/MsgClawback";
    is(o: any): o is MsgClawback;
    isSDK(o: any): o is MsgClawbackSDKType;
    encode(message: MsgClawback, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgClawback;
    fromJSON(object: any): MsgClawback;
    toJSON(message: MsgClawback): JsonSafe<MsgClawback>;
    fromPartial(object: Partial<MsgClawback>): MsgClawback;
    fromProtoMsg(message: MsgClawbackProtoMsg): MsgClawback;
    toProto(message: MsgClawback): Uint8Array;
    toProtoMsg(message: MsgClawback): MsgClawbackProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgClawbackResponse defines the MsgClawback response type.
 * @name MsgClawbackResponse
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgClawbackResponse
 */
export declare const MsgClawbackResponse: {
    typeUrl: "/cosmos.vesting.v1beta1.MsgClawbackResponse";
    aminoType: "cosmos-sdk/MsgClawbackResponse";
    is(o: any): o is MsgClawbackResponse;
    isSDK(o: any): o is MsgClawbackResponseSDKType;
    encode(_: MsgClawbackResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgClawbackResponse;
    fromJSON(_: any): MsgClawbackResponse;
    toJSON(_: MsgClawbackResponse): JsonSafe<MsgClawbackResponse>;
    fromPartial(_: Partial<MsgClawbackResponse>): MsgClawbackResponse;
    fromProtoMsg(message: MsgClawbackResponseProtoMsg): MsgClawbackResponse;
    toProto(message: MsgClawbackResponse): Uint8Array;
    toProtoMsg(message: MsgClawbackResponse): MsgClawbackResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgReturnGrants defines a message for a grantee to return all granted assets,
 * including delegated, undelegated and unbonding, vested and unvested,
 * are transferred to the original funder of the account. Might not be complete if
 * some vested assets have been transferred out of the account. Currently only applies to
 * ClawbackVesting accounts.
 * @name MsgReturnGrants
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgReturnGrants
 */
export declare const MsgReturnGrants: {
    typeUrl: "/cosmos.vesting.v1beta1.MsgReturnGrants";
    aminoType: "cosmos-sdk/MsgReturnGrants";
    is(o: any): o is MsgReturnGrants;
    isSDK(o: any): o is MsgReturnGrantsSDKType;
    encode(message: MsgReturnGrants, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgReturnGrants;
    fromJSON(object: any): MsgReturnGrants;
    toJSON(message: MsgReturnGrants): JsonSafe<MsgReturnGrants>;
    fromPartial(object: Partial<MsgReturnGrants>): MsgReturnGrants;
    fromProtoMsg(message: MsgReturnGrantsProtoMsg): MsgReturnGrants;
    toProto(message: MsgReturnGrants): Uint8Array;
    toProtoMsg(message: MsgReturnGrants): MsgReturnGrantsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgReturnGrantsResponse defines the ReturnGrants response type.
 * @name MsgReturnGrantsResponse
 * @package cosmos.vesting.v1beta1
 * @see proto type: cosmos.vesting.v1beta1.MsgReturnGrantsResponse
 */
export declare const MsgReturnGrantsResponse: {
    typeUrl: "/cosmos.vesting.v1beta1.MsgReturnGrantsResponse";
    aminoType: "cosmos-sdk/MsgReturnGrantsResponse";
    is(o: any): o is MsgReturnGrantsResponse;
    isSDK(o: any): o is MsgReturnGrantsResponseSDKType;
    encode(_: MsgReturnGrantsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgReturnGrantsResponse;
    fromJSON(_: any): MsgReturnGrantsResponse;
    toJSON(_: MsgReturnGrantsResponse): JsonSafe<MsgReturnGrantsResponse>;
    fromPartial(_: Partial<MsgReturnGrantsResponse>): MsgReturnGrantsResponse;
    fromProtoMsg(message: MsgReturnGrantsResponseProtoMsg): MsgReturnGrantsResponse;
    toProto(message: MsgReturnGrantsResponse): Uint8Array;
    toProtoMsg(message: MsgReturnGrantsResponse): MsgReturnGrantsResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map