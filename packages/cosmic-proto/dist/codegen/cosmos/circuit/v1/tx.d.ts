import { Permissions, type PermissionsSDKType } from './types.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgAuthorizeCircuitBreaker defines the Msg/AuthorizeCircuitBreaker request type.
 * @name MsgAuthorizeCircuitBreaker
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgAuthorizeCircuitBreaker
 */
export interface MsgAuthorizeCircuitBreaker {
    /**
     * granter is the granter of the circuit breaker permissions and must have
     * LEVEL_SUPER_ADMIN.
     */
    granter: string;
    /**
     * grantee is the account authorized with the provided permissions.
     */
    grantee: string;
    /**
     * permissions are the circuit breaker permissions that the grantee receives.
     * These will overwrite any existing permissions. LEVEL_NONE_UNSPECIFIED can
     * be specified to revoke all permissions.
     */
    permissions?: Permissions;
}
export interface MsgAuthorizeCircuitBreakerProtoMsg {
    typeUrl: '/cosmos.circuit.v1.MsgAuthorizeCircuitBreaker';
    value: Uint8Array;
}
/**
 * MsgAuthorizeCircuitBreaker defines the Msg/AuthorizeCircuitBreaker request type.
 * @name MsgAuthorizeCircuitBreakerSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgAuthorizeCircuitBreaker
 */
export interface MsgAuthorizeCircuitBreakerSDKType {
    granter: string;
    grantee: string;
    permissions?: PermissionsSDKType;
}
/**
 * MsgAuthorizeCircuitBreakerResponse defines the Msg/AuthorizeCircuitBreaker response type.
 * @name MsgAuthorizeCircuitBreakerResponse
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgAuthorizeCircuitBreakerResponse
 */
export interface MsgAuthorizeCircuitBreakerResponse {
    success: boolean;
}
export interface MsgAuthorizeCircuitBreakerResponseProtoMsg {
    typeUrl: '/cosmos.circuit.v1.MsgAuthorizeCircuitBreakerResponse';
    value: Uint8Array;
}
/**
 * MsgAuthorizeCircuitBreakerResponse defines the Msg/AuthorizeCircuitBreaker response type.
 * @name MsgAuthorizeCircuitBreakerResponseSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgAuthorizeCircuitBreakerResponse
 */
export interface MsgAuthorizeCircuitBreakerResponseSDKType {
    success: boolean;
}
/**
 * MsgTripCircuitBreaker defines the Msg/TripCircuitBreaker request type.
 * @name MsgTripCircuitBreaker
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgTripCircuitBreaker
 */
export interface MsgTripCircuitBreaker {
    /**
     * authority is the account authorized to trip the circuit breaker.
     */
    authority: string;
    /**
     * msg_type_urls specifies a list of type URLs to immediately stop processing.
     * IF IT IS LEFT EMPTY, ALL MSG PROCESSING WILL STOP IMMEDIATELY.
     * This value is validated against the authority's permissions and if the
     * authority does not have permissions to trip the specified msg type URLs
     * (or all URLs), the operation will fail.
     */
    msgTypeUrls: string[];
}
export interface MsgTripCircuitBreakerProtoMsg {
    typeUrl: '/cosmos.circuit.v1.MsgTripCircuitBreaker';
    value: Uint8Array;
}
/**
 * MsgTripCircuitBreaker defines the Msg/TripCircuitBreaker request type.
 * @name MsgTripCircuitBreakerSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgTripCircuitBreaker
 */
export interface MsgTripCircuitBreakerSDKType {
    authority: string;
    msg_type_urls: string[];
}
/**
 * MsgTripCircuitBreakerResponse defines the Msg/TripCircuitBreaker response type.
 * @name MsgTripCircuitBreakerResponse
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgTripCircuitBreakerResponse
 */
export interface MsgTripCircuitBreakerResponse {
    success: boolean;
}
export interface MsgTripCircuitBreakerResponseProtoMsg {
    typeUrl: '/cosmos.circuit.v1.MsgTripCircuitBreakerResponse';
    value: Uint8Array;
}
/**
 * MsgTripCircuitBreakerResponse defines the Msg/TripCircuitBreaker response type.
 * @name MsgTripCircuitBreakerResponseSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgTripCircuitBreakerResponse
 */
export interface MsgTripCircuitBreakerResponseSDKType {
    success: boolean;
}
/**
 * MsgResetCircuitBreaker defines the Msg/ResetCircuitBreaker request type.
 * @name MsgResetCircuitBreaker
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgResetCircuitBreaker
 */
export interface MsgResetCircuitBreaker {
    /**
     * authority is the account authorized to trip or reset the circuit breaker.
     */
    authority: string;
    /**
     * msg_type_urls specifies a list of Msg type URLs to resume processing. If
     * it is left empty all Msg processing for type URLs that the account is
     * authorized to trip will resume.
     */
    msgTypeUrls: string[];
}
export interface MsgResetCircuitBreakerProtoMsg {
    typeUrl: '/cosmos.circuit.v1.MsgResetCircuitBreaker';
    value: Uint8Array;
}
/**
 * MsgResetCircuitBreaker defines the Msg/ResetCircuitBreaker request type.
 * @name MsgResetCircuitBreakerSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgResetCircuitBreaker
 */
export interface MsgResetCircuitBreakerSDKType {
    authority: string;
    msg_type_urls: string[];
}
/**
 * MsgResetCircuitBreakerResponse defines the Msg/ResetCircuitBreaker response type.
 * @name MsgResetCircuitBreakerResponse
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgResetCircuitBreakerResponse
 */
export interface MsgResetCircuitBreakerResponse {
    success: boolean;
}
export interface MsgResetCircuitBreakerResponseProtoMsg {
    typeUrl: '/cosmos.circuit.v1.MsgResetCircuitBreakerResponse';
    value: Uint8Array;
}
/**
 * MsgResetCircuitBreakerResponse defines the Msg/ResetCircuitBreaker response type.
 * @name MsgResetCircuitBreakerResponseSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgResetCircuitBreakerResponse
 */
export interface MsgResetCircuitBreakerResponseSDKType {
    success: boolean;
}
/**
 * MsgAuthorizeCircuitBreaker defines the Msg/AuthorizeCircuitBreaker request type.
 * @name MsgAuthorizeCircuitBreaker
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgAuthorizeCircuitBreaker
 */
export declare const MsgAuthorizeCircuitBreaker: {
    typeUrl: "/cosmos.circuit.v1.MsgAuthorizeCircuitBreaker";
    aminoType: "cosmos-sdk/MsgAuthorizeCircuitBreaker";
    is(o: any): o is MsgAuthorizeCircuitBreaker;
    isSDK(o: any): o is MsgAuthorizeCircuitBreakerSDKType;
    encode(message: MsgAuthorizeCircuitBreaker, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgAuthorizeCircuitBreaker;
    fromJSON(object: any): MsgAuthorizeCircuitBreaker;
    toJSON(message: MsgAuthorizeCircuitBreaker): JsonSafe<MsgAuthorizeCircuitBreaker>;
    fromPartial(object: Partial<MsgAuthorizeCircuitBreaker>): MsgAuthorizeCircuitBreaker;
    fromProtoMsg(message: MsgAuthorizeCircuitBreakerProtoMsg): MsgAuthorizeCircuitBreaker;
    toProto(message: MsgAuthorizeCircuitBreaker): Uint8Array;
    toProtoMsg(message: MsgAuthorizeCircuitBreaker): MsgAuthorizeCircuitBreakerProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgAuthorizeCircuitBreakerResponse defines the Msg/AuthorizeCircuitBreaker response type.
 * @name MsgAuthorizeCircuitBreakerResponse
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgAuthorizeCircuitBreakerResponse
 */
export declare const MsgAuthorizeCircuitBreakerResponse: {
    typeUrl: "/cosmos.circuit.v1.MsgAuthorizeCircuitBreakerResponse";
    aminoType: "cosmos-sdk/MsgAuthorizeCircuitBreakerResponse";
    is(o: any): o is MsgAuthorizeCircuitBreakerResponse;
    isSDK(o: any): o is MsgAuthorizeCircuitBreakerResponseSDKType;
    encode(message: MsgAuthorizeCircuitBreakerResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgAuthorizeCircuitBreakerResponse;
    fromJSON(object: any): MsgAuthorizeCircuitBreakerResponse;
    toJSON(message: MsgAuthorizeCircuitBreakerResponse): JsonSafe<MsgAuthorizeCircuitBreakerResponse>;
    fromPartial(object: Partial<MsgAuthorizeCircuitBreakerResponse>): MsgAuthorizeCircuitBreakerResponse;
    fromProtoMsg(message: MsgAuthorizeCircuitBreakerResponseProtoMsg): MsgAuthorizeCircuitBreakerResponse;
    toProto(message: MsgAuthorizeCircuitBreakerResponse): Uint8Array;
    toProtoMsg(message: MsgAuthorizeCircuitBreakerResponse): MsgAuthorizeCircuitBreakerResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgTripCircuitBreaker defines the Msg/TripCircuitBreaker request type.
 * @name MsgTripCircuitBreaker
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgTripCircuitBreaker
 */
export declare const MsgTripCircuitBreaker: {
    typeUrl: "/cosmos.circuit.v1.MsgTripCircuitBreaker";
    aminoType: "cosmos-sdk/MsgTripCircuitBreaker";
    is(o: any): o is MsgTripCircuitBreaker;
    isSDK(o: any): o is MsgTripCircuitBreakerSDKType;
    encode(message: MsgTripCircuitBreaker, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgTripCircuitBreaker;
    fromJSON(object: any): MsgTripCircuitBreaker;
    toJSON(message: MsgTripCircuitBreaker): JsonSafe<MsgTripCircuitBreaker>;
    fromPartial(object: Partial<MsgTripCircuitBreaker>): MsgTripCircuitBreaker;
    fromProtoMsg(message: MsgTripCircuitBreakerProtoMsg): MsgTripCircuitBreaker;
    toProto(message: MsgTripCircuitBreaker): Uint8Array;
    toProtoMsg(message: MsgTripCircuitBreaker): MsgTripCircuitBreakerProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgTripCircuitBreakerResponse defines the Msg/TripCircuitBreaker response type.
 * @name MsgTripCircuitBreakerResponse
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgTripCircuitBreakerResponse
 */
export declare const MsgTripCircuitBreakerResponse: {
    typeUrl: "/cosmos.circuit.v1.MsgTripCircuitBreakerResponse";
    aminoType: "cosmos-sdk/MsgTripCircuitBreakerResponse";
    is(o: any): o is MsgTripCircuitBreakerResponse;
    isSDK(o: any): o is MsgTripCircuitBreakerResponseSDKType;
    encode(message: MsgTripCircuitBreakerResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgTripCircuitBreakerResponse;
    fromJSON(object: any): MsgTripCircuitBreakerResponse;
    toJSON(message: MsgTripCircuitBreakerResponse): JsonSafe<MsgTripCircuitBreakerResponse>;
    fromPartial(object: Partial<MsgTripCircuitBreakerResponse>): MsgTripCircuitBreakerResponse;
    fromProtoMsg(message: MsgTripCircuitBreakerResponseProtoMsg): MsgTripCircuitBreakerResponse;
    toProto(message: MsgTripCircuitBreakerResponse): Uint8Array;
    toProtoMsg(message: MsgTripCircuitBreakerResponse): MsgTripCircuitBreakerResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgResetCircuitBreaker defines the Msg/ResetCircuitBreaker request type.
 * @name MsgResetCircuitBreaker
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgResetCircuitBreaker
 */
export declare const MsgResetCircuitBreaker: {
    typeUrl: "/cosmos.circuit.v1.MsgResetCircuitBreaker";
    aminoType: "cosmos-sdk/MsgResetCircuitBreaker";
    is(o: any): o is MsgResetCircuitBreaker;
    isSDK(o: any): o is MsgResetCircuitBreakerSDKType;
    encode(message: MsgResetCircuitBreaker, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgResetCircuitBreaker;
    fromJSON(object: any): MsgResetCircuitBreaker;
    toJSON(message: MsgResetCircuitBreaker): JsonSafe<MsgResetCircuitBreaker>;
    fromPartial(object: Partial<MsgResetCircuitBreaker>): MsgResetCircuitBreaker;
    fromProtoMsg(message: MsgResetCircuitBreakerProtoMsg): MsgResetCircuitBreaker;
    toProto(message: MsgResetCircuitBreaker): Uint8Array;
    toProtoMsg(message: MsgResetCircuitBreaker): MsgResetCircuitBreakerProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MsgResetCircuitBreakerResponse defines the Msg/ResetCircuitBreaker response type.
 * @name MsgResetCircuitBreakerResponse
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.MsgResetCircuitBreakerResponse
 */
export declare const MsgResetCircuitBreakerResponse: {
    typeUrl: "/cosmos.circuit.v1.MsgResetCircuitBreakerResponse";
    aminoType: "cosmos-sdk/MsgResetCircuitBreakerResponse";
    is(o: any): o is MsgResetCircuitBreakerResponse;
    isSDK(o: any): o is MsgResetCircuitBreakerResponseSDKType;
    encode(message: MsgResetCircuitBreakerResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgResetCircuitBreakerResponse;
    fromJSON(object: any): MsgResetCircuitBreakerResponse;
    toJSON(message: MsgResetCircuitBreakerResponse): JsonSafe<MsgResetCircuitBreakerResponse>;
    fromPartial(object: Partial<MsgResetCircuitBreakerResponse>): MsgResetCircuitBreakerResponse;
    fromProtoMsg(message: MsgResetCircuitBreakerResponseProtoMsg): MsgResetCircuitBreakerResponse;
    toProto(message: MsgResetCircuitBreakerResponse): Uint8Array;
    toProtoMsg(message: MsgResetCircuitBreakerResponse): MsgResetCircuitBreakerResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map