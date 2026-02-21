import { Packet, type PacketSDKType } from '../../ibc/core/channel/v1/channel.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * MsgSendPacket is an SDK message for sending an outgoing IBC packet
 * @name MsgSendPacket
 * @package agoric.vibc
 * @see proto type: agoric.vibc.MsgSendPacket
 */
export interface MsgSendPacket {
    packet: Packet;
    sender: Uint8Array;
}
export interface MsgSendPacketProtoMsg {
    typeUrl: '/agoric.vibc.MsgSendPacket';
    value: Uint8Array;
}
/**
 * MsgSendPacket is an SDK message for sending an outgoing IBC packet
 * @name MsgSendPacketSDKType
 * @package agoric.vibc
 * @see proto type: agoric.vibc.MsgSendPacket
 */
export interface MsgSendPacketSDKType {
    packet: PacketSDKType;
    sender: Uint8Array;
}
/**
 * Empty response for SendPacket.
 * @name MsgSendPacketResponse
 * @package agoric.vibc
 * @see proto type: agoric.vibc.MsgSendPacketResponse
 */
export interface MsgSendPacketResponse {
}
export interface MsgSendPacketResponseProtoMsg {
    typeUrl: '/agoric.vibc.MsgSendPacketResponse';
    value: Uint8Array;
}
/**
 * Empty response for SendPacket.
 * @name MsgSendPacketResponseSDKType
 * @package agoric.vibc
 * @see proto type: agoric.vibc.MsgSendPacketResponse
 */
export interface MsgSendPacketResponseSDKType {
}
/**
 * MsgSendPacket is an SDK message for sending an outgoing IBC packet
 * @name MsgSendPacket
 * @package agoric.vibc
 * @see proto type: agoric.vibc.MsgSendPacket
 */
export declare const MsgSendPacket: {
    typeUrl: "/agoric.vibc.MsgSendPacket";
    aminoType: "vibc/SendPacket";
    is(o: any): o is MsgSendPacket;
    isSDK(o: any): o is MsgSendPacketSDKType;
    encode(message: MsgSendPacket, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSendPacket;
    fromJSON(object: any): MsgSendPacket;
    toJSON(message: MsgSendPacket): JsonSafe<MsgSendPacket>;
    fromPartial(object: Partial<MsgSendPacket>): MsgSendPacket;
    fromProtoMsg(message: MsgSendPacketProtoMsg): MsgSendPacket;
    toProto(message: MsgSendPacket): Uint8Array;
    toProtoMsg(message: MsgSendPacket): MsgSendPacketProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Empty response for SendPacket.
 * @name MsgSendPacketResponse
 * @package agoric.vibc
 * @see proto type: agoric.vibc.MsgSendPacketResponse
 */
export declare const MsgSendPacketResponse: {
    typeUrl: "/agoric.vibc.MsgSendPacketResponse";
    is(o: any): o is MsgSendPacketResponse;
    isSDK(o: any): o is MsgSendPacketResponseSDKType;
    encode(_: MsgSendPacketResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSendPacketResponse;
    fromJSON(_: any): MsgSendPacketResponse;
    toJSON(_: MsgSendPacketResponse): JsonSafe<MsgSendPacketResponse>;
    fromPartial(_: Partial<MsgSendPacketResponse>): MsgSendPacketResponse;
    fromProtoMsg(message: MsgSendPacketResponseProtoMsg): MsgSendPacketResponse;
    toProto(message: MsgSendPacketResponse): Uint8Array;
    toProtoMsg(message: MsgSendPacketResponse): MsgSendPacketResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=msgs.d.ts.map