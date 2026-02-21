import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * EventGrant is emitted on Msg/Grant
 * @name EventGrant
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.EventGrant
 */
export interface EventGrant {
    /**
     * Msg type URL for which an autorization is granted
     */
    msgTypeUrl: string;
    /**
     * Granter account address
     */
    granter: string;
    /**
     * Grantee account address
     */
    grantee: string;
}
export interface EventGrantProtoMsg {
    typeUrl: '/cosmos.authz.v1beta1.EventGrant';
    value: Uint8Array;
}
/**
 * EventGrant is emitted on Msg/Grant
 * @name EventGrantSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.EventGrant
 */
export interface EventGrantSDKType {
    msg_type_url: string;
    granter: string;
    grantee: string;
}
/**
 * EventRevoke is emitted on Msg/Revoke
 * @name EventRevoke
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.EventRevoke
 */
export interface EventRevoke {
    /**
     * Msg type URL for which an autorization is revoked
     */
    msgTypeUrl: string;
    /**
     * Granter account address
     */
    granter: string;
    /**
     * Grantee account address
     */
    grantee: string;
}
export interface EventRevokeProtoMsg {
    typeUrl: '/cosmos.authz.v1beta1.EventRevoke';
    value: Uint8Array;
}
/**
 * EventRevoke is emitted on Msg/Revoke
 * @name EventRevokeSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.EventRevoke
 */
export interface EventRevokeSDKType {
    msg_type_url: string;
    granter: string;
    grantee: string;
}
/**
 * EventGrant is emitted on Msg/Grant
 * @name EventGrant
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.EventGrant
 */
export declare const EventGrant: {
    typeUrl: "/cosmos.authz.v1beta1.EventGrant";
    aminoType: "cosmos-sdk/EventGrant";
    is(o: any): o is EventGrant;
    isSDK(o: any): o is EventGrantSDKType;
    encode(message: EventGrant, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EventGrant;
    fromJSON(object: any): EventGrant;
    toJSON(message: EventGrant): JsonSafe<EventGrant>;
    fromPartial(object: Partial<EventGrant>): EventGrant;
    fromProtoMsg(message: EventGrantProtoMsg): EventGrant;
    toProto(message: EventGrant): Uint8Array;
    toProtoMsg(message: EventGrant): EventGrantProtoMsg;
    registerTypeUrl(): void;
};
/**
 * EventRevoke is emitted on Msg/Revoke
 * @name EventRevoke
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.EventRevoke
 */
export declare const EventRevoke: {
    typeUrl: "/cosmos.authz.v1beta1.EventRevoke";
    aminoType: "cosmos-sdk/EventRevoke";
    is(o: any): o is EventRevoke;
    isSDK(o: any): o is EventRevokeSDKType;
    encode(message: EventRevoke, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EventRevoke;
    fromJSON(object: any): EventRevoke;
    toJSON(message: EventRevoke): JsonSafe<EventRevoke>;
    fromPartial(object: Partial<EventRevoke>): EventRevoke;
    fromProtoMsg(message: EventRevokeProtoMsg): EventRevoke;
    toProto(message: EventRevoke): Uint8Array;
    toProtoMsg(message: EventRevoke): EventRevokeProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=event.d.ts.map