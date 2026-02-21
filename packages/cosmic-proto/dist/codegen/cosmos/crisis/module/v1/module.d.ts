import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Module is the config object of the crisis module.
 * @name Module
 * @package cosmos.crisis.module.v1
 * @see proto type: cosmos.crisis.module.v1.Module
 */
export interface Module {
    /**
     * fee_collector_name is the name of the FeeCollector ModuleAccount.
     */
    feeCollectorName: string;
    /**
     * authority defines the custom module authority. If not set, defaults to the governance module.
     */
    authority: string;
}
export interface ModuleProtoMsg {
    typeUrl: '/cosmos.crisis.module.v1.Module';
    value: Uint8Array;
}
/**
 * Module is the config object of the crisis module.
 * @name ModuleSDKType
 * @package cosmos.crisis.module.v1
 * @see proto type: cosmos.crisis.module.v1.Module
 */
export interface ModuleSDKType {
    fee_collector_name: string;
    authority: string;
}
/**
 * Module is the config object of the crisis module.
 * @name Module
 * @package cosmos.crisis.module.v1
 * @see proto type: cosmos.crisis.module.v1.Module
 */
export declare const Module: {
    typeUrl: "/cosmos.crisis.module.v1.Module";
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