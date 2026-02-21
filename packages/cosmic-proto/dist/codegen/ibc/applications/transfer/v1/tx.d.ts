import { Coin, type CoinSDKType } from '../../../../cosmos/base/v1beta1/coin.js';
import { Height, type HeightSDKType, Params, type ParamsSDKType } from '../../../core/client/v1/client.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * MsgTransfer defines a msg to transfer fungible tokens (i.e Coins) between
 * ICS20 enabled chains. See ICS Spec here:
 * https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer#data-structures
 * @name MsgTransfer
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.MsgTransfer
 */
export interface MsgTransfer {
    /**
     * the port on which the packet will be sent
     */
    sourcePort: string;
    /**
     * the channel by which the packet will be sent
     */
    sourceChannel: string;
    /**
     * the tokens to be transferred
     */
    token: Coin;
    /**
     * the sender address
     */
    sender: string;
    /**
     * the recipient address on the destination chain
     */
    receiver: string;
    /**
     * Timeout height relative to the current block height.
     * The timeout is disabled when set to 0.
     */
    timeoutHeight: Height;
    /**
     * Timeout timestamp in absolute nanoseconds since unix epoch.
     * The timeout is disabled when set to 0.
     */
    timeoutTimestamp: bigint;
    /**
     * optional memo
     */
    memo: string;
}
export interface MsgTransferProtoMsg {
    typeUrl: '/ibc.applications.transfer.v1.MsgTransfer';
    value: Uint8Array;
}
/**
 * MsgTransfer defines a msg to transfer fungible tokens (i.e Coins) between
 * ICS20 enabled chains. See ICS Spec here:
 * https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer#data-structures
 * @name MsgTransferSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.MsgTransfer
 */
export interface MsgTransferSDKType {
    source_port: string;
    source_channel: string;
    token: CoinSDKType;
    sender: string;
    receiver: string;
    timeout_height: HeightSDKType;
    timeout_timestamp: bigint;
    memo: string;
}
/**
 * MsgTransferResponse defines the Msg/Transfer response type.
 * @name MsgTransferResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.MsgTransferResponse
 */
export interface MsgTransferResponse {
    /**
     * sequence number of the transfer packet sent
     */
    sequence: bigint;
}
export interface MsgTransferResponseProtoMsg {
    typeUrl: '/ibc.applications.transfer.v1.MsgTransferResponse';
    value: Uint8Array;
}
/**
 * MsgTransferResponse defines the Msg/Transfer response type.
 * @name MsgTransferResponseSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.MsgTransferResponse
 */
export interface MsgTransferResponseSDKType {
    sequence: bigint;
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 * @name MsgUpdateParams
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.MsgUpdateParams
 */
export interface MsgUpdateParams {
    /**
     * signer address
     */
    signer: string;
    /**
     * params defines the transfer parameters to update.
     *
     * NOTE: All parameters must be supplied.
     */
    params: Params;
}
export interface MsgUpdateParamsProtoMsg {
    typeUrl: '/ibc.applications.transfer.v1.MsgUpdateParams';
    value: Uint8Array;
}
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 * @name MsgUpdateParamsSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.MsgUpdateParams
 */
export interface MsgUpdateParamsSDKType {
    signer: string;
    params: ParamsSDKType;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 * @name MsgUpdateParamsResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponse {
}
export interface MsgUpdateParamsResponseProtoMsg {
    typeUrl: '/ibc.applications.transfer.v1.MsgUpdateParamsResponse';
    value: Uint8Array;
}
/**
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 * @name MsgUpdateParamsResponseSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.MsgUpdateParamsResponse
 */
export interface MsgUpdateParamsResponseSDKType {
}
/**
 * MsgTransfer defines a msg to transfer fungible tokens (i.e Coins) between
 * ICS20 enabled chains. See ICS Spec here:
 * https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer#data-structures
 * @name MsgTransfer
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.MsgTransfer
 */
export declare const MsgTransfer: {
    typeUrl: "/ibc.applications.transfer.v1.MsgTransfer";
    aminoType: "cosmos-sdk/MsgTransfer";
    is(o: any): o is MsgTransfer;
    isSDK(o: any): o is MsgTransferSDKType;
    encode(message: MsgTransfer, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgTransfer;
    fromJSON(object: any): MsgTransfer;
    toJSON(message: MsgTransfer): JsonSafe<MsgTransfer>;
    fromPartial(object: Partial<MsgTransfer>): MsgTransfer;
    fromProtoMsg(message: MsgTransferProtoMsg): MsgTransfer;
    toProto(message: MsgTransfer): Uint8Array;
    toProtoMsg(message: MsgTransfer): MsgTransferProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgTransferResponse defines the Msg/Transfer response type.
 * @name MsgTransferResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.MsgTransferResponse
 */
export declare const MsgTransferResponse: {
    typeUrl: "/ibc.applications.transfer.v1.MsgTransferResponse";
    aminoType: "cosmos-sdk/MsgTransferResponse";
    is(o: any): o is MsgTransferResponse;
    isSDK(o: any): o is MsgTransferResponseSDKType;
    encode(message: MsgTransferResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgTransferResponse;
    fromJSON(object: any): MsgTransferResponse;
    toJSON(message: MsgTransferResponse): JsonSafe<MsgTransferResponse>;
    fromPartial(object: Partial<MsgTransferResponse>): MsgTransferResponse;
    fromProtoMsg(message: MsgTransferResponseProtoMsg): MsgTransferResponse;
    toProto(message: MsgTransferResponse): Uint8Array;
    toProtoMsg(message: MsgTransferResponse): MsgTransferResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgUpdateParams is the Msg/UpdateParams request type.
 * @name MsgUpdateParams
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.MsgUpdateParams
 */
export declare const MsgUpdateParams: {
    typeUrl: "/ibc.applications.transfer.v1.MsgUpdateParams";
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
 * MsgUpdateParamsResponse defines the response structure for executing a
 * MsgUpdateParams message.
 * @name MsgUpdateParamsResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.MsgUpdateParamsResponse
 */
export declare const MsgUpdateParamsResponse: {
    typeUrl: "/ibc.applications.transfer.v1.MsgUpdateParamsResponse";
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