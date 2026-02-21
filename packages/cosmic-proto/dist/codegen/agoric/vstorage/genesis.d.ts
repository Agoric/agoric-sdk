import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * The initial or exported state.
 * @name GenesisState
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.GenesisState
 */
export interface GenesisState {
    data: DataEntry[];
}
export interface GenesisStateProtoMsg {
    typeUrl: '/agoric.vstorage.GenesisState';
    value: Uint8Array;
}
/**
 * The initial or exported state.
 * @name GenesisStateSDKType
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.GenesisState
 */
export interface GenesisStateSDKType {
    data: DataEntrySDKType[];
}
/**
 * A vstorage entry.  The only necessary entries are those with data, as the
 * ancestor nodes are reconstructed on import.
 * @name DataEntry
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.DataEntry
 */
export interface DataEntry {
    /**
     * A "."-separated path with individual path elements matching
     * `[-_A-Za-z0-9]+`
     */
    path: string;
    value: string;
}
export interface DataEntryProtoMsg {
    typeUrl: '/agoric.vstorage.DataEntry';
    value: Uint8Array;
}
/**
 * A vstorage entry.  The only necessary entries are those with data, as the
 * ancestor nodes are reconstructed on import.
 * @name DataEntrySDKType
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.DataEntry
 */
export interface DataEntrySDKType {
    path: string;
    value: string;
}
/**
 * The initial or exported state.
 * @name GenesisState
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/agoric.vstorage.GenesisState";
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
/**
 * A vstorage entry.  The only necessary entries are those with data, as the
 * ancestor nodes are reconstructed on import.
 * @name DataEntry
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.DataEntry
 */
export declare const DataEntry: {
    typeUrl: "/agoric.vstorage.DataEntry";
    is(o: any): o is DataEntry;
    isSDK(o: any): o is DataEntrySDKType;
    encode(message: DataEntry, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DataEntry;
    fromJSON(object: any): DataEntry;
    toJSON(message: DataEntry): JsonSafe<DataEntry>;
    fromPartial(object: Partial<DataEntry>): DataEntry;
    fromProtoMsg(message: DataEntryProtoMsg): DataEntry;
    toProto(message: DataEntry): Uint8Array;
    toProtoMsg(message: DataEntry): DataEntryProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=genesis.d.ts.map