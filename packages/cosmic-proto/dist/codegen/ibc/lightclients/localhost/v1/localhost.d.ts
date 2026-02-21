import { Height, type HeightSDKType } from '../../../core/client/v1/client.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * ClientState defines a loopback (localhost) client. It requires (read-only)
 * access to keys outside the client prefix.
 * @name ClientState
 * @package ibc.lightclients.localhost.v1
 * @see proto type: ibc.lightclients.localhost.v1.ClientState
 */
export interface ClientState {
    /**
     * self chain ID
     */
    chainId: string;
    /**
     * self latest block height
     */
    height: Height;
}
export interface ClientStateProtoMsg {
    typeUrl: '/ibc.lightclients.localhost.v1.ClientState';
    value: Uint8Array;
}
/**
 * ClientState defines a loopback (localhost) client. It requires (read-only)
 * access to keys outside the client prefix.
 * @name ClientStateSDKType
 * @package ibc.lightclients.localhost.v1
 * @see proto type: ibc.lightclients.localhost.v1.ClientState
 */
export interface ClientStateSDKType {
    chain_id: string;
    height: HeightSDKType;
}
/**
 * ClientState defines a loopback (localhost) client. It requires (read-only)
 * access to keys outside the client prefix.
 * @name ClientState
 * @package ibc.lightclients.localhost.v1
 * @see proto type: ibc.lightclients.localhost.v1.ClientState
 */
export declare const ClientState: {
    typeUrl: "/ibc.lightclients.localhost.v1.ClientState";
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