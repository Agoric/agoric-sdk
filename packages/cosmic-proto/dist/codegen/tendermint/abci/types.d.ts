import { Timestamp, type TimestampSDKType } from '../../google/protobuf/timestamp.js';
import { ConsensusParams, type ConsensusParamsSDKType } from '../types/params.js';
import { ProofOps, type ProofOpsSDKType } from '../crypto/proof.js';
import { PublicKey, type PublicKeySDKType } from '../crypto/keys.js';
import { BlockIDFlag } from '../types/validator.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
export declare enum CheckTxType {
    NEW = 0,
    RECHECK = 1,
    UNRECOGNIZED = -1
}
export declare const CheckTxTypeSDKType: typeof CheckTxType;
export declare function checkTxTypeFromJSON(object: any): CheckTxType;
export declare function checkTxTypeToJSON(object: CheckTxType): string;
export declare enum ResponseOfferSnapshot_Result {
    /** UNKNOWN - Unknown result, abort all snapshot restoration */
    UNKNOWN = 0,
    /** ACCEPT - Snapshot accepted, apply chunks */
    ACCEPT = 1,
    /** ABORT - Abort all snapshot restoration */
    ABORT = 2,
    /** REJECT - Reject this specific snapshot, try others */
    REJECT = 3,
    /** REJECT_FORMAT - Reject all snapshots of this format, try others */
    REJECT_FORMAT = 4,
    /** REJECT_SENDER - Reject all snapshots from the sender(s), try others */
    REJECT_SENDER = 5,
    UNRECOGNIZED = -1
}
export declare const ResponseOfferSnapshot_ResultSDKType: typeof ResponseOfferSnapshot_Result;
export declare function responseOfferSnapshot_ResultFromJSON(object: any): ResponseOfferSnapshot_Result;
export declare function responseOfferSnapshot_ResultToJSON(object: ResponseOfferSnapshot_Result): string;
export declare enum ResponseApplySnapshotChunk_Result {
    /** UNKNOWN - Unknown result, abort all snapshot restoration */
    UNKNOWN = 0,
    /** ACCEPT - Chunk successfully accepted */
    ACCEPT = 1,
    /** ABORT - Abort all snapshot restoration */
    ABORT = 2,
    /** RETRY - Retry chunk (combine with refetch and reject) */
    RETRY = 3,
    /** RETRY_SNAPSHOT - Retry snapshot (combine with refetch and reject) */
    RETRY_SNAPSHOT = 4,
    /** REJECT_SNAPSHOT - Reject this snapshot, try others */
    REJECT_SNAPSHOT = 5,
    UNRECOGNIZED = -1
}
export declare const ResponseApplySnapshotChunk_ResultSDKType: typeof ResponseApplySnapshotChunk_Result;
export declare function responseApplySnapshotChunk_ResultFromJSON(object: any): ResponseApplySnapshotChunk_Result;
export declare function responseApplySnapshotChunk_ResultToJSON(object: ResponseApplySnapshotChunk_Result): string;
export declare enum ResponseProcessProposal_ProposalStatus {
    UNKNOWN = 0,
    ACCEPT = 1,
    REJECT = 2,
    UNRECOGNIZED = -1
}
export declare const ResponseProcessProposal_ProposalStatusSDKType: typeof ResponseProcessProposal_ProposalStatus;
export declare function responseProcessProposal_ProposalStatusFromJSON(object: any): ResponseProcessProposal_ProposalStatus;
export declare function responseProcessProposal_ProposalStatusToJSON(object: ResponseProcessProposal_ProposalStatus): string;
export declare enum ResponseVerifyVoteExtension_VerifyStatus {
    UNKNOWN = 0,
    ACCEPT = 1,
    /**
     * REJECT - Rejecting the vote extension will reject the entire precommit by the sender.
     * Incorrectly implementing this thus has liveness implications as it may affect
     * CometBFT's ability to receive 2/3+ valid votes to finalize the block.
     * Honest nodes should never be rejected.
     */
    REJECT = 2,
    UNRECOGNIZED = -1
}
export declare const ResponseVerifyVoteExtension_VerifyStatusSDKType: typeof ResponseVerifyVoteExtension_VerifyStatus;
export declare function responseVerifyVoteExtension_VerifyStatusFromJSON(object: any): ResponseVerifyVoteExtension_VerifyStatus;
export declare function responseVerifyVoteExtension_VerifyStatusToJSON(object: ResponseVerifyVoteExtension_VerifyStatus): string;
export declare enum MisbehaviorType {
    UNKNOWN = 0,
    DUPLICATE_VOTE = 1,
    LIGHT_CLIENT_ATTACK = 2,
    UNRECOGNIZED = -1
}
export declare const MisbehaviorTypeSDKType: typeof MisbehaviorType;
export declare function misbehaviorTypeFromJSON(object: any): MisbehaviorType;
export declare function misbehaviorTypeToJSON(object: MisbehaviorType): string;
/**
 * @name Request
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Request
 */
export interface Request {
    echo?: RequestEcho;
    flush?: RequestFlush;
    info?: RequestInfo;
    initChain?: RequestInitChain;
    query?: RequestQuery;
    checkTx?: RequestCheckTx;
    commit?: RequestCommit;
    listSnapshots?: RequestListSnapshots;
    offerSnapshot?: RequestOfferSnapshot;
    loadSnapshotChunk?: RequestLoadSnapshotChunk;
    applySnapshotChunk?: RequestApplySnapshotChunk;
    prepareProposal?: RequestPrepareProposal;
    processProposal?: RequestProcessProposal;
    extendVote?: RequestExtendVote;
    verifyVoteExtension?: RequestVerifyVoteExtension;
    finalizeBlock?: RequestFinalizeBlock;
}
export interface RequestProtoMsg {
    typeUrl: '/tendermint.abci.Request';
    value: Uint8Array;
}
/**
 * @name RequestSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Request
 */
export interface RequestSDKType {
    echo?: RequestEchoSDKType;
    flush?: RequestFlushSDKType;
    info?: RequestInfoSDKType;
    init_chain?: RequestInitChainSDKType;
    query?: RequestQuerySDKType;
    check_tx?: RequestCheckTxSDKType;
    commit?: RequestCommitSDKType;
    list_snapshots?: RequestListSnapshotsSDKType;
    offer_snapshot?: RequestOfferSnapshotSDKType;
    load_snapshot_chunk?: RequestLoadSnapshotChunkSDKType;
    apply_snapshot_chunk?: RequestApplySnapshotChunkSDKType;
    prepare_proposal?: RequestPrepareProposalSDKType;
    process_proposal?: RequestProcessProposalSDKType;
    extend_vote?: RequestExtendVoteSDKType;
    verify_vote_extension?: RequestVerifyVoteExtensionSDKType;
    finalize_block?: RequestFinalizeBlockSDKType;
}
/**
 * @name RequestEcho
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestEcho
 */
export interface RequestEcho {
    message: string;
}
export interface RequestEchoProtoMsg {
    typeUrl: '/tendermint.abci.RequestEcho';
    value: Uint8Array;
}
/**
 * @name RequestEchoSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestEcho
 */
export interface RequestEchoSDKType {
    message: string;
}
/**
 * @name RequestFlush
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestFlush
 */
export interface RequestFlush {
}
export interface RequestFlushProtoMsg {
    typeUrl: '/tendermint.abci.RequestFlush';
    value: Uint8Array;
}
/**
 * @name RequestFlushSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestFlush
 */
export interface RequestFlushSDKType {
}
/**
 * @name RequestInfo
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestInfo
 */
export interface RequestInfo {
    version: string;
    blockVersion: bigint;
    p2pVersion: bigint;
    abciVersion: string;
}
export interface RequestInfoProtoMsg {
    typeUrl: '/tendermint.abci.RequestInfo';
    value: Uint8Array;
}
/**
 * @name RequestInfoSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestInfo
 */
export interface RequestInfoSDKType {
    version: string;
    block_version: bigint;
    p2p_version: bigint;
    abci_version: string;
}
/**
 * @name RequestInitChain
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestInitChain
 */
export interface RequestInitChain {
    time: Timestamp;
    chainId: string;
    consensusParams?: ConsensusParams;
    validators: ValidatorUpdate[];
    appStateBytes: Uint8Array;
    initialHeight: bigint;
}
export interface RequestInitChainProtoMsg {
    typeUrl: '/tendermint.abci.RequestInitChain';
    value: Uint8Array;
}
/**
 * @name RequestInitChainSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestInitChain
 */
export interface RequestInitChainSDKType {
    time: TimestampSDKType;
    chain_id: string;
    consensus_params?: ConsensusParamsSDKType;
    validators: ValidatorUpdateSDKType[];
    app_state_bytes: Uint8Array;
    initial_height: bigint;
}
/**
 * @name RequestQuery
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestQuery
 */
export interface RequestQuery {
    data: Uint8Array;
    path: string;
    height: bigint;
    prove: boolean;
}
export interface RequestQueryProtoMsg {
    typeUrl: '/tendermint.abci.RequestQuery';
    value: Uint8Array;
}
/**
 * @name RequestQuerySDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestQuery
 */
export interface RequestQuerySDKType {
    data: Uint8Array;
    path: string;
    height: bigint;
    prove: boolean;
}
/**
 * @name RequestCheckTx
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestCheckTx
 */
export interface RequestCheckTx {
    tx: Uint8Array;
    type: CheckTxType;
}
export interface RequestCheckTxProtoMsg {
    typeUrl: '/tendermint.abci.RequestCheckTx';
    value: Uint8Array;
}
/**
 * @name RequestCheckTxSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestCheckTx
 */
export interface RequestCheckTxSDKType {
    tx: Uint8Array;
    type: CheckTxType;
}
/**
 * @name RequestCommit
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestCommit
 */
export interface RequestCommit {
}
export interface RequestCommitProtoMsg {
    typeUrl: '/tendermint.abci.RequestCommit';
    value: Uint8Array;
}
/**
 * @name RequestCommitSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestCommit
 */
export interface RequestCommitSDKType {
}
/**
 * lists available snapshots
 * @name RequestListSnapshots
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestListSnapshots
 */
export interface RequestListSnapshots {
}
export interface RequestListSnapshotsProtoMsg {
    typeUrl: '/tendermint.abci.RequestListSnapshots';
    value: Uint8Array;
}
/**
 * lists available snapshots
 * @name RequestListSnapshotsSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestListSnapshots
 */
export interface RequestListSnapshotsSDKType {
}
/**
 * offers a snapshot to the application
 * @name RequestOfferSnapshot
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestOfferSnapshot
 */
export interface RequestOfferSnapshot {
    /**
     * snapshot offered by peers
     */
    snapshot?: Snapshot;
    /**
     * light client-verified app hash for snapshot height
     */
    appHash: Uint8Array;
}
export interface RequestOfferSnapshotProtoMsg {
    typeUrl: '/tendermint.abci.RequestOfferSnapshot';
    value: Uint8Array;
}
/**
 * offers a snapshot to the application
 * @name RequestOfferSnapshotSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestOfferSnapshot
 */
export interface RequestOfferSnapshotSDKType {
    snapshot?: SnapshotSDKType;
    app_hash: Uint8Array;
}
/**
 * loads a snapshot chunk
 * @name RequestLoadSnapshotChunk
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestLoadSnapshotChunk
 */
export interface RequestLoadSnapshotChunk {
    height: bigint;
    format: number;
    chunk: number;
}
export interface RequestLoadSnapshotChunkProtoMsg {
    typeUrl: '/tendermint.abci.RequestLoadSnapshotChunk';
    value: Uint8Array;
}
/**
 * loads a snapshot chunk
 * @name RequestLoadSnapshotChunkSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestLoadSnapshotChunk
 */
export interface RequestLoadSnapshotChunkSDKType {
    height: bigint;
    format: number;
    chunk: number;
}
/**
 * Applies a snapshot chunk
 * @name RequestApplySnapshotChunk
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestApplySnapshotChunk
 */
export interface RequestApplySnapshotChunk {
    index: number;
    chunk: Uint8Array;
    sender: string;
}
export interface RequestApplySnapshotChunkProtoMsg {
    typeUrl: '/tendermint.abci.RequestApplySnapshotChunk';
    value: Uint8Array;
}
/**
 * Applies a snapshot chunk
 * @name RequestApplySnapshotChunkSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestApplySnapshotChunk
 */
export interface RequestApplySnapshotChunkSDKType {
    index: number;
    chunk: Uint8Array;
    sender: string;
}
/**
 * @name RequestPrepareProposal
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestPrepareProposal
 */
export interface RequestPrepareProposal {
    /**
     * the modified transactions cannot exceed this size.
     */
    maxTxBytes: bigint;
    /**
     * txs is an array of transactions that will be included in a block,
     * sent to the app for possible modifications.
     */
    txs: Uint8Array[];
    localLastCommit: ExtendedCommitInfo;
    misbehavior: Misbehavior[];
    height: bigint;
    time: Timestamp;
    nextValidatorsHash: Uint8Array;
    /**
     * address of the public key of the validator proposing the block.
     */
    proposerAddress: Uint8Array;
}
export interface RequestPrepareProposalProtoMsg {
    typeUrl: '/tendermint.abci.RequestPrepareProposal';
    value: Uint8Array;
}
/**
 * @name RequestPrepareProposalSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestPrepareProposal
 */
export interface RequestPrepareProposalSDKType {
    max_tx_bytes: bigint;
    txs: Uint8Array[];
    local_last_commit: ExtendedCommitInfoSDKType;
    misbehavior: MisbehaviorSDKType[];
    height: bigint;
    time: TimestampSDKType;
    next_validators_hash: Uint8Array;
    proposer_address: Uint8Array;
}
/**
 * @name RequestProcessProposal
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestProcessProposal
 */
export interface RequestProcessProposal {
    txs: Uint8Array[];
    proposedLastCommit: CommitInfo;
    misbehavior: Misbehavior[];
    /**
     * hash is the merkle root hash of the fields of the proposed block.
     */
    hash: Uint8Array;
    height: bigint;
    time: Timestamp;
    nextValidatorsHash: Uint8Array;
    /**
     * address of the public key of the original proposer of the block.
     */
    proposerAddress: Uint8Array;
}
export interface RequestProcessProposalProtoMsg {
    typeUrl: '/tendermint.abci.RequestProcessProposal';
    value: Uint8Array;
}
/**
 * @name RequestProcessProposalSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestProcessProposal
 */
export interface RequestProcessProposalSDKType {
    txs: Uint8Array[];
    proposed_last_commit: CommitInfoSDKType;
    misbehavior: MisbehaviorSDKType[];
    hash: Uint8Array;
    height: bigint;
    time: TimestampSDKType;
    next_validators_hash: Uint8Array;
    proposer_address: Uint8Array;
}
/**
 * Extends a vote with application-injected data
 * @name RequestExtendVote
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestExtendVote
 */
export interface RequestExtendVote {
    /**
     * the hash of the block that this vote may be referring to
     */
    hash: Uint8Array;
    /**
     * the height of the extended vote
     */
    height: bigint;
    /**
     * info of the block that this vote may be referring to
     */
    time: Timestamp;
    txs: Uint8Array[];
    proposedLastCommit: CommitInfo;
    misbehavior: Misbehavior[];
    nextValidatorsHash: Uint8Array;
    /**
     * address of the public key of the original proposer of the block.
     */
    proposerAddress: Uint8Array;
}
export interface RequestExtendVoteProtoMsg {
    typeUrl: '/tendermint.abci.RequestExtendVote';
    value: Uint8Array;
}
/**
 * Extends a vote with application-injected data
 * @name RequestExtendVoteSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestExtendVote
 */
export interface RequestExtendVoteSDKType {
    hash: Uint8Array;
    height: bigint;
    time: TimestampSDKType;
    txs: Uint8Array[];
    proposed_last_commit: CommitInfoSDKType;
    misbehavior: MisbehaviorSDKType[];
    next_validators_hash: Uint8Array;
    proposer_address: Uint8Array;
}
/**
 * Verify the vote extension
 * @name RequestVerifyVoteExtension
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestVerifyVoteExtension
 */
export interface RequestVerifyVoteExtension {
    /**
     * the hash of the block that this received vote corresponds to
     */
    hash: Uint8Array;
    /**
     * the validator that signed the vote extension
     */
    validatorAddress: Uint8Array;
    height: bigint;
    voteExtension: Uint8Array;
}
export interface RequestVerifyVoteExtensionProtoMsg {
    typeUrl: '/tendermint.abci.RequestVerifyVoteExtension';
    value: Uint8Array;
}
/**
 * Verify the vote extension
 * @name RequestVerifyVoteExtensionSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestVerifyVoteExtension
 */
export interface RequestVerifyVoteExtensionSDKType {
    hash: Uint8Array;
    validator_address: Uint8Array;
    height: bigint;
    vote_extension: Uint8Array;
}
/**
 * @name RequestFinalizeBlock
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestFinalizeBlock
 */
export interface RequestFinalizeBlock {
    txs: Uint8Array[];
    decidedLastCommit: CommitInfo;
    misbehavior: Misbehavior[];
    /**
     * hash is the merkle root hash of the fields of the decided block.
     */
    hash: Uint8Array;
    height: bigint;
    time: Timestamp;
    nextValidatorsHash: Uint8Array;
    /**
     * proposer_address is the address of the public key of the original proposer of the block.
     */
    proposerAddress: Uint8Array;
}
export interface RequestFinalizeBlockProtoMsg {
    typeUrl: '/tendermint.abci.RequestFinalizeBlock';
    value: Uint8Array;
}
/**
 * @name RequestFinalizeBlockSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestFinalizeBlock
 */
export interface RequestFinalizeBlockSDKType {
    txs: Uint8Array[];
    decided_last_commit: CommitInfoSDKType;
    misbehavior: MisbehaviorSDKType[];
    hash: Uint8Array;
    height: bigint;
    time: TimestampSDKType;
    next_validators_hash: Uint8Array;
    proposer_address: Uint8Array;
}
/**
 * @name Response
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Response
 */
export interface Response {
    exception?: ResponseException;
    echo?: ResponseEcho;
    flush?: ResponseFlush;
    info?: ResponseInfo;
    initChain?: ResponseInitChain;
    query?: ResponseQuery;
    checkTx?: ResponseCheckTx;
    commit?: ResponseCommit;
    listSnapshots?: ResponseListSnapshots;
    offerSnapshot?: ResponseOfferSnapshot;
    loadSnapshotChunk?: ResponseLoadSnapshotChunk;
    applySnapshotChunk?: ResponseApplySnapshotChunk;
    prepareProposal?: ResponsePrepareProposal;
    processProposal?: ResponseProcessProposal;
    extendVote?: ResponseExtendVote;
    verifyVoteExtension?: ResponseVerifyVoteExtension;
    finalizeBlock?: ResponseFinalizeBlock;
}
export interface ResponseProtoMsg {
    typeUrl: '/tendermint.abci.Response';
    value: Uint8Array;
}
/**
 * @name ResponseSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Response
 */
export interface ResponseSDKType {
    exception?: ResponseExceptionSDKType;
    echo?: ResponseEchoSDKType;
    flush?: ResponseFlushSDKType;
    info?: ResponseInfoSDKType;
    init_chain?: ResponseInitChainSDKType;
    query?: ResponseQuerySDKType;
    check_tx?: ResponseCheckTxSDKType;
    commit?: ResponseCommitSDKType;
    list_snapshots?: ResponseListSnapshotsSDKType;
    offer_snapshot?: ResponseOfferSnapshotSDKType;
    load_snapshot_chunk?: ResponseLoadSnapshotChunkSDKType;
    apply_snapshot_chunk?: ResponseApplySnapshotChunkSDKType;
    prepare_proposal?: ResponsePrepareProposalSDKType;
    process_proposal?: ResponseProcessProposalSDKType;
    extend_vote?: ResponseExtendVoteSDKType;
    verify_vote_extension?: ResponseVerifyVoteExtensionSDKType;
    finalize_block?: ResponseFinalizeBlockSDKType;
}
/**
 * nondeterministic
 * @name ResponseException
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseException
 */
export interface ResponseException {
    error: string;
}
export interface ResponseExceptionProtoMsg {
    typeUrl: '/tendermint.abci.ResponseException';
    value: Uint8Array;
}
/**
 * nondeterministic
 * @name ResponseExceptionSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseException
 */
export interface ResponseExceptionSDKType {
    error: string;
}
/**
 * @name ResponseEcho
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseEcho
 */
export interface ResponseEcho {
    message: string;
}
export interface ResponseEchoProtoMsg {
    typeUrl: '/tendermint.abci.ResponseEcho';
    value: Uint8Array;
}
/**
 * @name ResponseEchoSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseEcho
 */
export interface ResponseEchoSDKType {
    message: string;
}
/**
 * @name ResponseFlush
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseFlush
 */
export interface ResponseFlush {
}
export interface ResponseFlushProtoMsg {
    typeUrl: '/tendermint.abci.ResponseFlush';
    value: Uint8Array;
}
/**
 * @name ResponseFlushSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseFlush
 */
export interface ResponseFlushSDKType {
}
/**
 * @name ResponseInfo
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseInfo
 */
export interface ResponseInfo {
    data: string;
    version: string;
    appVersion: bigint;
    lastBlockHeight: bigint;
    lastBlockAppHash: Uint8Array;
}
export interface ResponseInfoProtoMsg {
    typeUrl: '/tendermint.abci.ResponseInfo';
    value: Uint8Array;
}
/**
 * @name ResponseInfoSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseInfo
 */
export interface ResponseInfoSDKType {
    data: string;
    version: string;
    app_version: bigint;
    last_block_height: bigint;
    last_block_app_hash: Uint8Array;
}
/**
 * @name ResponseInitChain
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseInitChain
 */
export interface ResponseInitChain {
    consensusParams?: ConsensusParams;
    validators: ValidatorUpdate[];
    appHash: Uint8Array;
}
export interface ResponseInitChainProtoMsg {
    typeUrl: '/tendermint.abci.ResponseInitChain';
    value: Uint8Array;
}
/**
 * @name ResponseInitChainSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseInitChain
 */
export interface ResponseInitChainSDKType {
    consensus_params?: ConsensusParamsSDKType;
    validators: ValidatorUpdateSDKType[];
    app_hash: Uint8Array;
}
/**
 * @name ResponseQuery
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseQuery
 */
export interface ResponseQuery {
    code: number;
    /**
     * bytes data = 2; // use "value" instead.
     */
    log: string;
    /**
     * nondeterministic
     */
    info: string;
    index: bigint;
    key: Uint8Array;
    value: Uint8Array;
    proofOps?: ProofOps;
    height: bigint;
    codespace: string;
}
export interface ResponseQueryProtoMsg {
    typeUrl: '/tendermint.abci.ResponseQuery';
    value: Uint8Array;
}
/**
 * @name ResponseQuerySDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseQuery
 */
export interface ResponseQuerySDKType {
    code: number;
    log: string;
    info: string;
    index: bigint;
    key: Uint8Array;
    value: Uint8Array;
    proof_ops?: ProofOpsSDKType;
    height: bigint;
    codespace: string;
}
/**
 * @name ResponseCheckTx
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseCheckTx
 */
export interface ResponseCheckTx {
    code: number;
    data: Uint8Array;
    /**
     * nondeterministic
     */
    log: string;
    /**
     * nondeterministic
     */
    info: string;
    gasWanted: bigint;
    gasUsed: bigint;
    events: Event[];
    codespace: string;
}
export interface ResponseCheckTxProtoMsg {
    typeUrl: '/tendermint.abci.ResponseCheckTx';
    value: Uint8Array;
}
/**
 * @name ResponseCheckTxSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseCheckTx
 */
export interface ResponseCheckTxSDKType {
    code: number;
    data: Uint8Array;
    log: string;
    info: string;
    gas_wanted: bigint;
    gas_used: bigint;
    events: EventSDKType[];
    codespace: string;
}
/**
 * @name ResponseCommit
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseCommit
 */
export interface ResponseCommit {
    retainHeight: bigint;
}
export interface ResponseCommitProtoMsg {
    typeUrl: '/tendermint.abci.ResponseCommit';
    value: Uint8Array;
}
/**
 * @name ResponseCommitSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseCommit
 */
export interface ResponseCommitSDKType {
    retain_height: bigint;
}
/**
 * @name ResponseListSnapshots
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseListSnapshots
 */
export interface ResponseListSnapshots {
    snapshots: Snapshot[];
}
export interface ResponseListSnapshotsProtoMsg {
    typeUrl: '/tendermint.abci.ResponseListSnapshots';
    value: Uint8Array;
}
/**
 * @name ResponseListSnapshotsSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseListSnapshots
 */
export interface ResponseListSnapshotsSDKType {
    snapshots: SnapshotSDKType[];
}
/**
 * @name ResponseOfferSnapshot
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseOfferSnapshot
 */
export interface ResponseOfferSnapshot {
    result: ResponseOfferSnapshot_Result;
}
export interface ResponseOfferSnapshotProtoMsg {
    typeUrl: '/tendermint.abci.ResponseOfferSnapshot';
    value: Uint8Array;
}
/**
 * @name ResponseOfferSnapshotSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseOfferSnapshot
 */
export interface ResponseOfferSnapshotSDKType {
    result: ResponseOfferSnapshot_Result;
}
/**
 * @name ResponseLoadSnapshotChunk
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseLoadSnapshotChunk
 */
export interface ResponseLoadSnapshotChunk {
    chunk: Uint8Array;
}
export interface ResponseLoadSnapshotChunkProtoMsg {
    typeUrl: '/tendermint.abci.ResponseLoadSnapshotChunk';
    value: Uint8Array;
}
/**
 * @name ResponseLoadSnapshotChunkSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseLoadSnapshotChunk
 */
export interface ResponseLoadSnapshotChunkSDKType {
    chunk: Uint8Array;
}
/**
 * @name ResponseApplySnapshotChunk
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseApplySnapshotChunk
 */
export interface ResponseApplySnapshotChunk {
    result: ResponseApplySnapshotChunk_Result;
    /**
     * Chunks to refetch and reapply
     */
    refetchChunks: number[];
    /**
     * Chunk senders to reject and ban
     */
    rejectSenders: string[];
}
export interface ResponseApplySnapshotChunkProtoMsg {
    typeUrl: '/tendermint.abci.ResponseApplySnapshotChunk';
    value: Uint8Array;
}
/**
 * @name ResponseApplySnapshotChunkSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseApplySnapshotChunk
 */
export interface ResponseApplySnapshotChunkSDKType {
    result: ResponseApplySnapshotChunk_Result;
    refetch_chunks: number[];
    reject_senders: string[];
}
/**
 * @name ResponsePrepareProposal
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponsePrepareProposal
 */
export interface ResponsePrepareProposal {
    txs: Uint8Array[];
}
export interface ResponsePrepareProposalProtoMsg {
    typeUrl: '/tendermint.abci.ResponsePrepareProposal';
    value: Uint8Array;
}
/**
 * @name ResponsePrepareProposalSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponsePrepareProposal
 */
export interface ResponsePrepareProposalSDKType {
    txs: Uint8Array[];
}
/**
 * @name ResponseProcessProposal
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseProcessProposal
 */
export interface ResponseProcessProposal {
    status: ResponseProcessProposal_ProposalStatus;
}
export interface ResponseProcessProposalProtoMsg {
    typeUrl: '/tendermint.abci.ResponseProcessProposal';
    value: Uint8Array;
}
/**
 * @name ResponseProcessProposalSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseProcessProposal
 */
export interface ResponseProcessProposalSDKType {
    status: ResponseProcessProposal_ProposalStatus;
}
/**
 * @name ResponseExtendVote
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseExtendVote
 */
export interface ResponseExtendVote {
    voteExtension: Uint8Array;
}
export interface ResponseExtendVoteProtoMsg {
    typeUrl: '/tendermint.abci.ResponseExtendVote';
    value: Uint8Array;
}
/**
 * @name ResponseExtendVoteSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseExtendVote
 */
export interface ResponseExtendVoteSDKType {
    vote_extension: Uint8Array;
}
/**
 * @name ResponseVerifyVoteExtension
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseVerifyVoteExtension
 */
export interface ResponseVerifyVoteExtension {
    status: ResponseVerifyVoteExtension_VerifyStatus;
}
export interface ResponseVerifyVoteExtensionProtoMsg {
    typeUrl: '/tendermint.abci.ResponseVerifyVoteExtension';
    value: Uint8Array;
}
/**
 * @name ResponseVerifyVoteExtensionSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseVerifyVoteExtension
 */
export interface ResponseVerifyVoteExtensionSDKType {
    status: ResponseVerifyVoteExtension_VerifyStatus;
}
/**
 * @name ResponseFinalizeBlock
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseFinalizeBlock
 */
export interface ResponseFinalizeBlock {
    /**
     * set of block events emmitted as part of executing the block
     */
    events: Event[];
    /**
     * the result of executing each transaction including the events
     * the particular transction emitted. This should match the order
     * of the transactions delivered in the block itself
     */
    txResults: ExecTxResult[];
    /**
     * a list of updates to the validator set. These will reflect the validator set at current height + 2.
     */
    validatorUpdates: ValidatorUpdate[];
    /**
     * updates to the consensus params, if any.
     */
    consensusParamUpdates?: ConsensusParams;
    /**
     * app_hash is the hash of the applications' state which is used to confirm that execution of the transactions was
     * deterministic. It is up to the application to decide which algorithm to use.
     */
    appHash: Uint8Array;
}
export interface ResponseFinalizeBlockProtoMsg {
    typeUrl: '/tendermint.abci.ResponseFinalizeBlock';
    value: Uint8Array;
}
/**
 * @name ResponseFinalizeBlockSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseFinalizeBlock
 */
export interface ResponseFinalizeBlockSDKType {
    events: EventSDKType[];
    tx_results: ExecTxResultSDKType[];
    validator_updates: ValidatorUpdateSDKType[];
    consensus_param_updates?: ConsensusParamsSDKType;
    app_hash: Uint8Array;
}
/**
 * @name CommitInfo
 * @package tendermint.abci
 * @see proto type: tendermint.abci.CommitInfo
 */
export interface CommitInfo {
    round: number;
    votes: VoteInfo[];
}
export interface CommitInfoProtoMsg {
    typeUrl: '/tendermint.abci.CommitInfo';
    value: Uint8Array;
}
/**
 * @name CommitInfoSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.CommitInfo
 */
export interface CommitInfoSDKType {
    round: number;
    votes: VoteInfoSDKType[];
}
/**
 * ExtendedCommitInfo is similar to CommitInfo except that it is only used in
 * the PrepareProposal request such that CometBFT can provide vote extensions
 * to the application.
 * @name ExtendedCommitInfo
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ExtendedCommitInfo
 */
export interface ExtendedCommitInfo {
    /**
     * The round at which the block proposer decided in the previous height.
     */
    round: number;
    /**
     * List of validators' addresses in the last validator set with their voting
     * information, including vote extensions.
     */
    votes: ExtendedVoteInfo[];
}
export interface ExtendedCommitInfoProtoMsg {
    typeUrl: '/tendermint.abci.ExtendedCommitInfo';
    value: Uint8Array;
}
/**
 * ExtendedCommitInfo is similar to CommitInfo except that it is only used in
 * the PrepareProposal request such that CometBFT can provide vote extensions
 * to the application.
 * @name ExtendedCommitInfoSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ExtendedCommitInfo
 */
export interface ExtendedCommitInfoSDKType {
    round: number;
    votes: ExtendedVoteInfoSDKType[];
}
/**
 * Event allows application developers to attach additional information to
 * ResponseFinalizeBlock and ResponseCheckTx.
 * Later, transactions may be queried using these events.
 * @name Event
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Event
 */
export interface Event {
    type: string;
    attributes: EventAttribute[];
}
export interface EventProtoMsg {
    typeUrl: '/tendermint.abci.Event';
    value: Uint8Array;
}
/**
 * Event allows application developers to attach additional information to
 * ResponseFinalizeBlock and ResponseCheckTx.
 * Later, transactions may be queried using these events.
 * @name EventSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Event
 */
export interface EventSDKType {
    type: string;
    attributes: EventAttributeSDKType[];
}
/**
 * EventAttribute is a single key-value pair, associated with an event.
 * @name EventAttribute
 * @package tendermint.abci
 * @see proto type: tendermint.abci.EventAttribute
 */
export interface EventAttribute {
    key: string;
    value: string;
    /**
     * nondeterministic
     */
    index: boolean;
}
export interface EventAttributeProtoMsg {
    typeUrl: '/tendermint.abci.EventAttribute';
    value: Uint8Array;
}
/**
 * EventAttribute is a single key-value pair, associated with an event.
 * @name EventAttributeSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.EventAttribute
 */
export interface EventAttributeSDKType {
    key: string;
    value: string;
    index: boolean;
}
/**
 * ExecTxResult contains results of executing one individual transaction.
 *
 * * Its structure is equivalent to #ResponseDeliverTx which will be deprecated/deleted
 * @name ExecTxResult
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ExecTxResult
 */
export interface ExecTxResult {
    code: number;
    data: Uint8Array;
    /**
     * nondeterministic
     */
    log: string;
    /**
     * nondeterministic
     */
    info: string;
    gasWanted: bigint;
    gasUsed: bigint;
    events: Event[];
    codespace: string;
}
export interface ExecTxResultProtoMsg {
    typeUrl: '/tendermint.abci.ExecTxResult';
    value: Uint8Array;
}
/**
 * ExecTxResult contains results of executing one individual transaction.
 *
 * * Its structure is equivalent to #ResponseDeliverTx which will be deprecated/deleted
 * @name ExecTxResultSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ExecTxResult
 */
export interface ExecTxResultSDKType {
    code: number;
    data: Uint8Array;
    log: string;
    info: string;
    gas_wanted: bigint;
    gas_used: bigint;
    events: EventSDKType[];
    codespace: string;
}
/**
 * TxResult contains results of executing the transaction.
 *
 * One usage is indexing transaction results.
 * @name TxResult
 * @package tendermint.abci
 * @see proto type: tendermint.abci.TxResult
 */
export interface TxResult {
    height: bigint;
    index: number;
    tx: Uint8Array;
    result: ExecTxResult;
}
export interface TxResultProtoMsg {
    typeUrl: '/tendermint.abci.TxResult';
    value: Uint8Array;
}
/**
 * TxResult contains results of executing the transaction.
 *
 * One usage is indexing transaction results.
 * @name TxResultSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.TxResult
 */
export interface TxResultSDKType {
    height: bigint;
    index: number;
    tx: Uint8Array;
    result: ExecTxResultSDKType;
}
/**
 * @name Validator
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Validator
 */
export interface Validator {
    /**
     * The first 20 bytes of SHA256(public key)
     */
    address: Uint8Array;
    /**
     * PubKey pub_key = 2 [(gogoproto.nullable)=false];
     */
    power: bigint;
}
export interface ValidatorProtoMsg {
    typeUrl: '/tendermint.abci.Validator';
    value: Uint8Array;
}
/**
 * @name ValidatorSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Validator
 */
export interface ValidatorSDKType {
    address: Uint8Array;
    power: bigint;
}
/**
 * @name ValidatorUpdate
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ValidatorUpdate
 */
export interface ValidatorUpdate {
    pubKey: PublicKey;
    power: bigint;
}
export interface ValidatorUpdateProtoMsg {
    typeUrl: '/tendermint.abci.ValidatorUpdate';
    value: Uint8Array;
}
/**
 * @name ValidatorUpdateSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ValidatorUpdate
 */
export interface ValidatorUpdateSDKType {
    pub_key: PublicKeySDKType;
    power: bigint;
}
/**
 * @name VoteInfo
 * @package tendermint.abci
 * @see proto type: tendermint.abci.VoteInfo
 */
export interface VoteInfo {
    validator: Validator;
    blockIdFlag: BlockIDFlag;
}
export interface VoteInfoProtoMsg {
    typeUrl: '/tendermint.abci.VoteInfo';
    value: Uint8Array;
}
/**
 * @name VoteInfoSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.VoteInfo
 */
export interface VoteInfoSDKType {
    validator: ValidatorSDKType;
    block_id_flag: BlockIDFlag;
}
/**
 * @name ExtendedVoteInfo
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ExtendedVoteInfo
 */
export interface ExtendedVoteInfo {
    /**
     * The validator that sent the vote.
     */
    validator: Validator;
    /**
     * Non-deterministic extension provided by the sending validator's application.
     */
    voteExtension: Uint8Array;
    /**
     * Vote extension signature created by CometBFT
     */
    extensionSignature: Uint8Array;
    /**
     * block_id_flag indicates whether the validator voted for a block, nil, or did not vote at all
     */
    blockIdFlag: BlockIDFlag;
}
export interface ExtendedVoteInfoProtoMsg {
    typeUrl: '/tendermint.abci.ExtendedVoteInfo';
    value: Uint8Array;
}
/**
 * @name ExtendedVoteInfoSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ExtendedVoteInfo
 */
export interface ExtendedVoteInfoSDKType {
    validator: ValidatorSDKType;
    vote_extension: Uint8Array;
    extension_signature: Uint8Array;
    block_id_flag: BlockIDFlag;
}
/**
 * @name Misbehavior
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Misbehavior
 */
export interface Misbehavior {
    type: MisbehaviorType;
    /**
     * The offending validator
     */
    validator: Validator;
    /**
     * The height when the offense occurred
     */
    height: bigint;
    /**
     * The corresponding time where the offense occurred
     */
    time: Timestamp;
    /**
     * Total voting power of the validator set in case the ABCI application does
     * not store historical validators.
     * https://github.com/tendermint/tendermint/issues/4581
     */
    totalVotingPower: bigint;
}
export interface MisbehaviorProtoMsg {
    typeUrl: '/tendermint.abci.Misbehavior';
    value: Uint8Array;
}
/**
 * @name MisbehaviorSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Misbehavior
 */
export interface MisbehaviorSDKType {
    type: MisbehaviorType;
    validator: ValidatorSDKType;
    height: bigint;
    time: TimestampSDKType;
    total_voting_power: bigint;
}
/**
 * @name Snapshot
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Snapshot
 */
export interface Snapshot {
    /**
     * The height at which the snapshot was taken
     */
    height: bigint;
    /**
     * The application-specific snapshot format
     */
    format: number;
    /**
     * Number of chunks in the snapshot
     */
    chunks: number;
    /**
     * Arbitrary snapshot hash, equal only if identical
     */
    hash: Uint8Array;
    /**
     * Arbitrary application metadata
     */
    metadata: Uint8Array;
}
export interface SnapshotProtoMsg {
    typeUrl: '/tendermint.abci.Snapshot';
    value: Uint8Array;
}
/**
 * @name SnapshotSDKType
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Snapshot
 */
export interface SnapshotSDKType {
    height: bigint;
    format: number;
    chunks: number;
    hash: Uint8Array;
    metadata: Uint8Array;
}
/**
 * @name Request
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Request
 */
export declare const Request: {
    typeUrl: "/tendermint.abci.Request";
    is(o: any): o is Request;
    isSDK(o: any): o is RequestSDKType;
    encode(message: Request, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Request;
    fromJSON(object: any): Request;
    toJSON(message: Request): JsonSafe<Request>;
    fromPartial(object: Partial<Request>): Request;
    fromProtoMsg(message: RequestProtoMsg): Request;
    toProto(message: Request): Uint8Array;
    toProtoMsg(message: Request): RequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name RequestEcho
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestEcho
 */
export declare const RequestEcho: {
    typeUrl: "/tendermint.abci.RequestEcho";
    is(o: any): o is RequestEcho;
    isSDK(o: any): o is RequestEchoSDKType;
    encode(message: RequestEcho, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestEcho;
    fromJSON(object: any): RequestEcho;
    toJSON(message: RequestEcho): JsonSafe<RequestEcho>;
    fromPartial(object: Partial<RequestEcho>): RequestEcho;
    fromProtoMsg(message: RequestEchoProtoMsg): RequestEcho;
    toProto(message: RequestEcho): Uint8Array;
    toProtoMsg(message: RequestEcho): RequestEchoProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name RequestFlush
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestFlush
 */
export declare const RequestFlush: {
    typeUrl: "/tendermint.abci.RequestFlush";
    is(o: any): o is RequestFlush;
    isSDK(o: any): o is RequestFlushSDKType;
    encode(_: RequestFlush, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestFlush;
    fromJSON(_: any): RequestFlush;
    toJSON(_: RequestFlush): JsonSafe<RequestFlush>;
    fromPartial(_: Partial<RequestFlush>): RequestFlush;
    fromProtoMsg(message: RequestFlushProtoMsg): RequestFlush;
    toProto(message: RequestFlush): Uint8Array;
    toProtoMsg(message: RequestFlush): RequestFlushProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name RequestInfo
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestInfo
 */
export declare const RequestInfo: {
    typeUrl: "/tendermint.abci.RequestInfo";
    is(o: any): o is RequestInfo;
    isSDK(o: any): o is RequestInfoSDKType;
    encode(message: RequestInfo, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestInfo;
    fromJSON(object: any): RequestInfo;
    toJSON(message: RequestInfo): JsonSafe<RequestInfo>;
    fromPartial(object: Partial<RequestInfo>): RequestInfo;
    fromProtoMsg(message: RequestInfoProtoMsg): RequestInfo;
    toProto(message: RequestInfo): Uint8Array;
    toProtoMsg(message: RequestInfo): RequestInfoProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name RequestInitChain
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestInitChain
 */
export declare const RequestInitChain: {
    typeUrl: "/tendermint.abci.RequestInitChain";
    is(o: any): o is RequestInitChain;
    isSDK(o: any): o is RequestInitChainSDKType;
    encode(message: RequestInitChain, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestInitChain;
    fromJSON(object: any): RequestInitChain;
    toJSON(message: RequestInitChain): JsonSafe<RequestInitChain>;
    fromPartial(object: Partial<RequestInitChain>): RequestInitChain;
    fromProtoMsg(message: RequestInitChainProtoMsg): RequestInitChain;
    toProto(message: RequestInitChain): Uint8Array;
    toProtoMsg(message: RequestInitChain): RequestInitChainProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name RequestQuery
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestQuery
 */
export declare const RequestQuery: {
    typeUrl: "/tendermint.abci.RequestQuery";
    is(o: any): o is RequestQuery;
    isSDK(o: any): o is RequestQuerySDKType;
    encode(message: RequestQuery, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestQuery;
    fromJSON(object: any): RequestQuery;
    toJSON(message: RequestQuery): JsonSafe<RequestQuery>;
    fromPartial(object: Partial<RequestQuery>): RequestQuery;
    fromProtoMsg(message: RequestQueryProtoMsg): RequestQuery;
    toProto(message: RequestQuery): Uint8Array;
    toProtoMsg(message: RequestQuery): RequestQueryProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name RequestCheckTx
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestCheckTx
 */
export declare const RequestCheckTx: {
    typeUrl: "/tendermint.abci.RequestCheckTx";
    is(o: any): o is RequestCheckTx;
    isSDK(o: any): o is RequestCheckTxSDKType;
    encode(message: RequestCheckTx, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestCheckTx;
    fromJSON(object: any): RequestCheckTx;
    toJSON(message: RequestCheckTx): JsonSafe<RequestCheckTx>;
    fromPartial(object: Partial<RequestCheckTx>): RequestCheckTx;
    fromProtoMsg(message: RequestCheckTxProtoMsg): RequestCheckTx;
    toProto(message: RequestCheckTx): Uint8Array;
    toProtoMsg(message: RequestCheckTx): RequestCheckTxProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name RequestCommit
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestCommit
 */
export declare const RequestCommit: {
    typeUrl: "/tendermint.abci.RequestCommit";
    is(o: any): o is RequestCommit;
    isSDK(o: any): o is RequestCommitSDKType;
    encode(_: RequestCommit, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestCommit;
    fromJSON(_: any): RequestCommit;
    toJSON(_: RequestCommit): JsonSafe<RequestCommit>;
    fromPartial(_: Partial<RequestCommit>): RequestCommit;
    fromProtoMsg(message: RequestCommitProtoMsg): RequestCommit;
    toProto(message: RequestCommit): Uint8Array;
    toProtoMsg(message: RequestCommit): RequestCommitProtoMsg;
    registerTypeUrl(): void;
};
/**
 * lists available snapshots
 * @name RequestListSnapshots
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestListSnapshots
 */
export declare const RequestListSnapshots: {
    typeUrl: "/tendermint.abci.RequestListSnapshots";
    is(o: any): o is RequestListSnapshots;
    isSDK(o: any): o is RequestListSnapshotsSDKType;
    encode(_: RequestListSnapshots, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestListSnapshots;
    fromJSON(_: any): RequestListSnapshots;
    toJSON(_: RequestListSnapshots): JsonSafe<RequestListSnapshots>;
    fromPartial(_: Partial<RequestListSnapshots>): RequestListSnapshots;
    fromProtoMsg(message: RequestListSnapshotsProtoMsg): RequestListSnapshots;
    toProto(message: RequestListSnapshots): Uint8Array;
    toProtoMsg(message: RequestListSnapshots): RequestListSnapshotsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * offers a snapshot to the application
 * @name RequestOfferSnapshot
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestOfferSnapshot
 */
export declare const RequestOfferSnapshot: {
    typeUrl: "/tendermint.abci.RequestOfferSnapshot";
    is(o: any): o is RequestOfferSnapshot;
    isSDK(o: any): o is RequestOfferSnapshotSDKType;
    encode(message: RequestOfferSnapshot, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestOfferSnapshot;
    fromJSON(object: any): RequestOfferSnapshot;
    toJSON(message: RequestOfferSnapshot): JsonSafe<RequestOfferSnapshot>;
    fromPartial(object: Partial<RequestOfferSnapshot>): RequestOfferSnapshot;
    fromProtoMsg(message: RequestOfferSnapshotProtoMsg): RequestOfferSnapshot;
    toProto(message: RequestOfferSnapshot): Uint8Array;
    toProtoMsg(message: RequestOfferSnapshot): RequestOfferSnapshotProtoMsg;
    registerTypeUrl(): void;
};
/**
 * loads a snapshot chunk
 * @name RequestLoadSnapshotChunk
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestLoadSnapshotChunk
 */
export declare const RequestLoadSnapshotChunk: {
    typeUrl: "/tendermint.abci.RequestLoadSnapshotChunk";
    is(o: any): o is RequestLoadSnapshotChunk;
    isSDK(o: any): o is RequestLoadSnapshotChunkSDKType;
    encode(message: RequestLoadSnapshotChunk, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestLoadSnapshotChunk;
    fromJSON(object: any): RequestLoadSnapshotChunk;
    toJSON(message: RequestLoadSnapshotChunk): JsonSafe<RequestLoadSnapshotChunk>;
    fromPartial(object: Partial<RequestLoadSnapshotChunk>): RequestLoadSnapshotChunk;
    fromProtoMsg(message: RequestLoadSnapshotChunkProtoMsg): RequestLoadSnapshotChunk;
    toProto(message: RequestLoadSnapshotChunk): Uint8Array;
    toProtoMsg(message: RequestLoadSnapshotChunk): RequestLoadSnapshotChunkProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Applies a snapshot chunk
 * @name RequestApplySnapshotChunk
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestApplySnapshotChunk
 */
export declare const RequestApplySnapshotChunk: {
    typeUrl: "/tendermint.abci.RequestApplySnapshotChunk";
    is(o: any): o is RequestApplySnapshotChunk;
    isSDK(o: any): o is RequestApplySnapshotChunkSDKType;
    encode(message: RequestApplySnapshotChunk, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestApplySnapshotChunk;
    fromJSON(object: any): RequestApplySnapshotChunk;
    toJSON(message: RequestApplySnapshotChunk): JsonSafe<RequestApplySnapshotChunk>;
    fromPartial(object: Partial<RequestApplySnapshotChunk>): RequestApplySnapshotChunk;
    fromProtoMsg(message: RequestApplySnapshotChunkProtoMsg): RequestApplySnapshotChunk;
    toProto(message: RequestApplySnapshotChunk): Uint8Array;
    toProtoMsg(message: RequestApplySnapshotChunk): RequestApplySnapshotChunkProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name RequestPrepareProposal
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestPrepareProposal
 */
export declare const RequestPrepareProposal: {
    typeUrl: "/tendermint.abci.RequestPrepareProposal";
    is(o: any): o is RequestPrepareProposal;
    isSDK(o: any): o is RequestPrepareProposalSDKType;
    encode(message: RequestPrepareProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestPrepareProposal;
    fromJSON(object: any): RequestPrepareProposal;
    toJSON(message: RequestPrepareProposal): JsonSafe<RequestPrepareProposal>;
    fromPartial(object: Partial<RequestPrepareProposal>): RequestPrepareProposal;
    fromProtoMsg(message: RequestPrepareProposalProtoMsg): RequestPrepareProposal;
    toProto(message: RequestPrepareProposal): Uint8Array;
    toProtoMsg(message: RequestPrepareProposal): RequestPrepareProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name RequestProcessProposal
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestProcessProposal
 */
export declare const RequestProcessProposal: {
    typeUrl: "/tendermint.abci.RequestProcessProposal";
    is(o: any): o is RequestProcessProposal;
    isSDK(o: any): o is RequestProcessProposalSDKType;
    encode(message: RequestProcessProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestProcessProposal;
    fromJSON(object: any): RequestProcessProposal;
    toJSON(message: RequestProcessProposal): JsonSafe<RequestProcessProposal>;
    fromPartial(object: Partial<RequestProcessProposal>): RequestProcessProposal;
    fromProtoMsg(message: RequestProcessProposalProtoMsg): RequestProcessProposal;
    toProto(message: RequestProcessProposal): Uint8Array;
    toProtoMsg(message: RequestProcessProposal): RequestProcessProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Extends a vote with application-injected data
 * @name RequestExtendVote
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestExtendVote
 */
export declare const RequestExtendVote: {
    typeUrl: "/tendermint.abci.RequestExtendVote";
    is(o: any): o is RequestExtendVote;
    isSDK(o: any): o is RequestExtendVoteSDKType;
    encode(message: RequestExtendVote, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestExtendVote;
    fromJSON(object: any): RequestExtendVote;
    toJSON(message: RequestExtendVote): JsonSafe<RequestExtendVote>;
    fromPartial(object: Partial<RequestExtendVote>): RequestExtendVote;
    fromProtoMsg(message: RequestExtendVoteProtoMsg): RequestExtendVote;
    toProto(message: RequestExtendVote): Uint8Array;
    toProtoMsg(message: RequestExtendVote): RequestExtendVoteProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Verify the vote extension
 * @name RequestVerifyVoteExtension
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestVerifyVoteExtension
 */
export declare const RequestVerifyVoteExtension: {
    typeUrl: "/tendermint.abci.RequestVerifyVoteExtension";
    is(o: any): o is RequestVerifyVoteExtension;
    isSDK(o: any): o is RequestVerifyVoteExtensionSDKType;
    encode(message: RequestVerifyVoteExtension, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestVerifyVoteExtension;
    fromJSON(object: any): RequestVerifyVoteExtension;
    toJSON(message: RequestVerifyVoteExtension): JsonSafe<RequestVerifyVoteExtension>;
    fromPartial(object: Partial<RequestVerifyVoteExtension>): RequestVerifyVoteExtension;
    fromProtoMsg(message: RequestVerifyVoteExtensionProtoMsg): RequestVerifyVoteExtension;
    toProto(message: RequestVerifyVoteExtension): Uint8Array;
    toProtoMsg(message: RequestVerifyVoteExtension): RequestVerifyVoteExtensionProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name RequestFinalizeBlock
 * @package tendermint.abci
 * @see proto type: tendermint.abci.RequestFinalizeBlock
 */
export declare const RequestFinalizeBlock: {
    typeUrl: "/tendermint.abci.RequestFinalizeBlock";
    is(o: any): o is RequestFinalizeBlock;
    isSDK(o: any): o is RequestFinalizeBlockSDKType;
    encode(message: RequestFinalizeBlock, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RequestFinalizeBlock;
    fromJSON(object: any): RequestFinalizeBlock;
    toJSON(message: RequestFinalizeBlock): JsonSafe<RequestFinalizeBlock>;
    fromPartial(object: Partial<RequestFinalizeBlock>): RequestFinalizeBlock;
    fromProtoMsg(message: RequestFinalizeBlockProtoMsg): RequestFinalizeBlock;
    toProto(message: RequestFinalizeBlock): Uint8Array;
    toProtoMsg(message: RequestFinalizeBlock): RequestFinalizeBlockProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name Response
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Response
 */
export declare const Response: {
    typeUrl: "/tendermint.abci.Response";
    is(o: any): o is Response;
    isSDK(o: any): o is ResponseSDKType;
    encode(message: Response, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Response;
    fromJSON(object: any): Response;
    toJSON(message: Response): JsonSafe<Response>;
    fromPartial(object: Partial<Response>): Response;
    fromProtoMsg(message: ResponseProtoMsg): Response;
    toProto(message: Response): Uint8Array;
    toProtoMsg(message: Response): ResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * nondeterministic
 * @name ResponseException
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseException
 */
export declare const ResponseException: {
    typeUrl: "/tendermint.abci.ResponseException";
    is(o: any): o is ResponseException;
    isSDK(o: any): o is ResponseExceptionSDKType;
    encode(message: ResponseException, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseException;
    fromJSON(object: any): ResponseException;
    toJSON(message: ResponseException): JsonSafe<ResponseException>;
    fromPartial(object: Partial<ResponseException>): ResponseException;
    fromProtoMsg(message: ResponseExceptionProtoMsg): ResponseException;
    toProto(message: ResponseException): Uint8Array;
    toProtoMsg(message: ResponseException): ResponseExceptionProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseEcho
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseEcho
 */
export declare const ResponseEcho: {
    typeUrl: "/tendermint.abci.ResponseEcho";
    is(o: any): o is ResponseEcho;
    isSDK(o: any): o is ResponseEchoSDKType;
    encode(message: ResponseEcho, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseEcho;
    fromJSON(object: any): ResponseEcho;
    toJSON(message: ResponseEcho): JsonSafe<ResponseEcho>;
    fromPartial(object: Partial<ResponseEcho>): ResponseEcho;
    fromProtoMsg(message: ResponseEchoProtoMsg): ResponseEcho;
    toProto(message: ResponseEcho): Uint8Array;
    toProtoMsg(message: ResponseEcho): ResponseEchoProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseFlush
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseFlush
 */
export declare const ResponseFlush: {
    typeUrl: "/tendermint.abci.ResponseFlush";
    is(o: any): o is ResponseFlush;
    isSDK(o: any): o is ResponseFlushSDKType;
    encode(_: ResponseFlush, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseFlush;
    fromJSON(_: any): ResponseFlush;
    toJSON(_: ResponseFlush): JsonSafe<ResponseFlush>;
    fromPartial(_: Partial<ResponseFlush>): ResponseFlush;
    fromProtoMsg(message: ResponseFlushProtoMsg): ResponseFlush;
    toProto(message: ResponseFlush): Uint8Array;
    toProtoMsg(message: ResponseFlush): ResponseFlushProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseInfo
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseInfo
 */
export declare const ResponseInfo: {
    typeUrl: "/tendermint.abci.ResponseInfo";
    is(o: any): o is ResponseInfo;
    isSDK(o: any): o is ResponseInfoSDKType;
    encode(message: ResponseInfo, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseInfo;
    fromJSON(object: any): ResponseInfo;
    toJSON(message: ResponseInfo): JsonSafe<ResponseInfo>;
    fromPartial(object: Partial<ResponseInfo>): ResponseInfo;
    fromProtoMsg(message: ResponseInfoProtoMsg): ResponseInfo;
    toProto(message: ResponseInfo): Uint8Array;
    toProtoMsg(message: ResponseInfo): ResponseInfoProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseInitChain
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseInitChain
 */
export declare const ResponseInitChain: {
    typeUrl: "/tendermint.abci.ResponseInitChain";
    is(o: any): o is ResponseInitChain;
    isSDK(o: any): o is ResponseInitChainSDKType;
    encode(message: ResponseInitChain, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseInitChain;
    fromJSON(object: any): ResponseInitChain;
    toJSON(message: ResponseInitChain): JsonSafe<ResponseInitChain>;
    fromPartial(object: Partial<ResponseInitChain>): ResponseInitChain;
    fromProtoMsg(message: ResponseInitChainProtoMsg): ResponseInitChain;
    toProto(message: ResponseInitChain): Uint8Array;
    toProtoMsg(message: ResponseInitChain): ResponseInitChainProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseQuery
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseQuery
 */
export declare const ResponseQuery: {
    typeUrl: "/tendermint.abci.ResponseQuery";
    is(o: any): o is ResponseQuery;
    isSDK(o: any): o is ResponseQuerySDKType;
    encode(message: ResponseQuery, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseQuery;
    fromJSON(object: any): ResponseQuery;
    toJSON(message: ResponseQuery): JsonSafe<ResponseQuery>;
    fromPartial(object: Partial<ResponseQuery>): ResponseQuery;
    fromProtoMsg(message: ResponseQueryProtoMsg): ResponseQuery;
    toProto(message: ResponseQuery): Uint8Array;
    toProtoMsg(message: ResponseQuery): ResponseQueryProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseCheckTx
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseCheckTx
 */
export declare const ResponseCheckTx: {
    typeUrl: "/tendermint.abci.ResponseCheckTx";
    is(o: any): o is ResponseCheckTx;
    isSDK(o: any): o is ResponseCheckTxSDKType;
    encode(message: ResponseCheckTx, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseCheckTx;
    fromJSON(object: any): ResponseCheckTx;
    toJSON(message: ResponseCheckTx): JsonSafe<ResponseCheckTx>;
    fromPartial(object: Partial<ResponseCheckTx>): ResponseCheckTx;
    fromProtoMsg(message: ResponseCheckTxProtoMsg): ResponseCheckTx;
    toProto(message: ResponseCheckTx): Uint8Array;
    toProtoMsg(message: ResponseCheckTx): ResponseCheckTxProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseCommit
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseCommit
 */
export declare const ResponseCommit: {
    typeUrl: "/tendermint.abci.ResponseCommit";
    is(o: any): o is ResponseCommit;
    isSDK(o: any): o is ResponseCommitSDKType;
    encode(message: ResponseCommit, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseCommit;
    fromJSON(object: any): ResponseCommit;
    toJSON(message: ResponseCommit): JsonSafe<ResponseCommit>;
    fromPartial(object: Partial<ResponseCommit>): ResponseCommit;
    fromProtoMsg(message: ResponseCommitProtoMsg): ResponseCommit;
    toProto(message: ResponseCommit): Uint8Array;
    toProtoMsg(message: ResponseCommit): ResponseCommitProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseListSnapshots
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseListSnapshots
 */
export declare const ResponseListSnapshots: {
    typeUrl: "/tendermint.abci.ResponseListSnapshots";
    is(o: any): o is ResponseListSnapshots;
    isSDK(o: any): o is ResponseListSnapshotsSDKType;
    encode(message: ResponseListSnapshots, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseListSnapshots;
    fromJSON(object: any): ResponseListSnapshots;
    toJSON(message: ResponseListSnapshots): JsonSafe<ResponseListSnapshots>;
    fromPartial(object: Partial<ResponseListSnapshots>): ResponseListSnapshots;
    fromProtoMsg(message: ResponseListSnapshotsProtoMsg): ResponseListSnapshots;
    toProto(message: ResponseListSnapshots): Uint8Array;
    toProtoMsg(message: ResponseListSnapshots): ResponseListSnapshotsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseOfferSnapshot
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseOfferSnapshot
 */
export declare const ResponseOfferSnapshot: {
    typeUrl: "/tendermint.abci.ResponseOfferSnapshot";
    is(o: any): o is ResponseOfferSnapshot;
    isSDK(o: any): o is ResponseOfferSnapshotSDKType;
    encode(message: ResponseOfferSnapshot, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseOfferSnapshot;
    fromJSON(object: any): ResponseOfferSnapshot;
    toJSON(message: ResponseOfferSnapshot): JsonSafe<ResponseOfferSnapshot>;
    fromPartial(object: Partial<ResponseOfferSnapshot>): ResponseOfferSnapshot;
    fromProtoMsg(message: ResponseOfferSnapshotProtoMsg): ResponseOfferSnapshot;
    toProto(message: ResponseOfferSnapshot): Uint8Array;
    toProtoMsg(message: ResponseOfferSnapshot): ResponseOfferSnapshotProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseLoadSnapshotChunk
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseLoadSnapshotChunk
 */
export declare const ResponseLoadSnapshotChunk: {
    typeUrl: "/tendermint.abci.ResponseLoadSnapshotChunk";
    is(o: any): o is ResponseLoadSnapshotChunk;
    isSDK(o: any): o is ResponseLoadSnapshotChunkSDKType;
    encode(message: ResponseLoadSnapshotChunk, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseLoadSnapshotChunk;
    fromJSON(object: any): ResponseLoadSnapshotChunk;
    toJSON(message: ResponseLoadSnapshotChunk): JsonSafe<ResponseLoadSnapshotChunk>;
    fromPartial(object: Partial<ResponseLoadSnapshotChunk>): ResponseLoadSnapshotChunk;
    fromProtoMsg(message: ResponseLoadSnapshotChunkProtoMsg): ResponseLoadSnapshotChunk;
    toProto(message: ResponseLoadSnapshotChunk): Uint8Array;
    toProtoMsg(message: ResponseLoadSnapshotChunk): ResponseLoadSnapshotChunkProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseApplySnapshotChunk
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseApplySnapshotChunk
 */
export declare const ResponseApplySnapshotChunk: {
    typeUrl: "/tendermint.abci.ResponseApplySnapshotChunk";
    is(o: any): o is ResponseApplySnapshotChunk;
    isSDK(o: any): o is ResponseApplySnapshotChunkSDKType;
    encode(message: ResponseApplySnapshotChunk, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseApplySnapshotChunk;
    fromJSON(object: any): ResponseApplySnapshotChunk;
    toJSON(message: ResponseApplySnapshotChunk): JsonSafe<ResponseApplySnapshotChunk>;
    fromPartial(object: Partial<ResponseApplySnapshotChunk>): ResponseApplySnapshotChunk;
    fromProtoMsg(message: ResponseApplySnapshotChunkProtoMsg): ResponseApplySnapshotChunk;
    toProto(message: ResponseApplySnapshotChunk): Uint8Array;
    toProtoMsg(message: ResponseApplySnapshotChunk): ResponseApplySnapshotChunkProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponsePrepareProposal
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponsePrepareProposal
 */
export declare const ResponsePrepareProposal: {
    typeUrl: "/tendermint.abci.ResponsePrepareProposal";
    is(o: any): o is ResponsePrepareProposal;
    isSDK(o: any): o is ResponsePrepareProposalSDKType;
    encode(message: ResponsePrepareProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponsePrepareProposal;
    fromJSON(object: any): ResponsePrepareProposal;
    toJSON(message: ResponsePrepareProposal): JsonSafe<ResponsePrepareProposal>;
    fromPartial(object: Partial<ResponsePrepareProposal>): ResponsePrepareProposal;
    fromProtoMsg(message: ResponsePrepareProposalProtoMsg): ResponsePrepareProposal;
    toProto(message: ResponsePrepareProposal): Uint8Array;
    toProtoMsg(message: ResponsePrepareProposal): ResponsePrepareProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseProcessProposal
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseProcessProposal
 */
export declare const ResponseProcessProposal: {
    typeUrl: "/tendermint.abci.ResponseProcessProposal";
    is(o: any): o is ResponseProcessProposal;
    isSDK(o: any): o is ResponseProcessProposalSDKType;
    encode(message: ResponseProcessProposal, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseProcessProposal;
    fromJSON(object: any): ResponseProcessProposal;
    toJSON(message: ResponseProcessProposal): JsonSafe<ResponseProcessProposal>;
    fromPartial(object: Partial<ResponseProcessProposal>): ResponseProcessProposal;
    fromProtoMsg(message: ResponseProcessProposalProtoMsg): ResponseProcessProposal;
    toProto(message: ResponseProcessProposal): Uint8Array;
    toProtoMsg(message: ResponseProcessProposal): ResponseProcessProposalProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseExtendVote
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseExtendVote
 */
export declare const ResponseExtendVote: {
    typeUrl: "/tendermint.abci.ResponseExtendVote";
    is(o: any): o is ResponseExtendVote;
    isSDK(o: any): o is ResponseExtendVoteSDKType;
    encode(message: ResponseExtendVote, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseExtendVote;
    fromJSON(object: any): ResponseExtendVote;
    toJSON(message: ResponseExtendVote): JsonSafe<ResponseExtendVote>;
    fromPartial(object: Partial<ResponseExtendVote>): ResponseExtendVote;
    fromProtoMsg(message: ResponseExtendVoteProtoMsg): ResponseExtendVote;
    toProto(message: ResponseExtendVote): Uint8Array;
    toProtoMsg(message: ResponseExtendVote): ResponseExtendVoteProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseVerifyVoteExtension
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseVerifyVoteExtension
 */
export declare const ResponseVerifyVoteExtension: {
    typeUrl: "/tendermint.abci.ResponseVerifyVoteExtension";
    is(o: any): o is ResponseVerifyVoteExtension;
    isSDK(o: any): o is ResponseVerifyVoteExtensionSDKType;
    encode(message: ResponseVerifyVoteExtension, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseVerifyVoteExtension;
    fromJSON(object: any): ResponseVerifyVoteExtension;
    toJSON(message: ResponseVerifyVoteExtension): JsonSafe<ResponseVerifyVoteExtension>;
    fromPartial(object: Partial<ResponseVerifyVoteExtension>): ResponseVerifyVoteExtension;
    fromProtoMsg(message: ResponseVerifyVoteExtensionProtoMsg): ResponseVerifyVoteExtension;
    toProto(message: ResponseVerifyVoteExtension): Uint8Array;
    toProtoMsg(message: ResponseVerifyVoteExtension): ResponseVerifyVoteExtensionProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ResponseFinalizeBlock
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ResponseFinalizeBlock
 */
export declare const ResponseFinalizeBlock: {
    typeUrl: "/tendermint.abci.ResponseFinalizeBlock";
    is(o: any): o is ResponseFinalizeBlock;
    isSDK(o: any): o is ResponseFinalizeBlockSDKType;
    encode(message: ResponseFinalizeBlock, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ResponseFinalizeBlock;
    fromJSON(object: any): ResponseFinalizeBlock;
    toJSON(message: ResponseFinalizeBlock): JsonSafe<ResponseFinalizeBlock>;
    fromPartial(object: Partial<ResponseFinalizeBlock>): ResponseFinalizeBlock;
    fromProtoMsg(message: ResponseFinalizeBlockProtoMsg): ResponseFinalizeBlock;
    toProto(message: ResponseFinalizeBlock): Uint8Array;
    toProtoMsg(message: ResponseFinalizeBlock): ResponseFinalizeBlockProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name CommitInfo
 * @package tendermint.abci
 * @see proto type: tendermint.abci.CommitInfo
 */
export declare const CommitInfo: {
    typeUrl: "/tendermint.abci.CommitInfo";
    is(o: any): o is CommitInfo;
    isSDK(o: any): o is CommitInfoSDKType;
    encode(message: CommitInfo, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): CommitInfo;
    fromJSON(object: any): CommitInfo;
    toJSON(message: CommitInfo): JsonSafe<CommitInfo>;
    fromPartial(object: Partial<CommitInfo>): CommitInfo;
    fromProtoMsg(message: CommitInfoProtoMsg): CommitInfo;
    toProto(message: CommitInfo): Uint8Array;
    toProtoMsg(message: CommitInfo): CommitInfoProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ExtendedCommitInfo is similar to CommitInfo except that it is only used in
 * the PrepareProposal request such that CometBFT can provide vote extensions
 * to the application.
 * @name ExtendedCommitInfo
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ExtendedCommitInfo
 */
export declare const ExtendedCommitInfo: {
    typeUrl: "/tendermint.abci.ExtendedCommitInfo";
    is(o: any): o is ExtendedCommitInfo;
    isSDK(o: any): o is ExtendedCommitInfoSDKType;
    encode(message: ExtendedCommitInfo, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ExtendedCommitInfo;
    fromJSON(object: any): ExtendedCommitInfo;
    toJSON(message: ExtendedCommitInfo): JsonSafe<ExtendedCommitInfo>;
    fromPartial(object: Partial<ExtendedCommitInfo>): ExtendedCommitInfo;
    fromProtoMsg(message: ExtendedCommitInfoProtoMsg): ExtendedCommitInfo;
    toProto(message: ExtendedCommitInfo): Uint8Array;
    toProtoMsg(message: ExtendedCommitInfo): ExtendedCommitInfoProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Event allows application developers to attach additional information to
 * ResponseFinalizeBlock and ResponseCheckTx.
 * Later, transactions may be queried using these events.
 * @name Event
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Event
 */
export declare const Event: {
    typeUrl: "/tendermint.abci.Event";
    is(o: any): o is Event;
    isSDK(o: any): o is EventSDKType;
    encode(message: Event, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Event;
    fromJSON(object: any): Event;
    toJSON(message: Event): JsonSafe<Event>;
    fromPartial(object: Partial<Event>): Event;
    fromProtoMsg(message: EventProtoMsg): Event;
    toProto(message: Event): Uint8Array;
    toProtoMsg(message: Event): EventProtoMsg;
    registerTypeUrl(): void;
};
/**
 * EventAttribute is a single key-value pair, associated with an event.
 * @name EventAttribute
 * @package tendermint.abci
 * @see proto type: tendermint.abci.EventAttribute
 */
export declare const EventAttribute: {
    typeUrl: "/tendermint.abci.EventAttribute";
    is(o: any): o is EventAttribute;
    isSDK(o: any): o is EventAttributeSDKType;
    encode(message: EventAttribute, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EventAttribute;
    fromJSON(object: any): EventAttribute;
    toJSON(message: EventAttribute): JsonSafe<EventAttribute>;
    fromPartial(object: Partial<EventAttribute>): EventAttribute;
    fromProtoMsg(message: EventAttributeProtoMsg): EventAttribute;
    toProto(message: EventAttribute): Uint8Array;
    toProtoMsg(message: EventAttribute): EventAttributeProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ExecTxResult contains results of executing one individual transaction.
 *
 * * Its structure is equivalent to #ResponseDeliverTx which will be deprecated/deleted
 * @name ExecTxResult
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ExecTxResult
 */
export declare const ExecTxResult: {
    typeUrl: "/tendermint.abci.ExecTxResult";
    is(o: any): o is ExecTxResult;
    isSDK(o: any): o is ExecTxResultSDKType;
    encode(message: ExecTxResult, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ExecTxResult;
    fromJSON(object: any): ExecTxResult;
    toJSON(message: ExecTxResult): JsonSafe<ExecTxResult>;
    fromPartial(object: Partial<ExecTxResult>): ExecTxResult;
    fromProtoMsg(message: ExecTxResultProtoMsg): ExecTxResult;
    toProto(message: ExecTxResult): Uint8Array;
    toProtoMsg(message: ExecTxResult): ExecTxResultProtoMsg;
    registerTypeUrl(): void;
};
/**
 * TxResult contains results of executing the transaction.
 *
 * One usage is indexing transaction results.
 * @name TxResult
 * @package tendermint.abci
 * @see proto type: tendermint.abci.TxResult
 */
export declare const TxResult: {
    typeUrl: "/tendermint.abci.TxResult";
    is(o: any): o is TxResult;
    isSDK(o: any): o is TxResultSDKType;
    encode(message: TxResult, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TxResult;
    fromJSON(object: any): TxResult;
    toJSON(message: TxResult): JsonSafe<TxResult>;
    fromPartial(object: Partial<TxResult>): TxResult;
    fromProtoMsg(message: TxResultProtoMsg): TxResult;
    toProto(message: TxResult): Uint8Array;
    toProtoMsg(message: TxResult): TxResultProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name Validator
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Validator
 */
export declare const Validator: {
    typeUrl: "/tendermint.abci.Validator";
    is(o: any): o is Validator;
    isSDK(o: any): o is ValidatorSDKType;
    encode(message: Validator, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Validator;
    fromJSON(object: any): Validator;
    toJSON(message: Validator): JsonSafe<Validator>;
    fromPartial(object: Partial<Validator>): Validator;
    fromProtoMsg(message: ValidatorProtoMsg): Validator;
    toProto(message: Validator): Uint8Array;
    toProtoMsg(message: Validator): ValidatorProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ValidatorUpdate
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ValidatorUpdate
 */
export declare const ValidatorUpdate: {
    typeUrl: "/tendermint.abci.ValidatorUpdate";
    is(o: any): o is ValidatorUpdate;
    isSDK(o: any): o is ValidatorUpdateSDKType;
    encode(message: ValidatorUpdate, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ValidatorUpdate;
    fromJSON(object: any): ValidatorUpdate;
    toJSON(message: ValidatorUpdate): JsonSafe<ValidatorUpdate>;
    fromPartial(object: Partial<ValidatorUpdate>): ValidatorUpdate;
    fromProtoMsg(message: ValidatorUpdateProtoMsg): ValidatorUpdate;
    toProto(message: ValidatorUpdate): Uint8Array;
    toProtoMsg(message: ValidatorUpdate): ValidatorUpdateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name VoteInfo
 * @package tendermint.abci
 * @see proto type: tendermint.abci.VoteInfo
 */
export declare const VoteInfo: {
    typeUrl: "/tendermint.abci.VoteInfo";
    is(o: any): o is VoteInfo;
    isSDK(o: any): o is VoteInfoSDKType;
    encode(message: VoteInfo, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): VoteInfo;
    fromJSON(object: any): VoteInfo;
    toJSON(message: VoteInfo): JsonSafe<VoteInfo>;
    fromPartial(object: Partial<VoteInfo>): VoteInfo;
    fromProtoMsg(message: VoteInfoProtoMsg): VoteInfo;
    toProto(message: VoteInfo): Uint8Array;
    toProtoMsg(message: VoteInfo): VoteInfoProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ExtendedVoteInfo
 * @package tendermint.abci
 * @see proto type: tendermint.abci.ExtendedVoteInfo
 */
export declare const ExtendedVoteInfo: {
    typeUrl: "/tendermint.abci.ExtendedVoteInfo";
    is(o: any): o is ExtendedVoteInfo;
    isSDK(o: any): o is ExtendedVoteInfoSDKType;
    encode(message: ExtendedVoteInfo, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ExtendedVoteInfo;
    fromJSON(object: any): ExtendedVoteInfo;
    toJSON(message: ExtendedVoteInfo): JsonSafe<ExtendedVoteInfo>;
    fromPartial(object: Partial<ExtendedVoteInfo>): ExtendedVoteInfo;
    fromProtoMsg(message: ExtendedVoteInfoProtoMsg): ExtendedVoteInfo;
    toProto(message: ExtendedVoteInfo): Uint8Array;
    toProtoMsg(message: ExtendedVoteInfo): ExtendedVoteInfoProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name Misbehavior
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Misbehavior
 */
export declare const Misbehavior: {
    typeUrl: "/tendermint.abci.Misbehavior";
    is(o: any): o is Misbehavior;
    isSDK(o: any): o is MisbehaviorSDKType;
    encode(message: Misbehavior, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Misbehavior;
    fromJSON(object: any): Misbehavior;
    toJSON(message: Misbehavior): JsonSafe<Misbehavior>;
    fromPartial(object: Partial<Misbehavior>): Misbehavior;
    fromProtoMsg(message: MisbehaviorProtoMsg): Misbehavior;
    toProto(message: Misbehavior): Uint8Array;
    toProtoMsg(message: Misbehavior): MisbehaviorProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name Snapshot
 * @package tendermint.abci
 * @see proto type: tendermint.abci.Snapshot
 */
export declare const Snapshot: {
    typeUrl: "/tendermint.abci.Snapshot";
    is(o: any): o is Snapshot;
    isSDK(o: any): o is SnapshotSDKType;
    encode(message: Snapshot, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Snapshot;
    fromJSON(object: any): Snapshot;
    toJSON(message: Snapshot): JsonSafe<Snapshot>;
    fromPartial(object: Partial<Snapshot>): Snapshot;
    fromProtoMsg(message: SnapshotProtoMsg): Snapshot;
    toProto(message: Snapshot): Uint8Array;
    toProtoMsg(message: Snapshot): SnapshotProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=types.d.ts.map