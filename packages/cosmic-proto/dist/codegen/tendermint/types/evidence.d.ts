import { Vote, type VoteSDKType, LightBlock, type LightBlockSDKType } from './types.js';
import { Timestamp, type TimestampSDKType } from '../../google/protobuf/timestamp.js';
import { Validator, type ValidatorSDKType } from './validator.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * @name Evidence
 * @package tendermint.types
 * @see proto type: tendermint.types.Evidence
 */
export interface Evidence {
    duplicateVoteEvidence?: DuplicateVoteEvidence;
    lightClientAttackEvidence?: LightClientAttackEvidence;
}
export interface EvidenceProtoMsg {
    typeUrl: '/tendermint.types.Evidence';
    value: Uint8Array;
}
/**
 * @name EvidenceSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.Evidence
 */
export interface EvidenceSDKType {
    duplicate_vote_evidence?: DuplicateVoteEvidenceSDKType;
    light_client_attack_evidence?: LightClientAttackEvidenceSDKType;
}
/**
 * DuplicateVoteEvidence contains evidence of a validator signed two conflicting votes.
 * @name DuplicateVoteEvidence
 * @package tendermint.types
 * @see proto type: tendermint.types.DuplicateVoteEvidence
 */
export interface DuplicateVoteEvidence {
    voteA?: Vote;
    voteB?: Vote;
    totalVotingPower: bigint;
    validatorPower: bigint;
    timestamp: Timestamp;
}
export interface DuplicateVoteEvidenceProtoMsg {
    typeUrl: '/tendermint.types.DuplicateVoteEvidence';
    value: Uint8Array;
}
/**
 * DuplicateVoteEvidence contains evidence of a validator signed two conflicting votes.
 * @name DuplicateVoteEvidenceSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.DuplicateVoteEvidence
 */
export interface DuplicateVoteEvidenceSDKType {
    vote_a?: VoteSDKType;
    vote_b?: VoteSDKType;
    total_voting_power: bigint;
    validator_power: bigint;
    timestamp: TimestampSDKType;
}
/**
 * LightClientAttackEvidence contains evidence of a set of validators attempting to mislead a light client.
 * @name LightClientAttackEvidence
 * @package tendermint.types
 * @see proto type: tendermint.types.LightClientAttackEvidence
 */
export interface LightClientAttackEvidence {
    conflictingBlock?: LightBlock;
    commonHeight: bigint;
    byzantineValidators: Validator[];
    totalVotingPower: bigint;
    timestamp: Timestamp;
}
export interface LightClientAttackEvidenceProtoMsg {
    typeUrl: '/tendermint.types.LightClientAttackEvidence';
    value: Uint8Array;
}
/**
 * LightClientAttackEvidence contains evidence of a set of validators attempting to mislead a light client.
 * @name LightClientAttackEvidenceSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.LightClientAttackEvidence
 */
export interface LightClientAttackEvidenceSDKType {
    conflicting_block?: LightBlockSDKType;
    common_height: bigint;
    byzantine_validators: ValidatorSDKType[];
    total_voting_power: bigint;
    timestamp: TimestampSDKType;
}
/**
 * @name EvidenceList
 * @package tendermint.types
 * @see proto type: tendermint.types.EvidenceList
 */
export interface EvidenceList {
    evidence: Evidence[];
}
export interface EvidenceListProtoMsg {
    typeUrl: '/tendermint.types.EvidenceList';
    value: Uint8Array;
}
/**
 * @name EvidenceListSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.EvidenceList
 */
export interface EvidenceListSDKType {
    evidence: EvidenceSDKType[];
}
/**
 * @name Evidence
 * @package tendermint.types
 * @see proto type: tendermint.types.Evidence
 */
export declare const Evidence: {
    typeUrl: "/tendermint.types.Evidence";
    is(o: any): o is Evidence;
    isSDK(o: any): o is EvidenceSDKType;
    encode(message: Evidence, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Evidence;
    fromJSON(object: any): Evidence;
    toJSON(message: Evidence): JsonSafe<Evidence>;
    fromPartial(object: Partial<Evidence>): Evidence;
    fromProtoMsg(message: EvidenceProtoMsg): Evidence;
    toProto(message: Evidence): Uint8Array;
    toProtoMsg(message: Evidence): EvidenceProtoMsg;
    registerTypeUrl(): void;
};
/**
 * DuplicateVoteEvidence contains evidence of a validator signed two conflicting votes.
 * @name DuplicateVoteEvidence
 * @package tendermint.types
 * @see proto type: tendermint.types.DuplicateVoteEvidence
 */
export declare const DuplicateVoteEvidence: {
    typeUrl: "/tendermint.types.DuplicateVoteEvidence";
    is(o: any): o is DuplicateVoteEvidence;
    isSDK(o: any): o is DuplicateVoteEvidenceSDKType;
    encode(message: DuplicateVoteEvidence, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DuplicateVoteEvidence;
    fromJSON(object: any): DuplicateVoteEvidence;
    toJSON(message: DuplicateVoteEvidence): JsonSafe<DuplicateVoteEvidence>;
    fromPartial(object: Partial<DuplicateVoteEvidence>): DuplicateVoteEvidence;
    fromProtoMsg(message: DuplicateVoteEvidenceProtoMsg): DuplicateVoteEvidence;
    toProto(message: DuplicateVoteEvidence): Uint8Array;
    toProtoMsg(message: DuplicateVoteEvidence): DuplicateVoteEvidenceProtoMsg;
    registerTypeUrl(): void;
};
/**
 * LightClientAttackEvidence contains evidence of a set of validators attempting to mislead a light client.
 * @name LightClientAttackEvidence
 * @package tendermint.types
 * @see proto type: tendermint.types.LightClientAttackEvidence
 */
export declare const LightClientAttackEvidence: {
    typeUrl: "/tendermint.types.LightClientAttackEvidence";
    is(o: any): o is LightClientAttackEvidence;
    isSDK(o: any): o is LightClientAttackEvidenceSDKType;
    encode(message: LightClientAttackEvidence, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): LightClientAttackEvidence;
    fromJSON(object: any): LightClientAttackEvidence;
    toJSON(message: LightClientAttackEvidence): JsonSafe<LightClientAttackEvidence>;
    fromPartial(object: Partial<LightClientAttackEvidence>): LightClientAttackEvidence;
    fromProtoMsg(message: LightClientAttackEvidenceProtoMsg): LightClientAttackEvidence;
    toProto(message: LightClientAttackEvidence): Uint8Array;
    toProtoMsg(message: LightClientAttackEvidence): LightClientAttackEvidenceProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name EvidenceList
 * @package tendermint.types
 * @see proto type: tendermint.types.EvidenceList
 */
export declare const EvidenceList: {
    typeUrl: "/tendermint.types.EvidenceList";
    is(o: any): o is EvidenceList;
    isSDK(o: any): o is EvidenceListSDKType;
    encode(message: EvidenceList, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EvidenceList;
    fromJSON(object: any): EvidenceList;
    toJSON(message: EvidenceList): JsonSafe<EvidenceList>;
    fromPartial(object: Partial<EvidenceList>): EvidenceList;
    fromProtoMsg(message: EvidenceListProtoMsg): EvidenceList;
    toProto(message: EvidenceList): Uint8Array;
    toProtoMsg(message: EvidenceList): EvidenceListProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=evidence.d.ts.map