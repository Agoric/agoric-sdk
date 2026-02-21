import { DenomTrace, type DenomTraceSDKType, Params, type ParamsSDKType } from './transfer.js';
import { Coin, type CoinSDKType } from '../../../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * GenesisState defines the ibc-transfer genesis state
 * @name GenesisState
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.GenesisState
 */
export interface GenesisState {
    portId: string;
    denomTraces: DenomTrace[];
    params: Params;
    /**
     * total_escrowed contains the total amount of tokens escrowed
     * by the transfer module
     */
    totalEscrowed: Coin[];
}
export interface GenesisStateProtoMsg {
    typeUrl: '/ibc.applications.transfer.v1.GenesisState';
    value: Uint8Array;
}
/**
 * GenesisState defines the ibc-transfer genesis state
 * @name GenesisStateSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.GenesisState
 */
export interface GenesisStateSDKType {
    port_id: string;
    denom_traces: DenomTraceSDKType[];
    params: ParamsSDKType;
    total_escrowed: CoinSDKType[];
}
/**
 * GenesisState defines the ibc-transfer genesis state
 * @name GenesisState
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.GenesisState
 */
export declare const GenesisState: {
    typeUrl: "/ibc.applications.transfer.v1.GenesisState";
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