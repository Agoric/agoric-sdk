import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import { Input, type InputSDKType, Output, type OutputSDKType, Params, type ParamsSDKType, SendEnabled, type SendEnabledSDKType } from './bank.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgSend represents a message to send coins from one account to another.
 * @name MsgSend
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgSend
 */
export interface MsgSend {
    fromAddress: string;
    toAddress: string;
    amount: Coin[];
}
export interface MsgSendProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.MsgSend';
    value: Uint8Array;
}
/**
 * MsgSend represents a message to send coins from one account to another.
 * @name MsgSendSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgSend
 */
export interface MsgSendSDKType {
    from_address: string;
    to_address: string;
    amount: CoinSDKType[];
}
/**
 * MsgSendResponse defines the Msg/Send response type.
 * @name MsgSendResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgSendResponse
 */
export interface MsgSendResponse {
}
export interface MsgSendResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.MsgSendResponse';
    value: Uint8Array;
}
/**
 * MsgSendResponse defines the Msg/Send response type.
 * @name MsgSendResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgSendResponse
 */
export interface MsgSendResponseSDKType {
}
/**
 * MsgMultiSend represents an arbitrary multi-in, multi-out send message.
 * @name MsgMultiSend
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgMultiSend
 */
export interface MsgMultiSend {
    /**
     * Inputs, despite being `repeated`, only allows one sender input. This is
     * checked in MsgMultiSend's ValidateBasic.
     */
    inputs: Input[];
    outputs: Output[];
}
export interface MsgMultiSendProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.MsgMultiSend';
    value: Uint8Array;
}
/**
 * MsgMultiSend represents an arbitrary multi-in, multi-out send message.
 * @name MsgMultiSendSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgMultiSend
 */
export interface MsgMultiSendSDKType {
    inputs: InputSDKType[];
    outputs: OutputSDKType[];
}
/**
 * MsgMultiSendResponse defines the Msg/MultiSend response type.
 * @name MsgMultiSendResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgMultiSendResponse
 */
export interface MsgMultiSendResponse {
}
export interface MsgMultiSendResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.MsgMultiSendResponse';
    value: Uint8Array;
}
/**
 * MsgMultiSendResponse defines the Msg/MultiSend response type.
 * @name MsgMultiSendResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgMultiSendResponse
 */
export interface MsgMultiSendResponseSDKType {
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParams
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgUpdateParams
 */
export interface MsgUpdateParams {
    /**
     * authority is the address that controls the module (defaults to x/gov unless overwritten).
     */
    authority: string;
    /**
     * params defines the x/bank parameters to update.
     *
     * NOTE: All parameters must be supplied.
     */
    params: Params;
}
export interface MsgUpdateParamsProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.MsgUpdateParams';
    value: Uint8Array;
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParamsSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgUpdateParams
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
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponse {
}
export interface MsgUpdateParamsResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.MsgUpdateParamsResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParamsResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponseSDKType {
}
/**
 * MsgSetSendEnabled is the Msg/SetSendEnabled request type.
 *
 * Only entries to add/update/delete need to be included.
 * Existing SendEnabled entries that are not included in this
 * message are left unchanged.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgSetSendEnabled
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgSetSendEnabled
 */
export interface MsgSetSendEnabled {
    /**
     * authority is the address that controls the module.
     */
    authority: string;
    /**
     * send_enabled is the list of entries to add or update.
     */
    sendEnabled: SendEnabled[];
    /**
     * use_default_for is a list of denoms that should use the params.default_send_enabled value.
     * Denoms listed here will have their SendEnabled entries deleted.
     * If a denom is included that doesn't have a SendEnabled entry,
     * it will be ignored.
     */
    useDefaultFor: string[];
}
export interface MsgSetSendEnabledProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.MsgSetSendEnabled';
    value: Uint8Array;
}
/**
 * MsgSetSendEnabled is the Msg/SetSendEnabled request type.
 *
 * Only entries to add/update/delete need to be included.
 * Existing SendEnabled entries that are not included in this
 * message are left unchanged.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgSetSendEnabledSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgSetSendEnabled
 */
export interface MsgSetSendEnabledSDKType {
    authority: string;
    send_enabled: SendEnabledSDKType[];
    use_default_for: string[];
}
/**
 * MsgSetSendEnabledResponse defines the Msg/SetSendEnabled response type.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgSetSendEnabledResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgSetSendEnabledResponse
 */
export interface MsgSetSendEnabledResponse {
}
export interface MsgSetSendEnabledResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.MsgSetSendEnabledResponse';
    value: Uint8Array;
}
/**
 * MsgSetSendEnabledResponse defines the Msg/SetSendEnabled response type.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgSetSendEnabledResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgSetSendEnabledResponse
 */
export interface MsgSetSendEnabledResponseSDKType {
}
/**
 * MsgSend represents a message to send coins from one account to another.
 * @name MsgSend
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgSend
 */
export declare const MsgSend: {
    typeUrl: "/cosmos.bank.v1beta1.MsgSend";
    aminoType: "cosmos-sdk/MsgSend";
    is(o: any): o is MsgSend;
    isSDK(o: any): o is MsgSendSDKType;
    encode(message: MsgSend, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSend;
    fromJSON(object: any): MsgSend;
    toJSON(message: MsgSend): JsonSafe<MsgSend>;
    fromPartial(object: Partial<MsgSend>): MsgSend;
    fromProtoMsg(message: MsgSendProtoMsg): MsgSend;
    toProto(message: MsgSend): Uint8Array;
    toProtoMsg(message: MsgSend): MsgSendProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgSendResponse defines the Msg/Send response type.
 * @name MsgSendResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgSendResponse
 */
export declare const MsgSendResponse: {
    typeUrl: "/cosmos.bank.v1beta1.MsgSendResponse";
    aminoType: "cosmos-sdk/MsgSendResponse";
    is(o: any): o is MsgSendResponse;
    isSDK(o: any): o is MsgSendResponseSDKType;
    encode(_: MsgSendResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSendResponse;
    fromJSON(_: any): MsgSendResponse;
    toJSON(_: MsgSendResponse): JsonSafe<MsgSendResponse>;
    fromPartial(_: Partial<MsgSendResponse>): MsgSendResponse;
    fromProtoMsg(message: MsgSendResponseProtoMsg): MsgSendResponse;
    toProto(message: MsgSendResponse): Uint8Array;
    toProtoMsg(message: MsgSendResponse): MsgSendResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgMultiSend represents an arbitrary multi-in, multi-out send message.
 * @name MsgMultiSend
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgMultiSend
 */
export declare const MsgMultiSend: {
    typeUrl: "/cosmos.bank.v1beta1.MsgMultiSend";
    aminoType: "cosmos-sdk/MsgMultiSend";
    is(o: any): o is MsgMultiSend;
    isSDK(o: any): o is MsgMultiSendSDKType;
    encode(message: MsgMultiSend, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgMultiSend;
    fromJSON(object: any): MsgMultiSend;
    toJSON(message: MsgMultiSend): JsonSafe<MsgMultiSend>;
    fromPartial(object: Partial<MsgMultiSend>): MsgMultiSend;
    fromProtoMsg(message: MsgMultiSendProtoMsg): MsgMultiSend;
    toProto(message: MsgMultiSend): Uint8Array;
    toProtoMsg(message: MsgMultiSend): MsgMultiSendProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgMultiSendResponse defines the Msg/MultiSend response type.
 * @name MsgMultiSendResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgMultiSendResponse
 */
export declare const MsgMultiSendResponse: {
    typeUrl: "/cosmos.bank.v1beta1.MsgMultiSendResponse";
    aminoType: "cosmos-sdk/MsgMultiSendResponse";
    is(o: any): o is MsgMultiSendResponse;
    isSDK(o: any): o is MsgMultiSendResponseSDKType;
    encode(_: MsgMultiSendResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgMultiSendResponse;
    fromJSON(_: any): MsgMultiSendResponse;
    toJSON(_: MsgMultiSendResponse): JsonSafe<MsgMultiSendResponse>;
    fromPartial(_: Partial<MsgMultiSendResponse>): MsgMultiSendResponse;
    fromProtoMsg(message: MsgMultiSendResponseProtoMsg): MsgMultiSendResponse;
    toProto(message: MsgMultiSendResponse): Uint8Array;
    toProtoMsg(message: MsgMultiSendResponse): MsgMultiSendResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgUpdateParams
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgUpdateParams
 */
export declare const MsgUpdateParams: {
    typeUrl: "/cosmos.bank.v1beta1.MsgUpdateParams";
    aminoType: "cosmos-sdk/x/bank/MsgUpdateParams";
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
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgUpdateParamsResponse
 */
export declare const MsgUpdateParamsResponse: {
    typeUrl: "/cosmos.bank.v1beta1.MsgUpdateParamsResponse";
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
 * MsgSetSendEnabled is the Msg/SetSendEnabled request type.
 *
 * Only entries to add/update/delete need to be included.
 * Existing SendEnabled entries that are not included in this
 * message are left unchanged.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgSetSendEnabled
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgSetSendEnabled
 */
export declare const MsgSetSendEnabled: {
    typeUrl: "/cosmos.bank.v1beta1.MsgSetSendEnabled";
    aminoType: "cosmos-sdk/MsgSetSendEnabled";
    is(o: any): o is MsgSetSendEnabled;
    isSDK(o: any): o is MsgSetSendEnabledSDKType;
    encode(message: MsgSetSendEnabled, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSetSendEnabled;
    fromJSON(object: any): MsgSetSendEnabled;
    toJSON(message: MsgSetSendEnabled): JsonSafe<MsgSetSendEnabled>;
    fromPartial(object: Partial<MsgSetSendEnabled>): MsgSetSendEnabled;
    fromProtoMsg(message: MsgSetSendEnabledProtoMsg): MsgSetSendEnabled;
    toProto(message: MsgSetSendEnabled): Uint8Array;
    toProtoMsg(message: MsgSetSendEnabled): MsgSetSendEnabledProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgSetSendEnabledResponse defines the Msg/SetSendEnabled response type.
 *
 * Since: cosmos-sdk 0.47
 * @name MsgSetSendEnabledResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.MsgSetSendEnabledResponse
 */
export declare const MsgSetSendEnabledResponse: {
    typeUrl: "/cosmos.bank.v1beta1.MsgSetSendEnabledResponse";
    aminoType: "cosmos-sdk/MsgSetSendEnabledResponse";
    is(o: any): o is MsgSetSendEnabledResponse;
    isSDK(o: any): o is MsgSetSendEnabledResponseSDKType;
    encode(_: MsgSetSendEnabledResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSetSendEnabledResponse;
    fromJSON(_: any): MsgSetSendEnabledResponse;
    toJSON(_: MsgSetSendEnabledResponse): JsonSafe<MsgSetSendEnabledResponse>;
    fromPartial(_: Partial<MsgSetSendEnabledResponse>): MsgSetSendEnabledResponse;
    fromProtoMsg(message: MsgSetSendEnabledResponseProtoMsg): MsgSetSendEnabledResponse;
    toProto(message: MsgSetSendEnabledResponse): Uint8Array;
    toProtoMsg(message: MsgSetSendEnabledResponse): MsgSetSendEnabledResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map