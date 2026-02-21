import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * PublicKey defines the keys available for use with Tendermint Validators
 * @name PublicKey
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.PublicKey
 */
export interface PublicKey {
    ed25519?: Uint8Array;
    secp256k1?: Uint8Array;
}
export interface PublicKeyProtoMsg {
    typeUrl: '/tendermint.crypto.PublicKey';
    value: Uint8Array;
}
/**
 * PublicKey defines the keys available for use with Tendermint Validators
 * @name PublicKeySDKType
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.PublicKey
 */
export interface PublicKeySDKType {
    ed25519?: Uint8Array;
    secp256k1?: Uint8Array;
}
/**
 * PublicKey defines the keys available for use with Tendermint Validators
 * @name PublicKey
 * @package tendermint.crypto
 * @see proto type: tendermint.crypto.PublicKey
 */
export declare const PublicKey: {
    typeUrl: "/tendermint.crypto.PublicKey";
    is(o: any): o is PublicKey;
    isSDK(o: any): o is PublicKeySDKType;
    encode(message: PublicKey, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PublicKey;
    fromJSON(object: any): PublicKey;
    toJSON(message: PublicKey): JsonSafe<PublicKey>;
    fromPartial(object: Partial<PublicKey>): PublicKey;
    fromProtoMsg(message: PublicKeyProtoMsg): PublicKey;
    toProto(message: PublicKey): Uint8Array;
    toProtoMsg(message: PublicKey): PublicKeyProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=keys.d.ts.map