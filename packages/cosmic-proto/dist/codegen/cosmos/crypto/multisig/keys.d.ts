import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * LegacyAminoPubKey specifies a public key type
 * which nests multiple public keys and a threshold,
 * it uses legacy amino address rules.
 * @name LegacyAminoPubKey
 * @package cosmos.crypto.multisig
 * @see proto type: cosmos.crypto.multisig.LegacyAminoPubKey
 */
export interface LegacyAminoPubKey {
    threshold: number;
    publicKeys: Any[];
}
export interface LegacyAminoPubKeyProtoMsg {
    typeUrl: '/cosmos.crypto.multisig.LegacyAminoPubKey';
    value: Uint8Array;
}
/**
 * LegacyAminoPubKey specifies a public key type
 * which nests multiple public keys and a threshold,
 * it uses legacy amino address rules.
 * @name LegacyAminoPubKeySDKType
 * @package cosmos.crypto.multisig
 * @see proto type: cosmos.crypto.multisig.LegacyAminoPubKey
 */
export interface LegacyAminoPubKeySDKType {
    threshold: number;
    public_keys: AnySDKType[];
}
/**
 * LegacyAminoPubKey specifies a public key type
 * which nests multiple public keys and a threshold,
 * it uses legacy amino address rules.
 * @name LegacyAminoPubKey
 * @package cosmos.crypto.multisig
 * @see proto type: cosmos.crypto.multisig.LegacyAminoPubKey
 */
export declare const LegacyAminoPubKey: {
    typeUrl: "/cosmos.crypto.multisig.LegacyAminoPubKey";
    aminoType: "tendermint/PubKeyMultisigThreshold";
    is(o: any): o is LegacyAminoPubKey;
    isSDK(o: any): o is LegacyAminoPubKeySDKType;
    encode(message: LegacyAminoPubKey, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): LegacyAminoPubKey;
    fromJSON(object: any): LegacyAminoPubKey;
    toJSON(message: LegacyAminoPubKey): JsonSafe<LegacyAminoPubKey>;
    fromPartial(object: Partial<LegacyAminoPubKey>): LegacyAminoPubKey;
    fromProtoMsg(message: LegacyAminoPubKeyProtoMsg): LegacyAminoPubKey;
    toProto(message: LegacyAminoPubKey): Uint8Array;
    toProtoMsg(message: LegacyAminoPubKey): LegacyAminoPubKeyProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=keys.d.ts.map