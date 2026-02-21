import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * PubKey is an ed25519 public key for handling Tendermint keys in SDK.
 * It's needed for Any serialization and SDK compatibility.
 * It must not be used in a non Tendermint key context because it doesn't implement
 * ADR-28. Nevertheless, you will like to use ed25519 in app user level
 * then you must create a new proto message and follow ADR-28 for Address construction.
 * @name PubKey
 * @package cosmos.crypto.ed25519
 * @see proto type: cosmos.crypto.ed25519.PubKey
 */
export interface PubKey {
    key: Uint8Array;
}
export interface PubKeyProtoMsg {
    typeUrl: '/cosmos.crypto.ed25519.PubKey';
    value: Uint8Array;
}
/**
 * PubKey is an ed25519 public key for handling Tendermint keys in SDK.
 * It's needed for Any serialization and SDK compatibility.
 * It must not be used in a non Tendermint key context because it doesn't implement
 * ADR-28. Nevertheless, you will like to use ed25519 in app user level
 * then you must create a new proto message and follow ADR-28 for Address construction.
 * @name PubKeySDKType
 * @package cosmos.crypto.ed25519
 * @see proto type: cosmos.crypto.ed25519.PubKey
 */
export interface PubKeySDKType {
    key: Uint8Array;
}
/**
 * PrivKey defines a ed25519 private key.
 * NOTE: ed25519 keys must not be used in SDK apps except in a tendermint validator context.
 * @name PrivKey
 * @package cosmos.crypto.ed25519
 * @see proto type: cosmos.crypto.ed25519.PrivKey
 */
export interface PrivKey {
    key: Uint8Array;
}
export interface PrivKeyProtoMsg {
    typeUrl: '/cosmos.crypto.ed25519.PrivKey';
    value: Uint8Array;
}
/**
 * PrivKey defines a ed25519 private key.
 * NOTE: ed25519 keys must not be used in SDK apps except in a tendermint validator context.
 * @name PrivKeySDKType
 * @package cosmos.crypto.ed25519
 * @see proto type: cosmos.crypto.ed25519.PrivKey
 */
export interface PrivKeySDKType {
    key: Uint8Array;
}
/**
 * PubKey is an ed25519 public key for handling Tendermint keys in SDK.
 * It's needed for Any serialization and SDK compatibility.
 * It must not be used in a non Tendermint key context because it doesn't implement
 * ADR-28. Nevertheless, you will like to use ed25519 in app user level
 * then you must create a new proto message and follow ADR-28 for Address construction.
 * @name PubKey
 * @package cosmos.crypto.ed25519
 * @see proto type: cosmos.crypto.ed25519.PubKey
 */
export declare const PubKey: {
    typeUrl: "/cosmos.crypto.ed25519.PubKey";
    aminoType: "tendermint/PubKeyEd25519";
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
 * PrivKey defines a ed25519 private key.
 * NOTE: ed25519 keys must not be used in SDK apps except in a tendermint validator context.
 * @name PrivKey
 * @package cosmos.crypto.ed25519
 * @see proto type: cosmos.crypto.ed25519.PrivKey
 */
export declare const PrivKey: {
    typeUrl: "/cosmos.crypto.ed25519.PrivKey";
    aminoType: "tendermint/PrivKeyEd25519";
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