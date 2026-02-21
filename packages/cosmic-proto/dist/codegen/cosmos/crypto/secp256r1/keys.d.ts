import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * PubKey defines a secp256r1 ECDSA public key.
 * @name PubKey
 * @package cosmos.crypto.secp256r1
 * @see proto type: cosmos.crypto.secp256r1.PubKey
 */
export interface PubKey {
    /**
     * Point on secp256r1 curve in a compressed representation as specified in section
     * 4.3.6 of ANSI X9.62: https://webstore.ansi.org/standards/ascx9/ansix9621998
     */
    key: Uint8Array;
}
export interface PubKeyProtoMsg {
    typeUrl: '/cosmos.crypto.secp256r1.PubKey';
    value: Uint8Array;
}
/**
 * PubKey defines a secp256r1 ECDSA public key.
 * @name PubKeySDKType
 * @package cosmos.crypto.secp256r1
 * @see proto type: cosmos.crypto.secp256r1.PubKey
 */
export interface PubKeySDKType {
    key: Uint8Array;
}
/**
 * PrivKey defines a secp256r1 ECDSA private key.
 * @name PrivKey
 * @package cosmos.crypto.secp256r1
 * @see proto type: cosmos.crypto.secp256r1.PrivKey
 */
export interface PrivKey {
    /**
     * secret number serialized using big-endian encoding
     */
    secret: Uint8Array;
}
export interface PrivKeyProtoMsg {
    typeUrl: '/cosmos.crypto.secp256r1.PrivKey';
    value: Uint8Array;
}
/**
 * PrivKey defines a secp256r1 ECDSA private key.
 * @name PrivKeySDKType
 * @package cosmos.crypto.secp256r1
 * @see proto type: cosmos.crypto.secp256r1.PrivKey
 */
export interface PrivKeySDKType {
    secret: Uint8Array;
}
/**
 * PubKey defines a secp256r1 ECDSA public key.
 * @name PubKey
 * @package cosmos.crypto.secp256r1
 * @see proto type: cosmos.crypto.secp256r1.PubKey
 */
export declare const PubKey: {
    typeUrl: "/cosmos.crypto.secp256r1.PubKey";
    aminoType: "cosmos-sdk/PubKey";
    is(o: any): o is PubKey;
    isSDK(o: any): o is PubKeySDKType;
    encode(message: PubKey, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PubKey;
    fromJSON(object: any): PubKey;
    toJSON(message: PubKey): JsonSafe<PubKey>;
    fromPartial(object: Partial<PubKey>): PubKey;
    fromProtoMsg(message: PubKeyProtoMsg): PubKey;
    toProto(message: PubKey): Uint8Array;
    toProtoMsg(message: PubKey): PubKeyProtoMsg;
    registerTypeUrl(): void;
};
/**
 * PrivKey defines a secp256r1 ECDSA private key.
 * @name PrivKey
 * @package cosmos.crypto.secp256r1
 * @see proto type: cosmos.crypto.secp256r1.PrivKey
 */
export declare const PrivKey: {
    typeUrl: "/cosmos.crypto.secp256r1.PrivKey";
    aminoType: "cosmos-sdk/PrivKey";
    is(o: any): o is PrivKey;
    isSDK(o: any): o is PrivKeySDKType;
    encode(message: PrivKey, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PrivKey;
    fromJSON(object: any): PrivKey;
    toJSON(message: PrivKey): JsonSafe<PrivKey>;
    fromPartial(object: Partial<PrivKey>): PrivKey;
    fromProtoMsg(message: PrivKeyProtoMsg): PrivKey;
    toProto(message: PrivKey): Uint8Array;
    toProtoMsg(message: PrivKey): PrivKeyProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=keys.d.ts.map