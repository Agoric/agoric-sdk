import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Module is the config object of the nft module.
 * @name Module
 * @package cosmos.nft.module.v1
 * @see proto type: cosmos.nft.module.v1.Module
 */
export interface Module {
}
export interface ModuleProtoMsg {
    typeUrl: '/cosmos.nft.module.v1.Module';
    value: Uint8Array;
}
/**
 * Module is the config object of the nft module.
 * @name ModuleSDKType
 * @package cosmos.nft.module.v1
 * @see proto type: cosmos.nft.module.v1.Module
 */
export interface ModuleSDKType {
}
/**
 * Module is the config object of the nft module.
 * @name Module
 * @package cosmos.nft.module.v1
 * @see proto type: cosmos.nft.module.v1.Module
 */
export declare const Module: {
    typeUrl: "/cosmos.nft.module.v1.Module";
    aminoType: "cosmos-sdk/Module";
    is(o: any): o is Module;
    isSDK(o: any): o is ModuleSDKType;
    encode(_: Module, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Module;
    fromJSON(_: any): Module;
    toJSON(_: Module): JsonSafe<Module>;
    fromPartial(_: Partial<Module>): Module;
    fromProtoMsg(message: ModuleProtoMsg): Module;
    toProto(message: Module): Uint8Array;
    toProtoMsg(message: Module): ModuleProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=module.d.ts.map