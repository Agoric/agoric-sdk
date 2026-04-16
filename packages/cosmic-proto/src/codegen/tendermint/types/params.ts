//@ts-nocheck
import {
  Duration,
  type DurationSDKType,
} from '../../google/protobuf/duration.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
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
function createBaseConsensusParams(): ConsensusParams {
  return {
    block: undefined,
    evidence: undefined,
    validator: undefined,
    version: undefined,
    abci: undefined,
  };
}
/**
 * ConsensusParams contains consensus critical parameters that determine the
 * validity of blocks.
 * @name ConsensusParams
 * @package tendermint.types
 * @see proto type: tendermint.types.ConsensusParams
 */
export const ConsensusParams = {
  typeUrl: '/tendermint.types.ConsensusParams' as const,
  is(o: any): o is ConsensusParams {
    return o && o.$typeUrl === ConsensusParams.typeUrl;
  },
  isSDK(o: any): o is ConsensusParamsSDKType {
    return o && o.$typeUrl === ConsensusParams.typeUrl;
  },
  encode(
    message: ConsensusParams,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.block !== undefined) {
      BlockParams.encode(message.block, writer.uint32(10).fork()).ldelim();
    }
    if (message.evidence !== undefined) {
      EvidenceParams.encode(
        message.evidence,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    if (message.validator !== undefined) {
      ValidatorParams.encode(
        message.validator,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    if (message.version !== undefined) {
      VersionParams.encode(message.version, writer.uint32(34).fork()).ldelim();
    }
    if (message.abci !== undefined) {
      ABCIParams.encode(message.abci, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ConsensusParams {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseConsensusParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.block = BlockParams.decode(reader, reader.uint32());
          break;
        case 2:
          message.evidence = EvidenceParams.decode(reader, reader.uint32());
          break;
        case 3:
          message.validator = ValidatorParams.decode(reader, reader.uint32());
          break;
        case 4:
          message.version = VersionParams.decode(reader, reader.uint32());
          break;
        case 5:
          message.abci = ABCIParams.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ConsensusParams {
    return {
      block: isSet(object.block)
        ? BlockParams.fromJSON(object.block)
        : undefined,
      evidence: isSet(object.evidence)
        ? EvidenceParams.fromJSON(object.evidence)
        : undefined,
      validator: isSet(object.validator)
        ? ValidatorParams.fromJSON(object.validator)
        : undefined,
      version: isSet(object.version)
        ? VersionParams.fromJSON(object.version)
        : undefined,
      abci: isSet(object.abci) ? ABCIParams.fromJSON(object.abci) : undefined,
    };
  },
  toJSON(message: ConsensusParams): JsonSafe<ConsensusParams> {
    const obj: any = {};
    message.block !== undefined &&
      (obj.block = message.block
        ? BlockParams.toJSON(message.block)
        : undefined);
    message.evidence !== undefined &&
      (obj.evidence = message.evidence
        ? EvidenceParams.toJSON(message.evidence)
        : undefined);
    message.validator !== undefined &&
      (obj.validator = message.validator
        ? ValidatorParams.toJSON(message.validator)
        : undefined);
    message.version !== undefined &&
      (obj.version = message.version
        ? VersionParams.toJSON(message.version)
        : undefined);
    message.abci !== undefined &&
      (obj.abci = message.abci ? ABCIParams.toJSON(message.abci) : undefined);
    return obj;
  },
  fromPartial(object: Partial<ConsensusParams>): ConsensusParams {
    const message = createBaseConsensusParams();
    message.block =
      object.block !== undefined && object.block !== null
        ? BlockParams.fromPartial(object.block)
        : undefined;
    message.evidence =
      object.evidence !== undefined && object.evidence !== null
        ? EvidenceParams.fromPartial(object.evidence)
        : undefined;
    message.validator =
      object.validator !== undefined && object.validator !== null
        ? ValidatorParams.fromPartial(object.validator)
        : undefined;
    message.version =
      object.version !== undefined && object.version !== null
        ? VersionParams.fromPartial(object.version)
        : undefined;
    message.abci =
      object.abci !== undefined && object.abci !== null
        ? ABCIParams.fromPartial(object.abci)
        : undefined;
    return message;
  },
  fromProtoMsg(message: ConsensusParamsProtoMsg): ConsensusParams {
    return ConsensusParams.decode(message.value);
  },
  toProto(message: ConsensusParams): Uint8Array {
    return ConsensusParams.encode(message).finish();
  },
  toProtoMsg(message: ConsensusParams): ConsensusParamsProtoMsg {
    return {
      typeUrl: '/tendermint.types.ConsensusParams',
      value: ConsensusParams.encode(message).finish(),
    };
  },
};
function createBaseBlockParams(): BlockParams {
  return {
    maxBytes: BigInt(0),
    maxGas: BigInt(0),
  };
}
/**
 * BlockParams contains limits on the block size.
 * @name BlockParams
 * @package tendermint.types
 * @see proto type: tendermint.types.BlockParams
 */
export const BlockParams = {
  typeUrl: '/tendermint.types.BlockParams' as const,
  is(o: any): o is BlockParams {
    return (
      o &&
      (o.$typeUrl === BlockParams.typeUrl ||
        (typeof o.maxBytes === 'bigint' && typeof o.maxGas === 'bigint'))
    );
  },
  isSDK(o: any): o is BlockParamsSDKType {
    return (
      o &&
      (o.$typeUrl === BlockParams.typeUrl ||
        (typeof o.max_bytes === 'bigint' && typeof o.max_gas === 'bigint'))
    );
  },
  encode(
    message: BlockParams,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.maxBytes !== BigInt(0)) {
      writer.uint32(8).int64(message.maxBytes);
    }
    if (message.maxGas !== BigInt(0)) {
      writer.uint32(16).int64(message.maxGas);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): BlockParams {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBlockParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.maxBytes = reader.int64();
          break;
        case 2:
          message.maxGas = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): BlockParams {
    return {
      maxBytes: isSet(object.maxBytes)
        ? BigInt(object.maxBytes.toString())
        : BigInt(0),
      maxGas: isSet(object.maxGas)
        ? BigInt(object.maxGas.toString())
        : BigInt(0),
    };
  },
  toJSON(message: BlockParams): JsonSafe<BlockParams> {
    const obj: any = {};
    message.maxBytes !== undefined &&
      (obj.maxBytes = (message.maxBytes || BigInt(0)).toString());
    message.maxGas !== undefined &&
      (obj.maxGas = (message.maxGas || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<BlockParams>): BlockParams {
    const message = createBaseBlockParams();
    message.maxBytes =
      object.maxBytes !== undefined && object.maxBytes !== null
        ? BigInt(object.maxBytes.toString())
        : BigInt(0);
    message.maxGas =
      object.maxGas !== undefined && object.maxGas !== null
        ? BigInt(object.maxGas.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: BlockParamsProtoMsg): BlockParams {
    return BlockParams.decode(message.value);
  },
  toProto(message: BlockParams): Uint8Array {
    return BlockParams.encode(message).finish();
  },
  toProtoMsg(message: BlockParams): BlockParamsProtoMsg {
    return {
      typeUrl: '/tendermint.types.BlockParams',
      value: BlockParams.encode(message).finish(),
    };
  },
};
function createBaseEvidenceParams(): EvidenceParams {
  return {
    maxAgeNumBlocks: BigInt(0),
    maxAgeDuration: Duration.fromPartial({}),
    maxBytes: BigInt(0),
  };
}
/**
 * EvidenceParams determine how we handle evidence of malfeasance.
 * @name EvidenceParams
 * @package tendermint.types
 * @see proto type: tendermint.types.EvidenceParams
 */
export const EvidenceParams = {
  typeUrl: '/tendermint.types.EvidenceParams' as const,
  is(o: any): o is EvidenceParams {
    return (
      o &&
      (o.$typeUrl === EvidenceParams.typeUrl ||
        (typeof o.maxAgeNumBlocks === 'bigint' &&
          Duration.is(o.maxAgeDuration) &&
          typeof o.maxBytes === 'bigint'))
    );
  },
  isSDK(o: any): o is EvidenceParamsSDKType {
    return (
      o &&
      (o.$typeUrl === EvidenceParams.typeUrl ||
        (typeof o.max_age_num_blocks === 'bigint' &&
          Duration.isSDK(o.max_age_duration) &&
          typeof o.max_bytes === 'bigint'))
    );
  },
  encode(
    message: EvidenceParams,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.maxAgeNumBlocks !== BigInt(0)) {
      writer.uint32(8).int64(message.maxAgeNumBlocks);
    }
    if (message.maxAgeDuration !== undefined) {
      Duration.encode(
        message.maxAgeDuration,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    if (message.maxBytes !== BigInt(0)) {
      writer.uint32(24).int64(message.maxBytes);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EvidenceParams {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEvidenceParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.maxAgeNumBlocks = reader.int64();
          break;
        case 2:
          message.maxAgeDuration = Duration.decode(reader, reader.uint32());
          break;
        case 3:
          message.maxBytes = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EvidenceParams {
    return {
      maxAgeNumBlocks: isSet(object.maxAgeNumBlocks)
        ? BigInt(object.maxAgeNumBlocks.toString())
        : BigInt(0),
      maxAgeDuration: isSet(object.maxAgeDuration)
        ? Duration.fromJSON(object.maxAgeDuration)
        : undefined,
      maxBytes: isSet(object.maxBytes)
        ? BigInt(object.maxBytes.toString())
        : BigInt(0),
    };
  },
  toJSON(message: EvidenceParams): JsonSafe<EvidenceParams> {
    const obj: any = {};
    message.maxAgeNumBlocks !== undefined &&
      (obj.maxAgeNumBlocks = (message.maxAgeNumBlocks || BigInt(0)).toString());
    message.maxAgeDuration !== undefined &&
      (obj.maxAgeDuration = message.maxAgeDuration
        ? Duration.toJSON(message.maxAgeDuration)
        : undefined);
    message.maxBytes !== undefined &&
      (obj.maxBytes = (message.maxBytes || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<EvidenceParams>): EvidenceParams {
    const message = createBaseEvidenceParams();
    message.maxAgeNumBlocks =
      object.maxAgeNumBlocks !== undefined && object.maxAgeNumBlocks !== null
        ? BigInt(object.maxAgeNumBlocks.toString())
        : BigInt(0);
    message.maxAgeDuration =
      object.maxAgeDuration !== undefined && object.maxAgeDuration !== null
        ? Duration.fromPartial(object.maxAgeDuration)
        : undefined;
    message.maxBytes =
      object.maxBytes !== undefined && object.maxBytes !== null
        ? BigInt(object.maxBytes.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: EvidenceParamsProtoMsg): EvidenceParams {
    return EvidenceParams.decode(message.value);
  },
  toProto(message: EvidenceParams): Uint8Array {
    return EvidenceParams.encode(message).finish();
  },
  toProtoMsg(message: EvidenceParams): EvidenceParamsProtoMsg {
    return {
      typeUrl: '/tendermint.types.EvidenceParams',
      value: EvidenceParams.encode(message).finish(),
    };
  },
};
function createBaseValidatorParams(): ValidatorParams {
  return {
    pubKeyTypes: [],
  };
}
/**
 * ValidatorParams restrict the public key types validators can use.
 * NOTE: uses ABCI pubkey naming, not Amino names.
 * @name ValidatorParams
 * @package tendermint.types
 * @see proto type: tendermint.types.ValidatorParams
 */
export const ValidatorParams = {
  typeUrl: '/tendermint.types.ValidatorParams' as const,
  is(o: any): o is ValidatorParams {
    return (
      o &&
      (o.$typeUrl === ValidatorParams.typeUrl ||
        (Array.isArray(o.pubKeyTypes) &&
          (!o.pubKeyTypes.length || typeof o.pubKeyTypes[0] === 'string')))
    );
  },
  isSDK(o: any): o is ValidatorParamsSDKType {
    return (
      o &&
      (o.$typeUrl === ValidatorParams.typeUrl ||
        (Array.isArray(o.pub_key_types) &&
          (!o.pub_key_types.length || typeof o.pub_key_types[0] === 'string')))
    );
  },
  encode(
    message: ValidatorParams,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.pubKeyTypes) {
      writer.uint32(10).string(v!);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ValidatorParams {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseValidatorParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pubKeyTypes.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ValidatorParams {
    return {
      pubKeyTypes: Array.isArray(object?.pubKeyTypes)
        ? object.pubKeyTypes.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: ValidatorParams): JsonSafe<ValidatorParams> {
    const obj: any = {};
    if (message.pubKeyTypes) {
      obj.pubKeyTypes = message.pubKeyTypes.map(e => e);
    } else {
      obj.pubKeyTypes = [];
    }
    return obj;
  },
  fromPartial(object: Partial<ValidatorParams>): ValidatorParams {
    const message = createBaseValidatorParams();
    message.pubKeyTypes = object.pubKeyTypes?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: ValidatorParamsProtoMsg): ValidatorParams {
    return ValidatorParams.decode(message.value);
  },
  toProto(message: ValidatorParams): Uint8Array {
    return ValidatorParams.encode(message).finish();
  },
  toProtoMsg(message: ValidatorParams): ValidatorParamsProtoMsg {
    return {
      typeUrl: '/tendermint.types.ValidatorParams',
      value: ValidatorParams.encode(message).finish(),
    };
  },
};
function createBaseVersionParams(): VersionParams {
  return {
    app: BigInt(0),
  };
}
/**
 * VersionParams contains the ABCI application version.
 * @name VersionParams
 * @package tendermint.types
 * @see proto type: tendermint.types.VersionParams
 */
export const VersionParams = {
  typeUrl: '/tendermint.types.VersionParams' as const,
  is(o: any): o is VersionParams {
    return (
      o && (o.$typeUrl === VersionParams.typeUrl || typeof o.app === 'bigint')
    );
  },
  isSDK(o: any): o is VersionParamsSDKType {
    return (
      o && (o.$typeUrl === VersionParams.typeUrl || typeof o.app === 'bigint')
    );
  },
  encode(
    message: VersionParams,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.app !== BigInt(0)) {
      writer.uint32(8).uint64(message.app);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): VersionParams {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseVersionParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.app = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): VersionParams {
    return {
      app: isSet(object.app) ? BigInt(object.app.toString()) : BigInt(0),
    };
  },
  toJSON(message: VersionParams): JsonSafe<VersionParams> {
    const obj: any = {};
    message.app !== undefined &&
      (obj.app = (message.app || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<VersionParams>): VersionParams {
    const message = createBaseVersionParams();
    message.app =
      object.app !== undefined && object.app !== null
        ? BigInt(object.app.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: VersionParamsProtoMsg): VersionParams {
    return VersionParams.decode(message.value);
  },
  toProto(message: VersionParams): Uint8Array {
    return VersionParams.encode(message).finish();
  },
  toProtoMsg(message: VersionParams): VersionParamsProtoMsg {
    return {
      typeUrl: '/tendermint.types.VersionParams',
      value: VersionParams.encode(message).finish(),
    };
  },
};
function createBaseHashedParams(): HashedParams {
  return {
    blockMaxBytes: BigInt(0),
    blockMaxGas: BigInt(0),
  };
}
/**
 * HashedParams is a subset of ConsensusParams.
 *
 * It is hashed into the Header.ConsensusHash.
 * @name HashedParams
 * @package tendermint.types
 * @see proto type: tendermint.types.HashedParams
 */
export const HashedParams = {
  typeUrl: '/tendermint.types.HashedParams' as const,
  is(o: any): o is HashedParams {
    return (
      o &&
      (o.$typeUrl === HashedParams.typeUrl ||
        (typeof o.blockMaxBytes === 'bigint' &&
          typeof o.blockMaxGas === 'bigint'))
    );
  },
  isSDK(o: any): o is HashedParamsSDKType {
    return (
      o &&
      (o.$typeUrl === HashedParams.typeUrl ||
        (typeof o.block_max_bytes === 'bigint' &&
          typeof o.block_max_gas === 'bigint'))
    );
  },
  encode(
    message: HashedParams,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.blockMaxBytes !== BigInt(0)) {
      writer.uint32(8).int64(message.blockMaxBytes);
    }
    if (message.blockMaxGas !== BigInt(0)) {
      writer.uint32(16).int64(message.blockMaxGas);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): HashedParams {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseHashedParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.blockMaxBytes = reader.int64();
          break;
        case 2:
          message.blockMaxGas = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): HashedParams {
    return {
      blockMaxBytes: isSet(object.blockMaxBytes)
        ? BigInt(object.blockMaxBytes.toString())
        : BigInt(0),
      blockMaxGas: isSet(object.blockMaxGas)
        ? BigInt(object.blockMaxGas.toString())
        : BigInt(0),
    };
  },
  toJSON(message: HashedParams): JsonSafe<HashedParams> {
    const obj: any = {};
    message.blockMaxBytes !== undefined &&
      (obj.blockMaxBytes = (message.blockMaxBytes || BigInt(0)).toString());
    message.blockMaxGas !== undefined &&
      (obj.blockMaxGas = (message.blockMaxGas || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<HashedParams>): HashedParams {
    const message = createBaseHashedParams();
    message.blockMaxBytes =
      object.blockMaxBytes !== undefined && object.blockMaxBytes !== null
        ? BigInt(object.blockMaxBytes.toString())
        : BigInt(0);
    message.blockMaxGas =
      object.blockMaxGas !== undefined && object.blockMaxGas !== null
        ? BigInt(object.blockMaxGas.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: HashedParamsProtoMsg): HashedParams {
    return HashedParams.decode(message.value);
  },
  toProto(message: HashedParams): Uint8Array {
    return HashedParams.encode(message).finish();
  },
  toProtoMsg(message: HashedParams): HashedParamsProtoMsg {
    return {
      typeUrl: '/tendermint.types.HashedParams',
      value: HashedParams.encode(message).finish(),
    };
  },
};
function createBaseABCIParams(): ABCIParams {
  return {
    voteExtensionsEnableHeight: BigInt(0),
  };
}
/**
 * ABCIParams configure functionality specific to the Application Blockchain Interface.
 * @name ABCIParams
 * @package tendermint.types
 * @see proto type: tendermint.types.ABCIParams
 */
export const ABCIParams = {
  typeUrl: '/tendermint.types.ABCIParams' as const,
  is(o: any): o is ABCIParams {
    return (
      o &&
      (o.$typeUrl === ABCIParams.typeUrl ||
        typeof o.voteExtensionsEnableHeight === 'bigint')
    );
  },
  isSDK(o: any): o is ABCIParamsSDKType {
    return (
      o &&
      (o.$typeUrl === ABCIParams.typeUrl ||
        typeof o.vote_extensions_enable_height === 'bigint')
    );
  },
  encode(
    message: ABCIParams,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.voteExtensionsEnableHeight !== BigInt(0)) {
      writer.uint32(8).int64(message.voteExtensionsEnableHeight);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ABCIParams {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseABCIParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.voteExtensionsEnableHeight = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ABCIParams {
    return {
      voteExtensionsEnableHeight: isSet(object.voteExtensionsEnableHeight)
        ? BigInt(object.voteExtensionsEnableHeight.toString())
        : BigInt(0),
    };
  },
  toJSON(message: ABCIParams): JsonSafe<ABCIParams> {
    const obj: any = {};
    message.voteExtensionsEnableHeight !== undefined &&
      (obj.voteExtensionsEnableHeight = (
        message.voteExtensionsEnableHeight || BigInt(0)
      ).toString());
    return obj;
  },
  fromPartial(object: Partial<ABCIParams>): ABCIParams {
    const message = createBaseABCIParams();
    message.voteExtensionsEnableHeight =
      object.voteExtensionsEnableHeight !== undefined &&
      object.voteExtensionsEnableHeight !== null
        ? BigInt(object.voteExtensionsEnableHeight.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: ABCIParamsProtoMsg): ABCIParams {
    return ABCIParams.decode(message.value);
  },
  toProto(message: ABCIParams): Uint8Array {
    return ABCIParams.encode(message).finish();
  },
  toProtoMsg(message: ABCIParams): ABCIParamsProtoMsg {
    return {
      typeUrl: '/tendermint.types.ABCIParams',
      value: ABCIParams.encode(message).finish(),
    };
  },
};
