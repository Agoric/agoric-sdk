import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * The Nonce type functions both to mark receipt of received messages and a
 * counter for sending messages
 * @param source_domain the domain id, used to mark used nonces for received
 * messages
 * @param nonce the nonce number
 * @name Nonce
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.Nonce
 */
export interface Nonce {
    sourceDomain: number;
    nonce: bigint;
}
export interface NonceProtoMsg {
    typeUrl: '/circle.cctp.v1.Nonce';
    value: Uint8Array;
}
/**
 * The Nonce type functions both to mark receipt of received messages and a
 * counter for sending messages
 * @param source_domain the domain id, used to mark used nonces for received
 * messages
 * @param nonce the nonce number
 * @name NonceSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.Nonce
 */
export interface NonceSDKType {
    source_domain: number;
    nonce: bigint;
}
/**
 * The Nonce type functions both to mark receipt of received messages and a
 * counter for sending messages
 * @param source_domain the domain id, used to mark used nonces for received
 * messages
 * @param nonce the nonce number
 * @name Nonce
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.Nonce
 */
export declare const Nonce: {
    typeUrl: "/circle.cctp.v1.Nonce";
    is(o: any): o is Nonce;
    isSDK(o: any): o is NonceSDKType;
    encode(message: Nonce, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Nonce;
    fromJSON(object: any): Nonce;
    toJSON(message: Nonce): JsonSafe<Nonce>;
    fromPartial(object: Partial<Nonce>): Nonce;
    fromProtoMsg(message: NonceProtoMsg): Nonce;
    toProto(message: Nonce): Uint8Array;
    toProtoMsg(message: Nonce): NonceProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=nonce.d.ts.map