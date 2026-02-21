import { Height, type HeightSDKType } from '../../../core/client/v1/client.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * ClientState defines the 09-localhost client state
 * @name ClientState
 * @package ibc.lightclients.localhost.v2
 * @see proto type: ibc.lightclients.localhost.v2.ClientState
 */
export interface ClientState {
    /**
     * the latest block height
     */
    latestHeight: Height;
}
export interface ClientStateProtoMsg {
    typeUrl: '/ibc.lightclients.localhost.v2.ClientState';
    value: Uint8Array;
}
/**
 * ClientState defines the 09-localhost client state
 * @name ClientStateSDKType
 * @package ibc.lightclients.localhost.v2
 * @see proto type: ibc.lightclients.localhost.v2.ClientState
 */
export interface ClientStateSDKType {
    latest_height: HeightSDKType;
}
/**
 * ClientState defines the 09-localhost client state
 * @name ClientState
 * @package ibc.lightclients.localhost.v2
 * @see proto type: ibc.lightclients.localhost.v2.ClientState
 */
export declare const ClientState: {
    typeUrl: "/ibc.lightclients.localhost.v2.ClientState";
    aminoType: "cosmos-sdk/ClientState";
    is(o: any): o is ClientState;
    isSDK(o: any): o is ClientStateSDKType;
    encode(message: ClientState, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ClientState;
    fromJSON(object: any): ClientState;
    toJSON(message: ClientState): JsonSafe<ClientState>;
    fromPartial(object: Partial<ClientState>): ClientState;
    fromProtoMsg(message: ClientStateProtoMsg): ClientState;
    toProto(message: ClientState): Uint8Array;
    toProtoMsg(message: ClientState): ClientStateProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=localhost.d.ts.map