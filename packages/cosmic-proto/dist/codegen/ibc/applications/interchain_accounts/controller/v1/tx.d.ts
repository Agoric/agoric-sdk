import { Order } from '../../../../core/channel/v1/channel.js';
import { InterchainAccountPacketData, type InterchainAccountPacketDataSDKType } from '../../v1/packet.js';
import { Params, type ParamsSDKType } from './controller.js';
import { BinaryReader, BinaryWriter } from '../../../../../binary.js';
import { type JsonSafe } from '../../../../../json-safe.js';
/**
 * MsgRegisterInterchainAccount defines the payload for Msg/RegisterAccount
 * @name MsgRegisterInterchainAccount
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount
 */
export interface MsgRegisterInterchainAccount {
    owner: string;
    connectionId: string;
    version: string;
    ordering: Order;
}
export interface MsgRegisterInterchainAccountProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount';
    value: Uint8Array;
}
/**
 * MsgRegisterInterchainAccount defines the payload for Msg/RegisterAccount
 * @name MsgRegisterInterchainAccountSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount
 */
export interface MsgRegisterInterchainAccountSDKType {
    owner: string;
    connection_id: string;
    version: string;
    ordering: Order;
}
/**
 * MsgRegisterInterchainAccountResponse defines the response for Msg/RegisterAccount
 * @name MsgRegisterInterchainAccountResponse
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccountResponse
 */
export interface MsgRegisterInterchainAccountResponse {
    channelId: string;
    portId: string;
}
export interface MsgRegisterInterchainAccountResponseProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccountResponse';
    value: Uint8Array;
}
/**
 * MsgRegisterInterchainAccountResponse defines the response for Msg/RegisterAccount
 * @name MsgRegisterInterchainAccountResponseSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccountResponse
 */
export interface MsgRegisterInterchainAccountResponseSDKType {
    channel_id: string;
    port_id: string;
}
/**
 * MsgSendTx defines the payload for Msg/SendTx
 * @name MsgSendTx
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgSendTx
 */
export interface MsgSendTx {
    owner: string;
    connectionId: string;
    packetData: InterchainAccountPacketData;
    /**
     * Relative timeout timestamp provided will be added to the current block time during transaction execution.
     * The timeout timestamp must be non-zero.
     */
    relativeTimeout: bigint;
}
export interface MsgSendTxProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.controller.v1.MsgSendTx';
    value: Uint8Array;
}
/**
 * MsgSendTx defines the payload for Msg/SendTx
 * @name MsgSendTxSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgSendTx
 */
export interface MsgSendTxSDKType {
    owner: string;
    connection_id: string;
    packet_data: InterchainAccountPacketDataSDKType;
    relative_timeout: bigint;
}
/**
 * MsgSendTxResponse defines the response for MsgSendTx
 * @name MsgSendTxResponse
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgSendTxResponse
 */
export interface MsgSendTxResponse {
    sequence: bigint;
}
export interface MsgSendTxResponseProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.controller.v1.MsgSendTxResponse';
    value: Uint8Array;
}
/**
 * MsgSendTxResponse defines the response for MsgSendTx
 * @name MsgSendTxResponseSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgSendTxResponse
 */
export interface MsgSendTxResponseSDKType {
    sequence: bigint;
}
/**
 * MsgUpdateParams defines the payload for Msg/UpdateParams
 * @name MsgUpdateParams
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgUpdateParams
 */
export interface MsgUpdateParams {
    /**
     * signer address
     */
    signer: string;
    /**
     * params defines the 27-interchain-accounts/controller parameters to update.
     *
     * NOTE: All parameters must be supplied.
     */
    params: Params;
}
export interface MsgUpdateParamsProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.controller.v1.MsgUpdateParams';
    value: Uint8Array;
}
/**
 * MsgUpdateParams defines the payload for Msg/UpdateParams
 * @name MsgUpdateParamsSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgUpdateParams
 */
export interface MsgUpdateParamsSDKType {
    signer: string;
    params: ParamsSDKType;
}
/**
 * MsgUpdateParamsResponse defines the response for Msg/UpdateParams
 * @name MsgUpdateParamsResponse
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponse {
}
export interface MsgUpdateParamsResponseProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.controller.v1.MsgUpdateParamsResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the response for Msg/UpdateParams
 * @name MsgUpdateParamsResponseSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponseSDKType {
}
/**
 * MsgRegisterInterchainAccount defines the payload for Msg/RegisterAccount
 * @name MsgRegisterInterchainAccount
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount
 */
export declare const MsgRegisterInterchainAccount: {
    typeUrl: "/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount";
    aminoType: "cosmos-sdk/MsgRegisterInterchainAccount";
    is(o: any): o is MsgRegisterInterchainAccount;
    isSDK(o: any): o is MsgRegisterInterchainAccountSDKType;
    encode(message: MsgRegisterInterchainAccount, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRegisterInterchainAccount;
    fromJSON(object: any): MsgRegisterInterchainAccount;
    toJSON(message: MsgRegisterInterchainAccount): JsonSafe<MsgRegisterInterchainAccount>;
    fromPartial(object: Partial<MsgRegisterInterchainAccount>): MsgRegisterInterchainAccount;
    fromProtoMsg(message: MsgRegisterInterchainAccountProtoMsg): MsgRegisterInterchainAccount;
    toProto(message: MsgRegisterInterchainAccount): Uint8Array;
    toProtoMsg(message: MsgRegisterInterchainAccount): MsgRegisterInterchainAccountProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgRegisterInterchainAccountResponse defines the response for Msg/RegisterAccount
 * @name MsgRegisterInterchainAccountResponse
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccountResponse
 */
export declare const MsgRegisterInterchainAccountResponse: {
    typeUrl: "/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccountResponse";
    aminoType: "cosmos-sdk/MsgRegisterInterchainAccountResponse";
    is(o: any): o is MsgRegisterInterchainAccountResponse;
    isSDK(o: any): o is MsgRegisterInterchainAccountResponseSDKType;
    encode(message: MsgRegisterInterchainAccountResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRegisterInterchainAccountResponse;
    fromJSON(object: any): MsgRegisterInterchainAccountResponse;
    toJSON(message: MsgRegisterInterchainAccountResponse): JsonSafe<MsgRegisterInterchainAccountResponse>;
    fromPartial(object: Partial<MsgRegisterInterchainAccountResponse>): MsgRegisterInterchainAccountResponse;
    fromProtoMsg(message: MsgRegisterInterchainAccountResponseProtoMsg): MsgRegisterInterchainAccountResponse;
    toProto(message: MsgRegisterInterchainAccountResponse): Uint8Array;
    toProtoMsg(message: MsgRegisterInterchainAccountResponse): MsgRegisterInterchainAccountResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgSendTx defines the payload for Msg/SendTx
 * @name MsgSendTx
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgSendTx
 */
export declare const MsgSendTx: {
    typeUrl: "/ibc.applications.interchain_accounts.controller.v1.MsgSendTx";
    aminoType: "cosmos-sdk/MsgSendTx";
    is(o: any): o is MsgSendTx;
    isSDK(o: any): o is MsgSendTxSDKType;
    encode(message: MsgSendTx, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSendTx;
    fromJSON(object: any): MsgSendTx;
    toJSON(message: MsgSendTx): JsonSafe<MsgSendTx>;
    fromPartial(object: Partial<MsgSendTx>): MsgSendTx;
    fromProtoMsg(message: MsgSendTxProtoMsg): MsgSendTx;
    toProto(message: MsgSendTx): Uint8Array;
    toProtoMsg(message: MsgSendTx): MsgSendTxProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgSendTxResponse defines the response for MsgSendTx
 * @name MsgSendTxResponse
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgSendTxResponse
 */
export declare const MsgSendTxResponse: {
    typeUrl: "/ibc.applications.interchain_accounts.controller.v1.MsgSendTxResponse";
    aminoType: "cosmos-sdk/MsgSendTxResponse";
    is(o: any): o is MsgSendTxResponse;
    isSDK(o: any): o is MsgSendTxResponseSDKType;
    encode(message: MsgSendTxResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSendTxResponse;
    fromJSON(object: any): MsgSendTxResponse;
    toJSON(message: MsgSendTxResponse): JsonSafe<MsgSendTxResponse>;
    fromPartial(object: Partial<MsgSendTxResponse>): MsgSendTxResponse;
    fromProtoMsg(message: MsgSendTxResponseProtoMsg): MsgSendTxResponse;
    toProto(message: MsgSendTxResponse): Uint8Array;
    toProtoMsg(message: MsgSendTxResponse): MsgSendTxResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateParams defines the payload for Msg/UpdateParams
 * @name MsgUpdateParams
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgUpdateParams
 */
export declare const MsgUpdateParams: {
    typeUrl: "/ibc.applications.interchain_accounts.controller.v1.MsgUpdateParams";
    aminoType: "cosmos-sdk/MsgUpdateParams";
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
 * MsgUpdateParamsResponse defines the response for Msg/UpdateParams
 * @name MsgUpdateParamsResponse
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.MsgUpdateParamsResponse
 */
export declare const MsgUpdateParamsResponse: {
    typeUrl: "/ibc.applications.interchain_accounts.controller.v1.MsgUpdateParamsResponse";
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