import { CommitmentProof, type CommitmentProofSDKType } from '../../../../cosmos/ics23/v1/proofs.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * MerkleRoot defines a merkle root hash.
 * In the Cosmos SDK, the AppHash of a block header becomes the root.
 * @name MerkleRoot
 * @package ibc.core.commitment.v1
 * @see proto type: ibc.core.commitment.v1.MerkleRoot
 */
export interface MerkleRoot {
    hash: Uint8Array;
}
export interface MerkleRootProtoMsg {
    typeUrl: '/ibc.core.commitment.v1.MerkleRoot';
    value: Uint8Array;
}
/**
 * MerkleRoot defines a merkle root hash.
 * In the Cosmos SDK, the AppHash of a block header becomes the root.
 * @name MerkleRootSDKType
 * @package ibc.core.commitment.v1
 * @see proto type: ibc.core.commitment.v1.MerkleRoot
 */
export interface MerkleRootSDKType {
    hash: Uint8Array;
}
/**
 * MerklePrefix is merkle path prefixed to the key.
 * The constructed key from the Path and the key will be append(Path.KeyPath,
 * append(Path.KeyPrefix, key...))
 * @name MerklePrefix
 * @package ibc.core.commitment.v1
 * @see proto type: ibc.core.commitment.v1.MerklePrefix
 */
export interface MerklePrefix {
    keyPrefix: Uint8Array;
}
export interface MerklePrefixProtoMsg {
    typeUrl: '/ibc.core.commitment.v1.MerklePrefix';
    value: Uint8Array;
}
/**
 * MerklePrefix is merkle path prefixed to the key.
 * The constructed key from the Path and the key will be append(Path.KeyPath,
 * append(Path.KeyPrefix, key...))
 * @name MerklePrefixSDKType
 * @package ibc.core.commitment.v1
 * @see proto type: ibc.core.commitment.v1.MerklePrefix
 */
export interface MerklePrefixSDKType {
    key_prefix: Uint8Array;
}
/**
 * MerklePath is the path used to verify commitment proofs, which can be an
 * arbitrary structured object (defined by a commitment type).
 * MerklePath is represented from root-to-leaf
 * @name MerklePath
 * @package ibc.core.commitment.v1
 * @see proto type: ibc.core.commitment.v1.MerklePath
 */
export interface MerklePath {
    keyPath: string[];
}
export interface MerklePathProtoMsg {
    typeUrl: '/ibc.core.commitment.v1.MerklePath';
    value: Uint8Array;
}
/**
 * MerklePath is the path used to verify commitment proofs, which can be an
 * arbitrary structured object (defined by a commitment type).
 * MerklePath is represented from root-to-leaf
 * @name MerklePathSDKType
 * @package ibc.core.commitment.v1
 * @see proto type: ibc.core.commitment.v1.MerklePath
 */
export interface MerklePathSDKType {
    key_path: string[];
}
/**
 * MerkleProof is a wrapper type over a chain of CommitmentProofs.
 * It demonstrates membership or non-membership for an element or set of
 * elements, verifiable in conjunction with a known commitment root. Proofs
 * should be succinct.
 * MerkleProofs are ordered from leaf-to-root
 * @name MerkleProof
 * @package ibc.core.commitment.v1
 * @see proto type: ibc.core.commitment.v1.MerkleProof
 */
export interface MerkleProof {
    proofs: CommitmentProof[];
}
export interface MerkleProofProtoMsg {
    typeUrl: '/ibc.core.commitment.v1.MerkleProof';
    value: Uint8Array;
}
/**
 * MerkleProof is a wrapper type over a chain of CommitmentProofs.
 * It demonstrates membership or non-membership for an element or set of
 * elements, verifiable in conjunction with a known commitment root. Proofs
 * should be succinct.
 * MerkleProofs are ordered from leaf-to-root
 * @name MerkleProofSDKType
 * @package ibc.core.commitment.v1
 * @see proto type: ibc.core.commitment.v1.MerkleProof
 */
export interface MerkleProofSDKType {
    proofs: CommitmentProofSDKType[];
}
/**
 * MerkleRoot defines a merkle root hash.
 * In the Cosmos SDK, the AppHash of a block header becomes the root.
 * @name MerkleRoot
 * @package ibc.core.commitment.v1
 * @see proto type: ibc.core.commitment.v1.MerkleRoot
 */
export declare const MerkleRoot: {
    typeUrl: "/ibc.core.commitment.v1.MerkleRoot";
    aminoType: "cosmos-sdk/MerkleRoot";
    is(o: any): o is MerkleRoot;
    isSDK(o: any): o is MerkleRootSDKType;
    encode(message: MerkleRoot, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MerkleRoot;
    fromJSON(object: any): MerkleRoot;
    toJSON(message: MerkleRoot): JsonSafe<MerkleRoot>;
    fromPartial(object: Partial<MerkleRoot>): MerkleRoot;
    fromProtoMsg(message: MerkleRootProtoMsg): MerkleRoot;
    toProto(message: MerkleRoot): Uint8Array;
    toProtoMsg(message: MerkleRoot): MerkleRootProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MerklePrefix is merkle path prefixed to the key.
 * The constructed key from the Path and the key will be append(Path.KeyPath,
 * append(Path.KeyPrefix, key...))
 * @name MerklePrefix
 * @package ibc.core.commitment.v1
 * @see proto type: ibc.core.commitment.v1.MerklePrefix
 */
export declare const MerklePrefix: {
    typeUrl: "/ibc.core.commitment.v1.MerklePrefix";
    aminoType: "cosmos-sdk/MerklePrefix";
    is(o: any): o is MerklePrefix;
    isSDK(o: any): o is MerklePrefixSDKType;
    encode(message: MerklePrefix, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MerklePrefix;
    fromJSON(object: any): MerklePrefix;
    toJSON(message: MerklePrefix): JsonSafe<MerklePrefix>;
    fromPartial(object: Partial<MerklePrefix>): MerklePrefix;
    fromProtoMsg(message: MerklePrefixProtoMsg): MerklePrefix;
    toProto(message: MerklePrefix): Uint8Array;
    toProtoMsg(message: MerklePrefix): MerklePrefixProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MerklePath is the path used to verify commitment proofs, which can be an
 * arbitrary structured object (defined by a commitment type).
 * MerklePath is represented from root-to-leaf
 * @name MerklePath
 * @package ibc.core.commitment.v1
 * @see proto type: ibc.core.commitment.v1.MerklePath
 */
export declare const MerklePath: {
    typeUrl: "/ibc.core.commitment.v1.MerklePath";
    aminoType: "cosmos-sdk/MerklePath";
    is(o: any): o is MerklePath;
    isSDK(o: any): o is MerklePathSDKType;
    encode(message: MerklePath, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MerklePath;
    fromJSON(object: any): MerklePath;
    toJSON(message: MerklePath): JsonSafe<MerklePath>;
    fromPartial(object: Partial<MerklePath>): MerklePath;
    fromProtoMsg(message: MerklePathProtoMsg): MerklePath;
    toProto(message: MerklePath): Uint8Array;
    toProtoMsg(message: MerklePath): MerklePathProtoMsg;
    registerTypeUrl(): void;
};
/**
 * MerkleProof is a wrapper type over a chain of CommitmentProofs.
 * It demonstrates membership or non-membership for an element or set of
 * elements, verifiable in conjunction with a known commitment root. Proofs
 * should be succinct.
 * MerkleProofs are ordered from leaf-to-root
 * @name MerkleProof
 * @package ibc.core.commitment.v1
 * @see proto type: ibc.core.commitment.v1.MerkleProof
 */
export declare const MerkleProof: {
    typeUrl: "/ibc.core.commitment.v1.MerkleProof";
    aminoType: "cosmos-sdk/MerkleProof";
    is(o: any): o is MerkleProof;
    isSDK(o: any): o is MerkleProofSDKType;
    encode(message: MerkleProof, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MerkleProof;
    fromJSON(object: any): MerkleProof;
    toJSON(message: MerkleProof): JsonSafe<MerkleProof>;
    fromPartial(object: Partial<MerkleProof>): MerkleProof;
    fromProtoMsg(message: MerkleProofProtoMsg): MerkleProof;
    toProto(message: MerkleProof): Uint8Array;
    toProtoMsg(message: MerkleProof): MerkleProofProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=commitment.d.ts.map