import { Duration, type DurationSDKType } from '../../../../google/protobuf/duration.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Module is the config object of the group module.
 * @name Module
 * @package cosmos.group.module.v1
 * @see proto type: cosmos.group.module.v1.Module
 */
export interface Module {
    /**
     * max_execution_period defines the max duration after a proposal's voting period ends that members can send a MsgExec
     * to execute the proposal.
     */
    maxExecutionPeriod: Duration;
    /**
     * max_metadata_len defines the max length of the metadata bytes field for various entities within the group module.
     * Defaults to 255 if not explicitly set.
     */
    maxMetadataLen: bigint;
}
export interface ModuleProtoMsg {
    typeUrl: '/cosmos.group.module.v1.Module';
    value: Uint8Array;
}
/**
 * Module is the config object of the group module.
 * @name ModuleSDKType
 * @package cosmos.group.module.v1
 * @see proto type: cosmos.group.module.v1.Module
 */
export interface ModuleSDKType {
    max_execution_period: DurationSDKType;
    max_metadata_len: bigint;
}
/**
 * Module is the config object of the group module.
 * @name Module
 * @package cosmos.group.module.v1
 * @see proto type: cosmos.group.module.v1.Module
 */
export declare const Module: {
    typeUrl: "/cosmos.group.module.v1.Module";
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