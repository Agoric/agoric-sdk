import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Module is the config object for the auth module.
 * @name Module
 * @package cosmos.auth.module.v1
 * @see proto type: cosmos.auth.module.v1.Module
 */
export interface Module {
    /**
     * bech32_prefix is the bech32 account prefix for the app.
     */
    bech32Prefix: string;
    /**
     * module_account_permissions are module account permissions.
     */
    moduleAccountPermissions: ModuleAccountPermission[];
    /**
     * authority defines the custom module authority. If not set, defaults to the governance module.
     */
    authority: string;
}
export interface ModuleProtoMsg {
    typeUrl: '/cosmos.auth.module.v1.Module';
    value: Uint8Array;
}
/**
 * Module is the config object for the auth module.
 * @name ModuleSDKType
 * @package cosmos.auth.module.v1
 * @see proto type: cosmos.auth.module.v1.Module
 */
export interface ModuleSDKType {
    bech32_prefix: string;
    module_account_permissions: ModuleAccountPermissionSDKType[];
    authority: string;
}
/**
 * ModuleAccountPermission represents permissions for a module account.
 * @name ModuleAccountPermission
 * @package cosmos.auth.module.v1
 * @see proto type: cosmos.auth.module.v1.ModuleAccountPermission
 */
export interface ModuleAccountPermission {
    /**
     * account is the name of the module.
     */
    account: string;
    /**
     * permissions are the permissions this module has. Currently recognized
     * values are minter, burner and staking.
     */
    permissions: string[];
}
export interface ModuleAccountPermissionProtoMsg {
    typeUrl: '/cosmos.auth.module.v1.ModuleAccountPermission';
    value: Uint8Array;
}
/**
 * ModuleAccountPermission represents permissions for a module account.
 * @name ModuleAccountPermissionSDKType
 * @package cosmos.auth.module.v1
 * @see proto type: cosmos.auth.module.v1.ModuleAccountPermission
 */
export interface ModuleAccountPermissionSDKType {
    account: string;
    permissions: string[];
}
/**
 * Module is the config object for the auth module.
 * @name Module
 * @package cosmos.auth.module.v1
 * @see proto type: cosmos.auth.module.v1.Module
 */
export declare const Module: {
    typeUrl: "/cosmos.auth.module.v1.Module";
    aminoType: "cosmos-sdk/Module";
    is(o: any): o is Module;
    isSDK(o: any): o is ModuleSDKType;
    encode(message: Module, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Module;
    fromJSON(object: any): Module;
    toJSON(message: Module): JsonSafe<Module>;
    fromPartial(object: Partial<Module>): Module;
    fromProtoMsg(message: ModuleProtoMsg): Module;
    toProto(message: Module): Uint8Array;
    toProtoMsg(message: Module): ModuleProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ModuleAccountPermission represents permissions for a module account.
 * @name ModuleAccountPermission
 * @package cosmos.auth.module.v1
 * @see proto type: cosmos.auth.module.v1.ModuleAccountPermission
 */
export declare const ModuleAccountPermission: {
    typeUrl: "/cosmos.auth.module.v1.ModuleAccountPermission";
    aminoType: "cosmos-sdk/ModuleAccountPermission";
    is(o: any): o is ModuleAccountPermission;
    isSDK(o: any): o is ModuleAccountPermissionSDKType;
    encode(message: ModuleAccountPermission, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ModuleAccountPermission;
    fromJSON(object: any): ModuleAccountPermission;
    toJSON(message: ModuleAccountPermission): JsonSafe<ModuleAccountPermission>;
    fromPartial(object: Partial<ModuleAccountPermission>): ModuleAccountPermission;
    fromProtoMsg(message: ModuleAccountPermissionProtoMsg): ModuleAccountPermission;
    toProto(message: ModuleAccountPermission): Uint8Array;
    toProtoMsg(message: ModuleAccountPermission): ModuleAccountPermissionProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=module.d.ts.map