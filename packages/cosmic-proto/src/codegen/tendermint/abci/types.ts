//@ts-nocheck
import {
  Timestamp,
  type TimestampSDKType,
} from '../../google/protobuf/timestamp.js';
import {
  ConsensusParams,
  type ConsensusParamsSDKType,
} from '../types/params.js';
import { ProofOps, type ProofOpsSDKType } from '../crypto/proof.js';
import { PublicKey, type PublicKeySDKType } from '../crypto/keys.js';
import {
  BlockIDFlag,
  blockIDFlagFromJSON,
  blockIDFlagToJSON,
} from '../types/validator.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet, fromJsonTimestamp, fromTimestamp } from '../../helpers.js';
import { type JsonSafe } from '../../json-safe.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
export enum CheckTxType {
  NEW = 0,
  RECHECK = 1,
  UNRECOGNIZED = -1,
}
export const CheckTxTypeSDKType = CheckTxType;
export function checkTxTypeFromJSON(object: any): CheckTxType {
  switch (object) {
    case 0:
    case 'NEW':
      return CheckTxType.NEW;
    case 1:
    case 'RECHECK':
      return CheckTxType.RECHECK;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return CheckTxType.UNRECOGNIZED;
  }
}
export function checkTxTypeToJSON(object: CheckTxType): string {
  switch (object) {
    case CheckTxType.NEW:
      return 'NEW';
    case CheckTxType.RECHECK:
      return 'RECHECK';
    case CheckTxType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
export enum ResponseOfferSnapshot_Result {
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
  UNRECOGNIZED = -1,
}
export const ResponseOfferSnapshot_ResultSDKType = ResponseOfferSnapshot_Result;
export function responseOfferSnapshot_ResultFromJSON(
  object: any,
): ResponseOfferSnapshot_Result {
  switch (object) {
    case 0:
    case 'UNKNOWN':
      return ResponseOfferSnapshot_Result.UNKNOWN;
    case 1:
    case 'ACCEPT':
      return ResponseOfferSnapshot_Result.ACCEPT;
    case 2:
    case 'ABORT':
      return ResponseOfferSnapshot_Result.ABORT;
    case 3:
    case 'REJECT':
      return ResponseOfferSnapshot_Result.REJECT;
    case 4:
    case 'REJECT_FORMAT':
      return ResponseOfferSnapshot_Result.REJECT_FORMAT;
    case 5:
    case 'REJECT_SENDER':
      return ResponseOfferSnapshot_Result.REJECT_SENDER;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return ResponseOfferSnapshot_Result.UNRECOGNIZED;
  }
}
export function responseOfferSnapshot_ResultToJSON(
  object: ResponseOfferSnapshot_Result,
): string {
  switch (object) {
    case ResponseOfferSnapshot_Result.UNKNOWN:
      return 'UNKNOWN';
    case ResponseOfferSnapshot_Result.ACCEPT:
      return 'ACCEPT';
    case ResponseOfferSnapshot_Result.ABORT:
      return 'ABORT';
    case ResponseOfferSnapshot_Result.REJECT:
      return 'REJECT';
    case ResponseOfferSnapshot_Result.REJECT_FORMAT:
      return 'REJECT_FORMAT';
    case ResponseOfferSnapshot_Result.REJECT_SENDER:
      return 'REJECT_SENDER';
    case ResponseOfferSnapshot_Result.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
export enum ResponseApplySnapshotChunk_Result {
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
  UNRECOGNIZED = -1,
}
export const ResponseApplySnapshotChunk_ResultSDKType =
  ResponseApplySnapshotChunk_Result;
export function responseApplySnapshotChunk_ResultFromJSON(
  object: any,
): ResponseApplySnapshotChunk_Result {
  switch (object) {
    case 0:
    case 'UNKNOWN':
      return ResponseApplySnapshotChunk_Result.UNKNOWN;
    case 1:
    case 'ACCEPT':
      return ResponseApplySnapshotChunk_Result.ACCEPT;
    case 2:
    case 'ABORT':
      return ResponseApplySnapshotChunk_Result.ABORT;
    case 3:
    case 'RETRY':
      return ResponseApplySnapshotChunk_Result.RETRY;
    case 4:
    case 'RETRY_SNAPSHOT':
      return ResponseApplySnapshotChunk_Result.RETRY_SNAPSHOT;
    case 5:
    case 'REJECT_SNAPSHOT':
      return ResponseApplySnapshotChunk_Result.REJECT_SNAPSHOT;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return ResponseApplySnapshotChunk_Result.UNRECOGNIZED;
  }
}
export function responseApplySnapshotChunk_ResultToJSON(
  object: ResponseApplySnapshotChunk_Result,
): string {
  switch (object) {
    case ResponseApplySnapshotChunk_Result.UNKNOWN:
      return 'UNKNOWN';
    case ResponseApplySnapshotChunk_Result.ACCEPT:
      return 'ACCEPT';
    case ResponseApplySnapshotChunk_Result.ABORT:
      return 'ABORT';
    case ResponseApplySnapshotChunk_Result.RETRY:
      return 'RETRY';
    case ResponseApplySnapshotChunk_Result.RETRY_SNAPSHOT:
      return 'RETRY_SNAPSHOT';
    case ResponseApplySnapshotChunk_Result.REJECT_SNAPSHOT:
      return 'REJECT_SNAPSHOT';
    case ResponseApplySnapshotChunk_Result.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
export enum ResponseProcessProposal_ProposalStatus {
  UNKNOWN = 0,
  ACCEPT = 1,
  REJECT = 2,
  UNRECOGNIZED = -1,
}
export const ResponseProcessProposal_ProposalStatusSDKType =
  ResponseProcessProposal_ProposalStatus;
export function responseProcessProposal_ProposalStatusFromJSON(
  object: any,
): ResponseProcessProposal_ProposalStatus {
  switch (object) {
    case 0:
    case 'UNKNOWN':
      return ResponseProcessProposal_ProposalStatus.UNKNOWN;
    case 1:
    case 'ACCEPT':
      return ResponseProcessProposal_ProposalStatus.ACCEPT;
    case 2:
    case 'REJECT':
      return ResponseProcessProposal_ProposalStatus.REJECT;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return ResponseProcessProposal_ProposalStatus.UNRECOGNIZED;
  }
}
export function responseProcessProposal_ProposalStatusToJSON(
  object: ResponseProcessProposal_ProposalStatus,
): string {
  switch (object) {
    case ResponseProcessProposal_ProposalStatus.UNKNOWN:
      return 'UNKNOWN';
    case ResponseProcessProposal_ProposalStatus.ACCEPT:
      return 'ACCEPT';
    case ResponseProcessProposal_ProposalStatus.REJECT:
      return 'REJECT';
    case ResponseProcessProposal_ProposalStatus.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
export enum ResponseVerifyVoteExtension_VerifyStatus {
  UNKNOWN = 0,
  ACCEPT = 1,
  /**
   * REJECT - Rejecting the vote extension will reject the entire precommit by the sender.
   * Incorrectly implementing this thus has liveness implications as it may affect
   * CometBFT's ability to receive 2/3+ valid votes to finalize the block.
   * Honest nodes should never be rejected.
   */
  REJECT = 2,
  UNRECOGNIZED = -1,
}
export const ResponseVerifyVoteExtension_VerifyStatusSDKType =
  ResponseVerifyVoteExtension_VerifyStatus;
export function responseVerifyVoteExtension_VerifyStatusFromJSON(
  object: any,
): ResponseVerifyVoteExtension_VerifyStatus {
  switch (object) {
    case 0:
    case 'UNKNOWN':
      return ResponseVerifyVoteExtension_VerifyStatus.UNKNOWN;
    case 1:
    case 'ACCEPT':
      return ResponseVerifyVoteExtension_VerifyStatus.ACCEPT;
    case 2:
    case 'REJECT':
      return ResponseVerifyVoteExtension_VerifyStatus.REJECT;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return ResponseVerifyVoteExtension_VerifyStatus.UNRECOGNIZED;
  }
}
export function responseVerifyVoteExtension_VerifyStatusToJSON(
  object: ResponseVerifyVoteExtension_VerifyStatus,
): string {
  switch (object) {
    case ResponseVerifyVoteExtension_VerifyStatus.UNKNOWN:
      return 'UNKNOWN';
    case ResponseVerifyVoteExtension_VerifyStatus.ACCEPT:
      return 'ACCEPT';
    case ResponseVerifyVoteExtension_VerifyStatus.REJECT:
      return 'REJECT';
    case ResponseVerifyVoteExtension_VerifyStatus.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
export enum MisbehaviorType {
  UNKNOWN = 0,
  DUPLICATE_VOTE = 1,
  LIGHT_CLIENT_ATTACK = 2,
  UNRECOGNIZED = -1,
}
export const MisbehaviorTypeSDKType = MisbehaviorType;
export function misbehaviorTypeFromJSON(object: any): MisbehaviorType {
  switch (object) {
    case 0:
    case 'UNKNOWN':
      return MisbehaviorType.UNKNOWN;
    case 1:
    case 'DUPLICATE_VOTE':
      return MisbehaviorType.DUPLICATE_VOTE;
    case 2:
    case 'LIGHT_CLIENT_ATTACK':
      return MisbehaviorType.LIGHT_CLIENT_ATTACK;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return MisbehaviorType.UNRECOGNIZED;
  }
}
export function misbehaviorTypeToJSON(object: MisbehaviorType): string {
  switch (object) {
    case MisbehaviorType.UNKNOWN:
      return 'UNKNOWN';
    case MisbehaviorType.DUPLICATE_VOTE:
      return 'DUPLICATE_VOTE';
    case MisbehaviorType.LIGHT_CLIENT_ATTACK:
      return 'LIGHT_CLIENT_ATTACK';
    case MisbehaviorType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
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
export interface RequestEcho {
  message: string;
}
export interface RequestEchoProtoMsg {
  typeUrl: '/tendermint.abci.RequestEcho';
  value: Uint8Array;
}
export interface RequestEchoSDKType {
  message: string;
}
export interface RequestFlush {}
export interface RequestFlushProtoMsg {
  typeUrl: '/tendermint.abci.RequestFlush';
  value: Uint8Array;
}
export interface RequestFlushSDKType {}
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
export interface RequestInfoSDKType {
  version: string;
  block_version: bigint;
  p2p_version: bigint;
  abci_version: string;
}
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
export interface RequestInitChainSDKType {
  time: TimestampSDKType;
  chain_id: string;
  consensus_params?: ConsensusParamsSDKType;
  validators: ValidatorUpdateSDKType[];
  app_state_bytes: Uint8Array;
  initial_height: bigint;
}
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
export interface RequestQuerySDKType {
  data: Uint8Array;
  path: string;
  height: bigint;
  prove: boolean;
}
export interface RequestCheckTx {
  tx: Uint8Array;
  type: CheckTxType;
}
export interface RequestCheckTxProtoMsg {
  typeUrl: '/tendermint.abci.RequestCheckTx';
  value: Uint8Array;
}
export interface RequestCheckTxSDKType {
  tx: Uint8Array;
  type: CheckTxType;
}
export interface RequestCommit {}
export interface RequestCommitProtoMsg {
  typeUrl: '/tendermint.abci.RequestCommit';
  value: Uint8Array;
}
export interface RequestCommitSDKType {}
/** lists available snapshots */
export interface RequestListSnapshots {}
export interface RequestListSnapshotsProtoMsg {
  typeUrl: '/tendermint.abci.RequestListSnapshots';
  value: Uint8Array;
}
/** lists available snapshots */
export interface RequestListSnapshotsSDKType {}
/** offers a snapshot to the application */
export interface RequestOfferSnapshot {
  /** snapshot offered by peers */
  snapshot?: Snapshot;
  /** light client-verified app hash for snapshot height */
  appHash: Uint8Array;
}
export interface RequestOfferSnapshotProtoMsg {
  typeUrl: '/tendermint.abci.RequestOfferSnapshot';
  value: Uint8Array;
}
/** offers a snapshot to the application */
export interface RequestOfferSnapshotSDKType {
  snapshot?: SnapshotSDKType;
  app_hash: Uint8Array;
}
/** loads a snapshot chunk */
export interface RequestLoadSnapshotChunk {
  height: bigint;
  format: number;
  chunk: number;
}
export interface RequestLoadSnapshotChunkProtoMsg {
  typeUrl: '/tendermint.abci.RequestLoadSnapshotChunk';
  value: Uint8Array;
}
/** loads a snapshot chunk */
export interface RequestLoadSnapshotChunkSDKType {
  height: bigint;
  format: number;
  chunk: number;
}
/** Applies a snapshot chunk */
export interface RequestApplySnapshotChunk {
  index: number;
  chunk: Uint8Array;
  sender: string;
}
export interface RequestApplySnapshotChunkProtoMsg {
  typeUrl: '/tendermint.abci.RequestApplySnapshotChunk';
  value: Uint8Array;
}
/** Applies a snapshot chunk */
export interface RequestApplySnapshotChunkSDKType {
  index: number;
  chunk: Uint8Array;
  sender: string;
}
export interface RequestPrepareProposal {
  /** the modified transactions cannot exceed this size. */
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
  /** address of the public key of the validator proposing the block. */
  proposerAddress: Uint8Array;
}
export interface RequestPrepareProposalProtoMsg {
  typeUrl: '/tendermint.abci.RequestPrepareProposal';
  value: Uint8Array;
}
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
export interface RequestProcessProposal {
  txs: Uint8Array[];
  proposedLastCommit: CommitInfo;
  misbehavior: Misbehavior[];
  /** hash is the merkle root hash of the fields of the proposed block. */
  hash: Uint8Array;
  height: bigint;
  time: Timestamp;
  nextValidatorsHash: Uint8Array;
  /** address of the public key of the original proposer of the block. */
  proposerAddress: Uint8Array;
}
export interface RequestProcessProposalProtoMsg {
  typeUrl: '/tendermint.abci.RequestProcessProposal';
  value: Uint8Array;
}
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
/** Extends a vote with application-injected data */
export interface RequestExtendVote {
  /** the hash of the block that this vote may be referring to */
  hash: Uint8Array;
  /** the height of the extended vote */
  height: bigint;
  /** info of the block that this vote may be referring to */
  time: Timestamp;
  txs: Uint8Array[];
  proposedLastCommit: CommitInfo;
  misbehavior: Misbehavior[];
  nextValidatorsHash: Uint8Array;
  /** address of the public key of the original proposer of the block. */
  proposerAddress: Uint8Array;
}
export interface RequestExtendVoteProtoMsg {
  typeUrl: '/tendermint.abci.RequestExtendVote';
  value: Uint8Array;
}
/** Extends a vote with application-injected data */
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
/** Verify the vote extension */
export interface RequestVerifyVoteExtension {
  /** the hash of the block that this received vote corresponds to */
  hash: Uint8Array;
  /** the validator that signed the vote extension */
  validatorAddress: Uint8Array;
  height: bigint;
  voteExtension: Uint8Array;
}
export interface RequestVerifyVoteExtensionProtoMsg {
  typeUrl: '/tendermint.abci.RequestVerifyVoteExtension';
  value: Uint8Array;
}
/** Verify the vote extension */
export interface RequestVerifyVoteExtensionSDKType {
  hash: Uint8Array;
  validator_address: Uint8Array;
  height: bigint;
  vote_extension: Uint8Array;
}
export interface RequestFinalizeBlock {
  txs: Uint8Array[];
  decidedLastCommit: CommitInfo;
  misbehavior: Misbehavior[];
  /** hash is the merkle root hash of the fields of the decided block. */
  hash: Uint8Array;
  height: bigint;
  time: Timestamp;
  nextValidatorsHash: Uint8Array;
  /** proposer_address is the address of the public key of the original proposer of the block. */
  proposerAddress: Uint8Array;
}
export interface RequestFinalizeBlockProtoMsg {
  typeUrl: '/tendermint.abci.RequestFinalizeBlock';
  value: Uint8Array;
}
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
/** nondeterministic */
export interface ResponseException {
  error: string;
}
export interface ResponseExceptionProtoMsg {
  typeUrl: '/tendermint.abci.ResponseException';
  value: Uint8Array;
}
/** nondeterministic */
export interface ResponseExceptionSDKType {
  error: string;
}
export interface ResponseEcho {
  message: string;
}
export interface ResponseEchoProtoMsg {
  typeUrl: '/tendermint.abci.ResponseEcho';
  value: Uint8Array;
}
export interface ResponseEchoSDKType {
  message: string;
}
export interface ResponseFlush {}
export interface ResponseFlushProtoMsg {
  typeUrl: '/tendermint.abci.ResponseFlush';
  value: Uint8Array;
}
export interface ResponseFlushSDKType {}
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
export interface ResponseInfoSDKType {
  data: string;
  version: string;
  app_version: bigint;
  last_block_height: bigint;
  last_block_app_hash: Uint8Array;
}
export interface ResponseInitChain {
  consensusParams?: ConsensusParams;
  validators: ValidatorUpdate[];
  appHash: Uint8Array;
}
export interface ResponseInitChainProtoMsg {
  typeUrl: '/tendermint.abci.ResponseInitChain';
  value: Uint8Array;
}
export interface ResponseInitChainSDKType {
  consensus_params?: ConsensusParamsSDKType;
  validators: ValidatorUpdateSDKType[];
  app_hash: Uint8Array;
}
export interface ResponseQuery {
  code: number;
  /** bytes data = 2; // use "value" instead. */
  log: string;
  /** nondeterministic */
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
export interface ResponseCheckTx {
  code: number;
  data: Uint8Array;
  /** nondeterministic */
  log: string;
  /** nondeterministic */
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
export interface ResponseCommit {
  retainHeight: bigint;
}
export interface ResponseCommitProtoMsg {
  typeUrl: '/tendermint.abci.ResponseCommit';
  value: Uint8Array;
}
export interface ResponseCommitSDKType {
  retain_height: bigint;
}
export interface ResponseListSnapshots {
  snapshots: Snapshot[];
}
export interface ResponseListSnapshotsProtoMsg {
  typeUrl: '/tendermint.abci.ResponseListSnapshots';
  value: Uint8Array;
}
export interface ResponseListSnapshotsSDKType {
  snapshots: SnapshotSDKType[];
}
export interface ResponseOfferSnapshot {
  result: ResponseOfferSnapshot_Result;
}
export interface ResponseOfferSnapshotProtoMsg {
  typeUrl: '/tendermint.abci.ResponseOfferSnapshot';
  value: Uint8Array;
}
export interface ResponseOfferSnapshotSDKType {
  result: ResponseOfferSnapshot_Result;
}
export interface ResponseLoadSnapshotChunk {
  chunk: Uint8Array;
}
export interface ResponseLoadSnapshotChunkProtoMsg {
  typeUrl: '/tendermint.abci.ResponseLoadSnapshotChunk';
  value: Uint8Array;
}
export interface ResponseLoadSnapshotChunkSDKType {
  chunk: Uint8Array;
}
export interface ResponseApplySnapshotChunk {
  result: ResponseApplySnapshotChunk_Result;
  /** Chunks to refetch and reapply */
  refetchChunks: number[];
  /** Chunk senders to reject and ban */
  rejectSenders: string[];
}
export interface ResponseApplySnapshotChunkProtoMsg {
  typeUrl: '/tendermint.abci.ResponseApplySnapshotChunk';
  value: Uint8Array;
}
export interface ResponseApplySnapshotChunkSDKType {
  result: ResponseApplySnapshotChunk_Result;
  refetch_chunks: number[];
  reject_senders: string[];
}
export interface ResponsePrepareProposal {
  txs: Uint8Array[];
}
export interface ResponsePrepareProposalProtoMsg {
  typeUrl: '/tendermint.abci.ResponsePrepareProposal';
  value: Uint8Array;
}
export interface ResponsePrepareProposalSDKType {
  txs: Uint8Array[];
}
export interface ResponseProcessProposal {
  status: ResponseProcessProposal_ProposalStatus;
}
export interface ResponseProcessProposalProtoMsg {
  typeUrl: '/tendermint.abci.ResponseProcessProposal';
  value: Uint8Array;
}
export interface ResponseProcessProposalSDKType {
  status: ResponseProcessProposal_ProposalStatus;
}
export interface ResponseExtendVote {
  voteExtension: Uint8Array;
}
export interface ResponseExtendVoteProtoMsg {
  typeUrl: '/tendermint.abci.ResponseExtendVote';
  value: Uint8Array;
}
export interface ResponseExtendVoteSDKType {
  vote_extension: Uint8Array;
}
export interface ResponseVerifyVoteExtension {
  status: ResponseVerifyVoteExtension_VerifyStatus;
}
export interface ResponseVerifyVoteExtensionProtoMsg {
  typeUrl: '/tendermint.abci.ResponseVerifyVoteExtension';
  value: Uint8Array;
}
export interface ResponseVerifyVoteExtensionSDKType {
  status: ResponseVerifyVoteExtension_VerifyStatus;
}
export interface ResponseFinalizeBlock {
  /** set of block events emmitted as part of executing the block */
  events: Event[];
  /**
   * the result of executing each transaction including the events
   * the particular transction emitted. This should match the order
   * of the transactions delivered in the block itself
   */
  txResults: ExecTxResult[];
  /** a list of updates to the validator set. These will reflect the validator set at current height + 2. */
  validatorUpdates: ValidatorUpdate[];
  /** updates to the consensus params, if any. */
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
export interface ResponseFinalizeBlockSDKType {
  events: EventSDKType[];
  tx_results: ExecTxResultSDKType[];
  validator_updates: ValidatorUpdateSDKType[];
  consensus_param_updates?: ConsensusParamsSDKType;
  app_hash: Uint8Array;
}
export interface CommitInfo {
  round: number;
  votes: VoteInfo[];
}
export interface CommitInfoProtoMsg {
  typeUrl: '/tendermint.abci.CommitInfo';
  value: Uint8Array;
}
export interface CommitInfoSDKType {
  round: number;
  votes: VoteInfoSDKType[];
}
/**
 * ExtendedCommitInfo is similar to CommitInfo except that it is only used in
 * the PrepareProposal request such that CometBFT can provide vote extensions
 * to the application.
 */
export interface ExtendedCommitInfo {
  /** The round at which the block proposer decided in the previous height. */
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
 */
export interface ExtendedCommitInfoSDKType {
  round: number;
  votes: ExtendedVoteInfoSDKType[];
}
/**
 * Event allows application developers to attach additional information to
 * ResponseFinalizeBlock and ResponseCheckTx.
 * Later, transactions may be queried using these events.
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
 */
export interface EventSDKType {
  type: string;
  attributes: EventAttributeSDKType[];
}
/** EventAttribute is a single key-value pair, associated with an event. */
export interface EventAttribute {
  key: string;
  value: string;
  /** nondeterministic */
  index: boolean;
}
export interface EventAttributeProtoMsg {
  typeUrl: '/tendermint.abci.EventAttribute';
  value: Uint8Array;
}
/** EventAttribute is a single key-value pair, associated with an event. */
export interface EventAttributeSDKType {
  key: string;
  value: string;
  index: boolean;
}
/**
 * ExecTxResult contains results of executing one individual transaction.
 *
 * * Its structure is equivalent to #ResponseDeliverTx which will be deprecated/deleted
 */
export interface ExecTxResult {
  code: number;
  data: Uint8Array;
  /** nondeterministic */
  log: string;
  /** nondeterministic */
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
 */
export interface TxResultSDKType {
  height: bigint;
  index: number;
  tx: Uint8Array;
  result: ExecTxResultSDKType;
}
export interface Validator {
  /** The first 20 bytes of SHA256(public key) */
  address: Uint8Array;
  /** PubKey pub_key = 2 [(gogoproto.nullable)=false]; */
  power: bigint;
}
export interface ValidatorProtoMsg {
  typeUrl: '/tendermint.abci.Validator';
  value: Uint8Array;
}
export interface ValidatorSDKType {
  address: Uint8Array;
  power: bigint;
}
export interface ValidatorUpdate {
  pubKey: PublicKey;
  power: bigint;
}
export interface ValidatorUpdateProtoMsg {
  typeUrl: '/tendermint.abci.ValidatorUpdate';
  value: Uint8Array;
}
export interface ValidatorUpdateSDKType {
  pub_key: PublicKeySDKType;
  power: bigint;
}
export interface VoteInfo {
  validator: Validator;
  blockIdFlag: BlockIDFlag;
}
export interface VoteInfoProtoMsg {
  typeUrl: '/tendermint.abci.VoteInfo';
  value: Uint8Array;
}
export interface VoteInfoSDKType {
  validator: ValidatorSDKType;
  block_id_flag: BlockIDFlag;
}
export interface ExtendedVoteInfo {
  /** The validator that sent the vote. */
  validator: Validator;
  /** Non-deterministic extension provided by the sending validator's application. */
  voteExtension: Uint8Array;
  /** Vote extension signature created by CometBFT */
  extensionSignature: Uint8Array;
  /** block_id_flag indicates whether the validator voted for a block, nil, or did not vote at all */
  blockIdFlag: BlockIDFlag;
}
export interface ExtendedVoteInfoProtoMsg {
  typeUrl: '/tendermint.abci.ExtendedVoteInfo';
  value: Uint8Array;
}
export interface ExtendedVoteInfoSDKType {
  validator: ValidatorSDKType;
  vote_extension: Uint8Array;
  extension_signature: Uint8Array;
  block_id_flag: BlockIDFlag;
}
export interface Misbehavior {
  type: MisbehaviorType;
  /** The offending validator */
  validator: Validator;
  /** The height when the offense occurred */
  height: bigint;
  /** The corresponding time where the offense occurred */
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
export interface MisbehaviorSDKType {
  type: MisbehaviorType;
  validator: ValidatorSDKType;
  height: bigint;
  time: TimestampSDKType;
  total_voting_power: bigint;
}
export interface Snapshot {
  /** The height at which the snapshot was taken */
  height: bigint;
  /** The application-specific snapshot format */
  format: number;
  /** Number of chunks in the snapshot */
  chunks: number;
  /** Arbitrary snapshot hash, equal only if identical */
  hash: Uint8Array;
  /** Arbitrary application metadata */
  metadata: Uint8Array;
}
export interface SnapshotProtoMsg {
  typeUrl: '/tendermint.abci.Snapshot';
  value: Uint8Array;
}
export interface SnapshotSDKType {
  height: bigint;
  format: number;
  chunks: number;
  hash: Uint8Array;
  metadata: Uint8Array;
}
function createBaseRequest(): Request {
  return {
    echo: undefined,
    flush: undefined,
    info: undefined,
    initChain: undefined,
    query: undefined,
    checkTx: undefined,
    commit: undefined,
    listSnapshots: undefined,
    offerSnapshot: undefined,
    loadSnapshotChunk: undefined,
    applySnapshotChunk: undefined,
    prepareProposal: undefined,
    processProposal: undefined,
    extendVote: undefined,
    verifyVoteExtension: undefined,
    finalizeBlock: undefined,
  };
}
export const Request = {
  typeUrl: '/tendermint.abci.Request' as const,
  encode(
    message: Request,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.echo !== undefined) {
      RequestEcho.encode(message.echo, writer.uint32(10).fork()).ldelim();
    }
    if (message.flush !== undefined) {
      RequestFlush.encode(message.flush, writer.uint32(18).fork()).ldelim();
    }
    if (message.info !== undefined) {
      RequestInfo.encode(message.info, writer.uint32(26).fork()).ldelim();
    }
    if (message.initChain !== undefined) {
      RequestInitChain.encode(
        message.initChain,
        writer.uint32(42).fork(),
      ).ldelim();
    }
    if (message.query !== undefined) {
      RequestQuery.encode(message.query, writer.uint32(50).fork()).ldelim();
    }
    if (message.checkTx !== undefined) {
      RequestCheckTx.encode(message.checkTx, writer.uint32(66).fork()).ldelim();
    }
    if (message.commit !== undefined) {
      RequestCommit.encode(message.commit, writer.uint32(90).fork()).ldelim();
    }
    if (message.listSnapshots !== undefined) {
      RequestListSnapshots.encode(
        message.listSnapshots,
        writer.uint32(98).fork(),
      ).ldelim();
    }
    if (message.offerSnapshot !== undefined) {
      RequestOfferSnapshot.encode(
        message.offerSnapshot,
        writer.uint32(106).fork(),
      ).ldelim();
    }
    if (message.loadSnapshotChunk !== undefined) {
      RequestLoadSnapshotChunk.encode(
        message.loadSnapshotChunk,
        writer.uint32(114).fork(),
      ).ldelim();
    }
    if (message.applySnapshotChunk !== undefined) {
      RequestApplySnapshotChunk.encode(
        message.applySnapshotChunk,
        writer.uint32(122).fork(),
      ).ldelim();
    }
    if (message.prepareProposal !== undefined) {
      RequestPrepareProposal.encode(
        message.prepareProposal,
        writer.uint32(130).fork(),
      ).ldelim();
    }
    if (message.processProposal !== undefined) {
      RequestProcessProposal.encode(
        message.processProposal,
        writer.uint32(138).fork(),
      ).ldelim();
    }
    if (message.extendVote !== undefined) {
      RequestExtendVote.encode(
        message.extendVote,
        writer.uint32(146).fork(),
      ).ldelim();
    }
    if (message.verifyVoteExtension !== undefined) {
      RequestVerifyVoteExtension.encode(
        message.verifyVoteExtension,
        writer.uint32(154).fork(),
      ).ldelim();
    }
    if (message.finalizeBlock !== undefined) {
      RequestFinalizeBlock.encode(
        message.finalizeBlock,
        writer.uint32(162).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Request {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.echo = RequestEcho.decode(reader, reader.uint32());
          break;
        case 2:
          message.flush = RequestFlush.decode(reader, reader.uint32());
          break;
        case 3:
          message.info = RequestInfo.decode(reader, reader.uint32());
          break;
        case 5:
          message.initChain = RequestInitChain.decode(reader, reader.uint32());
          break;
        case 6:
          message.query = RequestQuery.decode(reader, reader.uint32());
          break;
        case 8:
          message.checkTx = RequestCheckTx.decode(reader, reader.uint32());
          break;
        case 11:
          message.commit = RequestCommit.decode(reader, reader.uint32());
          break;
        case 12:
          message.listSnapshots = RequestListSnapshots.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 13:
          message.offerSnapshot = RequestOfferSnapshot.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 14:
          message.loadSnapshotChunk = RequestLoadSnapshotChunk.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 15:
          message.applySnapshotChunk = RequestApplySnapshotChunk.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 16:
          message.prepareProposal = RequestPrepareProposal.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 17:
          message.processProposal = RequestProcessProposal.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 18:
          message.extendVote = RequestExtendVote.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 19:
          message.verifyVoteExtension = RequestVerifyVoteExtension.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 20:
          message.finalizeBlock = RequestFinalizeBlock.decode(
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
  fromJSON(object: any): Request {
    return {
      echo: isSet(object.echo) ? RequestEcho.fromJSON(object.echo) : undefined,
      flush: isSet(object.flush)
        ? RequestFlush.fromJSON(object.flush)
        : undefined,
      info: isSet(object.info) ? RequestInfo.fromJSON(object.info) : undefined,
      initChain: isSet(object.initChain)
        ? RequestInitChain.fromJSON(object.initChain)
        : undefined,
      query: isSet(object.query)
        ? RequestQuery.fromJSON(object.query)
        : undefined,
      checkTx: isSet(object.checkTx)
        ? RequestCheckTx.fromJSON(object.checkTx)
        : undefined,
      commit: isSet(object.commit)
        ? RequestCommit.fromJSON(object.commit)
        : undefined,
      listSnapshots: isSet(object.listSnapshots)
        ? RequestListSnapshots.fromJSON(object.listSnapshots)
        : undefined,
      offerSnapshot: isSet(object.offerSnapshot)
        ? RequestOfferSnapshot.fromJSON(object.offerSnapshot)
        : undefined,
      loadSnapshotChunk: isSet(object.loadSnapshotChunk)
        ? RequestLoadSnapshotChunk.fromJSON(object.loadSnapshotChunk)
        : undefined,
      applySnapshotChunk: isSet(object.applySnapshotChunk)
        ? RequestApplySnapshotChunk.fromJSON(object.applySnapshotChunk)
        : undefined,
      prepareProposal: isSet(object.prepareProposal)
        ? RequestPrepareProposal.fromJSON(object.prepareProposal)
        : undefined,
      processProposal: isSet(object.processProposal)
        ? RequestProcessProposal.fromJSON(object.processProposal)
        : undefined,
      extendVote: isSet(object.extendVote)
        ? RequestExtendVote.fromJSON(object.extendVote)
        : undefined,
      verifyVoteExtension: isSet(object.verifyVoteExtension)
        ? RequestVerifyVoteExtension.fromJSON(object.verifyVoteExtension)
        : undefined,
      finalizeBlock: isSet(object.finalizeBlock)
        ? RequestFinalizeBlock.fromJSON(object.finalizeBlock)
        : undefined,
    };
  },
  toJSON(message: Request): JsonSafe<Request> {
    const obj: any = {};
    message.echo !== undefined &&
      (obj.echo = message.echo ? RequestEcho.toJSON(message.echo) : undefined);
    message.flush !== undefined &&
      (obj.flush = message.flush
        ? RequestFlush.toJSON(message.flush)
        : undefined);
    message.info !== undefined &&
      (obj.info = message.info ? RequestInfo.toJSON(message.info) : undefined);
    message.initChain !== undefined &&
      (obj.initChain = message.initChain
        ? RequestInitChain.toJSON(message.initChain)
        : undefined);
    message.query !== undefined &&
      (obj.query = message.query
        ? RequestQuery.toJSON(message.query)
        : undefined);
    message.checkTx !== undefined &&
      (obj.checkTx = message.checkTx
        ? RequestCheckTx.toJSON(message.checkTx)
        : undefined);
    message.commit !== undefined &&
      (obj.commit = message.commit
        ? RequestCommit.toJSON(message.commit)
        : undefined);
    message.listSnapshots !== undefined &&
      (obj.listSnapshots = message.listSnapshots
        ? RequestListSnapshots.toJSON(message.listSnapshots)
        : undefined);
    message.offerSnapshot !== undefined &&
      (obj.offerSnapshot = message.offerSnapshot
        ? RequestOfferSnapshot.toJSON(message.offerSnapshot)
        : undefined);
    message.loadSnapshotChunk !== undefined &&
      (obj.loadSnapshotChunk = message.loadSnapshotChunk
        ? RequestLoadSnapshotChunk.toJSON(message.loadSnapshotChunk)
        : undefined);
    message.applySnapshotChunk !== undefined &&
      (obj.applySnapshotChunk = message.applySnapshotChunk
        ? RequestApplySnapshotChunk.toJSON(message.applySnapshotChunk)
        : undefined);
    message.prepareProposal !== undefined &&
      (obj.prepareProposal = message.prepareProposal
        ? RequestPrepareProposal.toJSON(message.prepareProposal)
        : undefined);
    message.processProposal !== undefined &&
      (obj.processProposal = message.processProposal
        ? RequestProcessProposal.toJSON(message.processProposal)
        : undefined);
    message.extendVote !== undefined &&
      (obj.extendVote = message.extendVote
        ? RequestExtendVote.toJSON(message.extendVote)
        : undefined);
    message.verifyVoteExtension !== undefined &&
      (obj.verifyVoteExtension = message.verifyVoteExtension
        ? RequestVerifyVoteExtension.toJSON(message.verifyVoteExtension)
        : undefined);
    message.finalizeBlock !== undefined &&
      (obj.finalizeBlock = message.finalizeBlock
        ? RequestFinalizeBlock.toJSON(message.finalizeBlock)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<Request>): Request {
    const message = createBaseRequest();
    message.echo =
      object.echo !== undefined && object.echo !== null
        ? RequestEcho.fromPartial(object.echo)
        : undefined;
    message.flush =
      object.flush !== undefined && object.flush !== null
        ? RequestFlush.fromPartial(object.flush)
        : undefined;
    message.info =
      object.info !== undefined && object.info !== null
        ? RequestInfo.fromPartial(object.info)
        : undefined;
    message.initChain =
      object.initChain !== undefined && object.initChain !== null
        ? RequestInitChain.fromPartial(object.initChain)
        : undefined;
    message.query =
      object.query !== undefined && object.query !== null
        ? RequestQuery.fromPartial(object.query)
        : undefined;
    message.checkTx =
      object.checkTx !== undefined && object.checkTx !== null
        ? RequestCheckTx.fromPartial(object.checkTx)
        : undefined;
    message.commit =
      object.commit !== undefined && object.commit !== null
        ? RequestCommit.fromPartial(object.commit)
        : undefined;
    message.listSnapshots =
      object.listSnapshots !== undefined && object.listSnapshots !== null
        ? RequestListSnapshots.fromPartial(object.listSnapshots)
        : undefined;
    message.offerSnapshot =
      object.offerSnapshot !== undefined && object.offerSnapshot !== null
        ? RequestOfferSnapshot.fromPartial(object.offerSnapshot)
        : undefined;
    message.loadSnapshotChunk =
      object.loadSnapshotChunk !== undefined &&
      object.loadSnapshotChunk !== null
        ? RequestLoadSnapshotChunk.fromPartial(object.loadSnapshotChunk)
        : undefined;
    message.applySnapshotChunk =
      object.applySnapshotChunk !== undefined &&
      object.applySnapshotChunk !== null
        ? RequestApplySnapshotChunk.fromPartial(object.applySnapshotChunk)
        : undefined;
    message.prepareProposal =
      object.prepareProposal !== undefined && object.prepareProposal !== null
        ? RequestPrepareProposal.fromPartial(object.prepareProposal)
        : undefined;
    message.processProposal =
      object.processProposal !== undefined && object.processProposal !== null
        ? RequestProcessProposal.fromPartial(object.processProposal)
        : undefined;
    message.extendVote =
      object.extendVote !== undefined && object.extendVote !== null
        ? RequestExtendVote.fromPartial(object.extendVote)
        : undefined;
    message.verifyVoteExtension =
      object.verifyVoteExtension !== undefined &&
      object.verifyVoteExtension !== null
        ? RequestVerifyVoteExtension.fromPartial(object.verifyVoteExtension)
        : undefined;
    message.finalizeBlock =
      object.finalizeBlock !== undefined && object.finalizeBlock !== null
        ? RequestFinalizeBlock.fromPartial(object.finalizeBlock)
        : undefined;
    return message;
  },
  fromProtoMsg(message: RequestProtoMsg): Request {
    return Request.decode(message.value);
  },
  toProto(message: Request): Uint8Array {
    return Request.encode(message).finish();
  },
  toProtoMsg(message: Request): RequestProtoMsg {
    return {
      typeUrl: '/tendermint.abci.Request',
      value: Request.encode(message).finish(),
    };
  },
};
function createBaseRequestEcho(): RequestEcho {
  return {
    message: '',
  };
}
export const RequestEcho = {
  typeUrl: '/tendermint.abci.RequestEcho' as const,
  encode(
    message: RequestEcho,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.message !== '') {
      writer.uint32(10).string(message.message);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): RequestEcho {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestEcho();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.message = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RequestEcho {
    return {
      message: isSet(object.message) ? String(object.message) : '',
    };
  },
  toJSON(message: RequestEcho): JsonSafe<RequestEcho> {
    const obj: any = {};
    message.message !== undefined && (obj.message = message.message);
    return obj;
  },
  fromPartial(object: Partial<RequestEcho>): RequestEcho {
    const message = createBaseRequestEcho();
    message.message = object.message ?? '';
    return message;
  },
  fromProtoMsg(message: RequestEchoProtoMsg): RequestEcho {
    return RequestEcho.decode(message.value);
  },
  toProto(message: RequestEcho): Uint8Array {
    return RequestEcho.encode(message).finish();
  },
  toProtoMsg(message: RequestEcho): RequestEchoProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestEcho',
      value: RequestEcho.encode(message).finish(),
    };
  },
};
function createBaseRequestFlush(): RequestFlush {
  return {};
}
export const RequestFlush = {
  typeUrl: '/tendermint.abci.RequestFlush' as const,
  encode(
    _: RequestFlush,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): RequestFlush {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestFlush();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): RequestFlush {
    return {};
  },
  toJSON(_: RequestFlush): JsonSafe<RequestFlush> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<RequestFlush>): RequestFlush {
    const message = createBaseRequestFlush();
    return message;
  },
  fromProtoMsg(message: RequestFlushProtoMsg): RequestFlush {
    return RequestFlush.decode(message.value);
  },
  toProto(message: RequestFlush): Uint8Array {
    return RequestFlush.encode(message).finish();
  },
  toProtoMsg(message: RequestFlush): RequestFlushProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestFlush',
      value: RequestFlush.encode(message).finish(),
    };
  },
};
function createBaseRequestInfo(): RequestInfo {
  return {
    version: '',
    blockVersion: BigInt(0),
    p2pVersion: BigInt(0),
    abciVersion: '',
  };
}
export const RequestInfo = {
  typeUrl: '/tendermint.abci.RequestInfo' as const,
  encode(
    message: RequestInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.version !== '') {
      writer.uint32(10).string(message.version);
    }
    if (message.blockVersion !== BigInt(0)) {
      writer.uint32(16).uint64(message.blockVersion);
    }
    if (message.p2pVersion !== BigInt(0)) {
      writer.uint32(24).uint64(message.p2pVersion);
    }
    if (message.abciVersion !== '') {
      writer.uint32(34).string(message.abciVersion);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): RequestInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.version = reader.string();
          break;
        case 2:
          message.blockVersion = reader.uint64();
          break;
        case 3:
          message.p2pVersion = reader.uint64();
          break;
        case 4:
          message.abciVersion = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RequestInfo {
    return {
      version: isSet(object.version) ? String(object.version) : '',
      blockVersion: isSet(object.blockVersion)
        ? BigInt(object.blockVersion.toString())
        : BigInt(0),
      p2pVersion: isSet(object.p2pVersion)
        ? BigInt(object.p2pVersion.toString())
        : BigInt(0),
      abciVersion: isSet(object.abciVersion) ? String(object.abciVersion) : '',
    };
  },
  toJSON(message: RequestInfo): JsonSafe<RequestInfo> {
    const obj: any = {};
    message.version !== undefined && (obj.version = message.version);
    message.blockVersion !== undefined &&
      (obj.blockVersion = (message.blockVersion || BigInt(0)).toString());
    message.p2pVersion !== undefined &&
      (obj.p2pVersion = (message.p2pVersion || BigInt(0)).toString());
    message.abciVersion !== undefined &&
      (obj.abciVersion = message.abciVersion);
    return obj;
  },
  fromPartial(object: Partial<RequestInfo>): RequestInfo {
    const message = createBaseRequestInfo();
    message.version = object.version ?? '';
    message.blockVersion =
      object.blockVersion !== undefined && object.blockVersion !== null
        ? BigInt(object.blockVersion.toString())
        : BigInt(0);
    message.p2pVersion =
      object.p2pVersion !== undefined && object.p2pVersion !== null
        ? BigInt(object.p2pVersion.toString())
        : BigInt(0);
    message.abciVersion = object.abciVersion ?? '';
    return message;
  },
  fromProtoMsg(message: RequestInfoProtoMsg): RequestInfo {
    return RequestInfo.decode(message.value);
  },
  toProto(message: RequestInfo): Uint8Array {
    return RequestInfo.encode(message).finish();
  },
  toProtoMsg(message: RequestInfo): RequestInfoProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestInfo',
      value: RequestInfo.encode(message).finish(),
    };
  },
};
function createBaseRequestInitChain(): RequestInitChain {
  return {
    time: Timestamp.fromPartial({}),
    chainId: '',
    consensusParams: undefined,
    validators: [],
    appStateBytes: new Uint8Array(),
    initialHeight: BigInt(0),
  };
}
export const RequestInitChain = {
  typeUrl: '/tendermint.abci.RequestInitChain' as const,
  encode(
    message: RequestInitChain,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.time !== undefined) {
      Timestamp.encode(message.time, writer.uint32(10).fork()).ldelim();
    }
    if (message.chainId !== '') {
      writer.uint32(18).string(message.chainId);
    }
    if (message.consensusParams !== undefined) {
      ConsensusParams.encode(
        message.consensusParams,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    for (const v of message.validators) {
      ValidatorUpdate.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    if (message.appStateBytes.length !== 0) {
      writer.uint32(42).bytes(message.appStateBytes);
    }
    if (message.initialHeight !== BigInt(0)) {
      writer.uint32(48).int64(message.initialHeight);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): RequestInitChain {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestInitChain();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.time = Timestamp.decode(reader, reader.uint32());
          break;
        case 2:
          message.chainId = reader.string();
          break;
        case 3:
          message.consensusParams = ConsensusParams.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 4:
          message.validators.push(
            ValidatorUpdate.decode(reader, reader.uint32()),
          );
          break;
        case 5:
          message.appStateBytes = reader.bytes();
          break;
        case 6:
          message.initialHeight = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RequestInitChain {
    return {
      time: isSet(object.time) ? fromJsonTimestamp(object.time) : undefined,
      chainId: isSet(object.chainId) ? String(object.chainId) : '',
      consensusParams: isSet(object.consensusParams)
        ? ConsensusParams.fromJSON(object.consensusParams)
        : undefined,
      validators: Array.isArray(object?.validators)
        ? object.validators.map((e: any) => ValidatorUpdate.fromJSON(e))
        : [],
      appStateBytes: isSet(object.appStateBytes)
        ? bytesFromBase64(object.appStateBytes)
        : new Uint8Array(),
      initialHeight: isSet(object.initialHeight)
        ? BigInt(object.initialHeight.toString())
        : BigInt(0),
    };
  },
  toJSON(message: RequestInitChain): JsonSafe<RequestInitChain> {
    const obj: any = {};
    message.time !== undefined &&
      (obj.time = fromTimestamp(message.time).toISOString());
    message.chainId !== undefined && (obj.chainId = message.chainId);
    message.consensusParams !== undefined &&
      (obj.consensusParams = message.consensusParams
        ? ConsensusParams.toJSON(message.consensusParams)
        : undefined);
    if (message.validators) {
      obj.validators = message.validators.map(e =>
        e ? ValidatorUpdate.toJSON(e) : undefined,
      );
    } else {
      obj.validators = [];
    }
    message.appStateBytes !== undefined &&
      (obj.appStateBytes = base64FromBytes(
        message.appStateBytes !== undefined
          ? message.appStateBytes
          : new Uint8Array(),
      ));
    message.initialHeight !== undefined &&
      (obj.initialHeight = (message.initialHeight || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<RequestInitChain>): RequestInitChain {
    const message = createBaseRequestInitChain();
    message.time =
      object.time !== undefined && object.time !== null
        ? Timestamp.fromPartial(object.time)
        : undefined;
    message.chainId = object.chainId ?? '';
    message.consensusParams =
      object.consensusParams !== undefined && object.consensusParams !== null
        ? ConsensusParams.fromPartial(object.consensusParams)
        : undefined;
    message.validators =
      object.validators?.map(e => ValidatorUpdate.fromPartial(e)) || [];
    message.appStateBytes = object.appStateBytes ?? new Uint8Array();
    message.initialHeight =
      object.initialHeight !== undefined && object.initialHeight !== null
        ? BigInt(object.initialHeight.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: RequestInitChainProtoMsg): RequestInitChain {
    return RequestInitChain.decode(message.value);
  },
  toProto(message: RequestInitChain): Uint8Array {
    return RequestInitChain.encode(message).finish();
  },
  toProtoMsg(message: RequestInitChain): RequestInitChainProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestInitChain',
      value: RequestInitChain.encode(message).finish(),
    };
  },
};
function createBaseRequestQuery(): RequestQuery {
  return {
    data: new Uint8Array(),
    path: '',
    height: BigInt(0),
    prove: false,
  };
}
export const RequestQuery = {
  typeUrl: '/tendermint.abci.RequestQuery' as const,
  encode(
    message: RequestQuery,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.data.length !== 0) {
      writer.uint32(10).bytes(message.data);
    }
    if (message.path !== '') {
      writer.uint32(18).string(message.path);
    }
    if (message.height !== BigInt(0)) {
      writer.uint32(24).int64(message.height);
    }
    if (message.prove === true) {
      writer.uint32(32).bool(message.prove);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): RequestQuery {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestQuery();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.data = reader.bytes();
          break;
        case 2:
          message.path = reader.string();
          break;
        case 3:
          message.height = reader.int64();
          break;
        case 4:
          message.prove = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RequestQuery {
    return {
      data: isSet(object.data)
        ? bytesFromBase64(object.data)
        : new Uint8Array(),
      path: isSet(object.path) ? String(object.path) : '',
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
      prove: isSet(object.prove) ? Boolean(object.prove) : false,
    };
  },
  toJSON(message: RequestQuery): JsonSafe<RequestQuery> {
    const obj: any = {};
    message.data !== undefined &&
      (obj.data = base64FromBytes(
        message.data !== undefined ? message.data : new Uint8Array(),
      ));
    message.path !== undefined && (obj.path = message.path);
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    message.prove !== undefined && (obj.prove = message.prove);
    return obj;
  },
  fromPartial(object: Partial<RequestQuery>): RequestQuery {
    const message = createBaseRequestQuery();
    message.data = object.data ?? new Uint8Array();
    message.path = object.path ?? '';
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    message.prove = object.prove ?? false;
    return message;
  },
  fromProtoMsg(message: RequestQueryProtoMsg): RequestQuery {
    return RequestQuery.decode(message.value);
  },
  toProto(message: RequestQuery): Uint8Array {
    return RequestQuery.encode(message).finish();
  },
  toProtoMsg(message: RequestQuery): RequestQueryProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestQuery',
      value: RequestQuery.encode(message).finish(),
    };
  },
};
function createBaseRequestCheckTx(): RequestCheckTx {
  return {
    tx: new Uint8Array(),
    type: 0,
  };
}
export const RequestCheckTx = {
  typeUrl: '/tendermint.abci.RequestCheckTx' as const,
  encode(
    message: RequestCheckTx,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.tx.length !== 0) {
      writer.uint32(10).bytes(message.tx);
    }
    if (message.type !== 0) {
      writer.uint32(16).int32(message.type);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): RequestCheckTx {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestCheckTx();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.tx = reader.bytes();
          break;
        case 2:
          message.type = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RequestCheckTx {
    return {
      tx: isSet(object.tx) ? bytesFromBase64(object.tx) : new Uint8Array(),
      type: isSet(object.type) ? checkTxTypeFromJSON(object.type) : -1,
    };
  },
  toJSON(message: RequestCheckTx): JsonSafe<RequestCheckTx> {
    const obj: any = {};
    message.tx !== undefined &&
      (obj.tx = base64FromBytes(
        message.tx !== undefined ? message.tx : new Uint8Array(),
      ));
    message.type !== undefined && (obj.type = checkTxTypeToJSON(message.type));
    return obj;
  },
  fromPartial(object: Partial<RequestCheckTx>): RequestCheckTx {
    const message = createBaseRequestCheckTx();
    message.tx = object.tx ?? new Uint8Array();
    message.type = object.type ?? 0;
    return message;
  },
  fromProtoMsg(message: RequestCheckTxProtoMsg): RequestCheckTx {
    return RequestCheckTx.decode(message.value);
  },
  toProto(message: RequestCheckTx): Uint8Array {
    return RequestCheckTx.encode(message).finish();
  },
  toProtoMsg(message: RequestCheckTx): RequestCheckTxProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestCheckTx',
      value: RequestCheckTx.encode(message).finish(),
    };
  },
};
function createBaseRequestCommit(): RequestCommit {
  return {};
}
export const RequestCommit = {
  typeUrl: '/tendermint.abci.RequestCommit' as const,
  encode(
    _: RequestCommit,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): RequestCommit {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestCommit();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): RequestCommit {
    return {};
  },
  toJSON(_: RequestCommit): JsonSafe<RequestCommit> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<RequestCommit>): RequestCommit {
    const message = createBaseRequestCommit();
    return message;
  },
  fromProtoMsg(message: RequestCommitProtoMsg): RequestCommit {
    return RequestCommit.decode(message.value);
  },
  toProto(message: RequestCommit): Uint8Array {
    return RequestCommit.encode(message).finish();
  },
  toProtoMsg(message: RequestCommit): RequestCommitProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestCommit',
      value: RequestCommit.encode(message).finish(),
    };
  },
};
function createBaseRequestListSnapshots(): RequestListSnapshots {
  return {};
}
export const RequestListSnapshots = {
  typeUrl: '/tendermint.abci.RequestListSnapshots' as const,
  encode(
    _: RequestListSnapshots,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RequestListSnapshots {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestListSnapshots();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): RequestListSnapshots {
    return {};
  },
  toJSON(_: RequestListSnapshots): JsonSafe<RequestListSnapshots> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<RequestListSnapshots>): RequestListSnapshots {
    const message = createBaseRequestListSnapshots();
    return message;
  },
  fromProtoMsg(message: RequestListSnapshotsProtoMsg): RequestListSnapshots {
    return RequestListSnapshots.decode(message.value);
  },
  toProto(message: RequestListSnapshots): Uint8Array {
    return RequestListSnapshots.encode(message).finish();
  },
  toProtoMsg(message: RequestListSnapshots): RequestListSnapshotsProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestListSnapshots',
      value: RequestListSnapshots.encode(message).finish(),
    };
  },
};
function createBaseRequestOfferSnapshot(): RequestOfferSnapshot {
  return {
    snapshot: undefined,
    appHash: new Uint8Array(),
  };
}
export const RequestOfferSnapshot = {
  typeUrl: '/tendermint.abci.RequestOfferSnapshot' as const,
  encode(
    message: RequestOfferSnapshot,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.snapshot !== undefined) {
      Snapshot.encode(message.snapshot, writer.uint32(10).fork()).ldelim();
    }
    if (message.appHash.length !== 0) {
      writer.uint32(18).bytes(message.appHash);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RequestOfferSnapshot {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestOfferSnapshot();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.snapshot = Snapshot.decode(reader, reader.uint32());
          break;
        case 2:
          message.appHash = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RequestOfferSnapshot {
    return {
      snapshot: isSet(object.snapshot)
        ? Snapshot.fromJSON(object.snapshot)
        : undefined,
      appHash: isSet(object.appHash)
        ? bytesFromBase64(object.appHash)
        : new Uint8Array(),
    };
  },
  toJSON(message: RequestOfferSnapshot): JsonSafe<RequestOfferSnapshot> {
    const obj: any = {};
    message.snapshot !== undefined &&
      (obj.snapshot = message.snapshot
        ? Snapshot.toJSON(message.snapshot)
        : undefined);
    message.appHash !== undefined &&
      (obj.appHash = base64FromBytes(
        message.appHash !== undefined ? message.appHash : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<RequestOfferSnapshot>): RequestOfferSnapshot {
    const message = createBaseRequestOfferSnapshot();
    message.snapshot =
      object.snapshot !== undefined && object.snapshot !== null
        ? Snapshot.fromPartial(object.snapshot)
        : undefined;
    message.appHash = object.appHash ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: RequestOfferSnapshotProtoMsg): RequestOfferSnapshot {
    return RequestOfferSnapshot.decode(message.value);
  },
  toProto(message: RequestOfferSnapshot): Uint8Array {
    return RequestOfferSnapshot.encode(message).finish();
  },
  toProtoMsg(message: RequestOfferSnapshot): RequestOfferSnapshotProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestOfferSnapshot',
      value: RequestOfferSnapshot.encode(message).finish(),
    };
  },
};
function createBaseRequestLoadSnapshotChunk(): RequestLoadSnapshotChunk {
  return {
    height: BigInt(0),
    format: 0,
    chunk: 0,
  };
}
export const RequestLoadSnapshotChunk = {
  typeUrl: '/tendermint.abci.RequestLoadSnapshotChunk' as const,
  encode(
    message: RequestLoadSnapshotChunk,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.height !== BigInt(0)) {
      writer.uint32(8).uint64(message.height);
    }
    if (message.format !== 0) {
      writer.uint32(16).uint32(message.format);
    }
    if (message.chunk !== 0) {
      writer.uint32(24).uint32(message.chunk);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RequestLoadSnapshotChunk {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestLoadSnapshotChunk();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.height = reader.uint64();
          break;
        case 2:
          message.format = reader.uint32();
          break;
        case 3:
          message.chunk = reader.uint32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RequestLoadSnapshotChunk {
    return {
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
      format: isSet(object.format) ? Number(object.format) : 0,
      chunk: isSet(object.chunk) ? Number(object.chunk) : 0,
    };
  },
  toJSON(
    message: RequestLoadSnapshotChunk,
  ): JsonSafe<RequestLoadSnapshotChunk> {
    const obj: any = {};
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    message.format !== undefined && (obj.format = Math.round(message.format));
    message.chunk !== undefined && (obj.chunk = Math.round(message.chunk));
    return obj;
  },
  fromPartial(
    object: Partial<RequestLoadSnapshotChunk>,
  ): RequestLoadSnapshotChunk {
    const message = createBaseRequestLoadSnapshotChunk();
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    message.format = object.format ?? 0;
    message.chunk = object.chunk ?? 0;
    return message;
  },
  fromProtoMsg(
    message: RequestLoadSnapshotChunkProtoMsg,
  ): RequestLoadSnapshotChunk {
    return RequestLoadSnapshotChunk.decode(message.value);
  },
  toProto(message: RequestLoadSnapshotChunk): Uint8Array {
    return RequestLoadSnapshotChunk.encode(message).finish();
  },
  toProtoMsg(
    message: RequestLoadSnapshotChunk,
  ): RequestLoadSnapshotChunkProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestLoadSnapshotChunk',
      value: RequestLoadSnapshotChunk.encode(message).finish(),
    };
  },
};
function createBaseRequestApplySnapshotChunk(): RequestApplySnapshotChunk {
  return {
    index: 0,
    chunk: new Uint8Array(),
    sender: '',
  };
}
export const RequestApplySnapshotChunk = {
  typeUrl: '/tendermint.abci.RequestApplySnapshotChunk' as const,
  encode(
    message: RequestApplySnapshotChunk,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.index !== 0) {
      writer.uint32(8).uint32(message.index);
    }
    if (message.chunk.length !== 0) {
      writer.uint32(18).bytes(message.chunk);
    }
    if (message.sender !== '') {
      writer.uint32(26).string(message.sender);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RequestApplySnapshotChunk {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestApplySnapshotChunk();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.index = reader.uint32();
          break;
        case 2:
          message.chunk = reader.bytes();
          break;
        case 3:
          message.sender = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RequestApplySnapshotChunk {
    return {
      index: isSet(object.index) ? Number(object.index) : 0,
      chunk: isSet(object.chunk)
        ? bytesFromBase64(object.chunk)
        : new Uint8Array(),
      sender: isSet(object.sender) ? String(object.sender) : '',
    };
  },
  toJSON(
    message: RequestApplySnapshotChunk,
  ): JsonSafe<RequestApplySnapshotChunk> {
    const obj: any = {};
    message.index !== undefined && (obj.index = Math.round(message.index));
    message.chunk !== undefined &&
      (obj.chunk = base64FromBytes(
        message.chunk !== undefined ? message.chunk : new Uint8Array(),
      ));
    message.sender !== undefined && (obj.sender = message.sender);
    return obj;
  },
  fromPartial(
    object: Partial<RequestApplySnapshotChunk>,
  ): RequestApplySnapshotChunk {
    const message = createBaseRequestApplySnapshotChunk();
    message.index = object.index ?? 0;
    message.chunk = object.chunk ?? new Uint8Array();
    message.sender = object.sender ?? '';
    return message;
  },
  fromProtoMsg(
    message: RequestApplySnapshotChunkProtoMsg,
  ): RequestApplySnapshotChunk {
    return RequestApplySnapshotChunk.decode(message.value);
  },
  toProto(message: RequestApplySnapshotChunk): Uint8Array {
    return RequestApplySnapshotChunk.encode(message).finish();
  },
  toProtoMsg(
    message: RequestApplySnapshotChunk,
  ): RequestApplySnapshotChunkProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestApplySnapshotChunk',
      value: RequestApplySnapshotChunk.encode(message).finish(),
    };
  },
};
function createBaseRequestPrepareProposal(): RequestPrepareProposal {
  return {
    maxTxBytes: BigInt(0),
    txs: [],
    localLastCommit: ExtendedCommitInfo.fromPartial({}),
    misbehavior: [],
    height: BigInt(0),
    time: Timestamp.fromPartial({}),
    nextValidatorsHash: new Uint8Array(),
    proposerAddress: new Uint8Array(),
  };
}
export const RequestPrepareProposal = {
  typeUrl: '/tendermint.abci.RequestPrepareProposal' as const,
  encode(
    message: RequestPrepareProposal,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.maxTxBytes !== BigInt(0)) {
      writer.uint32(8).int64(message.maxTxBytes);
    }
    for (const v of message.txs) {
      writer.uint32(18).bytes(v!);
    }
    if (message.localLastCommit !== undefined) {
      ExtendedCommitInfo.encode(
        message.localLastCommit,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    for (const v of message.misbehavior) {
      Misbehavior.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    if (message.height !== BigInt(0)) {
      writer.uint32(40).int64(message.height);
    }
    if (message.time !== undefined) {
      Timestamp.encode(message.time, writer.uint32(50).fork()).ldelim();
    }
    if (message.nextValidatorsHash.length !== 0) {
      writer.uint32(58).bytes(message.nextValidatorsHash);
    }
    if (message.proposerAddress.length !== 0) {
      writer.uint32(66).bytes(message.proposerAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RequestPrepareProposal {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestPrepareProposal();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.maxTxBytes = reader.int64();
          break;
        case 2:
          message.txs.push(reader.bytes());
          break;
        case 3:
          message.localLastCommit = ExtendedCommitInfo.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 4:
          message.misbehavior.push(Misbehavior.decode(reader, reader.uint32()));
          break;
        case 5:
          message.height = reader.int64();
          break;
        case 6:
          message.time = Timestamp.decode(reader, reader.uint32());
          break;
        case 7:
          message.nextValidatorsHash = reader.bytes();
          break;
        case 8:
          message.proposerAddress = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RequestPrepareProposal {
    return {
      maxTxBytes: isSet(object.maxTxBytes)
        ? BigInt(object.maxTxBytes.toString())
        : BigInt(0),
      txs: Array.isArray(object?.txs)
        ? object.txs.map((e: any) => bytesFromBase64(e))
        : [],
      localLastCommit: isSet(object.localLastCommit)
        ? ExtendedCommitInfo.fromJSON(object.localLastCommit)
        : undefined,
      misbehavior: Array.isArray(object?.misbehavior)
        ? object.misbehavior.map((e: any) => Misbehavior.fromJSON(e))
        : [],
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
      time: isSet(object.time) ? fromJsonTimestamp(object.time) : undefined,
      nextValidatorsHash: isSet(object.nextValidatorsHash)
        ? bytesFromBase64(object.nextValidatorsHash)
        : new Uint8Array(),
      proposerAddress: isSet(object.proposerAddress)
        ? bytesFromBase64(object.proposerAddress)
        : new Uint8Array(),
    };
  },
  toJSON(message: RequestPrepareProposal): JsonSafe<RequestPrepareProposal> {
    const obj: any = {};
    message.maxTxBytes !== undefined &&
      (obj.maxTxBytes = (message.maxTxBytes || BigInt(0)).toString());
    if (message.txs) {
      obj.txs = message.txs.map(e =>
        base64FromBytes(e !== undefined ? e : new Uint8Array()),
      );
    } else {
      obj.txs = [];
    }
    message.localLastCommit !== undefined &&
      (obj.localLastCommit = message.localLastCommit
        ? ExtendedCommitInfo.toJSON(message.localLastCommit)
        : undefined);
    if (message.misbehavior) {
      obj.misbehavior = message.misbehavior.map(e =>
        e ? Misbehavior.toJSON(e) : undefined,
      );
    } else {
      obj.misbehavior = [];
    }
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    message.time !== undefined &&
      (obj.time = fromTimestamp(message.time).toISOString());
    message.nextValidatorsHash !== undefined &&
      (obj.nextValidatorsHash = base64FromBytes(
        message.nextValidatorsHash !== undefined
          ? message.nextValidatorsHash
          : new Uint8Array(),
      ));
    message.proposerAddress !== undefined &&
      (obj.proposerAddress = base64FromBytes(
        message.proposerAddress !== undefined
          ? message.proposerAddress
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<RequestPrepareProposal>): RequestPrepareProposal {
    const message = createBaseRequestPrepareProposal();
    message.maxTxBytes =
      object.maxTxBytes !== undefined && object.maxTxBytes !== null
        ? BigInt(object.maxTxBytes.toString())
        : BigInt(0);
    message.txs = object.txs?.map(e => e) || [];
    message.localLastCommit =
      object.localLastCommit !== undefined && object.localLastCommit !== null
        ? ExtendedCommitInfo.fromPartial(object.localLastCommit)
        : undefined;
    message.misbehavior =
      object.misbehavior?.map(e => Misbehavior.fromPartial(e)) || [];
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    message.time =
      object.time !== undefined && object.time !== null
        ? Timestamp.fromPartial(object.time)
        : undefined;
    message.nextValidatorsHash = object.nextValidatorsHash ?? new Uint8Array();
    message.proposerAddress = object.proposerAddress ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(
    message: RequestPrepareProposalProtoMsg,
  ): RequestPrepareProposal {
    return RequestPrepareProposal.decode(message.value);
  },
  toProto(message: RequestPrepareProposal): Uint8Array {
    return RequestPrepareProposal.encode(message).finish();
  },
  toProtoMsg(message: RequestPrepareProposal): RequestPrepareProposalProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestPrepareProposal',
      value: RequestPrepareProposal.encode(message).finish(),
    };
  },
};
function createBaseRequestProcessProposal(): RequestProcessProposal {
  return {
    txs: [],
    proposedLastCommit: CommitInfo.fromPartial({}),
    misbehavior: [],
    hash: new Uint8Array(),
    height: BigInt(0),
    time: Timestamp.fromPartial({}),
    nextValidatorsHash: new Uint8Array(),
    proposerAddress: new Uint8Array(),
  };
}
export const RequestProcessProposal = {
  typeUrl: '/tendermint.abci.RequestProcessProposal' as const,
  encode(
    message: RequestProcessProposal,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.txs) {
      writer.uint32(10).bytes(v!);
    }
    if (message.proposedLastCommit !== undefined) {
      CommitInfo.encode(
        message.proposedLastCommit,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    for (const v of message.misbehavior) {
      Misbehavior.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    if (message.hash.length !== 0) {
      writer.uint32(34).bytes(message.hash);
    }
    if (message.height !== BigInt(0)) {
      writer.uint32(40).int64(message.height);
    }
    if (message.time !== undefined) {
      Timestamp.encode(message.time, writer.uint32(50).fork()).ldelim();
    }
    if (message.nextValidatorsHash.length !== 0) {
      writer.uint32(58).bytes(message.nextValidatorsHash);
    }
    if (message.proposerAddress.length !== 0) {
      writer.uint32(66).bytes(message.proposerAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RequestProcessProposal {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestProcessProposal();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.txs.push(reader.bytes());
          break;
        case 2:
          message.proposedLastCommit = CommitInfo.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 3:
          message.misbehavior.push(Misbehavior.decode(reader, reader.uint32()));
          break;
        case 4:
          message.hash = reader.bytes();
          break;
        case 5:
          message.height = reader.int64();
          break;
        case 6:
          message.time = Timestamp.decode(reader, reader.uint32());
          break;
        case 7:
          message.nextValidatorsHash = reader.bytes();
          break;
        case 8:
          message.proposerAddress = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RequestProcessProposal {
    return {
      txs: Array.isArray(object?.txs)
        ? object.txs.map((e: any) => bytesFromBase64(e))
        : [],
      proposedLastCommit: isSet(object.proposedLastCommit)
        ? CommitInfo.fromJSON(object.proposedLastCommit)
        : undefined,
      misbehavior: Array.isArray(object?.misbehavior)
        ? object.misbehavior.map((e: any) => Misbehavior.fromJSON(e))
        : [],
      hash: isSet(object.hash)
        ? bytesFromBase64(object.hash)
        : new Uint8Array(),
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
      time: isSet(object.time) ? fromJsonTimestamp(object.time) : undefined,
      nextValidatorsHash: isSet(object.nextValidatorsHash)
        ? bytesFromBase64(object.nextValidatorsHash)
        : new Uint8Array(),
      proposerAddress: isSet(object.proposerAddress)
        ? bytesFromBase64(object.proposerAddress)
        : new Uint8Array(),
    };
  },
  toJSON(message: RequestProcessProposal): JsonSafe<RequestProcessProposal> {
    const obj: any = {};
    if (message.txs) {
      obj.txs = message.txs.map(e =>
        base64FromBytes(e !== undefined ? e : new Uint8Array()),
      );
    } else {
      obj.txs = [];
    }
    message.proposedLastCommit !== undefined &&
      (obj.proposedLastCommit = message.proposedLastCommit
        ? CommitInfo.toJSON(message.proposedLastCommit)
        : undefined);
    if (message.misbehavior) {
      obj.misbehavior = message.misbehavior.map(e =>
        e ? Misbehavior.toJSON(e) : undefined,
      );
    } else {
      obj.misbehavior = [];
    }
    message.hash !== undefined &&
      (obj.hash = base64FromBytes(
        message.hash !== undefined ? message.hash : new Uint8Array(),
      ));
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    message.time !== undefined &&
      (obj.time = fromTimestamp(message.time).toISOString());
    message.nextValidatorsHash !== undefined &&
      (obj.nextValidatorsHash = base64FromBytes(
        message.nextValidatorsHash !== undefined
          ? message.nextValidatorsHash
          : new Uint8Array(),
      ));
    message.proposerAddress !== undefined &&
      (obj.proposerAddress = base64FromBytes(
        message.proposerAddress !== undefined
          ? message.proposerAddress
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<RequestProcessProposal>): RequestProcessProposal {
    const message = createBaseRequestProcessProposal();
    message.txs = object.txs?.map(e => e) || [];
    message.proposedLastCommit =
      object.proposedLastCommit !== undefined &&
      object.proposedLastCommit !== null
        ? CommitInfo.fromPartial(object.proposedLastCommit)
        : undefined;
    message.misbehavior =
      object.misbehavior?.map(e => Misbehavior.fromPartial(e)) || [];
    message.hash = object.hash ?? new Uint8Array();
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    message.time =
      object.time !== undefined && object.time !== null
        ? Timestamp.fromPartial(object.time)
        : undefined;
    message.nextValidatorsHash = object.nextValidatorsHash ?? new Uint8Array();
    message.proposerAddress = object.proposerAddress ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(
    message: RequestProcessProposalProtoMsg,
  ): RequestProcessProposal {
    return RequestProcessProposal.decode(message.value);
  },
  toProto(message: RequestProcessProposal): Uint8Array {
    return RequestProcessProposal.encode(message).finish();
  },
  toProtoMsg(message: RequestProcessProposal): RequestProcessProposalProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestProcessProposal',
      value: RequestProcessProposal.encode(message).finish(),
    };
  },
};
function createBaseRequestExtendVote(): RequestExtendVote {
  return {
    hash: new Uint8Array(),
    height: BigInt(0),
    time: Timestamp.fromPartial({}),
    txs: [],
    proposedLastCommit: CommitInfo.fromPartial({}),
    misbehavior: [],
    nextValidatorsHash: new Uint8Array(),
    proposerAddress: new Uint8Array(),
  };
}
export const RequestExtendVote = {
  typeUrl: '/tendermint.abci.RequestExtendVote' as const,
  encode(
    message: RequestExtendVote,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.hash.length !== 0) {
      writer.uint32(10).bytes(message.hash);
    }
    if (message.height !== BigInt(0)) {
      writer.uint32(16).int64(message.height);
    }
    if (message.time !== undefined) {
      Timestamp.encode(message.time, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.txs) {
      writer.uint32(34).bytes(v!);
    }
    if (message.proposedLastCommit !== undefined) {
      CommitInfo.encode(
        message.proposedLastCommit,
        writer.uint32(42).fork(),
      ).ldelim();
    }
    for (const v of message.misbehavior) {
      Misbehavior.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    if (message.nextValidatorsHash.length !== 0) {
      writer.uint32(58).bytes(message.nextValidatorsHash);
    }
    if (message.proposerAddress.length !== 0) {
      writer.uint32(66).bytes(message.proposerAddress);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): RequestExtendVote {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestExtendVote();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.hash = reader.bytes();
          break;
        case 2:
          message.height = reader.int64();
          break;
        case 3:
          message.time = Timestamp.decode(reader, reader.uint32());
          break;
        case 4:
          message.txs.push(reader.bytes());
          break;
        case 5:
          message.proposedLastCommit = CommitInfo.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 6:
          message.misbehavior.push(Misbehavior.decode(reader, reader.uint32()));
          break;
        case 7:
          message.nextValidatorsHash = reader.bytes();
          break;
        case 8:
          message.proposerAddress = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RequestExtendVote {
    return {
      hash: isSet(object.hash)
        ? bytesFromBase64(object.hash)
        : new Uint8Array(),
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
      time: isSet(object.time) ? fromJsonTimestamp(object.time) : undefined,
      txs: Array.isArray(object?.txs)
        ? object.txs.map((e: any) => bytesFromBase64(e))
        : [],
      proposedLastCommit: isSet(object.proposedLastCommit)
        ? CommitInfo.fromJSON(object.proposedLastCommit)
        : undefined,
      misbehavior: Array.isArray(object?.misbehavior)
        ? object.misbehavior.map((e: any) => Misbehavior.fromJSON(e))
        : [],
      nextValidatorsHash: isSet(object.nextValidatorsHash)
        ? bytesFromBase64(object.nextValidatorsHash)
        : new Uint8Array(),
      proposerAddress: isSet(object.proposerAddress)
        ? bytesFromBase64(object.proposerAddress)
        : new Uint8Array(),
    };
  },
  toJSON(message: RequestExtendVote): JsonSafe<RequestExtendVote> {
    const obj: any = {};
    message.hash !== undefined &&
      (obj.hash = base64FromBytes(
        message.hash !== undefined ? message.hash : new Uint8Array(),
      ));
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    message.time !== undefined &&
      (obj.time = fromTimestamp(message.time).toISOString());
    if (message.txs) {
      obj.txs = message.txs.map(e =>
        base64FromBytes(e !== undefined ? e : new Uint8Array()),
      );
    } else {
      obj.txs = [];
    }
    message.proposedLastCommit !== undefined &&
      (obj.proposedLastCommit = message.proposedLastCommit
        ? CommitInfo.toJSON(message.proposedLastCommit)
        : undefined);
    if (message.misbehavior) {
      obj.misbehavior = message.misbehavior.map(e =>
        e ? Misbehavior.toJSON(e) : undefined,
      );
    } else {
      obj.misbehavior = [];
    }
    message.nextValidatorsHash !== undefined &&
      (obj.nextValidatorsHash = base64FromBytes(
        message.nextValidatorsHash !== undefined
          ? message.nextValidatorsHash
          : new Uint8Array(),
      ));
    message.proposerAddress !== undefined &&
      (obj.proposerAddress = base64FromBytes(
        message.proposerAddress !== undefined
          ? message.proposerAddress
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<RequestExtendVote>): RequestExtendVote {
    const message = createBaseRequestExtendVote();
    message.hash = object.hash ?? new Uint8Array();
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    message.time =
      object.time !== undefined && object.time !== null
        ? Timestamp.fromPartial(object.time)
        : undefined;
    message.txs = object.txs?.map(e => e) || [];
    message.proposedLastCommit =
      object.proposedLastCommit !== undefined &&
      object.proposedLastCommit !== null
        ? CommitInfo.fromPartial(object.proposedLastCommit)
        : undefined;
    message.misbehavior =
      object.misbehavior?.map(e => Misbehavior.fromPartial(e)) || [];
    message.nextValidatorsHash = object.nextValidatorsHash ?? new Uint8Array();
    message.proposerAddress = object.proposerAddress ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: RequestExtendVoteProtoMsg): RequestExtendVote {
    return RequestExtendVote.decode(message.value);
  },
  toProto(message: RequestExtendVote): Uint8Array {
    return RequestExtendVote.encode(message).finish();
  },
  toProtoMsg(message: RequestExtendVote): RequestExtendVoteProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestExtendVote',
      value: RequestExtendVote.encode(message).finish(),
    };
  },
};
function createBaseRequestVerifyVoteExtension(): RequestVerifyVoteExtension {
  return {
    hash: new Uint8Array(),
    validatorAddress: new Uint8Array(),
    height: BigInt(0),
    voteExtension: new Uint8Array(),
  };
}
export const RequestVerifyVoteExtension = {
  typeUrl: '/tendermint.abci.RequestVerifyVoteExtension' as const,
  encode(
    message: RequestVerifyVoteExtension,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.hash.length !== 0) {
      writer.uint32(10).bytes(message.hash);
    }
    if (message.validatorAddress.length !== 0) {
      writer.uint32(18).bytes(message.validatorAddress);
    }
    if (message.height !== BigInt(0)) {
      writer.uint32(24).int64(message.height);
    }
    if (message.voteExtension.length !== 0) {
      writer.uint32(34).bytes(message.voteExtension);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RequestVerifyVoteExtension {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestVerifyVoteExtension();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.hash = reader.bytes();
          break;
        case 2:
          message.validatorAddress = reader.bytes();
          break;
        case 3:
          message.height = reader.int64();
          break;
        case 4:
          message.voteExtension = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RequestVerifyVoteExtension {
    return {
      hash: isSet(object.hash)
        ? bytesFromBase64(object.hash)
        : new Uint8Array(),
      validatorAddress: isSet(object.validatorAddress)
        ? bytesFromBase64(object.validatorAddress)
        : new Uint8Array(),
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
      voteExtension: isSet(object.voteExtension)
        ? bytesFromBase64(object.voteExtension)
        : new Uint8Array(),
    };
  },
  toJSON(
    message: RequestVerifyVoteExtension,
  ): JsonSafe<RequestVerifyVoteExtension> {
    const obj: any = {};
    message.hash !== undefined &&
      (obj.hash = base64FromBytes(
        message.hash !== undefined ? message.hash : new Uint8Array(),
      ));
    message.validatorAddress !== undefined &&
      (obj.validatorAddress = base64FromBytes(
        message.validatorAddress !== undefined
          ? message.validatorAddress
          : new Uint8Array(),
      ));
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    message.voteExtension !== undefined &&
      (obj.voteExtension = base64FromBytes(
        message.voteExtension !== undefined
          ? message.voteExtension
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(
    object: Partial<RequestVerifyVoteExtension>,
  ): RequestVerifyVoteExtension {
    const message = createBaseRequestVerifyVoteExtension();
    message.hash = object.hash ?? new Uint8Array();
    message.validatorAddress = object.validatorAddress ?? new Uint8Array();
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    message.voteExtension = object.voteExtension ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(
    message: RequestVerifyVoteExtensionProtoMsg,
  ): RequestVerifyVoteExtension {
    return RequestVerifyVoteExtension.decode(message.value);
  },
  toProto(message: RequestVerifyVoteExtension): Uint8Array {
    return RequestVerifyVoteExtension.encode(message).finish();
  },
  toProtoMsg(
    message: RequestVerifyVoteExtension,
  ): RequestVerifyVoteExtensionProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestVerifyVoteExtension',
      value: RequestVerifyVoteExtension.encode(message).finish(),
    };
  },
};
function createBaseRequestFinalizeBlock(): RequestFinalizeBlock {
  return {
    txs: [],
    decidedLastCommit: CommitInfo.fromPartial({}),
    misbehavior: [],
    hash: new Uint8Array(),
    height: BigInt(0),
    time: Timestamp.fromPartial({}),
    nextValidatorsHash: new Uint8Array(),
    proposerAddress: new Uint8Array(),
  };
}
export const RequestFinalizeBlock = {
  typeUrl: '/tendermint.abci.RequestFinalizeBlock' as const,
  encode(
    message: RequestFinalizeBlock,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.txs) {
      writer.uint32(10).bytes(v!);
    }
    if (message.decidedLastCommit !== undefined) {
      CommitInfo.encode(
        message.decidedLastCommit,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    for (const v of message.misbehavior) {
      Misbehavior.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    if (message.hash.length !== 0) {
      writer.uint32(34).bytes(message.hash);
    }
    if (message.height !== BigInt(0)) {
      writer.uint32(40).int64(message.height);
    }
    if (message.time !== undefined) {
      Timestamp.encode(message.time, writer.uint32(50).fork()).ldelim();
    }
    if (message.nextValidatorsHash.length !== 0) {
      writer.uint32(58).bytes(message.nextValidatorsHash);
    }
    if (message.proposerAddress.length !== 0) {
      writer.uint32(66).bytes(message.proposerAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RequestFinalizeBlock {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRequestFinalizeBlock();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.txs.push(reader.bytes());
          break;
        case 2:
          message.decidedLastCommit = CommitInfo.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 3:
          message.misbehavior.push(Misbehavior.decode(reader, reader.uint32()));
          break;
        case 4:
          message.hash = reader.bytes();
          break;
        case 5:
          message.height = reader.int64();
          break;
        case 6:
          message.time = Timestamp.decode(reader, reader.uint32());
          break;
        case 7:
          message.nextValidatorsHash = reader.bytes();
          break;
        case 8:
          message.proposerAddress = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RequestFinalizeBlock {
    return {
      txs: Array.isArray(object?.txs)
        ? object.txs.map((e: any) => bytesFromBase64(e))
        : [],
      decidedLastCommit: isSet(object.decidedLastCommit)
        ? CommitInfo.fromJSON(object.decidedLastCommit)
        : undefined,
      misbehavior: Array.isArray(object?.misbehavior)
        ? object.misbehavior.map((e: any) => Misbehavior.fromJSON(e))
        : [],
      hash: isSet(object.hash)
        ? bytesFromBase64(object.hash)
        : new Uint8Array(),
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
      time: isSet(object.time) ? fromJsonTimestamp(object.time) : undefined,
      nextValidatorsHash: isSet(object.nextValidatorsHash)
        ? bytesFromBase64(object.nextValidatorsHash)
        : new Uint8Array(),
      proposerAddress: isSet(object.proposerAddress)
        ? bytesFromBase64(object.proposerAddress)
        : new Uint8Array(),
    };
  },
  toJSON(message: RequestFinalizeBlock): JsonSafe<RequestFinalizeBlock> {
    const obj: any = {};
    if (message.txs) {
      obj.txs = message.txs.map(e =>
        base64FromBytes(e !== undefined ? e : new Uint8Array()),
      );
    } else {
      obj.txs = [];
    }
    message.decidedLastCommit !== undefined &&
      (obj.decidedLastCommit = message.decidedLastCommit
        ? CommitInfo.toJSON(message.decidedLastCommit)
        : undefined);
    if (message.misbehavior) {
      obj.misbehavior = message.misbehavior.map(e =>
        e ? Misbehavior.toJSON(e) : undefined,
      );
    } else {
      obj.misbehavior = [];
    }
    message.hash !== undefined &&
      (obj.hash = base64FromBytes(
        message.hash !== undefined ? message.hash : new Uint8Array(),
      ));
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    message.time !== undefined &&
      (obj.time = fromTimestamp(message.time).toISOString());
    message.nextValidatorsHash !== undefined &&
      (obj.nextValidatorsHash = base64FromBytes(
        message.nextValidatorsHash !== undefined
          ? message.nextValidatorsHash
          : new Uint8Array(),
      ));
    message.proposerAddress !== undefined &&
      (obj.proposerAddress = base64FromBytes(
        message.proposerAddress !== undefined
          ? message.proposerAddress
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<RequestFinalizeBlock>): RequestFinalizeBlock {
    const message = createBaseRequestFinalizeBlock();
    message.txs = object.txs?.map(e => e) || [];
    message.decidedLastCommit =
      object.decidedLastCommit !== undefined &&
      object.decidedLastCommit !== null
        ? CommitInfo.fromPartial(object.decidedLastCommit)
        : undefined;
    message.misbehavior =
      object.misbehavior?.map(e => Misbehavior.fromPartial(e)) || [];
    message.hash = object.hash ?? new Uint8Array();
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    message.time =
      object.time !== undefined && object.time !== null
        ? Timestamp.fromPartial(object.time)
        : undefined;
    message.nextValidatorsHash = object.nextValidatorsHash ?? new Uint8Array();
    message.proposerAddress = object.proposerAddress ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: RequestFinalizeBlockProtoMsg): RequestFinalizeBlock {
    return RequestFinalizeBlock.decode(message.value);
  },
  toProto(message: RequestFinalizeBlock): Uint8Array {
    return RequestFinalizeBlock.encode(message).finish();
  },
  toProtoMsg(message: RequestFinalizeBlock): RequestFinalizeBlockProtoMsg {
    return {
      typeUrl: '/tendermint.abci.RequestFinalizeBlock',
      value: RequestFinalizeBlock.encode(message).finish(),
    };
  },
};
function createBaseResponse(): Response {
  return {
    exception: undefined,
    echo: undefined,
    flush: undefined,
    info: undefined,
    initChain: undefined,
    query: undefined,
    checkTx: undefined,
    commit: undefined,
    listSnapshots: undefined,
    offerSnapshot: undefined,
    loadSnapshotChunk: undefined,
    applySnapshotChunk: undefined,
    prepareProposal: undefined,
    processProposal: undefined,
    extendVote: undefined,
    verifyVoteExtension: undefined,
    finalizeBlock: undefined,
  };
}
export const Response = {
  typeUrl: '/tendermint.abci.Response' as const,
  encode(
    message: Response,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.exception !== undefined) {
      ResponseException.encode(
        message.exception,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    if (message.echo !== undefined) {
      ResponseEcho.encode(message.echo, writer.uint32(18).fork()).ldelim();
    }
    if (message.flush !== undefined) {
      ResponseFlush.encode(message.flush, writer.uint32(26).fork()).ldelim();
    }
    if (message.info !== undefined) {
      ResponseInfo.encode(message.info, writer.uint32(34).fork()).ldelim();
    }
    if (message.initChain !== undefined) {
      ResponseInitChain.encode(
        message.initChain,
        writer.uint32(50).fork(),
      ).ldelim();
    }
    if (message.query !== undefined) {
      ResponseQuery.encode(message.query, writer.uint32(58).fork()).ldelim();
    }
    if (message.checkTx !== undefined) {
      ResponseCheckTx.encode(
        message.checkTx,
        writer.uint32(74).fork(),
      ).ldelim();
    }
    if (message.commit !== undefined) {
      ResponseCommit.encode(message.commit, writer.uint32(98).fork()).ldelim();
    }
    if (message.listSnapshots !== undefined) {
      ResponseListSnapshots.encode(
        message.listSnapshots,
        writer.uint32(106).fork(),
      ).ldelim();
    }
    if (message.offerSnapshot !== undefined) {
      ResponseOfferSnapshot.encode(
        message.offerSnapshot,
        writer.uint32(114).fork(),
      ).ldelim();
    }
    if (message.loadSnapshotChunk !== undefined) {
      ResponseLoadSnapshotChunk.encode(
        message.loadSnapshotChunk,
        writer.uint32(122).fork(),
      ).ldelim();
    }
    if (message.applySnapshotChunk !== undefined) {
      ResponseApplySnapshotChunk.encode(
        message.applySnapshotChunk,
        writer.uint32(130).fork(),
      ).ldelim();
    }
    if (message.prepareProposal !== undefined) {
      ResponsePrepareProposal.encode(
        message.prepareProposal,
        writer.uint32(138).fork(),
      ).ldelim();
    }
    if (message.processProposal !== undefined) {
      ResponseProcessProposal.encode(
        message.processProposal,
        writer.uint32(146).fork(),
      ).ldelim();
    }
    if (message.extendVote !== undefined) {
      ResponseExtendVote.encode(
        message.extendVote,
        writer.uint32(154).fork(),
      ).ldelim();
    }
    if (message.verifyVoteExtension !== undefined) {
      ResponseVerifyVoteExtension.encode(
        message.verifyVoteExtension,
        writer.uint32(162).fork(),
      ).ldelim();
    }
    if (message.finalizeBlock !== undefined) {
      ResponseFinalizeBlock.encode(
        message.finalizeBlock,
        writer.uint32(170).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Response {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.exception = ResponseException.decode(reader, reader.uint32());
          break;
        case 2:
          message.echo = ResponseEcho.decode(reader, reader.uint32());
          break;
        case 3:
          message.flush = ResponseFlush.decode(reader, reader.uint32());
          break;
        case 4:
          message.info = ResponseInfo.decode(reader, reader.uint32());
          break;
        case 6:
          message.initChain = ResponseInitChain.decode(reader, reader.uint32());
          break;
        case 7:
          message.query = ResponseQuery.decode(reader, reader.uint32());
          break;
        case 9:
          message.checkTx = ResponseCheckTx.decode(reader, reader.uint32());
          break;
        case 12:
          message.commit = ResponseCommit.decode(reader, reader.uint32());
          break;
        case 13:
          message.listSnapshots = ResponseListSnapshots.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 14:
          message.offerSnapshot = ResponseOfferSnapshot.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 15:
          message.loadSnapshotChunk = ResponseLoadSnapshotChunk.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 16:
          message.applySnapshotChunk = ResponseApplySnapshotChunk.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 17:
          message.prepareProposal = ResponsePrepareProposal.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 18:
          message.processProposal = ResponseProcessProposal.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 19:
          message.extendVote = ResponseExtendVote.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 20:
          message.verifyVoteExtension = ResponseVerifyVoteExtension.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 21:
          message.finalizeBlock = ResponseFinalizeBlock.decode(
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
  fromJSON(object: any): Response {
    return {
      exception: isSet(object.exception)
        ? ResponseException.fromJSON(object.exception)
        : undefined,
      echo: isSet(object.echo) ? ResponseEcho.fromJSON(object.echo) : undefined,
      flush: isSet(object.flush)
        ? ResponseFlush.fromJSON(object.flush)
        : undefined,
      info: isSet(object.info) ? ResponseInfo.fromJSON(object.info) : undefined,
      initChain: isSet(object.initChain)
        ? ResponseInitChain.fromJSON(object.initChain)
        : undefined,
      query: isSet(object.query)
        ? ResponseQuery.fromJSON(object.query)
        : undefined,
      checkTx: isSet(object.checkTx)
        ? ResponseCheckTx.fromJSON(object.checkTx)
        : undefined,
      commit: isSet(object.commit)
        ? ResponseCommit.fromJSON(object.commit)
        : undefined,
      listSnapshots: isSet(object.listSnapshots)
        ? ResponseListSnapshots.fromJSON(object.listSnapshots)
        : undefined,
      offerSnapshot: isSet(object.offerSnapshot)
        ? ResponseOfferSnapshot.fromJSON(object.offerSnapshot)
        : undefined,
      loadSnapshotChunk: isSet(object.loadSnapshotChunk)
        ? ResponseLoadSnapshotChunk.fromJSON(object.loadSnapshotChunk)
        : undefined,
      applySnapshotChunk: isSet(object.applySnapshotChunk)
        ? ResponseApplySnapshotChunk.fromJSON(object.applySnapshotChunk)
        : undefined,
      prepareProposal: isSet(object.prepareProposal)
        ? ResponsePrepareProposal.fromJSON(object.prepareProposal)
        : undefined,
      processProposal: isSet(object.processProposal)
        ? ResponseProcessProposal.fromJSON(object.processProposal)
        : undefined,
      extendVote: isSet(object.extendVote)
        ? ResponseExtendVote.fromJSON(object.extendVote)
        : undefined,
      verifyVoteExtension: isSet(object.verifyVoteExtension)
        ? ResponseVerifyVoteExtension.fromJSON(object.verifyVoteExtension)
        : undefined,
      finalizeBlock: isSet(object.finalizeBlock)
        ? ResponseFinalizeBlock.fromJSON(object.finalizeBlock)
        : undefined,
    };
  },
  toJSON(message: Response): JsonSafe<Response> {
    const obj: any = {};
    message.exception !== undefined &&
      (obj.exception = message.exception
        ? ResponseException.toJSON(message.exception)
        : undefined);
    message.echo !== undefined &&
      (obj.echo = message.echo ? ResponseEcho.toJSON(message.echo) : undefined);
    message.flush !== undefined &&
      (obj.flush = message.flush
        ? ResponseFlush.toJSON(message.flush)
        : undefined);
    message.info !== undefined &&
      (obj.info = message.info ? ResponseInfo.toJSON(message.info) : undefined);
    message.initChain !== undefined &&
      (obj.initChain = message.initChain
        ? ResponseInitChain.toJSON(message.initChain)
        : undefined);
    message.query !== undefined &&
      (obj.query = message.query
        ? ResponseQuery.toJSON(message.query)
        : undefined);
    message.checkTx !== undefined &&
      (obj.checkTx = message.checkTx
        ? ResponseCheckTx.toJSON(message.checkTx)
        : undefined);
    message.commit !== undefined &&
      (obj.commit = message.commit
        ? ResponseCommit.toJSON(message.commit)
        : undefined);
    message.listSnapshots !== undefined &&
      (obj.listSnapshots = message.listSnapshots
        ? ResponseListSnapshots.toJSON(message.listSnapshots)
        : undefined);
    message.offerSnapshot !== undefined &&
      (obj.offerSnapshot = message.offerSnapshot
        ? ResponseOfferSnapshot.toJSON(message.offerSnapshot)
        : undefined);
    message.loadSnapshotChunk !== undefined &&
      (obj.loadSnapshotChunk = message.loadSnapshotChunk
        ? ResponseLoadSnapshotChunk.toJSON(message.loadSnapshotChunk)
        : undefined);
    message.applySnapshotChunk !== undefined &&
      (obj.applySnapshotChunk = message.applySnapshotChunk
        ? ResponseApplySnapshotChunk.toJSON(message.applySnapshotChunk)
        : undefined);
    message.prepareProposal !== undefined &&
      (obj.prepareProposal = message.prepareProposal
        ? ResponsePrepareProposal.toJSON(message.prepareProposal)
        : undefined);
    message.processProposal !== undefined &&
      (obj.processProposal = message.processProposal
        ? ResponseProcessProposal.toJSON(message.processProposal)
        : undefined);
    message.extendVote !== undefined &&
      (obj.extendVote = message.extendVote
        ? ResponseExtendVote.toJSON(message.extendVote)
        : undefined);
    message.verifyVoteExtension !== undefined &&
      (obj.verifyVoteExtension = message.verifyVoteExtension
        ? ResponseVerifyVoteExtension.toJSON(message.verifyVoteExtension)
        : undefined);
    message.finalizeBlock !== undefined &&
      (obj.finalizeBlock = message.finalizeBlock
        ? ResponseFinalizeBlock.toJSON(message.finalizeBlock)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<Response>): Response {
    const message = createBaseResponse();
    message.exception =
      object.exception !== undefined && object.exception !== null
        ? ResponseException.fromPartial(object.exception)
        : undefined;
    message.echo =
      object.echo !== undefined && object.echo !== null
        ? ResponseEcho.fromPartial(object.echo)
        : undefined;
    message.flush =
      object.flush !== undefined && object.flush !== null
        ? ResponseFlush.fromPartial(object.flush)
        : undefined;
    message.info =
      object.info !== undefined && object.info !== null
        ? ResponseInfo.fromPartial(object.info)
        : undefined;
    message.initChain =
      object.initChain !== undefined && object.initChain !== null
        ? ResponseInitChain.fromPartial(object.initChain)
        : undefined;
    message.query =
      object.query !== undefined && object.query !== null
        ? ResponseQuery.fromPartial(object.query)
        : undefined;
    message.checkTx =
      object.checkTx !== undefined && object.checkTx !== null
        ? ResponseCheckTx.fromPartial(object.checkTx)
        : undefined;
    message.commit =
      object.commit !== undefined && object.commit !== null
        ? ResponseCommit.fromPartial(object.commit)
        : undefined;
    message.listSnapshots =
      object.listSnapshots !== undefined && object.listSnapshots !== null
        ? ResponseListSnapshots.fromPartial(object.listSnapshots)
        : undefined;
    message.offerSnapshot =
      object.offerSnapshot !== undefined && object.offerSnapshot !== null
        ? ResponseOfferSnapshot.fromPartial(object.offerSnapshot)
        : undefined;
    message.loadSnapshotChunk =
      object.loadSnapshotChunk !== undefined &&
      object.loadSnapshotChunk !== null
        ? ResponseLoadSnapshotChunk.fromPartial(object.loadSnapshotChunk)
        : undefined;
    message.applySnapshotChunk =
      object.applySnapshotChunk !== undefined &&
      object.applySnapshotChunk !== null
        ? ResponseApplySnapshotChunk.fromPartial(object.applySnapshotChunk)
        : undefined;
    message.prepareProposal =
      object.prepareProposal !== undefined && object.prepareProposal !== null
        ? ResponsePrepareProposal.fromPartial(object.prepareProposal)
        : undefined;
    message.processProposal =
      object.processProposal !== undefined && object.processProposal !== null
        ? ResponseProcessProposal.fromPartial(object.processProposal)
        : undefined;
    message.extendVote =
      object.extendVote !== undefined && object.extendVote !== null
        ? ResponseExtendVote.fromPartial(object.extendVote)
        : undefined;
    message.verifyVoteExtension =
      object.verifyVoteExtension !== undefined &&
      object.verifyVoteExtension !== null
        ? ResponseVerifyVoteExtension.fromPartial(object.verifyVoteExtension)
        : undefined;
    message.finalizeBlock =
      object.finalizeBlock !== undefined && object.finalizeBlock !== null
        ? ResponseFinalizeBlock.fromPartial(object.finalizeBlock)
        : undefined;
    return message;
  },
  fromProtoMsg(message: ResponseProtoMsg): Response {
    return Response.decode(message.value);
  },
  toProto(message: Response): Uint8Array {
    return Response.encode(message).finish();
  },
  toProtoMsg(message: Response): ResponseProtoMsg {
    return {
      typeUrl: '/tendermint.abci.Response',
      value: Response.encode(message).finish(),
    };
  },
};
function createBaseResponseException(): ResponseException {
  return {
    error: '',
  };
}
export const ResponseException = {
  typeUrl: '/tendermint.abci.ResponseException' as const,
  encode(
    message: ResponseException,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.error !== '') {
      writer.uint32(10).string(message.error);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ResponseException {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseException();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.error = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseException {
    return {
      error: isSet(object.error) ? String(object.error) : '',
    };
  },
  toJSON(message: ResponseException): JsonSafe<ResponseException> {
    const obj: any = {};
    message.error !== undefined && (obj.error = message.error);
    return obj;
  },
  fromPartial(object: Partial<ResponseException>): ResponseException {
    const message = createBaseResponseException();
    message.error = object.error ?? '';
    return message;
  },
  fromProtoMsg(message: ResponseExceptionProtoMsg): ResponseException {
    return ResponseException.decode(message.value);
  },
  toProto(message: ResponseException): Uint8Array {
    return ResponseException.encode(message).finish();
  },
  toProtoMsg(message: ResponseException): ResponseExceptionProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseException',
      value: ResponseException.encode(message).finish(),
    };
  },
};
function createBaseResponseEcho(): ResponseEcho {
  return {
    message: '',
  };
}
export const ResponseEcho = {
  typeUrl: '/tendermint.abci.ResponseEcho' as const,
  encode(
    message: ResponseEcho,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.message !== '') {
      writer.uint32(10).string(message.message);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ResponseEcho {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseEcho();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.message = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseEcho {
    return {
      message: isSet(object.message) ? String(object.message) : '',
    };
  },
  toJSON(message: ResponseEcho): JsonSafe<ResponseEcho> {
    const obj: any = {};
    message.message !== undefined && (obj.message = message.message);
    return obj;
  },
  fromPartial(object: Partial<ResponseEcho>): ResponseEcho {
    const message = createBaseResponseEcho();
    message.message = object.message ?? '';
    return message;
  },
  fromProtoMsg(message: ResponseEchoProtoMsg): ResponseEcho {
    return ResponseEcho.decode(message.value);
  },
  toProto(message: ResponseEcho): Uint8Array {
    return ResponseEcho.encode(message).finish();
  },
  toProtoMsg(message: ResponseEcho): ResponseEchoProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseEcho',
      value: ResponseEcho.encode(message).finish(),
    };
  },
};
function createBaseResponseFlush(): ResponseFlush {
  return {};
}
export const ResponseFlush = {
  typeUrl: '/tendermint.abci.ResponseFlush' as const,
  encode(
    _: ResponseFlush,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ResponseFlush {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseFlush();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): ResponseFlush {
    return {};
  },
  toJSON(_: ResponseFlush): JsonSafe<ResponseFlush> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<ResponseFlush>): ResponseFlush {
    const message = createBaseResponseFlush();
    return message;
  },
  fromProtoMsg(message: ResponseFlushProtoMsg): ResponseFlush {
    return ResponseFlush.decode(message.value);
  },
  toProto(message: ResponseFlush): Uint8Array {
    return ResponseFlush.encode(message).finish();
  },
  toProtoMsg(message: ResponseFlush): ResponseFlushProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseFlush',
      value: ResponseFlush.encode(message).finish(),
    };
  },
};
function createBaseResponseInfo(): ResponseInfo {
  return {
    data: '',
    version: '',
    appVersion: BigInt(0),
    lastBlockHeight: BigInt(0),
    lastBlockAppHash: new Uint8Array(),
  };
}
export const ResponseInfo = {
  typeUrl: '/tendermint.abci.ResponseInfo' as const,
  encode(
    message: ResponseInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.data !== '') {
      writer.uint32(10).string(message.data);
    }
    if (message.version !== '') {
      writer.uint32(18).string(message.version);
    }
    if (message.appVersion !== BigInt(0)) {
      writer.uint32(24).uint64(message.appVersion);
    }
    if (message.lastBlockHeight !== BigInt(0)) {
      writer.uint32(32).int64(message.lastBlockHeight);
    }
    if (message.lastBlockAppHash.length !== 0) {
      writer.uint32(42).bytes(message.lastBlockAppHash);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ResponseInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.data = reader.string();
          break;
        case 2:
          message.version = reader.string();
          break;
        case 3:
          message.appVersion = reader.uint64();
          break;
        case 4:
          message.lastBlockHeight = reader.int64();
          break;
        case 5:
          message.lastBlockAppHash = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseInfo {
    return {
      data: isSet(object.data) ? String(object.data) : '',
      version: isSet(object.version) ? String(object.version) : '',
      appVersion: isSet(object.appVersion)
        ? BigInt(object.appVersion.toString())
        : BigInt(0),
      lastBlockHeight: isSet(object.lastBlockHeight)
        ? BigInt(object.lastBlockHeight.toString())
        : BigInt(0),
      lastBlockAppHash: isSet(object.lastBlockAppHash)
        ? bytesFromBase64(object.lastBlockAppHash)
        : new Uint8Array(),
    };
  },
  toJSON(message: ResponseInfo): JsonSafe<ResponseInfo> {
    const obj: any = {};
    message.data !== undefined && (obj.data = message.data);
    message.version !== undefined && (obj.version = message.version);
    message.appVersion !== undefined &&
      (obj.appVersion = (message.appVersion || BigInt(0)).toString());
    message.lastBlockHeight !== undefined &&
      (obj.lastBlockHeight = (message.lastBlockHeight || BigInt(0)).toString());
    message.lastBlockAppHash !== undefined &&
      (obj.lastBlockAppHash = base64FromBytes(
        message.lastBlockAppHash !== undefined
          ? message.lastBlockAppHash
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<ResponseInfo>): ResponseInfo {
    const message = createBaseResponseInfo();
    message.data = object.data ?? '';
    message.version = object.version ?? '';
    message.appVersion =
      object.appVersion !== undefined && object.appVersion !== null
        ? BigInt(object.appVersion.toString())
        : BigInt(0);
    message.lastBlockHeight =
      object.lastBlockHeight !== undefined && object.lastBlockHeight !== null
        ? BigInt(object.lastBlockHeight.toString())
        : BigInt(0);
    message.lastBlockAppHash = object.lastBlockAppHash ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: ResponseInfoProtoMsg): ResponseInfo {
    return ResponseInfo.decode(message.value);
  },
  toProto(message: ResponseInfo): Uint8Array {
    return ResponseInfo.encode(message).finish();
  },
  toProtoMsg(message: ResponseInfo): ResponseInfoProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseInfo',
      value: ResponseInfo.encode(message).finish(),
    };
  },
};
function createBaseResponseInitChain(): ResponseInitChain {
  return {
    consensusParams: undefined,
    validators: [],
    appHash: new Uint8Array(),
  };
}
export const ResponseInitChain = {
  typeUrl: '/tendermint.abci.ResponseInitChain' as const,
  encode(
    message: ResponseInitChain,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.consensusParams !== undefined) {
      ConsensusParams.encode(
        message.consensusParams,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    for (const v of message.validators) {
      ValidatorUpdate.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.appHash.length !== 0) {
      writer.uint32(26).bytes(message.appHash);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ResponseInitChain {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseInitChain();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.consensusParams = ConsensusParams.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 2:
          message.validators.push(
            ValidatorUpdate.decode(reader, reader.uint32()),
          );
          break;
        case 3:
          message.appHash = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseInitChain {
    return {
      consensusParams: isSet(object.consensusParams)
        ? ConsensusParams.fromJSON(object.consensusParams)
        : undefined,
      validators: Array.isArray(object?.validators)
        ? object.validators.map((e: any) => ValidatorUpdate.fromJSON(e))
        : [],
      appHash: isSet(object.appHash)
        ? bytesFromBase64(object.appHash)
        : new Uint8Array(),
    };
  },
  toJSON(message: ResponseInitChain): JsonSafe<ResponseInitChain> {
    const obj: any = {};
    message.consensusParams !== undefined &&
      (obj.consensusParams = message.consensusParams
        ? ConsensusParams.toJSON(message.consensusParams)
        : undefined);
    if (message.validators) {
      obj.validators = message.validators.map(e =>
        e ? ValidatorUpdate.toJSON(e) : undefined,
      );
    } else {
      obj.validators = [];
    }
    message.appHash !== undefined &&
      (obj.appHash = base64FromBytes(
        message.appHash !== undefined ? message.appHash : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<ResponseInitChain>): ResponseInitChain {
    const message = createBaseResponseInitChain();
    message.consensusParams =
      object.consensusParams !== undefined && object.consensusParams !== null
        ? ConsensusParams.fromPartial(object.consensusParams)
        : undefined;
    message.validators =
      object.validators?.map(e => ValidatorUpdate.fromPartial(e)) || [];
    message.appHash = object.appHash ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: ResponseInitChainProtoMsg): ResponseInitChain {
    return ResponseInitChain.decode(message.value);
  },
  toProto(message: ResponseInitChain): Uint8Array {
    return ResponseInitChain.encode(message).finish();
  },
  toProtoMsg(message: ResponseInitChain): ResponseInitChainProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseInitChain',
      value: ResponseInitChain.encode(message).finish(),
    };
  },
};
function createBaseResponseQuery(): ResponseQuery {
  return {
    code: 0,
    log: '',
    info: '',
    index: BigInt(0),
    key: new Uint8Array(),
    value: new Uint8Array(),
    proofOps: undefined,
    height: BigInt(0),
    codespace: '',
  };
}
export const ResponseQuery = {
  typeUrl: '/tendermint.abci.ResponseQuery' as const,
  encode(
    message: ResponseQuery,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.code !== 0) {
      writer.uint32(8).uint32(message.code);
    }
    if (message.log !== '') {
      writer.uint32(26).string(message.log);
    }
    if (message.info !== '') {
      writer.uint32(34).string(message.info);
    }
    if (message.index !== BigInt(0)) {
      writer.uint32(40).int64(message.index);
    }
    if (message.key.length !== 0) {
      writer.uint32(50).bytes(message.key);
    }
    if (message.value.length !== 0) {
      writer.uint32(58).bytes(message.value);
    }
    if (message.proofOps !== undefined) {
      ProofOps.encode(message.proofOps, writer.uint32(66).fork()).ldelim();
    }
    if (message.height !== BigInt(0)) {
      writer.uint32(72).int64(message.height);
    }
    if (message.codespace !== '') {
      writer.uint32(82).string(message.codespace);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ResponseQuery {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseQuery();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.code = reader.uint32();
          break;
        case 3:
          message.log = reader.string();
          break;
        case 4:
          message.info = reader.string();
          break;
        case 5:
          message.index = reader.int64();
          break;
        case 6:
          message.key = reader.bytes();
          break;
        case 7:
          message.value = reader.bytes();
          break;
        case 8:
          message.proofOps = ProofOps.decode(reader, reader.uint32());
          break;
        case 9:
          message.height = reader.int64();
          break;
        case 10:
          message.codespace = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseQuery {
    return {
      code: isSet(object.code) ? Number(object.code) : 0,
      log: isSet(object.log) ? String(object.log) : '',
      info: isSet(object.info) ? String(object.info) : '',
      index: isSet(object.index) ? BigInt(object.index.toString()) : BigInt(0),
      key: isSet(object.key) ? bytesFromBase64(object.key) : new Uint8Array(),
      value: isSet(object.value)
        ? bytesFromBase64(object.value)
        : new Uint8Array(),
      proofOps: isSet(object.proofOps)
        ? ProofOps.fromJSON(object.proofOps)
        : undefined,
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
      codespace: isSet(object.codespace) ? String(object.codespace) : '',
    };
  },
  toJSON(message: ResponseQuery): JsonSafe<ResponseQuery> {
    const obj: any = {};
    message.code !== undefined && (obj.code = Math.round(message.code));
    message.log !== undefined && (obj.log = message.log);
    message.info !== undefined && (obj.info = message.info);
    message.index !== undefined &&
      (obj.index = (message.index || BigInt(0)).toString());
    message.key !== undefined &&
      (obj.key = base64FromBytes(
        message.key !== undefined ? message.key : new Uint8Array(),
      ));
    message.value !== undefined &&
      (obj.value = base64FromBytes(
        message.value !== undefined ? message.value : new Uint8Array(),
      ));
    message.proofOps !== undefined &&
      (obj.proofOps = message.proofOps
        ? ProofOps.toJSON(message.proofOps)
        : undefined);
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    message.codespace !== undefined && (obj.codespace = message.codespace);
    return obj;
  },
  fromPartial(object: Partial<ResponseQuery>): ResponseQuery {
    const message = createBaseResponseQuery();
    message.code = object.code ?? 0;
    message.log = object.log ?? '';
    message.info = object.info ?? '';
    message.index =
      object.index !== undefined && object.index !== null
        ? BigInt(object.index.toString())
        : BigInt(0);
    message.key = object.key ?? new Uint8Array();
    message.value = object.value ?? new Uint8Array();
    message.proofOps =
      object.proofOps !== undefined && object.proofOps !== null
        ? ProofOps.fromPartial(object.proofOps)
        : undefined;
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    message.codespace = object.codespace ?? '';
    return message;
  },
  fromProtoMsg(message: ResponseQueryProtoMsg): ResponseQuery {
    return ResponseQuery.decode(message.value);
  },
  toProto(message: ResponseQuery): Uint8Array {
    return ResponseQuery.encode(message).finish();
  },
  toProtoMsg(message: ResponseQuery): ResponseQueryProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseQuery',
      value: ResponseQuery.encode(message).finish(),
    };
  },
};
function createBaseResponseCheckTx(): ResponseCheckTx {
  return {
    code: 0,
    data: new Uint8Array(),
    log: '',
    info: '',
    gasWanted: BigInt(0),
    gasUsed: BigInt(0),
    events: [],
    codespace: '',
  };
}
export const ResponseCheckTx = {
  typeUrl: '/tendermint.abci.ResponseCheckTx' as const,
  encode(
    message: ResponseCheckTx,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.code !== 0) {
      writer.uint32(8).uint32(message.code);
    }
    if (message.data.length !== 0) {
      writer.uint32(18).bytes(message.data);
    }
    if (message.log !== '') {
      writer.uint32(26).string(message.log);
    }
    if (message.info !== '') {
      writer.uint32(34).string(message.info);
    }
    if (message.gasWanted !== BigInt(0)) {
      writer.uint32(40).int64(message.gasWanted);
    }
    if (message.gasUsed !== BigInt(0)) {
      writer.uint32(48).int64(message.gasUsed);
    }
    for (const v of message.events) {
      Event.encode(v!, writer.uint32(58).fork()).ldelim();
    }
    if (message.codespace !== '') {
      writer.uint32(66).string(message.codespace);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ResponseCheckTx {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseCheckTx();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.code = reader.uint32();
          break;
        case 2:
          message.data = reader.bytes();
          break;
        case 3:
          message.log = reader.string();
          break;
        case 4:
          message.info = reader.string();
          break;
        case 5:
          message.gasWanted = reader.int64();
          break;
        case 6:
          message.gasUsed = reader.int64();
          break;
        case 7:
          message.events.push(Event.decode(reader, reader.uint32()));
          break;
        case 8:
          message.codespace = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseCheckTx {
    return {
      code: isSet(object.code) ? Number(object.code) : 0,
      data: isSet(object.data)
        ? bytesFromBase64(object.data)
        : new Uint8Array(),
      log: isSet(object.log) ? String(object.log) : '',
      info: isSet(object.info) ? String(object.info) : '',
      gasWanted: isSet(object.gas_wanted)
        ? BigInt(object.gas_wanted.toString())
        : BigInt(0),
      gasUsed: isSet(object.gas_used)
        ? BigInt(object.gas_used.toString())
        : BigInt(0),
      events: Array.isArray(object?.events)
        ? object.events.map((e: any) => Event.fromJSON(e))
        : [],
      codespace: isSet(object.codespace) ? String(object.codespace) : '',
    };
  },
  toJSON(message: ResponseCheckTx): JsonSafe<ResponseCheckTx> {
    const obj: any = {};
    message.code !== undefined && (obj.code = Math.round(message.code));
    message.data !== undefined &&
      (obj.data = base64FromBytes(
        message.data !== undefined ? message.data : new Uint8Array(),
      ));
    message.log !== undefined && (obj.log = message.log);
    message.info !== undefined && (obj.info = message.info);
    message.gasWanted !== undefined &&
      (obj.gas_wanted = (message.gasWanted || BigInt(0)).toString());
    message.gasUsed !== undefined &&
      (obj.gas_used = (message.gasUsed || BigInt(0)).toString());
    if (message.events) {
      obj.events = message.events.map(e => (e ? Event.toJSON(e) : undefined));
    } else {
      obj.events = [];
    }
    message.codespace !== undefined && (obj.codespace = message.codespace);
    return obj;
  },
  fromPartial(object: Partial<ResponseCheckTx>): ResponseCheckTx {
    const message = createBaseResponseCheckTx();
    message.code = object.code ?? 0;
    message.data = object.data ?? new Uint8Array();
    message.log = object.log ?? '';
    message.info = object.info ?? '';
    message.gasWanted =
      object.gasWanted !== undefined && object.gasWanted !== null
        ? BigInt(object.gasWanted.toString())
        : BigInt(0);
    message.gasUsed =
      object.gasUsed !== undefined && object.gasUsed !== null
        ? BigInt(object.gasUsed.toString())
        : BigInt(0);
    message.events = object.events?.map(e => Event.fromPartial(e)) || [];
    message.codespace = object.codespace ?? '';
    return message;
  },
  fromProtoMsg(message: ResponseCheckTxProtoMsg): ResponseCheckTx {
    return ResponseCheckTx.decode(message.value);
  },
  toProto(message: ResponseCheckTx): Uint8Array {
    return ResponseCheckTx.encode(message).finish();
  },
  toProtoMsg(message: ResponseCheckTx): ResponseCheckTxProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseCheckTx',
      value: ResponseCheckTx.encode(message).finish(),
    };
  },
};
function createBaseResponseCommit(): ResponseCommit {
  return {
    retainHeight: BigInt(0),
  };
}
export const ResponseCommit = {
  typeUrl: '/tendermint.abci.ResponseCommit' as const,
  encode(
    message: ResponseCommit,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.retainHeight !== BigInt(0)) {
      writer.uint32(24).int64(message.retainHeight);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ResponseCommit {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseCommit();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 3:
          message.retainHeight = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseCommit {
    return {
      retainHeight: isSet(object.retainHeight)
        ? BigInt(object.retainHeight.toString())
        : BigInt(0),
    };
  },
  toJSON(message: ResponseCommit): JsonSafe<ResponseCommit> {
    const obj: any = {};
    message.retainHeight !== undefined &&
      (obj.retainHeight = (message.retainHeight || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<ResponseCommit>): ResponseCommit {
    const message = createBaseResponseCommit();
    message.retainHeight =
      object.retainHeight !== undefined && object.retainHeight !== null
        ? BigInt(object.retainHeight.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: ResponseCommitProtoMsg): ResponseCommit {
    return ResponseCommit.decode(message.value);
  },
  toProto(message: ResponseCommit): Uint8Array {
    return ResponseCommit.encode(message).finish();
  },
  toProtoMsg(message: ResponseCommit): ResponseCommitProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseCommit',
      value: ResponseCommit.encode(message).finish(),
    };
  },
};
function createBaseResponseListSnapshots(): ResponseListSnapshots {
  return {
    snapshots: [],
  };
}
export const ResponseListSnapshots = {
  typeUrl: '/tendermint.abci.ResponseListSnapshots' as const,
  encode(
    message: ResponseListSnapshots,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.snapshots) {
      Snapshot.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ResponseListSnapshots {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseListSnapshots();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.snapshots.push(Snapshot.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseListSnapshots {
    return {
      snapshots: Array.isArray(object?.snapshots)
        ? object.snapshots.map((e: any) => Snapshot.fromJSON(e))
        : [],
    };
  },
  toJSON(message: ResponseListSnapshots): JsonSafe<ResponseListSnapshots> {
    const obj: any = {};
    if (message.snapshots) {
      obj.snapshots = message.snapshots.map(e =>
        e ? Snapshot.toJSON(e) : undefined,
      );
    } else {
      obj.snapshots = [];
    }
    return obj;
  },
  fromPartial(object: Partial<ResponseListSnapshots>): ResponseListSnapshots {
    const message = createBaseResponseListSnapshots();
    message.snapshots =
      object.snapshots?.map(e => Snapshot.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: ResponseListSnapshotsProtoMsg): ResponseListSnapshots {
    return ResponseListSnapshots.decode(message.value);
  },
  toProto(message: ResponseListSnapshots): Uint8Array {
    return ResponseListSnapshots.encode(message).finish();
  },
  toProtoMsg(message: ResponseListSnapshots): ResponseListSnapshotsProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseListSnapshots',
      value: ResponseListSnapshots.encode(message).finish(),
    };
  },
};
function createBaseResponseOfferSnapshot(): ResponseOfferSnapshot {
  return {
    result: 0,
  };
}
export const ResponseOfferSnapshot = {
  typeUrl: '/tendermint.abci.ResponseOfferSnapshot' as const,
  encode(
    message: ResponseOfferSnapshot,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.result !== 0) {
      writer.uint32(8).int32(message.result);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ResponseOfferSnapshot {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseOfferSnapshot();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.result = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseOfferSnapshot {
    return {
      result: isSet(object.result)
        ? responseOfferSnapshot_ResultFromJSON(object.result)
        : -1,
    };
  },
  toJSON(message: ResponseOfferSnapshot): JsonSafe<ResponseOfferSnapshot> {
    const obj: any = {};
    message.result !== undefined &&
      (obj.result = responseOfferSnapshot_ResultToJSON(message.result));
    return obj;
  },
  fromPartial(object: Partial<ResponseOfferSnapshot>): ResponseOfferSnapshot {
    const message = createBaseResponseOfferSnapshot();
    message.result = object.result ?? 0;
    return message;
  },
  fromProtoMsg(message: ResponseOfferSnapshotProtoMsg): ResponseOfferSnapshot {
    return ResponseOfferSnapshot.decode(message.value);
  },
  toProto(message: ResponseOfferSnapshot): Uint8Array {
    return ResponseOfferSnapshot.encode(message).finish();
  },
  toProtoMsg(message: ResponseOfferSnapshot): ResponseOfferSnapshotProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseOfferSnapshot',
      value: ResponseOfferSnapshot.encode(message).finish(),
    };
  },
};
function createBaseResponseLoadSnapshotChunk(): ResponseLoadSnapshotChunk {
  return {
    chunk: new Uint8Array(),
  };
}
export const ResponseLoadSnapshotChunk = {
  typeUrl: '/tendermint.abci.ResponseLoadSnapshotChunk' as const,
  encode(
    message: ResponseLoadSnapshotChunk,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.chunk.length !== 0) {
      writer.uint32(10).bytes(message.chunk);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ResponseLoadSnapshotChunk {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseLoadSnapshotChunk();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.chunk = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseLoadSnapshotChunk {
    return {
      chunk: isSet(object.chunk)
        ? bytesFromBase64(object.chunk)
        : new Uint8Array(),
    };
  },
  toJSON(
    message: ResponseLoadSnapshotChunk,
  ): JsonSafe<ResponseLoadSnapshotChunk> {
    const obj: any = {};
    message.chunk !== undefined &&
      (obj.chunk = base64FromBytes(
        message.chunk !== undefined ? message.chunk : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(
    object: Partial<ResponseLoadSnapshotChunk>,
  ): ResponseLoadSnapshotChunk {
    const message = createBaseResponseLoadSnapshotChunk();
    message.chunk = object.chunk ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(
    message: ResponseLoadSnapshotChunkProtoMsg,
  ): ResponseLoadSnapshotChunk {
    return ResponseLoadSnapshotChunk.decode(message.value);
  },
  toProto(message: ResponseLoadSnapshotChunk): Uint8Array {
    return ResponseLoadSnapshotChunk.encode(message).finish();
  },
  toProtoMsg(
    message: ResponseLoadSnapshotChunk,
  ): ResponseLoadSnapshotChunkProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseLoadSnapshotChunk',
      value: ResponseLoadSnapshotChunk.encode(message).finish(),
    };
  },
};
function createBaseResponseApplySnapshotChunk(): ResponseApplySnapshotChunk {
  return {
    result: 0,
    refetchChunks: [],
    rejectSenders: [],
  };
}
export const ResponseApplySnapshotChunk = {
  typeUrl: '/tendermint.abci.ResponseApplySnapshotChunk' as const,
  encode(
    message: ResponseApplySnapshotChunk,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.result !== 0) {
      writer.uint32(8).int32(message.result);
    }
    writer.uint32(18).fork();
    for (const v of message.refetchChunks) {
      writer.uint32(v);
    }
    writer.ldelim();
    for (const v of message.rejectSenders) {
      writer.uint32(26).string(v!);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ResponseApplySnapshotChunk {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseApplySnapshotChunk();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.result = reader.int32() as any;
          break;
        case 2:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.refetchChunks.push(reader.uint32());
            }
          } else {
            message.refetchChunks.push(reader.uint32());
          }
          break;
        case 3:
          message.rejectSenders.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseApplySnapshotChunk {
    return {
      result: isSet(object.result)
        ? responseApplySnapshotChunk_ResultFromJSON(object.result)
        : -1,
      refetchChunks: Array.isArray(object?.refetchChunks)
        ? object.refetchChunks.map((e: any) => Number(e))
        : [],
      rejectSenders: Array.isArray(object?.rejectSenders)
        ? object.rejectSenders.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(
    message: ResponseApplySnapshotChunk,
  ): JsonSafe<ResponseApplySnapshotChunk> {
    const obj: any = {};
    message.result !== undefined &&
      (obj.result = responseApplySnapshotChunk_ResultToJSON(message.result));
    if (message.refetchChunks) {
      obj.refetchChunks = message.refetchChunks.map(e => Math.round(e));
    } else {
      obj.refetchChunks = [];
    }
    if (message.rejectSenders) {
      obj.rejectSenders = message.rejectSenders.map(e => e);
    } else {
      obj.rejectSenders = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<ResponseApplySnapshotChunk>,
  ): ResponseApplySnapshotChunk {
    const message = createBaseResponseApplySnapshotChunk();
    message.result = object.result ?? 0;
    message.refetchChunks = object.refetchChunks?.map(e => e) || [];
    message.rejectSenders = object.rejectSenders?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(
    message: ResponseApplySnapshotChunkProtoMsg,
  ): ResponseApplySnapshotChunk {
    return ResponseApplySnapshotChunk.decode(message.value);
  },
  toProto(message: ResponseApplySnapshotChunk): Uint8Array {
    return ResponseApplySnapshotChunk.encode(message).finish();
  },
  toProtoMsg(
    message: ResponseApplySnapshotChunk,
  ): ResponseApplySnapshotChunkProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseApplySnapshotChunk',
      value: ResponseApplySnapshotChunk.encode(message).finish(),
    };
  },
};
function createBaseResponsePrepareProposal(): ResponsePrepareProposal {
  return {
    txs: [],
  };
}
export const ResponsePrepareProposal = {
  typeUrl: '/tendermint.abci.ResponsePrepareProposal' as const,
  encode(
    message: ResponsePrepareProposal,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.txs) {
      writer.uint32(10).bytes(v!);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ResponsePrepareProposal {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponsePrepareProposal();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.txs.push(reader.bytes());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponsePrepareProposal {
    return {
      txs: Array.isArray(object?.txs)
        ? object.txs.map((e: any) => bytesFromBase64(e))
        : [],
    };
  },
  toJSON(message: ResponsePrepareProposal): JsonSafe<ResponsePrepareProposal> {
    const obj: any = {};
    if (message.txs) {
      obj.txs = message.txs.map(e =>
        base64FromBytes(e !== undefined ? e : new Uint8Array()),
      );
    } else {
      obj.txs = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<ResponsePrepareProposal>,
  ): ResponsePrepareProposal {
    const message = createBaseResponsePrepareProposal();
    message.txs = object.txs?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(
    message: ResponsePrepareProposalProtoMsg,
  ): ResponsePrepareProposal {
    return ResponsePrepareProposal.decode(message.value);
  },
  toProto(message: ResponsePrepareProposal): Uint8Array {
    return ResponsePrepareProposal.encode(message).finish();
  },
  toProtoMsg(
    message: ResponsePrepareProposal,
  ): ResponsePrepareProposalProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponsePrepareProposal',
      value: ResponsePrepareProposal.encode(message).finish(),
    };
  },
};
function createBaseResponseProcessProposal(): ResponseProcessProposal {
  return {
    status: 0,
  };
}
export const ResponseProcessProposal = {
  typeUrl: '/tendermint.abci.ResponseProcessProposal' as const,
  encode(
    message: ResponseProcessProposal,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ResponseProcessProposal {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseProcessProposal();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.status = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseProcessProposal {
    return {
      status: isSet(object.status)
        ? responseProcessProposal_ProposalStatusFromJSON(object.status)
        : -1,
    };
  },
  toJSON(message: ResponseProcessProposal): JsonSafe<ResponseProcessProposal> {
    const obj: any = {};
    message.status !== undefined &&
      (obj.status = responseProcessProposal_ProposalStatusToJSON(
        message.status,
      ));
    return obj;
  },
  fromPartial(
    object: Partial<ResponseProcessProposal>,
  ): ResponseProcessProposal {
    const message = createBaseResponseProcessProposal();
    message.status = object.status ?? 0;
    return message;
  },
  fromProtoMsg(
    message: ResponseProcessProposalProtoMsg,
  ): ResponseProcessProposal {
    return ResponseProcessProposal.decode(message.value);
  },
  toProto(message: ResponseProcessProposal): Uint8Array {
    return ResponseProcessProposal.encode(message).finish();
  },
  toProtoMsg(
    message: ResponseProcessProposal,
  ): ResponseProcessProposalProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseProcessProposal',
      value: ResponseProcessProposal.encode(message).finish(),
    };
  },
};
function createBaseResponseExtendVote(): ResponseExtendVote {
  return {
    voteExtension: new Uint8Array(),
  };
}
export const ResponseExtendVote = {
  typeUrl: '/tendermint.abci.ResponseExtendVote' as const,
  encode(
    message: ResponseExtendVote,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.voteExtension.length !== 0) {
      writer.uint32(10).bytes(message.voteExtension);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ResponseExtendVote {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseExtendVote();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.voteExtension = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseExtendVote {
    return {
      voteExtension: isSet(object.voteExtension)
        ? bytesFromBase64(object.voteExtension)
        : new Uint8Array(),
    };
  },
  toJSON(message: ResponseExtendVote): JsonSafe<ResponseExtendVote> {
    const obj: any = {};
    message.voteExtension !== undefined &&
      (obj.voteExtension = base64FromBytes(
        message.voteExtension !== undefined
          ? message.voteExtension
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<ResponseExtendVote>): ResponseExtendVote {
    const message = createBaseResponseExtendVote();
    message.voteExtension = object.voteExtension ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: ResponseExtendVoteProtoMsg): ResponseExtendVote {
    return ResponseExtendVote.decode(message.value);
  },
  toProto(message: ResponseExtendVote): Uint8Array {
    return ResponseExtendVote.encode(message).finish();
  },
  toProtoMsg(message: ResponseExtendVote): ResponseExtendVoteProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseExtendVote',
      value: ResponseExtendVote.encode(message).finish(),
    };
  },
};
function createBaseResponseVerifyVoteExtension(): ResponseVerifyVoteExtension {
  return {
    status: 0,
  };
}
export const ResponseVerifyVoteExtension = {
  typeUrl: '/tendermint.abci.ResponseVerifyVoteExtension' as const,
  encode(
    message: ResponseVerifyVoteExtension,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.status !== 0) {
      writer.uint32(8).int32(message.status);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ResponseVerifyVoteExtension {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseVerifyVoteExtension();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.status = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseVerifyVoteExtension {
    return {
      status: isSet(object.status)
        ? responseVerifyVoteExtension_VerifyStatusFromJSON(object.status)
        : -1,
    };
  },
  toJSON(
    message: ResponseVerifyVoteExtension,
  ): JsonSafe<ResponseVerifyVoteExtension> {
    const obj: any = {};
    message.status !== undefined &&
      (obj.status = responseVerifyVoteExtension_VerifyStatusToJSON(
        message.status,
      ));
    return obj;
  },
  fromPartial(
    object: Partial<ResponseVerifyVoteExtension>,
  ): ResponseVerifyVoteExtension {
    const message = createBaseResponseVerifyVoteExtension();
    message.status = object.status ?? 0;
    return message;
  },
  fromProtoMsg(
    message: ResponseVerifyVoteExtensionProtoMsg,
  ): ResponseVerifyVoteExtension {
    return ResponseVerifyVoteExtension.decode(message.value);
  },
  toProto(message: ResponseVerifyVoteExtension): Uint8Array {
    return ResponseVerifyVoteExtension.encode(message).finish();
  },
  toProtoMsg(
    message: ResponseVerifyVoteExtension,
  ): ResponseVerifyVoteExtensionProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseVerifyVoteExtension',
      value: ResponseVerifyVoteExtension.encode(message).finish(),
    };
  },
};
function createBaseResponseFinalizeBlock(): ResponseFinalizeBlock {
  return {
    events: [],
    txResults: [],
    validatorUpdates: [],
    consensusParamUpdates: undefined,
    appHash: new Uint8Array(),
  };
}
export const ResponseFinalizeBlock = {
  typeUrl: '/tendermint.abci.ResponseFinalizeBlock' as const,
  encode(
    message: ResponseFinalizeBlock,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.events) {
      Event.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.txResults) {
      ExecTxResult.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.validatorUpdates) {
      ValidatorUpdate.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    if (message.consensusParamUpdates !== undefined) {
      ConsensusParams.encode(
        message.consensusParamUpdates,
        writer.uint32(34).fork(),
      ).ldelim();
    }
    if (message.appHash.length !== 0) {
      writer.uint32(42).bytes(message.appHash);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ResponseFinalizeBlock {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseResponseFinalizeBlock();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.events.push(Event.decode(reader, reader.uint32()));
          break;
        case 2:
          message.txResults.push(ExecTxResult.decode(reader, reader.uint32()));
          break;
        case 3:
          message.validatorUpdates.push(
            ValidatorUpdate.decode(reader, reader.uint32()),
          );
          break;
        case 4:
          message.consensusParamUpdates = ConsensusParams.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 5:
          message.appHash = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ResponseFinalizeBlock {
    return {
      events: Array.isArray(object?.events)
        ? object.events.map((e: any) => Event.fromJSON(e))
        : [],
      txResults: Array.isArray(object?.txResults)
        ? object.txResults.map((e: any) => ExecTxResult.fromJSON(e))
        : [],
      validatorUpdates: Array.isArray(object?.validatorUpdates)
        ? object.validatorUpdates.map((e: any) => ValidatorUpdate.fromJSON(e))
        : [],
      consensusParamUpdates: isSet(object.consensusParamUpdates)
        ? ConsensusParams.fromJSON(object.consensusParamUpdates)
        : undefined,
      appHash: isSet(object.appHash)
        ? bytesFromBase64(object.appHash)
        : new Uint8Array(),
    };
  },
  toJSON(message: ResponseFinalizeBlock): JsonSafe<ResponseFinalizeBlock> {
    const obj: any = {};
    if (message.events) {
      obj.events = message.events.map(e => (e ? Event.toJSON(e) : undefined));
    } else {
      obj.events = [];
    }
    if (message.txResults) {
      obj.txResults = message.txResults.map(e =>
        e ? ExecTxResult.toJSON(e) : undefined,
      );
    } else {
      obj.txResults = [];
    }
    if (message.validatorUpdates) {
      obj.validatorUpdates = message.validatorUpdates.map(e =>
        e ? ValidatorUpdate.toJSON(e) : undefined,
      );
    } else {
      obj.validatorUpdates = [];
    }
    message.consensusParamUpdates !== undefined &&
      (obj.consensusParamUpdates = message.consensusParamUpdates
        ? ConsensusParams.toJSON(message.consensusParamUpdates)
        : undefined);
    message.appHash !== undefined &&
      (obj.appHash = base64FromBytes(
        message.appHash !== undefined ? message.appHash : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<ResponseFinalizeBlock>): ResponseFinalizeBlock {
    const message = createBaseResponseFinalizeBlock();
    message.events = object.events?.map(e => Event.fromPartial(e)) || [];
    message.txResults =
      object.txResults?.map(e => ExecTxResult.fromPartial(e)) || [];
    message.validatorUpdates =
      object.validatorUpdates?.map(e => ValidatorUpdate.fromPartial(e)) || [];
    message.consensusParamUpdates =
      object.consensusParamUpdates !== undefined &&
      object.consensusParamUpdates !== null
        ? ConsensusParams.fromPartial(object.consensusParamUpdates)
        : undefined;
    message.appHash = object.appHash ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: ResponseFinalizeBlockProtoMsg): ResponseFinalizeBlock {
    return ResponseFinalizeBlock.decode(message.value);
  },
  toProto(message: ResponseFinalizeBlock): Uint8Array {
    return ResponseFinalizeBlock.encode(message).finish();
  },
  toProtoMsg(message: ResponseFinalizeBlock): ResponseFinalizeBlockProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ResponseFinalizeBlock',
      value: ResponseFinalizeBlock.encode(message).finish(),
    };
  },
};
function createBaseCommitInfo(): CommitInfo {
  return {
    round: 0,
    votes: [],
  };
}
export const CommitInfo = {
  typeUrl: '/tendermint.abci.CommitInfo' as const,
  encode(
    message: CommitInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.round !== 0) {
      writer.uint32(8).int32(message.round);
    }
    for (const v of message.votes) {
      VoteInfo.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): CommitInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCommitInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.round = reader.int32();
          break;
        case 2:
          message.votes.push(VoteInfo.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): CommitInfo {
    return {
      round: isSet(object.round) ? Number(object.round) : 0,
      votes: Array.isArray(object?.votes)
        ? object.votes.map((e: any) => VoteInfo.fromJSON(e))
        : [],
    };
  },
  toJSON(message: CommitInfo): JsonSafe<CommitInfo> {
    const obj: any = {};
    message.round !== undefined && (obj.round = Math.round(message.round));
    if (message.votes) {
      obj.votes = message.votes.map(e => (e ? VoteInfo.toJSON(e) : undefined));
    } else {
      obj.votes = [];
    }
    return obj;
  },
  fromPartial(object: Partial<CommitInfo>): CommitInfo {
    const message = createBaseCommitInfo();
    message.round = object.round ?? 0;
    message.votes = object.votes?.map(e => VoteInfo.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: CommitInfoProtoMsg): CommitInfo {
    return CommitInfo.decode(message.value);
  },
  toProto(message: CommitInfo): Uint8Array {
    return CommitInfo.encode(message).finish();
  },
  toProtoMsg(message: CommitInfo): CommitInfoProtoMsg {
    return {
      typeUrl: '/tendermint.abci.CommitInfo',
      value: CommitInfo.encode(message).finish(),
    };
  },
};
function createBaseExtendedCommitInfo(): ExtendedCommitInfo {
  return {
    round: 0,
    votes: [],
  };
}
export const ExtendedCommitInfo = {
  typeUrl: '/tendermint.abci.ExtendedCommitInfo' as const,
  encode(
    message: ExtendedCommitInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.round !== 0) {
      writer.uint32(8).int32(message.round);
    }
    for (const v of message.votes) {
      ExtendedVoteInfo.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ExtendedCommitInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExtendedCommitInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.round = reader.int32();
          break;
        case 2:
          message.votes.push(ExtendedVoteInfo.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ExtendedCommitInfo {
    return {
      round: isSet(object.round) ? Number(object.round) : 0,
      votes: Array.isArray(object?.votes)
        ? object.votes.map((e: any) => ExtendedVoteInfo.fromJSON(e))
        : [],
    };
  },
  toJSON(message: ExtendedCommitInfo): JsonSafe<ExtendedCommitInfo> {
    const obj: any = {};
    message.round !== undefined && (obj.round = Math.round(message.round));
    if (message.votes) {
      obj.votes = message.votes.map(e =>
        e ? ExtendedVoteInfo.toJSON(e) : undefined,
      );
    } else {
      obj.votes = [];
    }
    return obj;
  },
  fromPartial(object: Partial<ExtendedCommitInfo>): ExtendedCommitInfo {
    const message = createBaseExtendedCommitInfo();
    message.round = object.round ?? 0;
    message.votes =
      object.votes?.map(e => ExtendedVoteInfo.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: ExtendedCommitInfoProtoMsg): ExtendedCommitInfo {
    return ExtendedCommitInfo.decode(message.value);
  },
  toProto(message: ExtendedCommitInfo): Uint8Array {
    return ExtendedCommitInfo.encode(message).finish();
  },
  toProtoMsg(message: ExtendedCommitInfo): ExtendedCommitInfoProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ExtendedCommitInfo',
      value: ExtendedCommitInfo.encode(message).finish(),
    };
  },
};
function createBaseEvent(): Event {
  return {
    type: '',
    attributes: [],
  };
}
export const Event = {
  typeUrl: '/tendermint.abci.Event' as const,
  encode(
    message: Event,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.type !== '') {
      writer.uint32(10).string(message.type);
    }
    for (const v of message.attributes) {
      EventAttribute.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Event {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEvent();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.type = reader.string();
          break;
        case 2:
          message.attributes.push(
            EventAttribute.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Event {
    return {
      type: isSet(object.type) ? String(object.type) : '',
      attributes: Array.isArray(object?.attributes)
        ? object.attributes.map((e: any) => EventAttribute.fromJSON(e))
        : [],
    };
  },
  toJSON(message: Event): JsonSafe<Event> {
    const obj: any = {};
    message.type !== undefined && (obj.type = message.type);
    if (message.attributes) {
      obj.attributes = message.attributes.map(e =>
        e ? EventAttribute.toJSON(e) : undefined,
      );
    } else {
      obj.attributes = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Event>): Event {
    const message = createBaseEvent();
    message.type = object.type ?? '';
    message.attributes =
      object.attributes?.map(e => EventAttribute.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: EventProtoMsg): Event {
    return Event.decode(message.value);
  },
  toProto(message: Event): Uint8Array {
    return Event.encode(message).finish();
  },
  toProtoMsg(message: Event): EventProtoMsg {
    return {
      typeUrl: '/tendermint.abci.Event',
      value: Event.encode(message).finish(),
    };
  },
};
function createBaseEventAttribute(): EventAttribute {
  return {
    key: '',
    value: '',
    index: false,
  };
}
export const EventAttribute = {
  typeUrl: '/tendermint.abci.EventAttribute' as const,
  encode(
    message: EventAttribute,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.key !== '') {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== '') {
      writer.uint32(18).string(message.value);
    }
    if (message.index === true) {
      writer.uint32(24).bool(message.index);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EventAttribute {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventAttribute();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.string();
          break;
        case 2:
          message.value = reader.string();
          break;
        case 3:
          message.index = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EventAttribute {
    return {
      key: isSet(object.key) ? String(object.key) : '',
      value: isSet(object.value) ? String(object.value) : '',
      index: isSet(object.index) ? Boolean(object.index) : false,
    };
  },
  toJSON(message: EventAttribute): JsonSafe<EventAttribute> {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined && (obj.value = message.value);
    message.index !== undefined && (obj.index = message.index);
    return obj;
  },
  fromPartial(object: Partial<EventAttribute>): EventAttribute {
    const message = createBaseEventAttribute();
    message.key = object.key ?? '';
    message.value = object.value ?? '';
    message.index = object.index ?? false;
    return message;
  },
  fromProtoMsg(message: EventAttributeProtoMsg): EventAttribute {
    return EventAttribute.decode(message.value);
  },
  toProto(message: EventAttribute): Uint8Array {
    return EventAttribute.encode(message).finish();
  },
  toProtoMsg(message: EventAttribute): EventAttributeProtoMsg {
    return {
      typeUrl: '/tendermint.abci.EventAttribute',
      value: EventAttribute.encode(message).finish(),
    };
  },
};
function createBaseExecTxResult(): ExecTxResult {
  return {
    code: 0,
    data: new Uint8Array(),
    log: '',
    info: '',
    gasWanted: BigInt(0),
    gasUsed: BigInt(0),
    events: [],
    codespace: '',
  };
}
export const ExecTxResult = {
  typeUrl: '/tendermint.abci.ExecTxResult' as const,
  encode(
    message: ExecTxResult,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.code !== 0) {
      writer.uint32(8).uint32(message.code);
    }
    if (message.data.length !== 0) {
      writer.uint32(18).bytes(message.data);
    }
    if (message.log !== '') {
      writer.uint32(26).string(message.log);
    }
    if (message.info !== '') {
      writer.uint32(34).string(message.info);
    }
    if (message.gasWanted !== BigInt(0)) {
      writer.uint32(40).int64(message.gasWanted);
    }
    if (message.gasUsed !== BigInt(0)) {
      writer.uint32(48).int64(message.gasUsed);
    }
    for (const v of message.events) {
      Event.encode(v!, writer.uint32(58).fork()).ldelim();
    }
    if (message.codespace !== '') {
      writer.uint32(66).string(message.codespace);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ExecTxResult {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExecTxResult();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.code = reader.uint32();
          break;
        case 2:
          message.data = reader.bytes();
          break;
        case 3:
          message.log = reader.string();
          break;
        case 4:
          message.info = reader.string();
          break;
        case 5:
          message.gasWanted = reader.int64();
          break;
        case 6:
          message.gasUsed = reader.int64();
          break;
        case 7:
          message.events.push(Event.decode(reader, reader.uint32()));
          break;
        case 8:
          message.codespace = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ExecTxResult {
    return {
      code: isSet(object.code) ? Number(object.code) : 0,
      data: isSet(object.data)
        ? bytesFromBase64(object.data)
        : new Uint8Array(),
      log: isSet(object.log) ? String(object.log) : '',
      info: isSet(object.info) ? String(object.info) : '',
      gasWanted: isSet(object.gas_wanted)
        ? BigInt(object.gas_wanted.toString())
        : BigInt(0),
      gasUsed: isSet(object.gas_used)
        ? BigInt(object.gas_used.toString())
        : BigInt(0),
      events: Array.isArray(object?.events)
        ? object.events.map((e: any) => Event.fromJSON(e))
        : [],
      codespace: isSet(object.codespace) ? String(object.codespace) : '',
    };
  },
  toJSON(message: ExecTxResult): JsonSafe<ExecTxResult> {
    const obj: any = {};
    message.code !== undefined && (obj.code = Math.round(message.code));
    message.data !== undefined &&
      (obj.data = base64FromBytes(
        message.data !== undefined ? message.data : new Uint8Array(),
      ));
    message.log !== undefined && (obj.log = message.log);
    message.info !== undefined && (obj.info = message.info);
    message.gasWanted !== undefined &&
      (obj.gas_wanted = (message.gasWanted || BigInt(0)).toString());
    message.gasUsed !== undefined &&
      (obj.gas_used = (message.gasUsed || BigInt(0)).toString());
    if (message.events) {
      obj.events = message.events.map(e => (e ? Event.toJSON(e) : undefined));
    } else {
      obj.events = [];
    }
    message.codespace !== undefined && (obj.codespace = message.codespace);
    return obj;
  },
  fromPartial(object: Partial<ExecTxResult>): ExecTxResult {
    const message = createBaseExecTxResult();
    message.code = object.code ?? 0;
    message.data = object.data ?? new Uint8Array();
    message.log = object.log ?? '';
    message.info = object.info ?? '';
    message.gasWanted =
      object.gasWanted !== undefined && object.gasWanted !== null
        ? BigInt(object.gasWanted.toString())
        : BigInt(0);
    message.gasUsed =
      object.gasUsed !== undefined && object.gasUsed !== null
        ? BigInt(object.gasUsed.toString())
        : BigInt(0);
    message.events = object.events?.map(e => Event.fromPartial(e)) || [];
    message.codespace = object.codespace ?? '';
    return message;
  },
  fromProtoMsg(message: ExecTxResultProtoMsg): ExecTxResult {
    return ExecTxResult.decode(message.value);
  },
  toProto(message: ExecTxResult): Uint8Array {
    return ExecTxResult.encode(message).finish();
  },
  toProtoMsg(message: ExecTxResult): ExecTxResultProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ExecTxResult',
      value: ExecTxResult.encode(message).finish(),
    };
  },
};
function createBaseTxResult(): TxResult {
  return {
    height: BigInt(0),
    index: 0,
    tx: new Uint8Array(),
    result: ExecTxResult.fromPartial({}),
  };
}
export const TxResult = {
  typeUrl: '/tendermint.abci.TxResult' as const,
  encode(
    message: TxResult,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.height !== BigInt(0)) {
      writer.uint32(8).int64(message.height);
    }
    if (message.index !== 0) {
      writer.uint32(16).uint32(message.index);
    }
    if (message.tx.length !== 0) {
      writer.uint32(26).bytes(message.tx);
    }
    if (message.result !== undefined) {
      ExecTxResult.encode(message.result, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): TxResult {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTxResult();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.height = reader.int64();
          break;
        case 2:
          message.index = reader.uint32();
          break;
        case 3:
          message.tx = reader.bytes();
          break;
        case 4:
          message.result = ExecTxResult.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TxResult {
    return {
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
      index: isSet(object.index) ? Number(object.index) : 0,
      tx: isSet(object.tx) ? bytesFromBase64(object.tx) : new Uint8Array(),
      result: isSet(object.result)
        ? ExecTxResult.fromJSON(object.result)
        : undefined,
    };
  },
  toJSON(message: TxResult): JsonSafe<TxResult> {
    const obj: any = {};
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    message.index !== undefined && (obj.index = Math.round(message.index));
    message.tx !== undefined &&
      (obj.tx = base64FromBytes(
        message.tx !== undefined ? message.tx : new Uint8Array(),
      ));
    message.result !== undefined &&
      (obj.result = message.result
        ? ExecTxResult.toJSON(message.result)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<TxResult>): TxResult {
    const message = createBaseTxResult();
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    message.index = object.index ?? 0;
    message.tx = object.tx ?? new Uint8Array();
    message.result =
      object.result !== undefined && object.result !== null
        ? ExecTxResult.fromPartial(object.result)
        : undefined;
    return message;
  },
  fromProtoMsg(message: TxResultProtoMsg): TxResult {
    return TxResult.decode(message.value);
  },
  toProto(message: TxResult): Uint8Array {
    return TxResult.encode(message).finish();
  },
  toProtoMsg(message: TxResult): TxResultProtoMsg {
    return {
      typeUrl: '/tendermint.abci.TxResult',
      value: TxResult.encode(message).finish(),
    };
  },
};
function createBaseValidator(): Validator {
  return {
    address: new Uint8Array(),
    power: BigInt(0),
  };
}
export const Validator = {
  typeUrl: '/tendermint.abci.Validator' as const,
  encode(
    message: Validator,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address.length !== 0) {
      writer.uint32(10).bytes(message.address);
    }
    if (message.power !== BigInt(0)) {
      writer.uint32(24).int64(message.power);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Validator {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseValidator();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.bytes();
          break;
        case 3:
          message.power = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Validator {
    return {
      address: isSet(object.address)
        ? bytesFromBase64(object.address)
        : new Uint8Array(),
      power: isSet(object.power) ? BigInt(object.power.toString()) : BigInt(0),
    };
  },
  toJSON(message: Validator): JsonSafe<Validator> {
    const obj: any = {};
    message.address !== undefined &&
      (obj.address = base64FromBytes(
        message.address !== undefined ? message.address : new Uint8Array(),
      ));
    message.power !== undefined &&
      (obj.power = (message.power || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<Validator>): Validator {
    const message = createBaseValidator();
    message.address = object.address ?? new Uint8Array();
    message.power =
      object.power !== undefined && object.power !== null
        ? BigInt(object.power.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: ValidatorProtoMsg): Validator {
    return Validator.decode(message.value);
  },
  toProto(message: Validator): Uint8Array {
    return Validator.encode(message).finish();
  },
  toProtoMsg(message: Validator): ValidatorProtoMsg {
    return {
      typeUrl: '/tendermint.abci.Validator',
      value: Validator.encode(message).finish(),
    };
  },
};
function createBaseValidatorUpdate(): ValidatorUpdate {
  return {
    pubKey: PublicKey.fromPartial({}),
    power: BigInt(0),
  };
}
export const ValidatorUpdate = {
  typeUrl: '/tendermint.abci.ValidatorUpdate' as const,
  encode(
    message: ValidatorUpdate,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.pubKey !== undefined) {
      PublicKey.encode(message.pubKey, writer.uint32(10).fork()).ldelim();
    }
    if (message.power !== BigInt(0)) {
      writer.uint32(16).int64(message.power);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ValidatorUpdate {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseValidatorUpdate();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pubKey = PublicKey.decode(reader, reader.uint32());
          break;
        case 2:
          message.power = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ValidatorUpdate {
    return {
      pubKey: isSet(object.pubKey)
        ? PublicKey.fromJSON(object.pubKey)
        : undefined,
      power: isSet(object.power) ? BigInt(object.power.toString()) : BigInt(0),
    };
  },
  toJSON(message: ValidatorUpdate): JsonSafe<ValidatorUpdate> {
    const obj: any = {};
    message.pubKey !== undefined &&
      (obj.pubKey = message.pubKey
        ? PublicKey.toJSON(message.pubKey)
        : undefined);
    message.power !== undefined &&
      (obj.power = (message.power || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<ValidatorUpdate>): ValidatorUpdate {
    const message = createBaseValidatorUpdate();
    message.pubKey =
      object.pubKey !== undefined && object.pubKey !== null
        ? PublicKey.fromPartial(object.pubKey)
        : undefined;
    message.power =
      object.power !== undefined && object.power !== null
        ? BigInt(object.power.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: ValidatorUpdateProtoMsg): ValidatorUpdate {
    return ValidatorUpdate.decode(message.value);
  },
  toProto(message: ValidatorUpdate): Uint8Array {
    return ValidatorUpdate.encode(message).finish();
  },
  toProtoMsg(message: ValidatorUpdate): ValidatorUpdateProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ValidatorUpdate',
      value: ValidatorUpdate.encode(message).finish(),
    };
  },
};
function createBaseVoteInfo(): VoteInfo {
  return {
    validator: Validator.fromPartial({}),
    blockIdFlag: 0,
  };
}
export const VoteInfo = {
  typeUrl: '/tendermint.abci.VoteInfo' as const,
  encode(
    message: VoteInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.validator !== undefined) {
      Validator.encode(message.validator, writer.uint32(10).fork()).ldelim();
    }
    if (message.blockIdFlag !== 0) {
      writer.uint32(24).int32(message.blockIdFlag);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): VoteInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseVoteInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.validator = Validator.decode(reader, reader.uint32());
          break;
        case 3:
          message.blockIdFlag = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): VoteInfo {
    return {
      validator: isSet(object.validator)
        ? Validator.fromJSON(object.validator)
        : undefined,
      blockIdFlag: isSet(object.blockIdFlag)
        ? blockIDFlagFromJSON(object.blockIdFlag)
        : -1,
    };
  },
  toJSON(message: VoteInfo): JsonSafe<VoteInfo> {
    const obj: any = {};
    message.validator !== undefined &&
      (obj.validator = message.validator
        ? Validator.toJSON(message.validator)
        : undefined);
    message.blockIdFlag !== undefined &&
      (obj.blockIdFlag = blockIDFlagToJSON(message.blockIdFlag));
    return obj;
  },
  fromPartial(object: Partial<VoteInfo>): VoteInfo {
    const message = createBaseVoteInfo();
    message.validator =
      object.validator !== undefined && object.validator !== null
        ? Validator.fromPartial(object.validator)
        : undefined;
    message.blockIdFlag = object.blockIdFlag ?? 0;
    return message;
  },
  fromProtoMsg(message: VoteInfoProtoMsg): VoteInfo {
    return VoteInfo.decode(message.value);
  },
  toProto(message: VoteInfo): Uint8Array {
    return VoteInfo.encode(message).finish();
  },
  toProtoMsg(message: VoteInfo): VoteInfoProtoMsg {
    return {
      typeUrl: '/tendermint.abci.VoteInfo',
      value: VoteInfo.encode(message).finish(),
    };
  },
};
function createBaseExtendedVoteInfo(): ExtendedVoteInfo {
  return {
    validator: Validator.fromPartial({}),
    voteExtension: new Uint8Array(),
    extensionSignature: new Uint8Array(),
    blockIdFlag: 0,
  };
}
export const ExtendedVoteInfo = {
  typeUrl: '/tendermint.abci.ExtendedVoteInfo' as const,
  encode(
    message: ExtendedVoteInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.validator !== undefined) {
      Validator.encode(message.validator, writer.uint32(10).fork()).ldelim();
    }
    if (message.voteExtension.length !== 0) {
      writer.uint32(26).bytes(message.voteExtension);
    }
    if (message.extensionSignature.length !== 0) {
      writer.uint32(34).bytes(message.extensionSignature);
    }
    if (message.blockIdFlag !== 0) {
      writer.uint32(40).int32(message.blockIdFlag);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ExtendedVoteInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExtendedVoteInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.validator = Validator.decode(reader, reader.uint32());
          break;
        case 3:
          message.voteExtension = reader.bytes();
          break;
        case 4:
          message.extensionSignature = reader.bytes();
          break;
        case 5:
          message.blockIdFlag = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ExtendedVoteInfo {
    return {
      validator: isSet(object.validator)
        ? Validator.fromJSON(object.validator)
        : undefined,
      voteExtension: isSet(object.voteExtension)
        ? bytesFromBase64(object.voteExtension)
        : new Uint8Array(),
      extensionSignature: isSet(object.extensionSignature)
        ? bytesFromBase64(object.extensionSignature)
        : new Uint8Array(),
      blockIdFlag: isSet(object.blockIdFlag)
        ? blockIDFlagFromJSON(object.blockIdFlag)
        : -1,
    };
  },
  toJSON(message: ExtendedVoteInfo): JsonSafe<ExtendedVoteInfo> {
    const obj: any = {};
    message.validator !== undefined &&
      (obj.validator = message.validator
        ? Validator.toJSON(message.validator)
        : undefined);
    message.voteExtension !== undefined &&
      (obj.voteExtension = base64FromBytes(
        message.voteExtension !== undefined
          ? message.voteExtension
          : new Uint8Array(),
      ));
    message.extensionSignature !== undefined &&
      (obj.extensionSignature = base64FromBytes(
        message.extensionSignature !== undefined
          ? message.extensionSignature
          : new Uint8Array(),
      ));
    message.blockIdFlag !== undefined &&
      (obj.blockIdFlag = blockIDFlagToJSON(message.blockIdFlag));
    return obj;
  },
  fromPartial(object: Partial<ExtendedVoteInfo>): ExtendedVoteInfo {
    const message = createBaseExtendedVoteInfo();
    message.validator =
      object.validator !== undefined && object.validator !== null
        ? Validator.fromPartial(object.validator)
        : undefined;
    message.voteExtension = object.voteExtension ?? new Uint8Array();
    message.extensionSignature = object.extensionSignature ?? new Uint8Array();
    message.blockIdFlag = object.blockIdFlag ?? 0;
    return message;
  },
  fromProtoMsg(message: ExtendedVoteInfoProtoMsg): ExtendedVoteInfo {
    return ExtendedVoteInfo.decode(message.value);
  },
  toProto(message: ExtendedVoteInfo): Uint8Array {
    return ExtendedVoteInfo.encode(message).finish();
  },
  toProtoMsg(message: ExtendedVoteInfo): ExtendedVoteInfoProtoMsg {
    return {
      typeUrl: '/tendermint.abci.ExtendedVoteInfo',
      value: ExtendedVoteInfo.encode(message).finish(),
    };
  },
};
function createBaseMisbehavior(): Misbehavior {
  return {
    type: 0,
    validator: Validator.fromPartial({}),
    height: BigInt(0),
    time: Timestamp.fromPartial({}),
    totalVotingPower: BigInt(0),
  };
}
export const Misbehavior = {
  typeUrl: '/tendermint.abci.Misbehavior' as const,
  encode(
    message: Misbehavior,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.type !== 0) {
      writer.uint32(8).int32(message.type);
    }
    if (message.validator !== undefined) {
      Validator.encode(message.validator, writer.uint32(18).fork()).ldelim();
    }
    if (message.height !== BigInt(0)) {
      writer.uint32(24).int64(message.height);
    }
    if (message.time !== undefined) {
      Timestamp.encode(message.time, writer.uint32(34).fork()).ldelim();
    }
    if (message.totalVotingPower !== BigInt(0)) {
      writer.uint32(40).int64(message.totalVotingPower);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Misbehavior {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMisbehavior();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.type = reader.int32() as any;
          break;
        case 2:
          message.validator = Validator.decode(reader, reader.uint32());
          break;
        case 3:
          message.height = reader.int64();
          break;
        case 4:
          message.time = Timestamp.decode(reader, reader.uint32());
          break;
        case 5:
          message.totalVotingPower = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Misbehavior {
    return {
      type: isSet(object.type) ? misbehaviorTypeFromJSON(object.type) : -1,
      validator: isSet(object.validator)
        ? Validator.fromJSON(object.validator)
        : undefined,
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
      time: isSet(object.time) ? fromJsonTimestamp(object.time) : undefined,
      totalVotingPower: isSet(object.totalVotingPower)
        ? BigInt(object.totalVotingPower.toString())
        : BigInt(0),
    };
  },
  toJSON(message: Misbehavior): JsonSafe<Misbehavior> {
    const obj: any = {};
    message.type !== undefined &&
      (obj.type = misbehaviorTypeToJSON(message.type));
    message.validator !== undefined &&
      (obj.validator = message.validator
        ? Validator.toJSON(message.validator)
        : undefined);
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    message.time !== undefined &&
      (obj.time = fromTimestamp(message.time).toISOString());
    message.totalVotingPower !== undefined &&
      (obj.totalVotingPower = (
        message.totalVotingPower || BigInt(0)
      ).toString());
    return obj;
  },
  fromPartial(object: Partial<Misbehavior>): Misbehavior {
    const message = createBaseMisbehavior();
    message.type = object.type ?? 0;
    message.validator =
      object.validator !== undefined && object.validator !== null
        ? Validator.fromPartial(object.validator)
        : undefined;
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    message.time =
      object.time !== undefined && object.time !== null
        ? Timestamp.fromPartial(object.time)
        : undefined;
    message.totalVotingPower =
      object.totalVotingPower !== undefined && object.totalVotingPower !== null
        ? BigInt(object.totalVotingPower.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: MisbehaviorProtoMsg): Misbehavior {
    return Misbehavior.decode(message.value);
  },
  toProto(message: Misbehavior): Uint8Array {
    return Misbehavior.encode(message).finish();
  },
  toProtoMsg(message: Misbehavior): MisbehaviorProtoMsg {
    return {
      typeUrl: '/tendermint.abci.Misbehavior',
      value: Misbehavior.encode(message).finish(),
    };
  },
};
function createBaseSnapshot(): Snapshot {
  return {
    height: BigInt(0),
    format: 0,
    chunks: 0,
    hash: new Uint8Array(),
    metadata: new Uint8Array(),
  };
}
export const Snapshot = {
  typeUrl: '/tendermint.abci.Snapshot' as const,
  encode(
    message: Snapshot,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.height !== BigInt(0)) {
      writer.uint32(8).uint64(message.height);
    }
    if (message.format !== 0) {
      writer.uint32(16).uint32(message.format);
    }
    if (message.chunks !== 0) {
      writer.uint32(24).uint32(message.chunks);
    }
    if (message.hash.length !== 0) {
      writer.uint32(34).bytes(message.hash);
    }
    if (message.metadata.length !== 0) {
      writer.uint32(42).bytes(message.metadata);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Snapshot {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSnapshot();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.height = reader.uint64();
          break;
        case 2:
          message.format = reader.uint32();
          break;
        case 3:
          message.chunks = reader.uint32();
          break;
        case 4:
          message.hash = reader.bytes();
          break;
        case 5:
          message.metadata = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Snapshot {
    return {
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
      format: isSet(object.format) ? Number(object.format) : 0,
      chunks: isSet(object.chunks) ? Number(object.chunks) : 0,
      hash: isSet(object.hash)
        ? bytesFromBase64(object.hash)
        : new Uint8Array(),
      metadata: isSet(object.metadata)
        ? bytesFromBase64(object.metadata)
        : new Uint8Array(),
    };
  },
  toJSON(message: Snapshot): JsonSafe<Snapshot> {
    const obj: any = {};
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    message.format !== undefined && (obj.format = Math.round(message.format));
    message.chunks !== undefined && (obj.chunks = Math.round(message.chunks));
    message.hash !== undefined &&
      (obj.hash = base64FromBytes(
        message.hash !== undefined ? message.hash : new Uint8Array(),
      ));
    message.metadata !== undefined &&
      (obj.metadata = base64FromBytes(
        message.metadata !== undefined ? message.metadata : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<Snapshot>): Snapshot {
    const message = createBaseSnapshot();
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    message.format = object.format ?? 0;
    message.chunks = object.chunks ?? 0;
    message.hash = object.hash ?? new Uint8Array();
    message.metadata = object.metadata ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: SnapshotProtoMsg): Snapshot {
    return Snapshot.decode(message.value);
  },
  toProto(message: Snapshot): Uint8Array {
    return Snapshot.encode(message).finish();
  },
  toProtoMsg(message: Snapshot): SnapshotProtoMsg {
    return {
      typeUrl: '/tendermint.abci.Snapshot',
      value: Snapshot.encode(message).finish(),
    };
  },
};
