import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * A public key used to verify message signatures
 * @param attester ECDSA uncompressed public key, hex encoded
 * @name Attester
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.Attester
 */
export interface Attester {
    attester: string;
}
export interface AttesterProtoMsg {
    typeUrl: '/circle.cctp.v1.Attester';
    value: Uint8Array;
}
/**
 * A public key used to verify message signatures
 * @param attester ECDSA uncompressed public key, hex encoded
 * @name AttesterSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.Attester
 */
export interface AttesterSDKType {
    attester: string;
}
/**
 * A public key used to verify message signatures
 * @param attester ECDSA uncompressed public key, hex encoded
 * @name Attester
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.Attester
 */
export declare const Attester: {
    typeUrl: "/circle.cctp.v1.Attester";
    is(o: any): o is Attester;
    isSDK(o: any): o is AttesterSDKType;
    encode(message: Attester, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Attester;
    fromJSON(object: any): Attester;
    toJSON(message: Attester): JsonSafe<Attester>;
    fromPartial(object: Partial<Attester>): Attester;
    fromProtoMsg(message: AttesterProtoMsg): Attester;
    toProto(message: Attester): Uint8Array;
    toProtoMsg(message: Attester): AttesterProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=attester.d.ts.map