//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
import { type JsonSafe } from '../../../json-safe.js';
export enum HashOp {
  /** NO_HASH - NO_HASH is the default if no data passed. Note this is an illegal argument some places. */
  NO_HASH = 0,
  SHA256 = 1,
  SHA512 = 2,
  KECCAK256 = 3,
  RIPEMD160 = 4,
  /** BITCOIN - ripemd160(sha256(x)) */
  BITCOIN = 5,
  SHA512_256 = 6,
  BLAKE2B_512 = 7,
  BLAKE2S_256 = 8,
  BLAKE3 = 9,
  UNRECOGNIZED = -1,
}
export const HashOpSDKType = HashOp;
export function hashOpFromJSON(object: any): HashOp {
  switch (object) {
    case 0:
    case 'NO_HASH':
      return HashOp.NO_HASH;
    case 1:
    case 'SHA256':
      return HashOp.SHA256;
    case 2:
    case 'SHA512':
      return HashOp.SHA512;
    case 3:
    case 'KECCAK256':
      return HashOp.KECCAK256;
    case 4:
    case 'RIPEMD160':
      return HashOp.RIPEMD160;
    case 5:
    case 'BITCOIN':
      return HashOp.BITCOIN;
    case 6:
    case 'SHA512_256':
      return HashOp.SHA512_256;
    case 7:
    case 'BLAKE2B_512':
      return HashOp.BLAKE2B_512;
    case 8:
    case 'BLAKE2S_256':
      return HashOp.BLAKE2S_256;
    case 9:
    case 'BLAKE3':
      return HashOp.BLAKE3;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return HashOp.UNRECOGNIZED;
  }
}
export function hashOpToJSON(object: HashOp): string {
  switch (object) {
    case HashOp.NO_HASH:
      return 'NO_HASH';
    case HashOp.SHA256:
      return 'SHA256';
    case HashOp.SHA512:
      return 'SHA512';
    case HashOp.KECCAK256:
      return 'KECCAK256';
    case HashOp.RIPEMD160:
      return 'RIPEMD160';
    case HashOp.BITCOIN:
      return 'BITCOIN';
    case HashOp.SHA512_256:
      return 'SHA512_256';
    case HashOp.BLAKE2B_512:
      return 'BLAKE2B_512';
    case HashOp.BLAKE2S_256:
      return 'BLAKE2S_256';
    case HashOp.BLAKE3:
      return 'BLAKE3';
    case HashOp.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/**
 * LengthOp defines how to process the key and value of the LeafOp
 * to include length information. After encoding the length with the given
 * algorithm, the length will be prepended to the key and value bytes.
 * (Each one with it's own encoded length)
 */
export enum LengthOp {
  /** NO_PREFIX - NO_PREFIX don't include any length info */
  NO_PREFIX = 0,
  /** VAR_PROTO - VAR_PROTO uses protobuf (and go-amino) varint encoding of the length */
  VAR_PROTO = 1,
  /** VAR_RLP - VAR_RLP uses rlp int encoding of the length */
  VAR_RLP = 2,
  /** FIXED32_BIG - FIXED32_BIG uses big-endian encoding of the length as a 32 bit integer */
  FIXED32_BIG = 3,
  /** FIXED32_LITTLE - FIXED32_LITTLE uses little-endian encoding of the length as a 32 bit integer */
  FIXED32_LITTLE = 4,
  /** FIXED64_BIG - FIXED64_BIG uses big-endian encoding of the length as a 64 bit integer */
  FIXED64_BIG = 5,
  /** FIXED64_LITTLE - FIXED64_LITTLE uses little-endian encoding of the length as a 64 bit integer */
  FIXED64_LITTLE = 6,
  /** REQUIRE_32_BYTES - REQUIRE_32_BYTES is like NONE, but will fail if the input is not exactly 32 bytes (sha256 output) */
  REQUIRE_32_BYTES = 7,
  /** REQUIRE_64_BYTES - REQUIRE_64_BYTES is like NONE, but will fail if the input is not exactly 64 bytes (sha512 output) */
  REQUIRE_64_BYTES = 8,
  UNRECOGNIZED = -1,
}
export const LengthOpSDKType = LengthOp;
export function lengthOpFromJSON(object: any): LengthOp {
  switch (object) {
    case 0:
    case 'NO_PREFIX':
      return LengthOp.NO_PREFIX;
    case 1:
    case 'VAR_PROTO':
      return LengthOp.VAR_PROTO;
    case 2:
    case 'VAR_RLP':
      return LengthOp.VAR_RLP;
    case 3:
    case 'FIXED32_BIG':
      return LengthOp.FIXED32_BIG;
    case 4:
    case 'FIXED32_LITTLE':
      return LengthOp.FIXED32_LITTLE;
    case 5:
    case 'FIXED64_BIG':
      return LengthOp.FIXED64_BIG;
    case 6:
    case 'FIXED64_LITTLE':
      return LengthOp.FIXED64_LITTLE;
    case 7:
    case 'REQUIRE_32_BYTES':
      return LengthOp.REQUIRE_32_BYTES;
    case 8:
    case 'REQUIRE_64_BYTES':
      return LengthOp.REQUIRE_64_BYTES;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return LengthOp.UNRECOGNIZED;
  }
}
export function lengthOpToJSON(object: LengthOp): string {
  switch (object) {
    case LengthOp.NO_PREFIX:
      return 'NO_PREFIX';
    case LengthOp.VAR_PROTO:
      return 'VAR_PROTO';
    case LengthOp.VAR_RLP:
      return 'VAR_RLP';
    case LengthOp.FIXED32_BIG:
      return 'FIXED32_BIG';
    case LengthOp.FIXED32_LITTLE:
      return 'FIXED32_LITTLE';
    case LengthOp.FIXED64_BIG:
      return 'FIXED64_BIG';
    case LengthOp.FIXED64_LITTLE:
      return 'FIXED64_LITTLE';
    case LengthOp.REQUIRE_32_BYTES:
      return 'REQUIRE_32_BYTES';
    case LengthOp.REQUIRE_64_BYTES:
      return 'REQUIRE_64_BYTES';
    case LengthOp.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/**
 * ExistenceProof takes a key and a value and a set of steps to perform on it.
 * The result of peforming all these steps will provide a "root hash", which can
 * be compared to the value in a header.
 *
 * Since it is computationally infeasible to produce a hash collission for any of the used
 * cryptographic hash functions, if someone can provide a series of operations to transform
 * a given key and value into a root hash that matches some trusted root, these key and values
 * must be in the referenced merkle tree.
 *
 * The only possible issue is maliablity in LeafOp, such as providing extra prefix data,
 * which should be controlled by a spec. Eg. with lengthOp as NONE,
 * prefix = FOO, key = BAR, value = CHOICE
 * and
 * prefix = F, key = OOBAR, value = CHOICE
 * would produce the same value.
 *
 * With LengthOp this is tricker but not impossible. Which is why the "leafPrefixEqual" field
 * in the ProofSpec is valuable to prevent this mutability. And why all trees should
 * length-prefix the data before hashing it.
 */
export interface ExistenceProof {
  key: Uint8Array;
  value: Uint8Array;
  leaf?: LeafOp;
  path: InnerOp[];
}
export interface ExistenceProofProtoMsg {
  typeUrl: '/cosmos.ics23.v1.ExistenceProof';
  value: Uint8Array;
}
/**
 * ExistenceProof takes a key and a value and a set of steps to perform on it.
 * The result of peforming all these steps will provide a "root hash", which can
 * be compared to the value in a header.
 *
 * Since it is computationally infeasible to produce a hash collission for any of the used
 * cryptographic hash functions, if someone can provide a series of operations to transform
 * a given key and value into a root hash that matches some trusted root, these key and values
 * must be in the referenced merkle tree.
 *
 * The only possible issue is maliablity in LeafOp, such as providing extra prefix data,
 * which should be controlled by a spec. Eg. with lengthOp as NONE,
 * prefix = FOO, key = BAR, value = CHOICE
 * and
 * prefix = F, key = OOBAR, value = CHOICE
 * would produce the same value.
 *
 * With LengthOp this is tricker but not impossible. Which is why the "leafPrefixEqual" field
 * in the ProofSpec is valuable to prevent this mutability. And why all trees should
 * length-prefix the data before hashing it.
 */
export interface ExistenceProofSDKType {
  key: Uint8Array;
  value: Uint8Array;
  leaf?: LeafOpSDKType;
  path: InnerOpSDKType[];
}
/**
 * NonExistenceProof takes a proof of two neighbors, one left of the desired key,
 * one right of the desired key. If both proofs are valid AND they are neighbors,
 * then there is no valid proof for the given key.
 */
export interface NonExistenceProof {
  /** TODO: remove this as unnecessary??? we prove a range */
  key: Uint8Array;
  left?: ExistenceProof;
  right?: ExistenceProof;
}
export interface NonExistenceProofProtoMsg {
  typeUrl: '/cosmos.ics23.v1.NonExistenceProof';
  value: Uint8Array;
}
/**
 * NonExistenceProof takes a proof of two neighbors, one left of the desired key,
 * one right of the desired key. If both proofs are valid AND they are neighbors,
 * then there is no valid proof for the given key.
 */
export interface NonExistenceProofSDKType {
  key: Uint8Array;
  left?: ExistenceProofSDKType;
  right?: ExistenceProofSDKType;
}
/** CommitmentProof is either an ExistenceProof or a NonExistenceProof, or a Batch of such messages */
export interface CommitmentProof {
  exist?: ExistenceProof;
  nonexist?: NonExistenceProof;
  batch?: BatchProof;
  compressed?: CompressedBatchProof;
}
export interface CommitmentProofProtoMsg {
  typeUrl: '/cosmos.ics23.v1.CommitmentProof';
  value: Uint8Array;
}
/** CommitmentProof is either an ExistenceProof or a NonExistenceProof, or a Batch of such messages */
export interface CommitmentProofSDKType {
  exist?: ExistenceProofSDKType;
  nonexist?: NonExistenceProofSDKType;
  batch?: BatchProofSDKType;
  compressed?: CompressedBatchProofSDKType;
}
/**
 * LeafOp represents the raw key-value data we wish to prove, and
 * must be flexible to represent the internal transformation from
 * the original key-value pairs into the basis hash, for many existing
 * merkle trees.
 *
 * key and value are passed in. So that the signature of this operation is:
 * leafOp(key, value) -> output
 *
 * To process this, first prehash the keys and values if needed (ANY means no hash in this case):
 * hkey = prehashKey(key)
 * hvalue = prehashValue(value)
 *
 * Then combine the bytes, and hash it
 * output = hash(prefix || length(hkey) || hkey || length(hvalue) || hvalue)
 */
export interface LeafOp {
  hash: HashOp;
  prehashKey: HashOp;
  prehashValue: HashOp;
  length: LengthOp;
  /**
   * prefix is a fixed bytes that may optionally be included at the beginning to differentiate
   * a leaf node from an inner node.
   */
  prefix: Uint8Array;
}
export interface LeafOpProtoMsg {
  typeUrl: '/cosmos.ics23.v1.LeafOp';
  value: Uint8Array;
}
/**
 * LeafOp represents the raw key-value data we wish to prove, and
 * must be flexible to represent the internal transformation from
 * the original key-value pairs into the basis hash, for many existing
 * merkle trees.
 *
 * key and value are passed in. So that the signature of this operation is:
 * leafOp(key, value) -> output
 *
 * To process this, first prehash the keys and values if needed (ANY means no hash in this case):
 * hkey = prehashKey(key)
 * hvalue = prehashValue(value)
 *
 * Then combine the bytes, and hash it
 * output = hash(prefix || length(hkey) || hkey || length(hvalue) || hvalue)
 */
export interface LeafOpSDKType {
  hash: HashOp;
  prehash_key: HashOp;
  prehash_value: HashOp;
  length: LengthOp;
  prefix: Uint8Array;
}
/**
 * InnerOp represents a merkle-proof step that is not a leaf.
 * It represents concatenating two children and hashing them to provide the next result.
 *
 * The result of the previous step is passed in, so the signature of this op is:
 * innerOp(child) -> output
 *
 * The result of applying InnerOp should be:
 * output = op.hash(op.prefix || child || op.suffix)
 *
 * where the || operator is concatenation of binary data,
 * and child is the result of hashing all the tree below this step.
 *
 * Any special data, like prepending child with the length, or prepending the entire operation with
 * some value to differentiate from leaf nodes, should be included in prefix and suffix.
 * If either of prefix or suffix is empty, we just treat it as an empty string
 */
export interface InnerOp {
  hash: HashOp;
  prefix: Uint8Array;
  suffix: Uint8Array;
}
export interface InnerOpProtoMsg {
  typeUrl: '/cosmos.ics23.v1.InnerOp';
  value: Uint8Array;
}
/**
 * InnerOp represents a merkle-proof step that is not a leaf.
 * It represents concatenating two children and hashing them to provide the next result.
 *
 * The result of the previous step is passed in, so the signature of this op is:
 * innerOp(child) -> output
 *
 * The result of applying InnerOp should be:
 * output = op.hash(op.prefix || child || op.suffix)
 *
 * where the || operator is concatenation of binary data,
 * and child is the result of hashing all the tree below this step.
 *
 * Any special data, like prepending child with the length, or prepending the entire operation with
 * some value to differentiate from leaf nodes, should be included in prefix and suffix.
 * If either of prefix or suffix is empty, we just treat it as an empty string
 */
export interface InnerOpSDKType {
  hash: HashOp;
  prefix: Uint8Array;
  suffix: Uint8Array;
}
/**
 * ProofSpec defines what the expected parameters are for a given proof type.
 * This can be stored in the client and used to validate any incoming proofs.
 *
 * verify(ProofSpec, Proof) -> Proof | Error
 *
 * As demonstrated in tests, if we don't fix the algorithm used to calculate the
 * LeafHash for a given tree, there are many possible key-value pairs that can
 * generate a given hash (by interpretting the preimage differently).
 * We need this for proper security, requires client knows a priori what
 * tree format server uses. But not in code, rather a configuration object.
 */
export interface ProofSpec {
  /**
   * any field in the ExistenceProof must be the same as in this spec.
   * except Prefix, which is just the first bytes of prefix (spec can be longer)
   */
  leafSpec?: LeafOp;
  innerSpec?: InnerSpec;
  /**
   * max_depth (if > 0) is the maximum number of InnerOps allowed (mainly for fixed-depth tries)
   * the max_depth is interpreted as 128 if set to 0
   */
  maxDepth: number;
  /** min_depth (if > 0) is the minimum number of InnerOps allowed (mainly for fixed-depth tries) */
  minDepth: number;
  /**
   * prehash_key_before_comparison is a flag that indicates whether to use the
   * prehash_key specified by LeafOp to compare lexical ordering of keys for
   * non-existence proofs.
   */
  prehashKeyBeforeComparison: boolean;
}
export interface ProofSpecProtoMsg {
  typeUrl: '/cosmos.ics23.v1.ProofSpec';
  value: Uint8Array;
}
/**
 * ProofSpec defines what the expected parameters are for a given proof type.
 * This can be stored in the client and used to validate any incoming proofs.
 *
 * verify(ProofSpec, Proof) -> Proof | Error
 *
 * As demonstrated in tests, if we don't fix the algorithm used to calculate the
 * LeafHash for a given tree, there are many possible key-value pairs that can
 * generate a given hash (by interpretting the preimage differently).
 * We need this for proper security, requires client knows a priori what
 * tree format server uses. But not in code, rather a configuration object.
 */
export interface ProofSpecSDKType {
  leaf_spec?: LeafOpSDKType;
  inner_spec?: InnerSpecSDKType;
  max_depth: number;
  min_depth: number;
  prehash_key_before_comparison: boolean;
}
/**
 * InnerSpec contains all store-specific structure info to determine if two proofs from a
 * given store are neighbors.
 *
 * This enables:
 *
 * isLeftMost(spec: InnerSpec, op: InnerOp)
 * isRightMost(spec: InnerSpec, op: InnerOp)
 * isLeftNeighbor(spec: InnerSpec, left: InnerOp, right: InnerOp)
 */
export interface InnerSpec {
  /**
   * Child order is the ordering of the children node, must count from 0
   * iavl tree is [0, 1] (left then right)
   * merk is [0, 2, 1] (left, right, here)
   */
  childOrder: number[];
  childSize: number;
  minPrefixLength: number;
  /** the max prefix length must be less than the minimum prefix length + child size */
  maxPrefixLength: number;
  /** empty child is the prehash image that is used when one child is nil (eg. 20 bytes of 0) */
  emptyChild: Uint8Array;
  /** hash is the algorithm that must be used for each InnerOp */
  hash: HashOp;
}
export interface InnerSpecProtoMsg {
  typeUrl: '/cosmos.ics23.v1.InnerSpec';
  value: Uint8Array;
}
/**
 * InnerSpec contains all store-specific structure info to determine if two proofs from a
 * given store are neighbors.
 *
 * This enables:
 *
 * isLeftMost(spec: InnerSpec, op: InnerOp)
 * isRightMost(spec: InnerSpec, op: InnerOp)
 * isLeftNeighbor(spec: InnerSpec, left: InnerOp, right: InnerOp)
 */
export interface InnerSpecSDKType {
  child_order: number[];
  child_size: number;
  min_prefix_length: number;
  max_prefix_length: number;
  empty_child: Uint8Array;
  hash: HashOp;
}
/** BatchProof is a group of multiple proof types than can be compressed */
export interface BatchProof {
  entries: BatchEntry[];
}
export interface BatchProofProtoMsg {
  typeUrl: '/cosmos.ics23.v1.BatchProof';
  value: Uint8Array;
}
/** BatchProof is a group of multiple proof types than can be compressed */
export interface BatchProofSDKType {
  entries: BatchEntrySDKType[];
}
/** Use BatchEntry not CommitmentProof, to avoid recursion */
export interface BatchEntry {
  exist?: ExistenceProof;
  nonexist?: NonExistenceProof;
}
export interface BatchEntryProtoMsg {
  typeUrl: '/cosmos.ics23.v1.BatchEntry';
  value: Uint8Array;
}
/** Use BatchEntry not CommitmentProof, to avoid recursion */
export interface BatchEntrySDKType {
  exist?: ExistenceProofSDKType;
  nonexist?: NonExistenceProofSDKType;
}
export interface CompressedBatchProof {
  entries: CompressedBatchEntry[];
  lookupInners: InnerOp[];
}
export interface CompressedBatchProofProtoMsg {
  typeUrl: '/cosmos.ics23.v1.CompressedBatchProof';
  value: Uint8Array;
}
export interface CompressedBatchProofSDKType {
  entries: CompressedBatchEntrySDKType[];
  lookup_inners: InnerOpSDKType[];
}
/** Use BatchEntry not CommitmentProof, to avoid recursion */
export interface CompressedBatchEntry {
  exist?: CompressedExistenceProof;
  nonexist?: CompressedNonExistenceProof;
}
export interface CompressedBatchEntryProtoMsg {
  typeUrl: '/cosmos.ics23.v1.CompressedBatchEntry';
  value: Uint8Array;
}
/** Use BatchEntry not CommitmentProof, to avoid recursion */
export interface CompressedBatchEntrySDKType {
  exist?: CompressedExistenceProofSDKType;
  nonexist?: CompressedNonExistenceProofSDKType;
}
export interface CompressedExistenceProof {
  key: Uint8Array;
  value: Uint8Array;
  leaf?: LeafOp;
  /** these are indexes into the lookup_inners table in CompressedBatchProof */
  path: number[];
}
export interface CompressedExistenceProofProtoMsg {
  typeUrl: '/cosmos.ics23.v1.CompressedExistenceProof';
  value: Uint8Array;
}
export interface CompressedExistenceProofSDKType {
  key: Uint8Array;
  value: Uint8Array;
  leaf?: LeafOpSDKType;
  path: number[];
}
export interface CompressedNonExistenceProof {
  /** TODO: remove this as unnecessary??? we prove a range */
  key: Uint8Array;
  left?: CompressedExistenceProof;
  right?: CompressedExistenceProof;
}
export interface CompressedNonExistenceProofProtoMsg {
  typeUrl: '/cosmos.ics23.v1.CompressedNonExistenceProof';
  value: Uint8Array;
}
export interface CompressedNonExistenceProofSDKType {
  key: Uint8Array;
  left?: CompressedExistenceProofSDKType;
  right?: CompressedExistenceProofSDKType;
}
function createBaseExistenceProof(): ExistenceProof {
  return {
    key: new Uint8Array(),
    value: new Uint8Array(),
    leaf: undefined,
    path: [],
  };
}
export const ExistenceProof = {
  typeUrl: '/cosmos.ics23.v1.ExistenceProof',
  encode(
    message: ExistenceProof,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.key.length !== 0) {
      writer.uint32(10).bytes(message.key);
    }
    if (message.value.length !== 0) {
      writer.uint32(18).bytes(message.value);
    }
    if (message.leaf !== undefined) {
      LeafOp.encode(message.leaf, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.path) {
      InnerOp.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ExistenceProof {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExistenceProof();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.bytes();
          break;
        case 2:
          message.value = reader.bytes();
          break;
        case 3:
          message.leaf = LeafOp.decode(reader, reader.uint32());
          break;
        case 4:
          message.path.push(InnerOp.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ExistenceProof {
    return {
      key: isSet(object.key) ? bytesFromBase64(object.key) : new Uint8Array(),
      value: isSet(object.value)
        ? bytesFromBase64(object.value)
        : new Uint8Array(),
      leaf: isSet(object.leaf) ? LeafOp.fromJSON(object.leaf) : undefined,
      path: Array.isArray(object?.path)
        ? object.path.map((e: any) => InnerOp.fromJSON(e))
        : [],
    };
  },
  toJSON(message: ExistenceProof): JsonSafe<ExistenceProof> {
    const obj: any = {};
    message.key !== undefined &&
      (obj.key = base64FromBytes(
        message.key !== undefined ? message.key : new Uint8Array(),
      ));
    message.value !== undefined &&
      (obj.value = base64FromBytes(
        message.value !== undefined ? message.value : new Uint8Array(),
      ));
    message.leaf !== undefined &&
      (obj.leaf = message.leaf ? LeafOp.toJSON(message.leaf) : undefined);
    if (message.path) {
      obj.path = message.path.map(e => (e ? InnerOp.toJSON(e) : undefined));
    } else {
      obj.path = [];
    }
    return obj;
  },
  fromPartial(object: Partial<ExistenceProof>): ExistenceProof {
    const message = createBaseExistenceProof();
    message.key = object.key ?? new Uint8Array();
    message.value = object.value ?? new Uint8Array();
    message.leaf =
      object.leaf !== undefined && object.leaf !== null
        ? LeafOp.fromPartial(object.leaf)
        : undefined;
    message.path = object.path?.map(e => InnerOp.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: ExistenceProofProtoMsg): ExistenceProof {
    return ExistenceProof.decode(message.value);
  },
  toProto(message: ExistenceProof): Uint8Array {
    return ExistenceProof.encode(message).finish();
  },
  toProtoMsg(message: ExistenceProof): ExistenceProofProtoMsg {
    return {
      typeUrl: '/cosmos.ics23.v1.ExistenceProof',
      value: ExistenceProof.encode(message).finish(),
    };
  },
};
function createBaseNonExistenceProof(): NonExistenceProof {
  return {
    key: new Uint8Array(),
    left: undefined,
    right: undefined,
  };
}
export const NonExistenceProof = {
  typeUrl: '/cosmos.ics23.v1.NonExistenceProof',
  encode(
    message: NonExistenceProof,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.key.length !== 0) {
      writer.uint32(10).bytes(message.key);
    }
    if (message.left !== undefined) {
      ExistenceProof.encode(message.left, writer.uint32(18).fork()).ldelim();
    }
    if (message.right !== undefined) {
      ExistenceProof.encode(message.right, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): NonExistenceProof {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNonExistenceProof();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.bytes();
          break;
        case 2:
          message.left = ExistenceProof.decode(reader, reader.uint32());
          break;
        case 3:
          message.right = ExistenceProof.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): NonExistenceProof {
    return {
      key: isSet(object.key) ? bytesFromBase64(object.key) : new Uint8Array(),
      left: isSet(object.left)
        ? ExistenceProof.fromJSON(object.left)
        : undefined,
      right: isSet(object.right)
        ? ExistenceProof.fromJSON(object.right)
        : undefined,
    };
  },
  toJSON(message: NonExistenceProof): JsonSafe<NonExistenceProof> {
    const obj: any = {};
    message.key !== undefined &&
      (obj.key = base64FromBytes(
        message.key !== undefined ? message.key : new Uint8Array(),
      ));
    message.left !== undefined &&
      (obj.left = message.left
        ? ExistenceProof.toJSON(message.left)
        : undefined);
    message.right !== undefined &&
      (obj.right = message.right
        ? ExistenceProof.toJSON(message.right)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<NonExistenceProof>): NonExistenceProof {
    const message = createBaseNonExistenceProof();
    message.key = object.key ?? new Uint8Array();
    message.left =
      object.left !== undefined && object.left !== null
        ? ExistenceProof.fromPartial(object.left)
        : undefined;
    message.right =
      object.right !== undefined && object.right !== null
        ? ExistenceProof.fromPartial(object.right)
        : undefined;
    return message;
  },
  fromProtoMsg(message: NonExistenceProofProtoMsg): NonExistenceProof {
    return NonExistenceProof.decode(message.value);
  },
  toProto(message: NonExistenceProof): Uint8Array {
    return NonExistenceProof.encode(message).finish();
  },
  toProtoMsg(message: NonExistenceProof): NonExistenceProofProtoMsg {
    return {
      typeUrl: '/cosmos.ics23.v1.NonExistenceProof',
      value: NonExistenceProof.encode(message).finish(),
    };
  },
};
function createBaseCommitmentProof(): CommitmentProof {
  return {
    exist: undefined,
    nonexist: undefined,
    batch: undefined,
    compressed: undefined,
  };
}
export const CommitmentProof = {
  typeUrl: '/cosmos.ics23.v1.CommitmentProof',
  encode(
    message: CommitmentProof,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.exist !== undefined) {
      ExistenceProof.encode(message.exist, writer.uint32(10).fork()).ldelim();
    }
    if (message.nonexist !== undefined) {
      NonExistenceProof.encode(
        message.nonexist,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    if (message.batch !== undefined) {
      BatchProof.encode(message.batch, writer.uint32(26).fork()).ldelim();
    }
    if (message.compressed !== undefined) {
      CompressedBatchProof.encode(
        message.compressed,
        writer.uint32(34).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): CommitmentProof {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCommitmentProof();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.exist = ExistenceProof.decode(reader, reader.uint32());
          break;
        case 2:
          message.nonexist = NonExistenceProof.decode(reader, reader.uint32());
          break;
        case 3:
          message.batch = BatchProof.decode(reader, reader.uint32());
          break;
        case 4:
          message.compressed = CompressedBatchProof.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): CommitmentProof {
    return {
      exist: isSet(object.exist)
        ? ExistenceProof.fromJSON(object.exist)
        : undefined,
      nonexist: isSet(object.nonexist)
        ? NonExistenceProof.fromJSON(object.nonexist)
        : undefined,
      batch: isSet(object.batch)
        ? BatchProof.fromJSON(object.batch)
        : undefined,
      compressed: isSet(object.compressed)
        ? CompressedBatchProof.fromJSON(object.compressed)
        : undefined,
    };
  },
  toJSON(message: CommitmentProof): JsonSafe<CommitmentProof> {
    const obj: any = {};
    message.exist !== undefined &&
      (obj.exist = message.exist
        ? ExistenceProof.toJSON(message.exist)
        : undefined);
    message.nonexist !== undefined &&
      (obj.nonexist = message.nonexist
        ? NonExistenceProof.toJSON(message.nonexist)
        : undefined);
    message.batch !== undefined &&
      (obj.batch = message.batch
        ? BatchProof.toJSON(message.batch)
        : undefined);
    message.compressed !== undefined &&
      (obj.compressed = message.compressed
        ? CompressedBatchProof.toJSON(message.compressed)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<CommitmentProof>): CommitmentProof {
    const message = createBaseCommitmentProof();
    message.exist =
      object.exist !== undefined && object.exist !== null
        ? ExistenceProof.fromPartial(object.exist)
        : undefined;
    message.nonexist =
      object.nonexist !== undefined && object.nonexist !== null
        ? NonExistenceProof.fromPartial(object.nonexist)
        : undefined;
    message.batch =
      object.batch !== undefined && object.batch !== null
        ? BatchProof.fromPartial(object.batch)
        : undefined;
    message.compressed =
      object.compressed !== undefined && object.compressed !== null
        ? CompressedBatchProof.fromPartial(object.compressed)
        : undefined;
    return message;
  },
  fromProtoMsg(message: CommitmentProofProtoMsg): CommitmentProof {
    return CommitmentProof.decode(message.value);
  },
  toProto(message: CommitmentProof): Uint8Array {
    return CommitmentProof.encode(message).finish();
  },
  toProtoMsg(message: CommitmentProof): CommitmentProofProtoMsg {
    return {
      typeUrl: '/cosmos.ics23.v1.CommitmentProof',
      value: CommitmentProof.encode(message).finish(),
    };
  },
};
function createBaseLeafOp(): LeafOp {
  return {
    hash: 0,
    prehashKey: 0,
    prehashValue: 0,
    length: 0,
    prefix: new Uint8Array(),
  };
}
export const LeafOp = {
  typeUrl: '/cosmos.ics23.v1.LeafOp',
  encode(
    message: LeafOp,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.hash !== 0) {
      writer.uint32(8).int32(message.hash);
    }
    if (message.prehashKey !== 0) {
      writer.uint32(16).int32(message.prehashKey);
    }
    if (message.prehashValue !== 0) {
      writer.uint32(24).int32(message.prehashValue);
    }
    if (message.length !== 0) {
      writer.uint32(32).int32(message.length);
    }
    if (message.prefix.length !== 0) {
      writer.uint32(42).bytes(message.prefix);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): LeafOp {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLeafOp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.hash = reader.int32() as any;
          break;
        case 2:
          message.prehashKey = reader.int32() as any;
          break;
        case 3:
          message.prehashValue = reader.int32() as any;
          break;
        case 4:
          message.length = reader.int32() as any;
          break;
        case 5:
          message.prefix = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): LeafOp {
    return {
      hash: isSet(object.hash) ? hashOpFromJSON(object.hash) : -1,
      prehashKey: isSet(object.prehashKey)
        ? hashOpFromJSON(object.prehashKey)
        : -1,
      prehashValue: isSet(object.prehashValue)
        ? hashOpFromJSON(object.prehashValue)
        : -1,
      length: isSet(object.length) ? lengthOpFromJSON(object.length) : -1,
      prefix: isSet(object.prefix)
        ? bytesFromBase64(object.prefix)
        : new Uint8Array(),
    };
  },
  toJSON(message: LeafOp): JsonSafe<LeafOp> {
    const obj: any = {};
    message.hash !== undefined && (obj.hash = hashOpToJSON(message.hash));
    message.prehashKey !== undefined &&
      (obj.prehashKey = hashOpToJSON(message.prehashKey));
    message.prehashValue !== undefined &&
      (obj.prehashValue = hashOpToJSON(message.prehashValue));
    message.length !== undefined &&
      (obj.length = lengthOpToJSON(message.length));
    message.prefix !== undefined &&
      (obj.prefix = base64FromBytes(
        message.prefix !== undefined ? message.prefix : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<LeafOp>): LeafOp {
    const message = createBaseLeafOp();
    message.hash = object.hash ?? 0;
    message.prehashKey = object.prehashKey ?? 0;
    message.prehashValue = object.prehashValue ?? 0;
    message.length = object.length ?? 0;
    message.prefix = object.prefix ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: LeafOpProtoMsg): LeafOp {
    return LeafOp.decode(message.value);
  },
  toProto(message: LeafOp): Uint8Array {
    return LeafOp.encode(message).finish();
  },
  toProtoMsg(message: LeafOp): LeafOpProtoMsg {
    return {
      typeUrl: '/cosmos.ics23.v1.LeafOp',
      value: LeafOp.encode(message).finish(),
    };
  },
};
function createBaseInnerOp(): InnerOp {
  return {
    hash: 0,
    prefix: new Uint8Array(),
    suffix: new Uint8Array(),
  };
}
export const InnerOp = {
  typeUrl: '/cosmos.ics23.v1.InnerOp',
  encode(
    message: InnerOp,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.hash !== 0) {
      writer.uint32(8).int32(message.hash);
    }
    if (message.prefix.length !== 0) {
      writer.uint32(18).bytes(message.prefix);
    }
    if (message.suffix.length !== 0) {
      writer.uint32(26).bytes(message.suffix);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): InnerOp {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseInnerOp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.hash = reader.int32() as any;
          break;
        case 2:
          message.prefix = reader.bytes();
          break;
        case 3:
          message.suffix = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): InnerOp {
    return {
      hash: isSet(object.hash) ? hashOpFromJSON(object.hash) : -1,
      prefix: isSet(object.prefix)
        ? bytesFromBase64(object.prefix)
        : new Uint8Array(),
      suffix: isSet(object.suffix)
        ? bytesFromBase64(object.suffix)
        : new Uint8Array(),
    };
  },
  toJSON(message: InnerOp): JsonSafe<InnerOp> {
    const obj: any = {};
    message.hash !== undefined && (obj.hash = hashOpToJSON(message.hash));
    message.prefix !== undefined &&
      (obj.prefix = base64FromBytes(
        message.prefix !== undefined ? message.prefix : new Uint8Array(),
      ));
    message.suffix !== undefined &&
      (obj.suffix = base64FromBytes(
        message.suffix !== undefined ? message.suffix : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<InnerOp>): InnerOp {
    const message = createBaseInnerOp();
    message.hash = object.hash ?? 0;
    message.prefix = object.prefix ?? new Uint8Array();
    message.suffix = object.suffix ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: InnerOpProtoMsg): InnerOp {
    return InnerOp.decode(message.value);
  },
  toProto(message: InnerOp): Uint8Array {
    return InnerOp.encode(message).finish();
  },
  toProtoMsg(message: InnerOp): InnerOpProtoMsg {
    return {
      typeUrl: '/cosmos.ics23.v1.InnerOp',
      value: InnerOp.encode(message).finish(),
    };
  },
};
function createBaseProofSpec(): ProofSpec {
  return {
    leafSpec: undefined,
    innerSpec: undefined,
    maxDepth: 0,
    minDepth: 0,
    prehashKeyBeforeComparison: false,
  };
}
export const ProofSpec = {
  typeUrl: '/cosmos.ics23.v1.ProofSpec',
  encode(
    message: ProofSpec,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.leafSpec !== undefined) {
      LeafOp.encode(message.leafSpec, writer.uint32(10).fork()).ldelim();
    }
    if (message.innerSpec !== undefined) {
      InnerSpec.encode(message.innerSpec, writer.uint32(18).fork()).ldelim();
    }
    if (message.maxDepth !== 0) {
      writer.uint32(24).int32(message.maxDepth);
    }
    if (message.minDepth !== 0) {
      writer.uint32(32).int32(message.minDepth);
    }
    if (message.prehashKeyBeforeComparison === true) {
      writer.uint32(40).bool(message.prehashKeyBeforeComparison);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ProofSpec {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProofSpec();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.leafSpec = LeafOp.decode(reader, reader.uint32());
          break;
        case 2:
          message.innerSpec = InnerSpec.decode(reader, reader.uint32());
          break;
        case 3:
          message.maxDepth = reader.int32();
          break;
        case 4:
          message.minDepth = reader.int32();
          break;
        case 5:
          message.prehashKeyBeforeComparison = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ProofSpec {
    return {
      leafSpec: isSet(object.leafSpec)
        ? LeafOp.fromJSON(object.leafSpec)
        : undefined,
      innerSpec: isSet(object.innerSpec)
        ? InnerSpec.fromJSON(object.innerSpec)
        : undefined,
      maxDepth: isSet(object.maxDepth) ? Number(object.maxDepth) : 0,
      minDepth: isSet(object.minDepth) ? Number(object.minDepth) : 0,
      prehashKeyBeforeComparison: isSet(object.prehashKeyBeforeComparison)
        ? Boolean(object.prehashKeyBeforeComparison)
        : false,
    };
  },
  toJSON(message: ProofSpec): JsonSafe<ProofSpec> {
    const obj: any = {};
    message.leafSpec !== undefined &&
      (obj.leafSpec = message.leafSpec
        ? LeafOp.toJSON(message.leafSpec)
        : undefined);
    message.innerSpec !== undefined &&
      (obj.innerSpec = message.innerSpec
        ? InnerSpec.toJSON(message.innerSpec)
        : undefined);
    message.maxDepth !== undefined &&
      (obj.maxDepth = Math.round(message.maxDepth));
    message.minDepth !== undefined &&
      (obj.minDepth = Math.round(message.minDepth));
    message.prehashKeyBeforeComparison !== undefined &&
      (obj.prehashKeyBeforeComparison = message.prehashKeyBeforeComparison);
    return obj;
  },
  fromPartial(object: Partial<ProofSpec>): ProofSpec {
    const message = createBaseProofSpec();
    message.leafSpec =
      object.leafSpec !== undefined && object.leafSpec !== null
        ? LeafOp.fromPartial(object.leafSpec)
        : undefined;
    message.innerSpec =
      object.innerSpec !== undefined && object.innerSpec !== null
        ? InnerSpec.fromPartial(object.innerSpec)
        : undefined;
    message.maxDepth = object.maxDepth ?? 0;
    message.minDepth = object.minDepth ?? 0;
    message.prehashKeyBeforeComparison =
      object.prehashKeyBeforeComparison ?? false;
    return message;
  },
  fromProtoMsg(message: ProofSpecProtoMsg): ProofSpec {
    return ProofSpec.decode(message.value);
  },
  toProto(message: ProofSpec): Uint8Array {
    return ProofSpec.encode(message).finish();
  },
  toProtoMsg(message: ProofSpec): ProofSpecProtoMsg {
    return {
      typeUrl: '/cosmos.ics23.v1.ProofSpec',
      value: ProofSpec.encode(message).finish(),
    };
  },
};
function createBaseInnerSpec(): InnerSpec {
  return {
    childOrder: [],
    childSize: 0,
    minPrefixLength: 0,
    maxPrefixLength: 0,
    emptyChild: new Uint8Array(),
    hash: 0,
  };
}
export const InnerSpec = {
  typeUrl: '/cosmos.ics23.v1.InnerSpec',
  encode(
    message: InnerSpec,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    writer.uint32(10).fork();
    for (const v of message.childOrder) {
      writer.int32(v);
    }
    writer.ldelim();
    if (message.childSize !== 0) {
      writer.uint32(16).int32(message.childSize);
    }
    if (message.minPrefixLength !== 0) {
      writer.uint32(24).int32(message.minPrefixLength);
    }
    if (message.maxPrefixLength !== 0) {
      writer.uint32(32).int32(message.maxPrefixLength);
    }
    if (message.emptyChild.length !== 0) {
      writer.uint32(42).bytes(message.emptyChild);
    }
    if (message.hash !== 0) {
      writer.uint32(48).int32(message.hash);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): InnerSpec {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseInnerSpec();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.childOrder.push(reader.int32());
            }
          } else {
            message.childOrder.push(reader.int32());
          }
          break;
        case 2:
          message.childSize = reader.int32();
          break;
        case 3:
          message.minPrefixLength = reader.int32();
          break;
        case 4:
          message.maxPrefixLength = reader.int32();
          break;
        case 5:
          message.emptyChild = reader.bytes();
          break;
        case 6:
          message.hash = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): InnerSpec {
    return {
      childOrder: Array.isArray(object?.childOrder)
        ? object.childOrder.map((e: any) => Number(e))
        : [],
      childSize: isSet(object.childSize) ? Number(object.childSize) : 0,
      minPrefixLength: isSet(object.minPrefixLength)
        ? Number(object.minPrefixLength)
        : 0,
      maxPrefixLength: isSet(object.maxPrefixLength)
        ? Number(object.maxPrefixLength)
        : 0,
      emptyChild: isSet(object.emptyChild)
        ? bytesFromBase64(object.emptyChild)
        : new Uint8Array(),
      hash: isSet(object.hash) ? hashOpFromJSON(object.hash) : -1,
    };
  },
  toJSON(message: InnerSpec): JsonSafe<InnerSpec> {
    const obj: any = {};
    if (message.childOrder) {
      obj.childOrder = message.childOrder.map(e => Math.round(e));
    } else {
      obj.childOrder = [];
    }
    message.childSize !== undefined &&
      (obj.childSize = Math.round(message.childSize));
    message.minPrefixLength !== undefined &&
      (obj.minPrefixLength = Math.round(message.minPrefixLength));
    message.maxPrefixLength !== undefined &&
      (obj.maxPrefixLength = Math.round(message.maxPrefixLength));
    message.emptyChild !== undefined &&
      (obj.emptyChild = base64FromBytes(
        message.emptyChild !== undefined
          ? message.emptyChild
          : new Uint8Array(),
      ));
    message.hash !== undefined && (obj.hash = hashOpToJSON(message.hash));
    return obj;
  },
  fromPartial(object: Partial<InnerSpec>): InnerSpec {
    const message = createBaseInnerSpec();
    message.childOrder = object.childOrder?.map(e => e) || [];
    message.childSize = object.childSize ?? 0;
    message.minPrefixLength = object.minPrefixLength ?? 0;
    message.maxPrefixLength = object.maxPrefixLength ?? 0;
    message.emptyChild = object.emptyChild ?? new Uint8Array();
    message.hash = object.hash ?? 0;
    return message;
  },
  fromProtoMsg(message: InnerSpecProtoMsg): InnerSpec {
    return InnerSpec.decode(message.value);
  },
  toProto(message: InnerSpec): Uint8Array {
    return InnerSpec.encode(message).finish();
  },
  toProtoMsg(message: InnerSpec): InnerSpecProtoMsg {
    return {
      typeUrl: '/cosmos.ics23.v1.InnerSpec',
      value: InnerSpec.encode(message).finish(),
    };
  },
};
function createBaseBatchProof(): BatchProof {
  return {
    entries: [],
  };
}
export const BatchProof = {
  typeUrl: '/cosmos.ics23.v1.BatchProof',
  encode(
    message: BatchProof,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.entries) {
      BatchEntry.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): BatchProof {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBatchProof();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.entries.push(BatchEntry.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): BatchProof {
    return {
      entries: Array.isArray(object?.entries)
        ? object.entries.map((e: any) => BatchEntry.fromJSON(e))
        : [],
    };
  },
  toJSON(message: BatchProof): JsonSafe<BatchProof> {
    const obj: any = {};
    if (message.entries) {
      obj.entries = message.entries.map(e =>
        e ? BatchEntry.toJSON(e) : undefined,
      );
    } else {
      obj.entries = [];
    }
    return obj;
  },
  fromPartial(object: Partial<BatchProof>): BatchProof {
    const message = createBaseBatchProof();
    message.entries = object.entries?.map(e => BatchEntry.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: BatchProofProtoMsg): BatchProof {
    return BatchProof.decode(message.value);
  },
  toProto(message: BatchProof): Uint8Array {
    return BatchProof.encode(message).finish();
  },
  toProtoMsg(message: BatchProof): BatchProofProtoMsg {
    return {
      typeUrl: '/cosmos.ics23.v1.BatchProof',
      value: BatchProof.encode(message).finish(),
    };
  },
};
function createBaseBatchEntry(): BatchEntry {
  return {
    exist: undefined,
    nonexist: undefined,
  };
}
export const BatchEntry = {
  typeUrl: '/cosmos.ics23.v1.BatchEntry',
  encode(
    message: BatchEntry,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.exist !== undefined) {
      ExistenceProof.encode(message.exist, writer.uint32(10).fork()).ldelim();
    }
    if (message.nonexist !== undefined) {
      NonExistenceProof.encode(
        message.nonexist,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): BatchEntry {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBatchEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.exist = ExistenceProof.decode(reader, reader.uint32());
          break;
        case 2:
          message.nonexist = NonExistenceProof.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): BatchEntry {
    return {
      exist: isSet(object.exist)
        ? ExistenceProof.fromJSON(object.exist)
        : undefined,
      nonexist: isSet(object.nonexist)
        ? NonExistenceProof.fromJSON(object.nonexist)
        : undefined,
    };
  },
  toJSON(message: BatchEntry): JsonSafe<BatchEntry> {
    const obj: any = {};
    message.exist !== undefined &&
      (obj.exist = message.exist
        ? ExistenceProof.toJSON(message.exist)
        : undefined);
    message.nonexist !== undefined &&
      (obj.nonexist = message.nonexist
        ? NonExistenceProof.toJSON(message.nonexist)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<BatchEntry>): BatchEntry {
    const message = createBaseBatchEntry();
    message.exist =
      object.exist !== undefined && object.exist !== null
        ? ExistenceProof.fromPartial(object.exist)
        : undefined;
    message.nonexist =
      object.nonexist !== undefined && object.nonexist !== null
        ? NonExistenceProof.fromPartial(object.nonexist)
        : undefined;
    return message;
  },
  fromProtoMsg(message: BatchEntryProtoMsg): BatchEntry {
    return BatchEntry.decode(message.value);
  },
  toProto(message: BatchEntry): Uint8Array {
    return BatchEntry.encode(message).finish();
  },
  toProtoMsg(message: BatchEntry): BatchEntryProtoMsg {
    return {
      typeUrl: '/cosmos.ics23.v1.BatchEntry',
      value: BatchEntry.encode(message).finish(),
    };
  },
};
function createBaseCompressedBatchProof(): CompressedBatchProof {
  return {
    entries: [],
    lookupInners: [],
  };
}
export const CompressedBatchProof = {
  typeUrl: '/cosmos.ics23.v1.CompressedBatchProof',
  encode(
    message: CompressedBatchProof,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.entries) {
      CompressedBatchEntry.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.lookupInners) {
      InnerOp.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): CompressedBatchProof {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCompressedBatchProof();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.entries.push(
            CompressedBatchEntry.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.lookupInners.push(InnerOp.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): CompressedBatchProof {
    return {
      entries: Array.isArray(object?.entries)
        ? object.entries.map((e: any) => CompressedBatchEntry.fromJSON(e))
        : [],
      lookupInners: Array.isArray(object?.lookupInners)
        ? object.lookupInners.map((e: any) => InnerOp.fromJSON(e))
        : [],
    };
  },
  toJSON(message: CompressedBatchProof): JsonSafe<CompressedBatchProof> {
    const obj: any = {};
    if (message.entries) {
      obj.entries = message.entries.map(e =>
        e ? CompressedBatchEntry.toJSON(e) : undefined,
      );
    } else {
      obj.entries = [];
    }
    if (message.lookupInners) {
      obj.lookupInners = message.lookupInners.map(e =>
        e ? InnerOp.toJSON(e) : undefined,
      );
    } else {
      obj.lookupInners = [];
    }
    return obj;
  },
  fromPartial(object: Partial<CompressedBatchProof>): CompressedBatchProof {
    const message = createBaseCompressedBatchProof();
    message.entries =
      object.entries?.map(e => CompressedBatchEntry.fromPartial(e)) || [];
    message.lookupInners =
      object.lookupInners?.map(e => InnerOp.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: CompressedBatchProofProtoMsg): CompressedBatchProof {
    return CompressedBatchProof.decode(message.value);
  },
  toProto(message: CompressedBatchProof): Uint8Array {
    return CompressedBatchProof.encode(message).finish();
  },
  toProtoMsg(message: CompressedBatchProof): CompressedBatchProofProtoMsg {
    return {
      typeUrl: '/cosmos.ics23.v1.CompressedBatchProof',
      value: CompressedBatchProof.encode(message).finish(),
    };
  },
};
function createBaseCompressedBatchEntry(): CompressedBatchEntry {
  return {
    exist: undefined,
    nonexist: undefined,
  };
}
export const CompressedBatchEntry = {
  typeUrl: '/cosmos.ics23.v1.CompressedBatchEntry',
  encode(
    message: CompressedBatchEntry,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.exist !== undefined) {
      CompressedExistenceProof.encode(
        message.exist,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    if (message.nonexist !== undefined) {
      CompressedNonExistenceProof.encode(
        message.nonexist,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): CompressedBatchEntry {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCompressedBatchEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.exist = CompressedExistenceProof.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 2:
          message.nonexist = CompressedNonExistenceProof.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): CompressedBatchEntry {
    return {
      exist: isSet(object.exist)
        ? CompressedExistenceProof.fromJSON(object.exist)
        : undefined,
      nonexist: isSet(object.nonexist)
        ? CompressedNonExistenceProof.fromJSON(object.nonexist)
        : undefined,
    };
  },
  toJSON(message: CompressedBatchEntry): JsonSafe<CompressedBatchEntry> {
    const obj: any = {};
    message.exist !== undefined &&
      (obj.exist = message.exist
        ? CompressedExistenceProof.toJSON(message.exist)
        : undefined);
    message.nonexist !== undefined &&
      (obj.nonexist = message.nonexist
        ? CompressedNonExistenceProof.toJSON(message.nonexist)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<CompressedBatchEntry>): CompressedBatchEntry {
    const message = createBaseCompressedBatchEntry();
    message.exist =
      object.exist !== undefined && object.exist !== null
        ? CompressedExistenceProof.fromPartial(object.exist)
        : undefined;
    message.nonexist =
      object.nonexist !== undefined && object.nonexist !== null
        ? CompressedNonExistenceProof.fromPartial(object.nonexist)
        : undefined;
    return message;
  },
  fromProtoMsg(message: CompressedBatchEntryProtoMsg): CompressedBatchEntry {
    return CompressedBatchEntry.decode(message.value);
  },
  toProto(message: CompressedBatchEntry): Uint8Array {
    return CompressedBatchEntry.encode(message).finish();
  },
  toProtoMsg(message: CompressedBatchEntry): CompressedBatchEntryProtoMsg {
    return {
      typeUrl: '/cosmos.ics23.v1.CompressedBatchEntry',
      value: CompressedBatchEntry.encode(message).finish(),
    };
  },
};
function createBaseCompressedExistenceProof(): CompressedExistenceProof {
  return {
    key: new Uint8Array(),
    value: new Uint8Array(),
    leaf: undefined,
    path: [],
  };
}
export const CompressedExistenceProof = {
  typeUrl: '/cosmos.ics23.v1.CompressedExistenceProof',
  encode(
    message: CompressedExistenceProof,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.key.length !== 0) {
      writer.uint32(10).bytes(message.key);
    }
    if (message.value.length !== 0) {
      writer.uint32(18).bytes(message.value);
    }
    if (message.leaf !== undefined) {
      LeafOp.encode(message.leaf, writer.uint32(26).fork()).ldelim();
    }
    writer.uint32(34).fork();
    for (const v of message.path) {
      writer.int32(v);
    }
    writer.ldelim();
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): CompressedExistenceProof {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCompressedExistenceProof();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.bytes();
          break;
        case 2:
          message.value = reader.bytes();
          break;
        case 3:
          message.leaf = LeafOp.decode(reader, reader.uint32());
          break;
        case 4:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.path.push(reader.int32());
            }
          } else {
            message.path.push(reader.int32());
          }
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): CompressedExistenceProof {
    return {
      key: isSet(object.key) ? bytesFromBase64(object.key) : new Uint8Array(),
      value: isSet(object.value)
        ? bytesFromBase64(object.value)
        : new Uint8Array(),
      leaf: isSet(object.leaf) ? LeafOp.fromJSON(object.leaf) : undefined,
      path: Array.isArray(object?.path)
        ? object.path.map((e: any) => Number(e))
        : [],
    };
  },
  toJSON(
    message: CompressedExistenceProof,
  ): JsonSafe<CompressedExistenceProof> {
    const obj: any = {};
    message.key !== undefined &&
      (obj.key = base64FromBytes(
        message.key !== undefined ? message.key : new Uint8Array(),
      ));
    message.value !== undefined &&
      (obj.value = base64FromBytes(
        message.value !== undefined ? message.value : new Uint8Array(),
      ));
    message.leaf !== undefined &&
      (obj.leaf = message.leaf ? LeafOp.toJSON(message.leaf) : undefined);
    if (message.path) {
      obj.path = message.path.map(e => Math.round(e));
    } else {
      obj.path = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<CompressedExistenceProof>,
  ): CompressedExistenceProof {
    const message = createBaseCompressedExistenceProof();
    message.key = object.key ?? new Uint8Array();
    message.value = object.value ?? new Uint8Array();
    message.leaf =
      object.leaf !== undefined && object.leaf !== null
        ? LeafOp.fromPartial(object.leaf)
        : undefined;
    message.path = object.path?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(
    message: CompressedExistenceProofProtoMsg,
  ): CompressedExistenceProof {
    return CompressedExistenceProof.decode(message.value);
  },
  toProto(message: CompressedExistenceProof): Uint8Array {
    return CompressedExistenceProof.encode(message).finish();
  },
  toProtoMsg(
    message: CompressedExistenceProof,
  ): CompressedExistenceProofProtoMsg {
    return {
      typeUrl: '/cosmos.ics23.v1.CompressedExistenceProof',
      value: CompressedExistenceProof.encode(message).finish(),
    };
  },
};
function createBaseCompressedNonExistenceProof(): CompressedNonExistenceProof {
  return {
    key: new Uint8Array(),
    left: undefined,
    right: undefined,
  };
}
export const CompressedNonExistenceProof = {
  typeUrl: '/cosmos.ics23.v1.CompressedNonExistenceProof',
  encode(
    message: CompressedNonExistenceProof,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.key.length !== 0) {
      writer.uint32(10).bytes(message.key);
    }
    if (message.left !== undefined) {
      CompressedExistenceProof.encode(
        message.left,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    if (message.right !== undefined) {
      CompressedExistenceProof.encode(
        message.right,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): CompressedNonExistenceProof {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCompressedNonExistenceProof();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.bytes();
          break;
        case 2:
          message.left = CompressedExistenceProof.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 3:
          message.right = CompressedExistenceProof.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): CompressedNonExistenceProof {
    return {
      key: isSet(object.key) ? bytesFromBase64(object.key) : new Uint8Array(),
      left: isSet(object.left)
        ? CompressedExistenceProof.fromJSON(object.left)
        : undefined,
      right: isSet(object.right)
        ? CompressedExistenceProof.fromJSON(object.right)
        : undefined,
    };
  },
  toJSON(
    message: CompressedNonExistenceProof,
  ): JsonSafe<CompressedNonExistenceProof> {
    const obj: any = {};
    message.key !== undefined &&
      (obj.key = base64FromBytes(
        message.key !== undefined ? message.key : new Uint8Array(),
      ));
    message.left !== undefined &&
      (obj.left = message.left
        ? CompressedExistenceProof.toJSON(message.left)
        : undefined);
    message.right !== undefined &&
      (obj.right = message.right
        ? CompressedExistenceProof.toJSON(message.right)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<CompressedNonExistenceProof>,
  ): CompressedNonExistenceProof {
    const message = createBaseCompressedNonExistenceProof();
    message.key = object.key ?? new Uint8Array();
    message.left =
      object.left !== undefined && object.left !== null
        ? CompressedExistenceProof.fromPartial(object.left)
        : undefined;
    message.right =
      object.right !== undefined && object.right !== null
        ? CompressedExistenceProof.fromPartial(object.right)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: CompressedNonExistenceProofProtoMsg,
  ): CompressedNonExistenceProof {
    return CompressedNonExistenceProof.decode(message.value);
  },
  toProto(message: CompressedNonExistenceProof): Uint8Array {
    return CompressedNonExistenceProof.encode(message).finish();
  },
  toProtoMsg(
    message: CompressedNonExistenceProof,
  ): CompressedNonExistenceProofProtoMsg {
    return {
      typeUrl: '/cosmos.ics23.v1.CompressedNonExistenceProof',
      value: CompressedNonExistenceProof.encode(message).finish(),
    };
  },
};
