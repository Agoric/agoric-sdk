import { Grant, type GrantSDKType } from './feegrant.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * GenesisState contains a set of fee allowances, persisted from the store
 * @name GenesisState
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.GenesisState
 */
export interface GenesisState {
    allowances: Grant[];
}
export interface GenesisStateProtoMsg {
    typeUrl: '/cosmos.feegrant.v1beta1.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState contains a set of fee allowances, persisted from the store
 * @name GenesisStateSDKType
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.GenesisState
 */
export interface GenesisStateSDKType {
    allowances: GrantSDKType[];
}
/**
 * GenesisState contains a set of fee allowances, persisted from the store
 * @name GenesisState
 * @package cosmos.feegrant.v1beta1
 * @see proto type: cosmos.feegrant.v1beta1.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/cosmos.feegrant.v1beta1.GenesisState";
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