import { Params, type ParamsSDKType } from './auth.js';
import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * GenesisState defines the auth module's genesis state.
 * @name GenesisState
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.GenesisState
 */
export interface GenesisState {
    /**
     * params defines all the parameters of the module.
     */
    params: Params;
    /**
     * accounts are the accounts present at genesis.
     */
    accounts: Any[];
}
export interface GenesisStateProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState defines the auth module's genesis state.
 * @name GenesisStateSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.GenesisState
 */
export interface GenesisStateSDKType {
    params: ParamsSDKType;
    accounts: AnySDKType[];
}
/**
 * GenesisState defines the auth module's genesis state.
 * @name GenesisState
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/cosmos.auth.v1beta1.GenesisState";
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