import { Grant, type GrantSDKType } from './authz.js';
import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgGrant is a request type for Grant method. It declares authorization to the grantee
 * on behalf of the granter with the provided expiration time.
 * @name MsgGrant
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgGrant
 */
export interface MsgGrant {
    granter: string;
    grantee: string;
    grant: Grant;
}
export interface MsgGrantProtoMsg {
    typeUrl: '/cosmos.authz.v1beta1.MsgGrant';
    value: Uint8Array;
}
/**
 * MsgGrant is a request type for Grant method. It declares authorization to the grantee
 * on behalf of the granter with the provided expiration time.
 * @name MsgGrantSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgGrant
 */
export interface MsgGrantSDKType {
    granter: string;
    grantee: string;
    grant: GrantSDKType;
}
/**
 * MsgGrantResponse defines the Msg/MsgGrant response type.
 * @name MsgGrantResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgGrantResponse
 */
export interface MsgGrantResponse {
}
export interface MsgGrantResponseProtoMsg {
    typeUrl: '/cosmos.authz.v1beta1.MsgGrantResponse';
    value: Uint8Array;
}
/**
 * MsgGrantResponse defines the Msg/MsgGrant response type.
 * @name MsgGrantResponseSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgGrantResponse
 */
export interface MsgGrantResponseSDKType {
}
/**
 * MsgExec attempts to execute the provided messages using
 * authorizations granted to the grantee. Each message should have only
 * one signer corresponding to the granter of the authorization.
 * @name MsgExec
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgExec
 */
export interface MsgExec {
    grantee: string;
    /**
     * Execute Msg.
     * The x/authz will try to find a grant matching (msg.signers[0], grantee, MsgTypeURL(msg))
     * triple and validate it.
     */
    msgs: Any[] | Any[];
}
export interface MsgExecProtoMsg {
    typeUrl: '/cosmos.authz.v1beta1.MsgExec';
    value: Uint8Array;
}
/**
 * MsgExec attempts to execute the provided messages using
 * authorizations granted to the grantee. Each message should have only
 * one signer corresponding to the granter of the authorization.
 * @name MsgExecSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgExec
 */
export interface MsgExecSDKType {
    grantee: string;
    msgs: AnySDKType[];
}
/**
 * MsgExecResponse defines the Msg/MsgExecResponse response type.
 * @name MsgExecResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgExecResponse
 */
export interface MsgExecResponse {
    results: Uint8Array[];
}
export interface MsgExecResponseProtoMsg {
    typeUrl: '/cosmos.authz.v1beta1.MsgExecResponse';
    value: Uint8Array;
}
/**
 * MsgExecResponse defines the Msg/MsgExecResponse response type.
 * @name MsgExecResponseSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgExecResponse
 */
export interface MsgExecResponseSDKType {
    results: Uint8Array[];
}
/**
 * MsgRevoke revokes any authorization with the provided sdk.Msg type on the
 * granter's account with that has been granted to the grantee.
 * @name MsgRevoke
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgRevoke
 */
export interface MsgRevoke {
    granter: string;
    grantee: string;
    msgTypeUrl: string;
}
export interface MsgRevokeProtoMsg {
    typeUrl: '/cosmos.authz.v1beta1.MsgRevoke';
    value: Uint8Array;
}
/**
 * MsgRevoke revokes any authorization with the provided sdk.Msg type on the
 * granter's account with that has been granted to the grantee.
 * @name MsgRevokeSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgRevoke
 */
export interface MsgRevokeSDKType {
    granter: string;
    grantee: string;
    msg_type_url: string;
}
/**
 * MsgRevokeResponse defines the Msg/MsgRevokeResponse response type.
 * @name MsgRevokeResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgRevokeResponse
 */
export interface MsgRevokeResponse {
}
export interface MsgRevokeResponseProtoMsg {
    typeUrl: '/cosmos.authz.v1beta1.MsgRevokeResponse';
    value: Uint8Array;
}
/**
 * MsgRevokeResponse defines the Msg/MsgRevokeResponse response type.
 * @name MsgRevokeResponseSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgRevokeResponse
 */
export interface MsgRevokeResponseSDKType {
}
/**
 * MsgGrant is a request type for Grant method. It declares authorization to the grantee
 * on behalf of the granter with the provided expiration time.
 * @name MsgGrant
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgGrant
 */
export declare const MsgGrant: {
    typeUrl: "/cosmos.authz.v1beta1.MsgGrant";
    aminoType: "cosmos-sdk/MsgGrant";
    is(o: any): o is MsgGrant;
    isSDK(o: any): o is MsgGrantSDKType;
    encode(message: MsgGrant, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgGrant;
    fromJSON(object: any): MsgGrant;
    toJSON(message: MsgGrant): JsonSafe<MsgGrant>;
    fromPartial(object: Partial<MsgGrant>): MsgGrant;
    fromProtoMsg(message: MsgGrantProtoMsg): MsgGrant;
    toProto(message: MsgGrant): Uint8Array;
    toProtoMsg(message: MsgGrant): MsgGrantProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgGrantResponse defines the Msg/MsgGrant response type.
 * @name MsgGrantResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgGrantResponse
 */
export declare const MsgGrantResponse: {
    typeUrl: "/cosmos.authz.v1beta1.MsgGrantResponse";
    aminoType: "cosmos-sdk/MsgGrantResponse";
    is(o: any): o is MsgGrantResponse;
    isSDK(o: any): o is MsgGrantResponseSDKType;
    encode(_: MsgGrantResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgGrantResponse;
    fromJSON(_: any): MsgGrantResponse;
    toJSON(_: MsgGrantResponse): JsonSafe<MsgGrantResponse>;
    fromPartial(_: Partial<MsgGrantResponse>): MsgGrantResponse;
    fromProtoMsg(message: MsgGrantResponseProtoMsg): MsgGrantResponse;
    toProto(message: MsgGrantResponse): Uint8Array;
    toProtoMsg(message: MsgGrantResponse): MsgGrantResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgExec attempts to execute the provided messages using
 * authorizations granted to the grantee. Each message should have only
 * one signer corresponding to the granter of the authorization.
 * @name MsgExec
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgExec
 */
export declare const MsgExec: {
    typeUrl: "/cosmos.authz.v1beta1.MsgExec";
    aminoType: "cosmos-sdk/MsgExec";
    is(o: any): o is MsgExec;
    isSDK(o: any): o is MsgExecSDKType;
    encode(message: MsgExec, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgExec;
    fromJSON(object: any): MsgExec;
    toJSON(message: MsgExec): JsonSafe<MsgExec>;
    fromPartial(object: Partial<MsgExec>): MsgExec;
    fromProtoMsg(message: MsgExecProtoMsg): MsgExec;
    toProto(message: MsgExec): Uint8Array;
    toProtoMsg(message: MsgExec): MsgExecProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgExecResponse defines the Msg/MsgExecResponse response type.
 * @name MsgExecResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgExecResponse
 */
export declare const MsgExecResponse: {
    typeUrl: "/cosmos.authz.v1beta1.MsgExecResponse";
    aminoType: "cosmos-sdk/MsgExecResponse";
    is(o: any): o is MsgExecResponse;
    isSDK(o: any): o is MsgExecResponseSDKType;
    encode(message: MsgExecResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgExecResponse;
    fromJSON(object: any): MsgExecResponse;
    toJSON(message: MsgExecResponse): JsonSafe<MsgExecResponse>;
    fromPartial(object: Partial<MsgExecResponse>): MsgExecResponse;
    fromProtoMsg(message: MsgExecResponseProtoMsg): MsgExecResponse;
    toProto(message: MsgExecResponse): Uint8Array;
    toProtoMsg(message: MsgExecResponse): MsgExecResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgRevoke revokes any authorization with the provided sdk.Msg type on the
 * granter's account with that has been granted to the grantee.
 * @name MsgRevoke
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgRevoke
 */
export declare const MsgRevoke: {
    typeUrl: "/cosmos.authz.v1beta1.MsgRevoke";
    aminoType: "cosmos-sdk/MsgRevoke";
    is(o: any): o is MsgRevoke;
    isSDK(o: any): o is MsgRevokeSDKType;
    encode(message: MsgRevoke, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRevoke;
    fromJSON(object: any): MsgRevoke;
    toJSON(message: MsgRevoke): JsonSafe<MsgRevoke>;
    fromPartial(object: Partial<MsgRevoke>): MsgRevoke;
    fromProtoMsg(message: MsgRevokeProtoMsg): MsgRevoke;
    toProto(message: MsgRevoke): Uint8Array;
    toProtoMsg(message: MsgRevoke): MsgRevokeProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgRevokeResponse defines the Msg/MsgRevokeResponse response type.
 * @name MsgRevokeResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgRevokeResponse
 */
export declare const MsgRevokeResponse: {
    typeUrl: "/cosmos.authz.v1beta1.MsgRevokeResponse";
    aminoType: "cosmos-sdk/MsgRevokeResponse";
    is(o: any): o is MsgRevokeResponse;
    isSDK(o: any): o is MsgRevokeResponseSDKType;
    encode(_: MsgRevokeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRevokeResponse;
    fromJSON(_: any): MsgRevokeResponse;
    toJSON(_: MsgRevokeResponse): JsonSafe<MsgRevokeResponse>;
    fromPartial(_: Partial<MsgRevokeResponse>): MsgRevokeResponse;
    fromProtoMsg(message: MsgRevokeResponseProtoMsg): MsgRevokeResponse;
    toProto(message: MsgRevokeResponse): Uint8Array;
    toProtoMsg(message: MsgRevokeResponse): MsgRevokeResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map