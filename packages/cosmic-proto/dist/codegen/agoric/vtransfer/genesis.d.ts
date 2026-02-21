import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * The initial and exported module state.
 * @name GenesisState
 * @package agoric.vtransfer
 * @see proto type: agoric.vtransfer.GenesisState
 */
export interface GenesisState {
    /**
     * The list of account addresses that are being watched by the VM.
     */
    watchedAddresses: Uint8Array[];
}
export interface GenesisStateProtoMsg {
    typeUrl: '/agoric.vtransfer.GenesisState';
    value: Uint8Array;
}
/**
 * The initial and exported module state.
 * @name GenesisStateSDKType
 * @package agoric.vtransfer
 * @see proto type: agoric.vtransfer.GenesisState
 */
export interface GenesisStateSDKType {
    watched_addresses: Uint8Array[];
}
/**
 * The initial and exported module state.
 * @name GenesisState
 * @package agoric.vtransfer
 * @see proto type: agoric.vtransfer.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/agoric.vtransfer.GenesisState";
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
//# sourceMappingURL=genesis.d.ts.map