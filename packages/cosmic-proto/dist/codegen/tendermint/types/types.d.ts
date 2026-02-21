import { Proof, type ProofSDKType } from '../crypto/proof.js';
import { Consensus, type ConsensusSDKType } from '../version/types.js';
import { Timestamp, type TimestampSDKType } from '../../google/protobuf/timestamp.js';
import { BlockIDFlag, ValidatorSet, type ValidatorSetSDKType } from './validator.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/** SignedMsgType is a type of signed message in the consensus. */
export declare enum SignedMsgType {
    SIGNED_MSG_TYPE_UNKNOWN = 0,
    /** SIGNED_MSG_TYPE_PREVOTE - Votes */
    SIGNED_MSG_TYPE_PREVOTE = 1,
    SIGNED_MSG_TYPE_PRECOMMIT = 2,
    /** SIGNED_MSG_TYPE_PROPOSAL - Proposals */
    SIGNED_MSG_TYPE_PROPOSAL = 32,
    UNRECOGNIZED = -1
}
export declare const SignedMsgTypeSDKType: typeof SignedMsgType;
export declare function signedMsgTypeFromJSON(object: any): SignedMsgType;
export declare function signedMsgTypeToJSON(object: SignedMsgType): string;
/**
 * PartsetHeader
 * @name PartSetHeader
 * @package tendermint.types
 * @see proto type: tendermint.types.PartSetHeader
 */
export interface PartSetHeader {
    total: number;
    hash: Uint8Array;
}
export interface PartSetHeaderProtoMsg {
    typeUrl: '/tendermint.types.PartSetHeader';
    value: Uint8Array;
}
/**
 * PartsetHeader
 * @name PartSetHeaderSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.PartSetHeader
 */
export interface PartSetHeaderSDKType {
    total: number;
    hash: Uint8Array;
}
/**
 * @name Part
 * @package tendermint.types
 * @see proto type: tendermint.types.Part
 */
export interface Part {
    index: number;
    bytes: Uint8Array;
    proof: Proof;
}
export interface PartProtoMsg {
    typeUrl: '/tendermint.types.Part';
    value: Uint8Array;
}
/**
 * @name PartSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.Part
 */
export interface PartSDKType {
    index: number;
    bytes: Uint8Array;
    proof: ProofSDKType;
}
/**
 * BlockID
 * @name BlockID
 * @package tendermint.types
 * @see proto type: tendermint.types.BlockID
 */
export interface BlockID {
    hash: Uint8Array;
    partSetHeader: PartSetHeader;
}
export interface BlockIDProtoMsg {
    typeUrl: '/tendermint.types.BlockID';
    value: Uint8Array;
}
/**
 * BlockID
 * @name BlockIDSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.BlockID
 */
export interface BlockIDSDKType {
    hash: Uint8Array;
    part_set_header: PartSetHeaderSDKType;
}
/**
 * Header defines the structure of a block header.
 * @name Header
 * @package tendermint.types
 * @see proto type: tendermint.types.Header
 */
export interface Header {
    /**
     * basic block info
     */
    version: Consensus;
    chainId: string;
    height: bigint;
    time: Timestamp;
    /**
     * prev block info
     */
    lastBlockId: BlockID;
    /**
     * hashes of block data
     */
    lastCommitHash: Uint8Array;
    /**
     * transactions
     */
    dataHash: Uint8Array;
    /**
     * hashes from the app output from the prev block
     */
    validatorsHash: Uint8Array;
    /**
     * validators for the next block
     */
    nextValidatorsHash: Uint8Array;
    /**
     * consensus params for current block
     */
    consensusHash: Uint8Array;
    /**
     * state after txs from the previous block
     */
    appHash: Uint8Array;
    /**
     * root hash of all results from the txs from the previous block
     */
    lastResultsHash: Uint8Array;
    /**
     * consensus info
     */
    evidenceHash: Uint8Array;
    /**
     * original proposer of the block
     */
    proposerAddress: Uint8Array;
}
export interface HeaderProtoMsg {
    typeUrl: '/tendermint.types.Header';
    value: Uint8Array;
}
/**
 * Header defines the structure of a block header.
 * @name HeaderSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.Header
 */
export interface HeaderSDKType {
    version: ConsensusSDKType;
    chain_id: string;
    height: bigint;
    time: TimestampSDKType;
    last_block_id: BlockIDSDKType;
    last_commit_hash: Uint8Array;
    data_hash: Uint8Array;
    validators_hash: Uint8Array;
    next_validators_hash: Uint8Array;
    consensus_hash: Uint8Array;
    app_hash: Uint8Array;
    last_results_hash: Uint8Array;
    evidence_hash: Uint8Array;
    proposer_address: Uint8Array;
}
/**
 * Data contains the set of transactions included in the block
 * @name Data
 * @package tendermint.types
 * @see proto type: tendermint.types.Data
 */
export interface Data {
    /**
     * Txs that will be applied by state @ block.Height+1.
     * NOTE: not all txs here are valid.  We're just agreeing on the order first.
     * This means that block.AppHash does not include these txs.
     */
    txs: Uint8Array[];
}
export interface DataProtoMsg {
    typeUrl: '/tendermint.types.Data';
    value: Uint8Array;
}
/**
 * Data contains the set of transactions included in the block
 * @name DataSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.Data
 */
export interface DataSDKType {
    txs: Uint8Array[];
}
/**
 * Vote represents a prevote or precommit vote from validators for
 * consensus.
 * @name Vote
 * @package tendermint.types
 * @see proto type: tendermint.types.Vote
 */
export interface Vote {
    type: SignedMsgType;
    height: bigint;
    round: number;
    /**
     * zero if vote is nil.
     */
    blockId: BlockID;
    timestamp: Timestamp;
    validatorAddress: Uint8Array;
    validatorIndex: number;
    /**
     * Vote signature by the validator if they participated in consensus for the
     * associated block.
     */
    signature: Uint8Array;
    /**
     * Vote extension provided by the application. Only valid for precommit
     * messages.
     */
    extension: Uint8Array;
    /**
     * Vote extension signature by the validator if they participated in
     * consensus for the associated block.
     * Only valid for precommit messages.
     */
    extensionSignature: Uint8Array;
}
export interface VoteProtoMsg {
    typeUrl: '/tendermint.types.Vote';
    value: Uint8Array;
}
/**
 * Vote represents a prevote or precommit vote from validators for
 * consensus.
 * @name VoteSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.Vote
 */
export interface VoteSDKType {
    type: SignedMsgType;
    height: bigint;
    round: number;
    block_id: BlockIDSDKType;
    timestamp: TimestampSDKType;
    validator_address: Uint8Array;
    validator_index: number;
    signature: Uint8Array;
    extension: Uint8Array;
    extension_signature: Uint8Array;
}
/**
 * Commit contains the evidence that a block was committed by a set of validators.
 * @name Commit
 * @package tendermint.types
 * @see proto type: tendermint.types.Commit
 */
export interface Commit {
    height: bigint;
    round: number;
    blockId: BlockID;
    signatures: CommitSig[];
}
export interface CommitProtoMsg {
    typeUrl: '/tendermint.types.Commit';
    value: Uint8Array;
}
/**
 * Commit contains the evidence that a block was committed by a set of validators.
 * @name CommitSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.Commit
 */
export interface CommitSDKType {
    height: bigint;
    round: number;
    block_id: BlockIDSDKType;
    signatures: CommitSigSDKType[];
}
/**
 * CommitSig is a part of the Vote included in a Commit.
 * @name CommitSig
 * @package tendermint.types
 * @see proto type: tendermint.types.CommitSig
 */
export interface CommitSig {
    blockIdFlag: BlockIDFlag;
    validatorAddress: Uint8Array;
    timestamp: Timestamp;
    signature: Uint8Array;
}
export interface CommitSigProtoMsg {
    typeUrl: '/tendermint.types.CommitSig';
    value: Uint8Array;
}
/**
 * CommitSig is a part of the Vote included in a Commit.
 * @name CommitSigSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.CommitSig
 */
export interface CommitSigSDKType {
    block_id_flag: BlockIDFlag;
    validator_address: Uint8Array;
    timestamp: TimestampSDKType;
    signature: Uint8Array;
}
/**
 * @name ExtendedCommit
 * @package tendermint.types
 * @see proto type: tendermint.types.ExtendedCommit
 */
export interface ExtendedCommit {
    height: bigint;
    round: number;
    blockId: BlockID;
    extendedSignatures: ExtendedCommitSig[];
}
export interface ExtendedCommitProtoMsg {
    typeUrl: '/tendermint.types.ExtendedCommit';
    value: Uint8Array;
}
/**
 * @name ExtendedCommitSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.ExtendedCommit
 */
export interface ExtendedCommitSDKType {
    height: bigint;
    round: number;
    block_id: BlockIDSDKType;
    extended_signatures: ExtendedCommitSigSDKType[];
}
/**
 * ExtendedCommitSig retains all the same fields as CommitSig but adds vote
 * extension-related fields. We use two signatures to ensure backwards compatibility.
 * That is the digest of the original signature is still the same in prior versions
 * @name ExtendedCommitSig
 * @package tendermint.types
 * @see proto type: tendermint.types.ExtendedCommitSig
 */
export interface ExtendedCommitSig {
    blockIdFlag: BlockIDFlag;
    validatorAddress: Uint8Array;
    timestamp: Timestamp;
    signature: Uint8Array;
    /**
     * Vote extension data
     */
    extension: Uint8Array;
    /**
     * Vote extension signature
     */
    extensionSignature: Uint8Array;
}
export interface ExtendedCommitSigProtoMsg {
    typeUrl: '/tendermint.types.ExtendedCommitSig';
    value: Uint8Array;
}
/**
 * ExtendedCommitSig retains all the same fields as CommitSig but adds vote
 * extension-related fields. We use two signatures to ensure backwards compatibility.
 * That is the digest of the original signature is still the same in prior versions
 * @name ExtendedCommitSigSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.ExtendedCommitSig
 */
export interface ExtendedCommitSigSDKType {
    block_id_flag: BlockIDFlag;
    validator_address: Uint8Array;
    timestamp: TimestampSDKType;
    signature: Uint8Array;
    extension: Uint8Array;
    extension_signature: Uint8Array;
}
/**
 * @name Proposal
 * @package tendermint.types
 * @see proto type: tendermint.types.Proposal
 */
export interface Proposal {
    type: SignedMsgType;
    height: bigint;
    round: number;
    polRound: number;
    blockId: BlockID;
    timestamp: Timestamp;
    signature: Uint8Array;
}
export interface ProposalProtoMsg {
    typeUrl: '/tendermint.types.Proposal';
    value: Uint8Array;
}
/**
 * @name ProposalSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.Proposal
 */
export interface ProposalSDKType {
    type: SignedMsgType;
    height: bigint;
    round: number;
    pol_round: number;
    block_id: BlockIDSDKType;
    timestamp: TimestampSDKType;
    signature: Uint8Array;
}
/**
 * @name SignedHeader
 * @package tendermint.types
 * @see proto type: tendermint.types.SignedHeader
 */
export interface SignedHeader {
    header?: Header;
    commit?: Commit;
}
export interface SignedHeaderProtoMsg {
    typeUrl: '/tendermint.types.SignedHeader';
    value: Uint8Array;
}
/**
 * @name SignedHeaderSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.SignedHeader
 */
export interface SignedHeaderSDKType {
    header?: HeaderSDKType;
    commit?: CommitSDKType;
}
/**
 * @name LightBlock
 * @package tendermint.types
 * @see proto type: tendermint.types.LightBlock
 */
export interface LightBlock {
    signedHeader?: SignedHeader;
    validatorSet?: ValidatorSet;
}
export interface LightBlockProtoMsg {
    typeUrl: '/tendermint.types.LightBlock';
    value: Uint8Array;
}
/**
 * @name LightBlockSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.LightBlock
 */
export interface LightBlockSDKType {
    signed_header?: SignedHeaderSDKType;
    validator_set?: ValidatorSetSDKType;
}
/**
 * @name BlockMeta
 * @package tendermint.types
 * @see proto type: tendermint.types.BlockMeta
 */
export interface BlockMeta {
    blockId: BlockID;
    blockSize: bigint;
    header: Header;
    numTxs: bigint;
}
export interface BlockMetaProtoMsg {
    typeUrl: '/tendermint.types.BlockMeta';
    value: Uint8Array;
}
/**
 * @name BlockMetaSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.BlockMeta
 */
export interface BlockMetaSDKType {
    block_id: BlockIDSDKType;
    block_size: bigint;
    header: HeaderSDKType;
    num_txs: bigint;
}
/**
 * TxProof represents a Merkle proof of the presence of a transaction in the Merkle tree.
 * @name TxProof
 * @package tendermint.types
 * @see proto type: tendermint.types.TxProof
 */
export interface TxProof {
    rootHash: Uint8Array;
    data: Uint8Array;
    proof?: Proof;
}
export interface TxProofProtoMsg {
    typeUrl: '/tendermint.types.TxProof';
    value: Uint8Array;
}
/**
 * TxProof represents a Merkle proof of the presence of a transaction in the Merkle tree.
 * @name TxProofSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.TxProof
 */
export interface TxProofSDKType {
    root_hash: Uint8Array;
    data: Uint8Array;
    proof?: ProofSDKType;
}
/**
 * PartsetHeader
 * @name PartSetHeader
 * @package tendermint.types
 * @see proto type: tendermint.types.PartSetHeader
 */
export declare const PartSetHeader: {
    typeUrl: "/tendermint.types.PartSetHeader";
    is(o: any): o is PartSetHeader;
    isSDK(o: any): o is PartSetHeaderSDKType;
    encode(message: PartSetHeader, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PartSetHeader;
    fromJSON(object: any): PartSetHeader;
    toJSON(message: PartSetHeader): JsonSafe<PartSetHeader>;
    fromPartial(object: Partial<PartSetHeader>): PartSetHeader;
    fromProtoMsg(message: PartSetHeaderProtoMsg): PartSetHeader;
    toProto(message: PartSetHeader): Uint8Array;
    toProtoMsg(message: PartSetHeader): PartSetHeaderProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name Part
 * @package tendermint.types
 * @see proto type: tendermint.types.Part
 */
export declare const Part: {
    typeUrl: "/tendermint.types.Part";
    is(o: any): o is Part;
    isSDK(o: any): o is PartSDKType;
    encode(message: Part, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Part;
    fromJSON(object: any): Part;
    toJSON(message: Part): JsonSafe<Part>;
    fromPartial(object: Partial<Part>): Part;
    fromProtoMsg(message: PartProtoMsg): Part;
    toProto(message: Part): Uint8Array;
    toProtoMsg(message: Part): PartProtoMsg;
    registerTypeUrl(): void;
};
/**
 * BlockID
 * @name BlockID
 * @package tendermint.types
 * @see proto type: tendermint.types.BlockID
 */
export declare const BlockID: {
    typeUrl: "/tendermint.types.BlockID";
    is(o: any): o is BlockID;
    isSDK(o: any): o is BlockIDSDKType;
    encode(message: BlockID, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): BlockID;
    fromJSON(object: any): BlockID;
    toJSON(message: BlockID): JsonSafe<BlockID>;
    fromPartial(object: Partial<BlockID>): BlockID;
    fromProtoMsg(message: BlockIDProtoMsg): BlockID;
    toProto(message: BlockID): Uint8Array;
    toProtoMsg(message: BlockID): BlockIDProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Header defines the structure of a block header.
 * @name Header
 * @package tendermint.types
 * @see proto type: tendermint.types.Header
 */
export declare const Header: {
    typeUrl: "/tendermint.types.Header";
    is(o: any): o is Header;
    isSDK(o: any): o is HeaderSDKType;
    encode(message: Header, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Header;
    fromJSON(object: any): Header;
    toJSON(message: Header): JsonSafe<Header>;
    fromPartial(object: Partial<Header>): Header;
    fromProtoMsg(message: HeaderProtoMsg): Header;
    toProto(message: Header): Uint8Array;
    toProtoMsg(message: Header): HeaderProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Data contains the set of transactions included in the block
 * @name Data
 * @package tendermint.types
 * @see proto type: tendermint.types.Data
 */
export declare const Data: {
    typeUrl: "/tendermint.types.Data";
    is(o: any): o is Data;
    isSDK(o: any): o is DataSDKType;
    encode(message: Data, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Data;
    fromJSON(object: any): Data;
    toJSON(message: Data): JsonSafe<Data>;
    fromPartial(object: Partial<Data>): Data;
    fromProtoMsg(message: DataProtoMsg): Data;
    toProto(message: Data): Uint8Array;
    toProtoMsg(message: Data): DataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Vote represents a prevote or precommit vote from validators for
 * consensus.
 * @name Vote
 * @package tendermint.types
 * @see proto type: tendermint.types.Vote
 */
export declare const Vote: {
    typeUrl: "/tendermint.types.Vote";
    is(o: any): o is Vote;
    isSDK(o: any): o is VoteSDKType;
    encode(message: Vote, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Vote;
    fromJSON(object: any): Vote;
    toJSON(message: Vote): JsonSafe<Vote>;
    fromPartial(object: Partial<Vote>): Vote;
    fromProtoMsg(message: VoteProtoMsg): Vote;
    toProto(message: Vote): Uint8Array;
    toProtoMsg(message: Vote): VoteProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Commit contains the evidence that a block was committed by a set of validators.
 * @name Commit
 * @package tendermint.types
 * @see proto type: tendermint.types.Commit
 */
export declare const Commit: {
    typeUrl: "/tendermint.types.Commit";
    is(o: any): o is Commit;
    isSDK(o: any): o is CommitSDKType;
    encode(message: Commit, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Commit;
    fromJSON(object: any): Commit;
    toJSON(message: Commit): JsonSafe<Commit>;
    fromPartial(object: Partial<Commit>): Commit;
    fromProtoMsg(message: CommitProtoMsg): Commit;
    toProto(message: Commit): Uint8Array;
    toProtoMsg(message: Commit): CommitProtoMsg;
    registerTypeUrl(): void;
};
/**
 * CommitSig is a part of the Vote included in a Commit.
 * @name CommitSig
 * @package tendermint.types
 * @see proto type: tendermint.types.CommitSig
 */
export declare const CommitSig: {
    typeUrl: "/tendermint.types.CommitSig";
    is(o: any): o is CommitSig;
    isSDK(o: any): o is CommitSigSDKType;
    encode(message: CommitSig, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): CommitSig;
    fromJSON(object: any): CommitSig;
    toJSON(message: CommitSig): JsonSafe<CommitSig>;
    fromPartial(object: Partial<CommitSig>): CommitSig;
    fromProtoMsg(message: CommitSigProtoMsg): CommitSig;
    toProto(message: CommitSig): Uint8Array;
    toProtoMsg(message: CommitSig): CommitSigProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ExtendedCommit
 * @package tendermint.types
 * @see proto type: tendermint.types.ExtendedCommit
 */
export declare const ExtendedCommit: {
    typeUrl: "/tendermint.types.ExtendedCommit";
    is(o: any): o is ExtendedCommit;
    isSDK(o: any): o is ExtendedCommitSDKType;
    encode(message: ExtendedCommit, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ExtendedCommit;
    fromJSON(object: any): ExtendedCommit;
    toJSON(message: ExtendedCommit): JsonSafe<ExtendedCommit>;
    fromPartial(object: Partial<ExtendedCommit>): ExtendedCommit;
    fromProtoMsg(message: ExtendedCommitProtoMsg): ExtendedCommit;
    toProto(message: ExtendedCommit): Uint8Array;
    toProtoMsg(message: ExtendedCommit): ExtendedCommitProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ExtendedCommitSig retains all the same fields as CommitSig but adds vote
 * extension-related fields. We use two signatures to ensure backwards compatibility.
 * That is the digest of the original signature is still the same in prior versions
 * @name ExtendedCommitSig
 * @package tendermint.types
 * @see proto type: tendermint.types.ExtendedCommitSig
 */
export declare const ExtendedCommitSig: {
    typeUrl: "/tendermint.types.ExtendedCommitSig";
    is(o: any): o is ExtendedCommitSig;
    isSDK(o: any): o is ExtendedCommitSigSDKType;
    encode(message: ExtendedCommitSig, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ExtendedCommitSig;
    fromJSON(object: any): ExtendedCommitSig;
    toJSON(message: ExtendedCommitSig): JsonSafe<ExtendedCommitSig>;
    fromPartial(object: Partial<ExtendedCommitSig>): ExtendedCommitSig;
    fromProtoMsg(message: ExtendedCommitSigProtoMsg): ExtendedCommitSig;
    toProto(message: ExtendedCommitSig): Uint8Array;
    toProtoMsg(message: ExtendedCommitSig): ExtendedCommitSigProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name Proposal
 * @package tendermint.types
 * @see proto type: tendermint.types.Proposal
 */
export declare const Proposal: {
    typeUrl: "/tendermint.types.Proposal";
    is(o: any): o is Proposal;
    isSDK(o: any): o is ProposalSDKType;
    encode(message: Proposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Proposal;
    fromJSON(object: any): Proposal;
    toJSON(message: Proposal): JsonSafe<Proposal>;
    fromPartial(object: Partial<Proposal>): Proposal;
    fromProtoMsg(message: ProposalProtoMsg): Proposal;
    toProto(message: Proposal): Uint8Array;
    toProtoMsg(message: Proposal): ProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name SignedHeader
 * @package tendermint.types
 * @see proto type: tendermint.types.SignedHeader
 */
export declare const SignedHeader: {
    typeUrl: "/tendermint.types.SignedHeader";
    is(o: any): o is SignedHeader;
    isSDK(o: any): o is SignedHeaderSDKType;
    encode(message: SignedHeader, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SignedHeader;
    fromJSON(object: any): SignedHeader;
    toJSON(message: SignedHeader): JsonSafe<SignedHeader>;
    fromPartial(object: Partial<SignedHeader>): SignedHeader;
    fromProtoMsg(message: SignedHeaderProtoMsg): SignedHeader;
    toProto(message: SignedHeader): Uint8Array;
    toProtoMsg(message: SignedHeader): SignedHeaderProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name LightBlock
 * @package tendermint.types
 * @see proto type: tendermint.types.LightBlock
 */
export declare const LightBlock: {
    typeUrl: "/tendermint.types.LightBlock";
    is(o: any): o is LightBlock;
    isSDK(o: any): o is LightBlockSDKType;
    encode(message: LightBlock, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): LightBlock;
    fromJSON(object: any): LightBlock;
    toJSON(message: LightBlock): JsonSafe<LightBlock>;
    fromPartial(object: Partial<LightBlock>): LightBlock;
    fromProtoMsg(message: LightBlockProtoMsg): LightBlock;
    toProto(message: LightBlock): Uint8Array;
    toProtoMsg(message: LightBlock): LightBlockProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name BlockMeta
 * @package tendermint.types
 * @see proto type: tendermint.types.BlockMeta
 */
export declare const BlockMeta: {
    typeUrl: "/tendermint.types.BlockMeta";
    is(o: any): o is BlockMeta;
    isSDK(o: any): o is BlockMetaSDKType;
    encode(message: BlockMeta, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): BlockMeta;
    fromJSON(object: any): BlockMeta;
    toJSON(message: BlockMeta): JsonSafe<BlockMeta>;
    fromPartial(object: Partial<BlockMeta>): BlockMeta;
    fromProtoMsg(message: BlockMetaProtoMsg): BlockMeta;
    toProto(message: BlockMeta): Uint8Array;
    toProtoMsg(message: BlockMeta): BlockMetaProtoMsg;
    registerTypeUrl(): void;
};
/**
 * TxProof represents a Merkle proof of the presence of a transaction in the Merkle tree.
 * @name TxProof
 * @package tendermint.types
 * @see proto type: tendermint.types.TxProof
 */
export declare const TxProof: {
    typeUrl: "/tendermint.types.TxProof";
    is(o: any): o is TxProof;
    isSDK(o: any): o is TxProofSDKType;
    encode(message: TxProof, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TxProof;
    fromJSON(object: any): TxProof;
    toJSON(message: TxProof): JsonSafe<TxProof>;
    fromPartial(object: Partial<TxProof>): TxProof;
    fromProtoMsg(message: TxProofProtoMsg): TxProof;
    toProto(message: TxProof): Uint8Array;
    toProtoMsg(message: TxProof): TxProofProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=types.d.ts.map