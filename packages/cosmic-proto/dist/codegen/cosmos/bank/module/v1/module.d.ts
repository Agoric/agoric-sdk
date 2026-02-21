import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Module is the config object of the bank module.
 * @name Module
 * @package cosmos.bank.module.v1
 * @see proto type: cosmos.bank.module.v1.Module
 */
export interface Module {
    /**
     * blocked_module_accounts_override configures exceptional module accounts which should be blocked from receiving
     * funds. If left empty it defaults to the list of account names supplied in the auth module configuration as
     * module_account_permissions
     */
    blockedModuleAccountsOverride: string[];
    /**
     * authority defines the custom module authority. If not set, defaults to the governance module.
     */
    authority: string;
    /**
     * restrictions_order specifies the order of send restrictions and should be
     * a list of module names which provide a send restriction instance. If no
     * order is provided, then restrictions will be applied in alphabetical order
     * of module names.
     */
    restrictionsOrder: string[];
}
export interface ModuleProtoMsg {
    typeUrl: '/cosmos.bank.module.v1.Module';
    value: Uint8Array;
}
/**
 * Module is the config object of the bank module.
 * @name ModuleSDKType
 * @package cosmos.bank.module.v1
 * @see proto type: cosmos.bank.module.v1.Module
 */
export interface ModuleSDKType {
    blocked_module_accounts_override: string[];
    authority: string;
    restrictions_order: string[];
}
/**
 * Module is the config object of the bank module.
 * @name Module
 * @package cosmos.bank.module.v1
 * @see proto type: cosmos.bank.module.v1.Module
 */
export declare const Module: {
    typeUrl: "/cosmos.bank.module.v1.Module";
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
//# sourceMappingURL=module.d.ts.map