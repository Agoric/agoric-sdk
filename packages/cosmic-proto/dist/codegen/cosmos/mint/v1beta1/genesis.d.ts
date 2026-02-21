import { Minter, type MinterSDKType, Params, type ParamsSDKType } from './mint.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * GenesisState defines the mint module's genesis state.
 * @name GenesisState
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.GenesisState
 */
export interface GenesisState {
    /**
     * minter is a space for holding current inflation information.
     */
    minter: Minter;
    /**
     * params defines all the parameters of the module.
     */
    params: Params;
}
export interface GenesisStateProtoMsg {
    typeUrl: '/cosmos.mint.v1beta1.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState defines the mint module's genesis state.
 * @name GenesisStateSDKType
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.GenesisState
 */
export interface GenesisStateSDKType {
    minter: MinterSDKType;
    params: ParamsSDKType;
}
/**
 * GenesisState defines the mint module's genesis state.
 * @name GenesisState
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/cosmos.mint.v1beta1.GenesisState";
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
//# sourceMappingURL=genesis.d.ts.map