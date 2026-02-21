import { Params, type ParamsSDKType, State, type StateSDKType } from './swingset.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * The initial or exported state.
 * @name GenesisState
 * @package agoric.swingset
 * @see proto type: agoric.swingset.GenesisState
 */
export interface GenesisState {
    params: Params;
    state: State;
    swingStoreExportData: SwingStoreExportDataEntry[];
    swingStoreExportDataHash: string;
}
export interface GenesisStateProtoMsg {
    typeUrl: '/agoric.swingset.GenesisState';
    value: Uint8Array;
}
/**
 * The initial or exported state.
 * @name GenesisStateSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.GenesisState
 */
export interface GenesisStateSDKType {
    params: ParamsSDKType;
    state: StateSDKType;
    swing_store_export_data: SwingStoreExportDataEntrySDKType[];
    swing_store_export_data_hash: string;
}
/**
 * A SwingStore "export data" entry.
 * @name SwingStoreExportDataEntry
 * @package agoric.swingset
 * @see proto type: agoric.swingset.SwingStoreExportDataEntry
 */
export interface SwingStoreExportDataEntry {
    key: string;
    value: string;
}
export interface SwingStoreExportDataEntryProtoMsg {
    typeUrl: '/agoric.swingset.SwingStoreExportDataEntry';
    value: Uint8Array;
}
/**
 * A SwingStore "export data" entry.
 * @name SwingStoreExportDataEntrySDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.SwingStoreExportDataEntry
 */
export interface SwingStoreExportDataEntrySDKType {
    key: string;
    value: string;
}
/**
 * The initial or exported state.
 * @name GenesisState
 * @package agoric.swingset
 * @see proto type: agoric.swingset.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/agoric.swingset.GenesisState";
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
 * A SwingStore "export data" entry.
 * @name SwingStoreExportDataEntry
 * @package agoric.swingset
 * @see proto type: agoric.swingset.SwingStoreExportDataEntry
 */
export declare const SwingStoreExportDataEntry: {
    typeUrl: "/agoric.swingset.SwingStoreExportDataEntry";
    is(o: any): o is SwingStoreExportDataEntry;
    isSDK(o: any): o is SwingStoreExportDataEntrySDKType;
    encode(message: SwingStoreExportDataEntry, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SwingStoreExportDataEntry;
    fromJSON(object: any): SwingStoreExportDataEntry;
    toJSON(message: SwingStoreExportDataEntry): JsonSafe<SwingStoreExportDataEntry>;
    fromPartial(object: Partial<SwingStoreExportDataEntry>): SwingStoreExportDataEntry;
    fromProtoMsg(message: SwingStoreExportDataEntryProtoMsg): SwingStoreExportDataEntry;
    toProto(message: SwingStoreExportDataEntry): Uint8Array;
    toProtoMsg(message: SwingStoreExportDataEntry): SwingStoreExportDataEntryProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=genesis.d.ts.map