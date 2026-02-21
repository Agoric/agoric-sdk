import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * GenesisState defines 08-wasm's keeper genesis state
 * @name GenesisState
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.GenesisState
 */
export interface GenesisState {
    /**
     * uploaded light client wasm contracts
     */
    contracts: Contract[];
}
export interface GenesisStateProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState defines 08-wasm's keeper genesis state
 * @name GenesisStateSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.GenesisState
 */
export interface GenesisStateSDKType {
    contracts: ContractSDKType[];
}
/**
 * Contract stores contract code
 * @name Contract
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.Contract
 */
export interface Contract {
    /**
     * contract byte code
     */
    codeBytes: Uint8Array;
}
export interface ContractProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.Contract';
    value: Uint8Array;
}
/**
 * Contract stores contract code
 * @name ContractSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.Contract
 */
export interface ContractSDKType {
    code_bytes: Uint8Array;
}
/**
 * GenesisState defines 08-wasm's keeper genesis state
 * @name GenesisState
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/ibc.lightclients.wasm.v1.GenesisState";
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
/**
 * Contract stores contract code
 * @name Contract
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.Contract
 */
export declare const Contract: {
    typeUrl: "/ibc.lightclients.wasm.v1.Contract";
    aminoType: "cosmos-sdk/Contract";
    is(o: any): o is Contract;
    isSDK(o: any): o is ContractSDKType;
    encode(message: Contract, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Contract;
    fromJSON(object: any): Contract;
    toJSON(message: Contract): JsonSafe<Contract>;
    fromPartial(object: Partial<Contract>): Contract;
    fromProtoMsg(message: ContractProtoMsg): Contract;
    toProto(message: Contract): Uint8Array;
    toProtoMsg(message: Contract): ContractProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=genesis.d.ts.map