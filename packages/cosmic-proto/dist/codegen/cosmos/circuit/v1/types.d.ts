import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/** Level is the permission level. */
export declare enum Permissions_Level {
    /**
     * LEVEL_NONE_UNSPECIFIED - LEVEL_NONE_UNSPECIFIED indicates that the account will have no circuit
     * breaker permissions.
     */
    LEVEL_NONE_UNSPECIFIED = 0,
    /**
     * LEVEL_SOME_MSGS - LEVEL_SOME_MSGS indicates that the account will have permission to
     * trip or reset the circuit breaker for some Msg type URLs. If this level
     * is chosen, a non-empty list of Msg type URLs must be provided in
     * limit_type_urls.
     */
    LEVEL_SOME_MSGS = 1,
    /**
     * LEVEL_ALL_MSGS - LEVEL_ALL_MSGS indicates that the account can trip or reset the circuit
     * breaker for Msg's of all type URLs.
     */
    LEVEL_ALL_MSGS = 2,
    /**
     * LEVEL_SUPER_ADMIN - LEVEL_SUPER_ADMIN indicates that the account can take all circuit breaker
     * actions and can grant permissions to other accounts.
     */
    LEVEL_SUPER_ADMIN = 3,
    UNRECOGNIZED = -1
}
export declare const Permissions_LevelSDKType: typeof Permissions_Level;
export declare function permissions_LevelFromJSON(object: any): Permissions_Level;
export declare function permissions_LevelToJSON(object: Permissions_Level): string;
/**
 * Permissions are the permissions that an account has to trip
 * or reset the circuit breaker.
 * @name Permissions
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.Permissions
 */
export interface Permissions {
    /**
     * level is the level of permissions granted to this account.
     */
    level: Permissions_Level;
    /**
     * limit_type_urls is used with LEVEL_SOME_MSGS to limit the lists of Msg type
     * URLs that the account can trip. It is an error to use limit_type_urls with
     * a level other than LEVEL_SOME_MSGS.
     */
    limitTypeUrls: string[];
}
export interface PermissionsProtoMsg {
    typeUrl: '/cosmos.circuit.v1.Permissions';
    value: Uint8Array;
}
/**
 * Permissions are the permissions that an account has to trip
 * or reset the circuit breaker.
 * @name PermissionsSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.Permissions
 */
export interface PermissionsSDKType {
    level: Permissions_Level;
    limit_type_urls: string[];
}
/**
 * GenesisAccountPermissions is the account permissions for the circuit breaker in genesis
 * @name GenesisAccountPermissions
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.GenesisAccountPermissions
 */
export interface GenesisAccountPermissions {
    address: string;
    permissions?: Permissions;
}
export interface GenesisAccountPermissionsProtoMsg {
    typeUrl: '/cosmos.circuit.v1.GenesisAccountPermissions';
    value: Uint8Array;
}
/**
 * GenesisAccountPermissions is the account permissions for the circuit breaker in genesis
 * @name GenesisAccountPermissionsSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.GenesisAccountPermissions
 */
export interface GenesisAccountPermissionsSDKType {
    address: string;
    permissions?: PermissionsSDKType;
}
/**
 * GenesisState is the state that must be provided at genesis.
 * @name GenesisState
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.GenesisState
 */
export interface GenesisState {
    accountPermissions: GenesisAccountPermissions[];
    disabledTypeUrls: string[];
}
export interface GenesisStateProtoMsg {
    typeUrl: '/cosmos.circuit.v1.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState is the state that must be provided at genesis.
 * @name GenesisStateSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.GenesisState
 */
export interface GenesisStateSDKType {
    account_permissions: GenesisAccountPermissionsSDKType[];
    disabled_type_urls: string[];
}
/**
 * Permissions are the permissions that an account has to trip
 * or reset the circuit breaker.
 * @name Permissions
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.Permissions
 */
export declare const Permissions: {
    typeUrl: "/cosmos.circuit.v1.Permissions";
    aminoType: "cosmos-sdk/Permissions";
    is(o: any): o is Permissions;
    isSDK(o: any): o is PermissionsSDKType;
    encode(message: Permissions, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Permissions;
    fromJSON(object: any): Permissions;
    toJSON(message: Permissions): JsonSafe<Permissions>;
    fromPartial(object: Partial<Permissions>): Permissions;
    fromProtoMsg(message: PermissionsProtoMsg): Permissions;
    toProto(message: Permissions): Uint8Array;
    toProtoMsg(message: Permissions): PermissionsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * GenesisAccountPermissions is the account permissions for the circuit breaker in genesis
 * @name GenesisAccountPermissions
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.GenesisAccountPermissions
 */
export declare const GenesisAccountPermissions: {
    typeUrl: "/cosmos.circuit.v1.GenesisAccountPermissions";
    aminoType: "cosmos-sdk/GenesisAccountPermissions";
    is(o: any): o is GenesisAccountPermissions;
    isSDK(o: any): o is GenesisAccountPermissionsSDKType;
    encode(message: GenesisAccountPermissions, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GenesisAccountPermissions;
    fromJSON(object: any): GenesisAccountPermissions;
    toJSON(message: GenesisAccountPermissions): JsonSafe<GenesisAccountPermissions>;
    fromPartial(object: Partial<GenesisAccountPermissions>): GenesisAccountPermissions;
    fromProtoMsg(message: GenesisAccountPermissionsProtoMsg): GenesisAccountPermissions;
    toProto(message: GenesisAccountPermissions): Uint8Array;
    toProtoMsg(message: GenesisAccountPermissions): GenesisAccountPermissionsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * GenesisState is the state that must be provided at genesis.
 * @name GenesisState
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/cosmos.circuit.v1.GenesisState";
    aminoType: "cosmos-sdk/GenesisState";
    is(o: any): o is GenesisState;
    isSDK(o: any): o is GenesisStateSDKType;
    encode(message: GenesisState, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GenesisState;
    fromJSON(object: any): GenesisState;
    toJSON(message: GenesisState): JsonSafe<GenesisState>;
    fromPartial(object: Partial<GenesisState>): GenesisState;
    fromProtoMsg(message: GenesisStateProtoMsg): GenesisState;
    toProto(message: GenesisState): Uint8Array;
    toProtoMsg(message: GenesisState): GenesisStateProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=types.d.ts.map