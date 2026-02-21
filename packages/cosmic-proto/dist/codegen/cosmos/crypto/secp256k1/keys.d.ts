import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * PubKey defines a secp256k1 public key
 * Key is the compressed form of the pubkey. The first byte depends is a 0x02 byte
 * if the y-coordinate is the lexicographically largest of the two associated with
 * the x-coordinate. Otherwise the first byte is a 0x03.
 * This prefix is followed with the x-coordinate.
 * @name PubKey
 * @package cosmos.crypto.secp256k1
 * @see proto type: cosmos.crypto.secp256k1.PubKey
 */
export interface PubKey {
    key: Uint8Array;
}
export interface PubKeyProtoMsg {
    typeUrl: '/cosmos.crypto.secp256k1.PubKey';
    value: Uint8Array;
}
/**
 * PubKey defines a secp256k1 public key
 * Key is the compressed form of the pubkey. The first byte depends is a 0x02 byte
 * if the y-coordinate is the lexicographically largest of the two associated with
 * the x-coordinate. Otherwise the first byte is a 0x03.
 * This prefix is followed with the x-coordinate.
 * @name PubKeySDKType
 * @package cosmos.crypto.secp256k1
 * @see proto type: cosmos.crypto.secp256k1.PubKey
 */
export interface PubKeySDKType {
    key: Uint8Array;
}
/**
 * PrivKey defines a secp256k1 private key.
 * @name PrivKey
 * @package cosmos.crypto.secp256k1
 * @see proto type: cosmos.crypto.secp256k1.PrivKey
 */
export interface PrivKey {
    key: Uint8Array;
}
export interface PrivKeyProtoMsg {
    typeUrl: '/cosmos.crypto.secp256k1.PrivKey';
    value: Uint8Array;
}
/**
 * PrivKey defines a secp256k1 private key.
 * @name PrivKeySDKType
 * @package cosmos.crypto.secp256k1
 * @see proto type: cosmos.crypto.secp256k1.PrivKey
 */
export interface PrivKeySDKType {
    key: Uint8Array;
}
/**
 * PubKey defines a secp256k1 public key
 * Key is the compressed form of the pubkey. The first byte depends is a 0x02 byte
 * if the y-coordinate is the lexicographically largest of the two associated with
 * the x-coordinate. Otherwise the first byte is a 0x03.
 * This prefix is followed with the x-coordinate.
 * @name PubKey
 * @package cosmos.crypto.secp256k1
 * @see proto type: cosmos.crypto.secp256k1.PubKey
 */
export declare const PubKey: {
    typeUrl: "/cosmos.crypto.secp256k1.PubKey";
    aminoType: "tendermint/PubKeySecp256k1";
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
 * PrivKey defines a secp256k1 private key.
 * @name PrivKey
 * @package cosmos.crypto.secp256k1
 * @see proto type: cosmos.crypto.secp256k1.PrivKey
 */
export declare const PrivKey: {
    typeUrl: "/cosmos.crypto.secp256k1.PrivKey";
    aminoType: "tendermint/PrivKeySecp256k1";
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