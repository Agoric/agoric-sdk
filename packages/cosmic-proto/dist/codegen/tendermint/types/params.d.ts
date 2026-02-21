import { Duration, type DurationSDKType } from '../../google/protobuf/duration.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * ConsensusParams contains consensus critical parameters that determine the
 * validity of blocks.
 * @name ConsensusParams
 * @package tendermint.types
 * @see proto type: tendermint.types.ConsensusParams
 */
export interface ConsensusParams {
    block?: BlockParams;
    evidence?: EvidenceParams;
    validator?: ValidatorParams;
    version?: VersionParams;
    abci?: ABCIParams;
}
export interface ConsensusParamsProtoMsg {
    typeUrl: '/tendermint.types.ConsensusParams';
    value: Uint8Array;
}
/**
 * ConsensusParams contains consensus critical parameters that determine the
 * validity of blocks.
 * @name ConsensusParamsSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.ConsensusParams
 */
export interface ConsensusParamsSDKType {
    block?: BlockParamsSDKType;
    evidence?: EvidenceParamsSDKType;
    validator?: ValidatorParamsSDKType;
    version?: VersionParamsSDKType;
    abci?: ABCIParamsSDKType;
}
/**
 * BlockParams contains limits on the block size.
 * @name BlockParams
 * @package tendermint.types
 * @see proto type: tendermint.types.BlockParams
 */
export interface BlockParams {
    /**
     * Max block size, in bytes.
     * Note: must be greater than 0
     */
    maxBytes: bigint;
    /**
     * Max gas per block.
     * Note: must be greater or equal to -1
     */
    maxGas: bigint;
}
export interface BlockParamsProtoMsg {
    typeUrl: '/tendermint.types.BlockParams';
    value: Uint8Array;
}
/**
 * BlockParams contains limits on the block size.
 * @name BlockParamsSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.BlockParams
 */
export interface BlockParamsSDKType {
    max_bytes: bigint;
    max_gas: bigint;
}
/**
 * EvidenceParams determine how we handle evidence of malfeasance.
 * @name EvidenceParams
 * @package tendermint.types
 * @see proto type: tendermint.types.EvidenceParams
 */
export interface EvidenceParams {
    /**
     * Max age of evidence, in blocks.
     *
     * The basic formula for calculating this is: MaxAgeDuration / {average block
     * time}.
     */
    maxAgeNumBlocks: bigint;
    /**
     * Max age of evidence, in time.
     *
     * It should correspond with an app's "unbonding period" or other similar
     * mechanism for handling [Nothing-At-Stake
     * attacks](https://github.com/ethereum/wiki/wiki/Proof-of-Stake-FAQ#what-is-the-nothing-at-stake-problem-and-how-can-it-be-fixed).
     */
    maxAgeDuration: Duration;
    /**
     * This sets the maximum size of total evidence in bytes that can be committed in a single block.
     * and should fall comfortably under the max block bytes.
     * Default is 1048576 or 1MB
     */
    maxBytes: bigint;
}
export interface EvidenceParamsProtoMsg {
    typeUrl: '/tendermint.types.EvidenceParams';
    value: Uint8Array;
}
/**
 * EvidenceParams determine how we handle evidence of malfeasance.
 * @name EvidenceParamsSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.EvidenceParams
 */
export interface EvidenceParamsSDKType {
    max_age_num_blocks: bigint;
    max_age_duration: DurationSDKType;
    max_bytes: bigint;
}
/**
 * ValidatorParams restrict the public key types validators can use.
 * NOTE: uses ABCI pubkey naming, not Amino names.
 * @name ValidatorParams
 * @package tendermint.types
 * @see proto type: tendermint.types.ValidatorParams
 */
export interface ValidatorParams {
    pubKeyTypes: string[];
}
export interface ValidatorParamsProtoMsg {
    typeUrl: '/tendermint.types.ValidatorParams';
    value: Uint8Array;
}
/**
 * ValidatorParams restrict the public key types validators can use.
 * NOTE: uses ABCI pubkey naming, not Amino names.
 * @name ValidatorParamsSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.ValidatorParams
 */
export interface ValidatorParamsSDKType {
    pub_key_types: string[];
}
/**
 * VersionParams contains the ABCI application version.
 * @name VersionParams
 * @package tendermint.types
 * @see proto type: tendermint.types.VersionParams
 */
export interface VersionParams {
    app: bigint;
}
export interface VersionParamsProtoMsg {
    typeUrl: '/tendermint.types.VersionParams';
    value: Uint8Array;
}
/**
 * VersionParams contains the ABCI application version.
 * @name VersionParamsSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.VersionParams
 */
export interface VersionParamsSDKType {
    app: bigint;
}
/**
 * HashedParams is a subset of ConsensusParams.
 *
 * It is hashed into the Header.ConsensusHash.
 * @name HashedParams
 * @package tendermint.types
 * @see proto type: tendermint.types.HashedParams
 */
export interface HashedParams {
    blockMaxBytes: bigint;
    blockMaxGas: bigint;
}
export interface HashedParamsProtoMsg {
    typeUrl: '/tendermint.types.HashedParams';
    value: Uint8Array;
}
/**
 * HashedParams is a subset of ConsensusParams.
 *
 * It is hashed into the Header.ConsensusHash.
 * @name HashedParamsSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.HashedParams
 */
export interface HashedParamsSDKType {
    block_max_bytes: bigint;
    block_max_gas: bigint;
}
/**
 * ABCIParams configure functionality specific to the Application Blockchain Interface.
 * @name ABCIParams
 * @package tendermint.types
 * @see proto type: tendermint.types.ABCIParams
 */
export interface ABCIParams {
    /**
     * vote_extensions_enable_height configures the first height during which
     * vote extensions will be enabled. During this specified height, and for all
     * subsequent heights, precommit messages that do not contain valid extension data
     * will be considered invalid. Prior to this height, vote extensions will not
     * be used or accepted by validators on the network.
     *
     * Once enabled, vote extensions will be created by the application in ExtendVote,
     * passed to the application for validation in VerifyVoteExtension and given
     * to the application to use when proposing a block during PrepareProposal.
     */
    voteExtensionsEnableHeight: bigint;
}
export interface ABCIParamsProtoMsg {
    typeUrl: '/tendermint.types.ABCIParams';
    value: Uint8Array;
}
/**
 * ABCIParams configure functionality specific to the Application Blockchain Interface.
 * @name ABCIParamsSDKType
 * @package tendermint.types
 * @see proto type: tendermint.types.ABCIParams
 */
export interface ABCIParamsSDKType {
    vote_extensions_enable_height: bigint;
}
/**
 * ConsensusParams contains consensus critical parameters that determine the
 * validity of blocks.
 * @name ConsensusParams
 * @package tendermint.types
 * @see proto type: tendermint.types.ConsensusParams
 */
export declare const ConsensusParams: {
    typeUrl: "/tendermint.types.ConsensusParams";
    is(o: any): o is ConsensusParams;
    isSDK(o: any): o is ConsensusParamsSDKType;
    encode(message: ConsensusParams, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ConsensusParams;
    fromJSON(object: any): ConsensusParams;
    toJSON(message: ConsensusParams): JsonSafe<ConsensusParams>;
    fromPartial(object: Partial<ConsensusParams>): ConsensusParams;
    fromProtoMsg(message: ConsensusParamsProtoMsg): ConsensusParams;
    toProto(message: ConsensusParams): Uint8Array;
    toProtoMsg(message: ConsensusParams): ConsensusParamsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * BlockParams contains limits on the block size.
 * @name BlockParams
 * @package tendermint.types
 * @see proto type: tendermint.types.BlockParams
 */
export declare const BlockParams: {
    typeUrl: "/tendermint.types.BlockParams";
    is(o: any): o is BlockParams;
    isSDK(o: any): o is BlockParamsSDKType;
    encode(message: BlockParams, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): BlockParams;
    fromJSON(object: any): BlockParams;
    toJSON(message: BlockParams): JsonSafe<BlockParams>;
    fromPartial(object: Partial<BlockParams>): BlockParams;
    fromProtoMsg(message: BlockParamsProtoMsg): BlockParams;
    toProto(message: BlockParams): Uint8Array;
    toProtoMsg(message: BlockParams): BlockParamsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * EvidenceParams determine how we handle evidence of malfeasance.
 * @name EvidenceParams
 * @package tendermint.types
 * @see proto type: tendermint.types.EvidenceParams
 */
export declare const EvidenceParams: {
    typeUrl: "/tendermint.types.EvidenceParams";
    is(o: any): o is EvidenceParams;
    isSDK(o: any): o is EvidenceParamsSDKType;
    encode(message: EvidenceParams, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): EvidenceParams;
    fromJSON(object: any): EvidenceParams;
    toJSON(message: EvidenceParams): JsonSafe<EvidenceParams>;
    fromPartial(object: Partial<EvidenceParams>): EvidenceParams;
    fromProtoMsg(message: EvidenceParamsProtoMsg): EvidenceParams;
    toProto(message: EvidenceParams): Uint8Array;
    toProtoMsg(message: EvidenceParams): EvidenceParamsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ValidatorParams restrict the public key types validators can use.
 * NOTE: uses ABCI pubkey naming, not Amino names.
 * @name ValidatorParams
 * @package tendermint.types
 * @see proto type: tendermint.types.ValidatorParams
 */
export declare const ValidatorParams: {
    typeUrl: "/tendermint.types.ValidatorParams";
    is(o: any): o is ValidatorParams;
    isSDK(o: any): o is ValidatorParamsSDKType;
    encode(message: ValidatorParams, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ValidatorParams;
    fromJSON(object: any): ValidatorParams;
    toJSON(message: ValidatorParams): JsonSafe<ValidatorParams>;
    fromPartial(object: Partial<ValidatorParams>): ValidatorParams;
    fromProtoMsg(message: ValidatorParamsProtoMsg): ValidatorParams;
    toProto(message: ValidatorParams): Uint8Array;
    toProtoMsg(message: ValidatorParams): ValidatorParamsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * VersionParams contains the ABCI application version.
 * @name VersionParams
 * @package tendermint.types
 * @see proto type: tendermint.types.VersionParams
 */
export declare const VersionParams: {
    typeUrl: "/tendermint.types.VersionParams";
    is(o: any): o is VersionParams;
    isSDK(o: any): o is VersionParamsSDKType;
    encode(message: VersionParams, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): VersionParams;
    fromJSON(object: any): VersionParams;
    toJSON(message: VersionParams): JsonSafe<VersionParams>;
    fromPartial(object: Partial<VersionParams>): VersionParams;
    fromProtoMsg(message: VersionParamsProtoMsg): VersionParams;
    toProto(message: VersionParams): Uint8Array;
    toProtoMsg(message: VersionParams): VersionParamsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * HashedParams is a subset of ConsensusParams.
 *
 * It is hashed into the Header.ConsensusHash.
 * @name HashedParams
 * @package tendermint.types
 * @see proto type: tendermint.types.HashedParams
 */
export declare const HashedParams: {
    typeUrl: "/tendermint.types.HashedParams";
    is(o: any): o is HashedParams;
    isSDK(o: any): o is HashedParamsSDKType;
    encode(message: HashedParams, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): HashedParams;
    fromJSON(object: any): HashedParams;
    toJSON(message: HashedParams): JsonSafe<HashedParams>;
    fromPartial(object: Partial<HashedParams>): HashedParams;
    fromProtoMsg(message: HashedParamsProtoMsg): HashedParams;
    toProto(message: HashedParams): Uint8Array;
    toProtoMsg(message: HashedParams): HashedParamsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ABCIParams configure functionality specific to the Application Blockchain Interface.
 * @name ABCIParams
 * @package tendermint.types
 * @see proto type: tendermint.types.ABCIParams
 */
export declare const ABCIParams: {
    typeUrl: "/tendermint.types.ABCIParams";
    is(o: any): o is ABCIParams;
    isSDK(o: any): o is ABCIParamsSDKType;
    encode(message: ABCIParams, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ABCIParams;
    fromJSON(object: any): ABCIParams;
    toJSON(message: ABCIParams): JsonSafe<ABCIParams>;
    fromPartial(object: Partial<ABCIParams>): ABCIParams;
    fromProtoMsg(message: ABCIParamsProtoMsg): ABCIParams;
    toProto(message: ABCIParams): Uint8Array;
    toProtoMsg(message: ABCIParams): ABCIParamsProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=params.d.ts.map