import { GrantAuthorization, type GrantAuthorizationSDKType } from './authz.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * GenesisState defines the authz module's genesis state.
 * @name GenesisState
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GenesisState
 */
export interface GenesisState {
    authorization: GrantAuthorization[];
}
export interface GenesisStateProtoMsg {
    typeUrl: '/cosmos.authz.v1beta1.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState defines the authz module's genesis state.
 * @name GenesisStateSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GenesisState
 */
export interface GenesisStateSDKType {
    authorization: GrantAuthorizationSDKType[];
}
/**
 * GenesisState defines the authz module's genesis state.
 * @name GenesisState
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/cosmos.authz.v1beta1.GenesisState";
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