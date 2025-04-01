//@ts-nocheck
import {
  ChunkedArtifact,
  type ChunkedArtifactSDKType,
  ChunkInfo,
  type ChunkInfoSDKType,
} from './swingset.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
import { type JsonSafe } from '../../json-safe.js';
/** MsgDeliverInbound defines an SDK message for delivering an eventual send */
export interface MsgDeliverInbound {
  messages: string[];
  nums: bigint[];
  ack: bigint;
  submitter: Uint8Array;
}
export interface MsgDeliverInboundProtoMsg {
  typeUrl: '/agoric.swingset.MsgDeliverInbound';
  value: Uint8Array;
}
/** MsgDeliverInbound defines an SDK message for delivering an eventual send */
export interface MsgDeliverInboundSDKType {
  messages: string[];
  nums: bigint[];
  ack: bigint;
  submitter: Uint8Array;
}
/** MsgDeliverInboundResponse is an empty reply. */
export interface MsgDeliverInboundResponse {}
export interface MsgDeliverInboundResponseProtoMsg {
  typeUrl: '/agoric.swingset.MsgDeliverInboundResponse';
  value: Uint8Array;
}
/** MsgDeliverInboundResponse is an empty reply. */
export interface MsgDeliverInboundResponseSDKType {}
/**
 * MsgWalletAction defines an SDK message for the on-chain wallet to perform an
 * action that *does not* spend any assets (other than gas fees/stamps).  This
 * message type is typically protected by feegrant budgets.
 */
export interface MsgWalletAction {
  owner: Uint8Array;
  /** The action to perform, as JSON-stringified marshalled data. */
  action: string;
}
export interface MsgWalletActionProtoMsg {
  typeUrl: '/agoric.swingset.MsgWalletAction';
  value: Uint8Array;
}
/**
 * MsgWalletAction defines an SDK message for the on-chain wallet to perform an
 * action that *does not* spend any assets (other than gas fees/stamps).  This
 * message type is typically protected by feegrant budgets.
 */
export interface MsgWalletActionSDKType {
  owner: Uint8Array;
  action: string;
}
/** MsgWalletActionResponse is an empty reply. */
export interface MsgWalletActionResponse {}
export interface MsgWalletActionResponseProtoMsg {
  typeUrl: '/agoric.swingset.MsgWalletActionResponse';
  value: Uint8Array;
}
/** MsgWalletActionResponse is an empty reply. */
export interface MsgWalletActionResponseSDKType {}
/**
 * MsgWalletSpendAction defines an SDK message for the on-chain wallet to
 * perform an action that *does spend the owner's assets.*  This message type is
 * typically protected by explicit confirmation by the user.
 */
export interface MsgWalletSpendAction {
  owner: Uint8Array;
  /** The action to perform, as JSON-stringified marshalled data. */
  spendAction: string;
}
export interface MsgWalletSpendActionProtoMsg {
  typeUrl: '/agoric.swingset.MsgWalletSpendAction';
  value: Uint8Array;
}
/**
 * MsgWalletSpendAction defines an SDK message for the on-chain wallet to
 * perform an action that *does spend the owner's assets.*  This message type is
 * typically protected by explicit confirmation by the user.
 */
export interface MsgWalletSpendActionSDKType {
  owner: Uint8Array;
  spend_action: string;
}
/** MsgWalletSpendActionResponse is an empty reply. */
export interface MsgWalletSpendActionResponse {}
export interface MsgWalletSpendActionResponseProtoMsg {
  typeUrl: '/agoric.swingset.MsgWalletSpendActionResponse';
  value: Uint8Array;
}
/** MsgWalletSpendActionResponse is an empty reply. */
export interface MsgWalletSpendActionResponseSDKType {}
/** MsgProvision defines an SDK message for provisioning a client to the chain */
export interface MsgProvision {
  nickname: string;
  address: Uint8Array;
  powerFlags: string[];
  submitter: Uint8Array;
}
export interface MsgProvisionProtoMsg {
  typeUrl: '/agoric.swingset.MsgProvision';
  value: Uint8Array;
}
/** MsgProvision defines an SDK message for provisioning a client to the chain */
export interface MsgProvisionSDKType {
  nickname: string;
  address: Uint8Array;
  power_flags: string[];
  submitter: Uint8Array;
}
/** MsgProvisionResponse is an empty reply. */
export interface MsgProvisionResponse {}
export interface MsgProvisionResponseProtoMsg {
  typeUrl: '/agoric.swingset.MsgProvisionResponse';
  value: Uint8Array;
}
/** MsgProvisionResponse is an empty reply. */
export interface MsgProvisionResponseSDKType {}
/**
 * MsgInstallBundle carries a signed bundle to SwingSet.
 * Of the fields bundle, compressed_bundle, and chunked_artifact, exactly one
 * must be present: bundle if complete and uncompressed, compressed_bundle if
 * complete and compressed, or chunked_artifact for a manifest of chunks to be
 * submitted in subsequent messages.
 */
export interface MsgInstallBundle {
  bundle: string;
  submitter: Uint8Array;
  /** Default compression algorithm is gzip. */
  compressedBundle: Uint8Array;
  /**
   * Total size in bytes of the bundle artifact, before compression and after
   * decompression.
   */
  uncompressedSize: bigint;
  /** Declaration of a chunked bundle. */
  chunkedArtifact?: ChunkedArtifact;
}
export interface MsgInstallBundleProtoMsg {
  typeUrl: '/agoric.swingset.MsgInstallBundle';
  value: Uint8Array;
}
/**
 * MsgInstallBundle carries a signed bundle to SwingSet.
 * Of the fields bundle, compressed_bundle, and chunked_artifact, exactly one
 * must be present: bundle if complete and uncompressed, compressed_bundle if
 * complete and compressed, or chunked_artifact for a manifest of chunks to be
 * submitted in subsequent messages.
 */
export interface MsgInstallBundleSDKType {
  bundle: string;
  submitter: Uint8Array;
  compressed_bundle: Uint8Array;
  uncompressed_size: bigint;
  chunked_artifact?: ChunkedArtifactSDKType;
}
/** MsgCoreEval defines an SDK message for a core eval. */
export interface MsgCoreEval {
  /** authority is the address that controls the module (defaults to x/gov unless overwritten). */
  authority: string;
  /**
   * The JSON-stringified core bootstrap permits to grant to the jsCode, as the
   * `powers` endowment.
   */
  jsonPermits: string;
  /**
   * Evaluate this JavaScript code in a Compartment endowed with `powers` as
   * well as some powerless helpers.
   */
  jsCode: string;
}
export interface MsgCoreEvalProtoMsg {
  typeUrl: '/agoric.swingset.MsgCoreEval';
  value: Uint8Array;
}
/** MsgCoreEval defines an SDK message for a core eval. */
export interface MsgCoreEvalSDKType {
  authority: string;
  json_permits: string;
  js_code: string;
}
/** MsgCoreEvalResponse is an empty reply. */
export interface MsgCoreEvalResponse {
  /** The result of the core eval. */
  result: string;
}
export interface MsgCoreEvalResponseProtoMsg {
  typeUrl: '/agoric.swingset.MsgCoreEvalResponse';
  value: Uint8Array;
}
/** MsgCoreEvalResponse is an empty reply. */
export interface MsgCoreEvalResponseSDKType {
  result: string;
}
/**
 * MsgInstallBundleResponse is either an empty acknowledgement that a bundle
 * installation message has been queued for the SwingSet kernel's
 * consideration, or for MsgInstallBundle requests that have a chunked artifact
 * manifest instead of a compressed or uncompressed bundle: the identifier
 * assigned for the chunked artifact for reference in subsequent MsgSendChunk
 * messages.
 */
export interface MsgInstallBundleResponse {
  /**
   * The assigned identifier for a chunked artifact, if the caller is expected
   * to call back with MsgSendChunk messages.
   */
  chunkedArtifactId: bigint;
}
export interface MsgInstallBundleResponseProtoMsg {
  typeUrl: '/agoric.swingset.MsgInstallBundleResponse';
  value: Uint8Array;
}
/**
 * MsgInstallBundleResponse is either an empty acknowledgement that a bundle
 * installation message has been queued for the SwingSet kernel's
 * consideration, or for MsgInstallBundle requests that have a chunked artifact
 * manifest instead of a compressed or uncompressed bundle: the identifier
 * assigned for the chunked artifact for reference in subsequent MsgSendChunk
 * messages.
 */
export interface MsgInstallBundleResponseSDKType {
  chunked_artifact_id: bigint;
}
/**
 * MsgSendChunk carries a chunk of an artifact through RPC to the chain.
 * Individual chunks are addressed by the chunked artifact identifier and
 * the zero-based index of the chunk among all chunks as mentioned in the
 * manifest provided to MsgInstallBundle.
 */
export interface MsgSendChunk {
  chunkedArtifactId: bigint;
  submitter: Uint8Array;
  chunkIndex: bigint;
  chunkData: Uint8Array;
}
export interface MsgSendChunkProtoMsg {
  typeUrl: '/agoric.swingset.MsgSendChunk';
  value: Uint8Array;
}
/**
 * MsgSendChunk carries a chunk of an artifact through RPC to the chain.
 * Individual chunks are addressed by the chunked artifact identifier and
 * the zero-based index of the chunk among all chunks as mentioned in the
 * manifest provided to MsgInstallBundle.
 */
export interface MsgSendChunkSDKType {
  chunked_artifact_id: bigint;
  submitter: Uint8Array;
  chunk_index: bigint;
  chunk_data: Uint8Array;
}
/**
 * MsgSendChunkResponse is an acknowledgement that a chunk has been received by
 * the chain.
 */
export interface MsgSendChunkResponse {
  chunkedArtifactId: bigint;
  /** The current state of the chunk. */
  chunk?: ChunkInfo;
}
export interface MsgSendChunkResponseProtoMsg {
  typeUrl: '/agoric.swingset.MsgSendChunkResponse';
  value: Uint8Array;
}
/**
 * MsgSendChunkResponse is an acknowledgement that a chunk has been received by
 * the chain.
 */
export interface MsgSendChunkResponseSDKType {
  chunked_artifact_id: bigint;
  chunk?: ChunkInfoSDKType;
}
function createBaseMsgDeliverInbound(): MsgDeliverInbound {
  return {
    messages: [],
    nums: [],
    ack: BigInt(0),
    submitter: new Uint8Array(),
  };
}
export const MsgDeliverInbound = {
  typeUrl: '/agoric.swingset.MsgDeliverInbound' as const,
  encode(
    message: MsgDeliverInbound,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.messages) {
      writer.uint32(10).string(v!);
    }
    writer.uint32(18).fork();
    for (const v of message.nums) {
      writer.uint64(v);
    }
    writer.ldelim();
    if (message.ack !== BigInt(0)) {
      writer.uint32(24).uint64(message.ack);
    }
    if (message.submitter.length !== 0) {
      writer.uint32(34).bytes(message.submitter);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgDeliverInbound {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDeliverInbound();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.messages.push(reader.string());
          break;
        case 2:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.nums.push(reader.uint64());
            }
          } else {
            message.nums.push(reader.uint64());
          }
          break;
        case 3:
          message.ack = reader.uint64();
          break;
        case 4:
          message.submitter = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgDeliverInbound {
    return {
      messages: Array.isArray(object?.messages)
        ? object.messages.map((e: any) => String(e))
        : [],
      nums: Array.isArray(object?.nums)
        ? object.nums.map((e: any) => BigInt(e.toString()))
        : [],
      ack: isSet(object.ack) ? BigInt(object.ack.toString()) : BigInt(0),
      submitter: isSet(object.submitter)
        ? bytesFromBase64(object.submitter)
        : new Uint8Array(),
    };
  },
  toJSON(message: MsgDeliverInbound): JsonSafe<MsgDeliverInbound> {
    const obj: any = {};
    if (message.messages) {
      obj.messages = message.messages.map(e => e);
    } else {
      obj.messages = [];
    }
    if (message.nums) {
      obj.nums = message.nums.map(e => (e || BigInt(0)).toString());
    } else {
      obj.nums = [];
    }
    message.ack !== undefined &&
      (obj.ack = (message.ack || BigInt(0)).toString());
    message.submitter !== undefined &&
      (obj.submitter = base64FromBytes(
        message.submitter !== undefined ? message.submitter : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MsgDeliverInbound>): MsgDeliverInbound {
    const message = createBaseMsgDeliverInbound();
    message.messages = object.messages?.map(e => e) || [];
    message.nums = object.nums?.map(e => BigInt(e.toString())) || [];
    message.ack =
      object.ack !== undefined && object.ack !== null
        ? BigInt(object.ack.toString())
        : BigInt(0);
    message.submitter = object.submitter ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: MsgDeliverInboundProtoMsg): MsgDeliverInbound {
    return MsgDeliverInbound.decode(message.value);
  },
  toProto(message: MsgDeliverInbound): Uint8Array {
    return MsgDeliverInbound.encode(message).finish();
  },
  toProtoMsg(message: MsgDeliverInbound): MsgDeliverInboundProtoMsg {
    return {
      typeUrl: '/agoric.swingset.MsgDeliverInbound',
      value: MsgDeliverInbound.encode(message).finish(),
    };
  },
};
function createBaseMsgDeliverInboundResponse(): MsgDeliverInboundResponse {
  return {};
}
export const MsgDeliverInboundResponse = {
  typeUrl: '/agoric.swingset.MsgDeliverInboundResponse' as const,
  encode(
    _: MsgDeliverInboundResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgDeliverInboundResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDeliverInboundResponse();
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
  fromJSON(_: any): MsgDeliverInboundResponse {
    return {};
  },
  toJSON(_: MsgDeliverInboundResponse): JsonSafe<MsgDeliverInboundResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgDeliverInboundResponse>,
  ): MsgDeliverInboundResponse {
    const message = createBaseMsgDeliverInboundResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgDeliverInboundResponseProtoMsg,
  ): MsgDeliverInboundResponse {
    return MsgDeliverInboundResponse.decode(message.value);
  },
  toProto(message: MsgDeliverInboundResponse): Uint8Array {
    return MsgDeliverInboundResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgDeliverInboundResponse,
  ): MsgDeliverInboundResponseProtoMsg {
    return {
      typeUrl: '/agoric.swingset.MsgDeliverInboundResponse',
      value: MsgDeliverInboundResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgWalletAction(): MsgWalletAction {
  return {
    owner: new Uint8Array(),
    action: '',
  };
}
export const MsgWalletAction = {
  typeUrl: '/agoric.swingset.MsgWalletAction' as const,
  encode(
    message: MsgWalletAction,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner.length !== 0) {
      writer.uint32(10).bytes(message.owner);
    }
    if (message.action !== '') {
      writer.uint32(18).string(message.action);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgWalletAction {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWalletAction();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.bytes();
          break;
        case 2:
          message.action = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgWalletAction {
    return {
      owner: isSet(object.owner)
        ? bytesFromBase64(object.owner)
        : new Uint8Array(),
      action: isSet(object.action) ? String(object.action) : '',
    };
  },
  toJSON(message: MsgWalletAction): JsonSafe<MsgWalletAction> {
    const obj: any = {};
    message.owner !== undefined &&
      (obj.owner = base64FromBytes(
        message.owner !== undefined ? message.owner : new Uint8Array(),
      ));
    message.action !== undefined && (obj.action = message.action);
    return obj;
  },
  fromPartial(object: Partial<MsgWalletAction>): MsgWalletAction {
    const message = createBaseMsgWalletAction();
    message.owner = object.owner ?? new Uint8Array();
    message.action = object.action ?? '';
    return message;
  },
  fromProtoMsg(message: MsgWalletActionProtoMsg): MsgWalletAction {
    return MsgWalletAction.decode(message.value);
  },
  toProto(message: MsgWalletAction): Uint8Array {
    return MsgWalletAction.encode(message).finish();
  },
  toProtoMsg(message: MsgWalletAction): MsgWalletActionProtoMsg {
    return {
      typeUrl: '/agoric.swingset.MsgWalletAction',
      value: MsgWalletAction.encode(message).finish(),
    };
  },
};
function createBaseMsgWalletActionResponse(): MsgWalletActionResponse {
  return {};
}
export const MsgWalletActionResponse = {
  typeUrl: '/agoric.swingset.MsgWalletActionResponse' as const,
  encode(
    _: MsgWalletActionResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgWalletActionResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWalletActionResponse();
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
  fromJSON(_: any): MsgWalletActionResponse {
    return {};
  },
  toJSON(_: MsgWalletActionResponse): JsonSafe<MsgWalletActionResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgWalletActionResponse>): MsgWalletActionResponse {
    const message = createBaseMsgWalletActionResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgWalletActionResponseProtoMsg,
  ): MsgWalletActionResponse {
    return MsgWalletActionResponse.decode(message.value);
  },
  toProto(message: MsgWalletActionResponse): Uint8Array {
    return MsgWalletActionResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgWalletActionResponse,
  ): MsgWalletActionResponseProtoMsg {
    return {
      typeUrl: '/agoric.swingset.MsgWalletActionResponse',
      value: MsgWalletActionResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgWalletSpendAction(): MsgWalletSpendAction {
  return {
    owner: new Uint8Array(),
    spendAction: '',
  };
}
export const MsgWalletSpendAction = {
  typeUrl: '/agoric.swingset.MsgWalletSpendAction' as const,
  encode(
    message: MsgWalletSpendAction,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner.length !== 0) {
      writer.uint32(10).bytes(message.owner);
    }
    if (message.spendAction !== '') {
      writer.uint32(18).string(message.spendAction);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgWalletSpendAction {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWalletSpendAction();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.bytes();
          break;
        case 2:
          message.spendAction = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgWalletSpendAction {
    return {
      owner: isSet(object.owner)
        ? bytesFromBase64(object.owner)
        : new Uint8Array(),
      spendAction: isSet(object.spendAction) ? String(object.spendAction) : '',
    };
  },
  toJSON(message: MsgWalletSpendAction): JsonSafe<MsgWalletSpendAction> {
    const obj: any = {};
    message.owner !== undefined &&
      (obj.owner = base64FromBytes(
        message.owner !== undefined ? message.owner : new Uint8Array(),
      ));
    message.spendAction !== undefined &&
      (obj.spendAction = message.spendAction);
    return obj;
  },
  fromPartial(object: Partial<MsgWalletSpendAction>): MsgWalletSpendAction {
    const message = createBaseMsgWalletSpendAction();
    message.owner = object.owner ?? new Uint8Array();
    message.spendAction = object.spendAction ?? '';
    return message;
  },
  fromProtoMsg(message: MsgWalletSpendActionProtoMsg): MsgWalletSpendAction {
    return MsgWalletSpendAction.decode(message.value);
  },
  toProto(message: MsgWalletSpendAction): Uint8Array {
    return MsgWalletSpendAction.encode(message).finish();
  },
  toProtoMsg(message: MsgWalletSpendAction): MsgWalletSpendActionProtoMsg {
    return {
      typeUrl: '/agoric.swingset.MsgWalletSpendAction',
      value: MsgWalletSpendAction.encode(message).finish(),
    };
  },
};
function createBaseMsgWalletSpendActionResponse(): MsgWalletSpendActionResponse {
  return {};
}
export const MsgWalletSpendActionResponse = {
  typeUrl: '/agoric.swingset.MsgWalletSpendActionResponse' as const,
  encode(
    _: MsgWalletSpendActionResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgWalletSpendActionResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgWalletSpendActionResponse();
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
  fromJSON(_: any): MsgWalletSpendActionResponse {
    return {};
  },
  toJSON(
    _: MsgWalletSpendActionResponse,
  ): JsonSafe<MsgWalletSpendActionResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgWalletSpendActionResponse>,
  ): MsgWalletSpendActionResponse {
    const message = createBaseMsgWalletSpendActionResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgWalletSpendActionResponseProtoMsg,
  ): MsgWalletSpendActionResponse {
    return MsgWalletSpendActionResponse.decode(message.value);
  },
  toProto(message: MsgWalletSpendActionResponse): Uint8Array {
    return MsgWalletSpendActionResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgWalletSpendActionResponse,
  ): MsgWalletSpendActionResponseProtoMsg {
    return {
      typeUrl: '/agoric.swingset.MsgWalletSpendActionResponse',
      value: MsgWalletSpendActionResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgProvision(): MsgProvision {
  return {
    nickname: '',
    address: new Uint8Array(),
    powerFlags: [],
    submitter: new Uint8Array(),
  };
}
export const MsgProvision = {
  typeUrl: '/agoric.swingset.MsgProvision' as const,
  encode(
    message: MsgProvision,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.nickname !== '') {
      writer.uint32(10).string(message.nickname);
    }
    if (message.address.length !== 0) {
      writer.uint32(18).bytes(message.address);
    }
    for (const v of message.powerFlags) {
      writer.uint32(26).string(v!);
    }
    if (message.submitter.length !== 0) {
      writer.uint32(34).bytes(message.submitter);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgProvision {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgProvision();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nickname = reader.string();
          break;
        case 2:
          message.address = reader.bytes();
          break;
        case 3:
          message.powerFlags.push(reader.string());
          break;
        case 4:
          message.submitter = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgProvision {
    return {
      nickname: isSet(object.nickname) ? String(object.nickname) : '',
      address: isSet(object.address)
        ? bytesFromBase64(object.address)
        : new Uint8Array(),
      powerFlags: Array.isArray(object?.powerFlags)
        ? object.powerFlags.map((e: any) => String(e))
        : [],
      submitter: isSet(object.submitter)
        ? bytesFromBase64(object.submitter)
        : new Uint8Array(),
    };
  },
  toJSON(message: MsgProvision): JsonSafe<MsgProvision> {
    const obj: any = {};
    message.nickname !== undefined && (obj.nickname = message.nickname);
    message.address !== undefined &&
      (obj.address = base64FromBytes(
        message.address !== undefined ? message.address : new Uint8Array(),
      ));
    if (message.powerFlags) {
      obj.powerFlags = message.powerFlags.map(e => e);
    } else {
      obj.powerFlags = [];
    }
    message.submitter !== undefined &&
      (obj.submitter = base64FromBytes(
        message.submitter !== undefined ? message.submitter : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MsgProvision>): MsgProvision {
    const message = createBaseMsgProvision();
    message.nickname = object.nickname ?? '';
    message.address = object.address ?? new Uint8Array();
    message.powerFlags = object.powerFlags?.map(e => e) || [];
    message.submitter = object.submitter ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: MsgProvisionProtoMsg): MsgProvision {
    return MsgProvision.decode(message.value);
  },
  toProto(message: MsgProvision): Uint8Array {
    return MsgProvision.encode(message).finish();
  },
  toProtoMsg(message: MsgProvision): MsgProvisionProtoMsg {
    return {
      typeUrl: '/agoric.swingset.MsgProvision',
      value: MsgProvision.encode(message).finish(),
    };
  },
};
function createBaseMsgProvisionResponse(): MsgProvisionResponse {
  return {};
}
export const MsgProvisionResponse = {
  typeUrl: '/agoric.swingset.MsgProvisionResponse' as const,
  encode(
    _: MsgProvisionResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgProvisionResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgProvisionResponse();
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
  fromJSON(_: any): MsgProvisionResponse {
    return {};
  },
  toJSON(_: MsgProvisionResponse): JsonSafe<MsgProvisionResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgProvisionResponse>): MsgProvisionResponse {
    const message = createBaseMsgProvisionResponse();
    return message;
  },
  fromProtoMsg(message: MsgProvisionResponseProtoMsg): MsgProvisionResponse {
    return MsgProvisionResponse.decode(message.value);
  },
  toProto(message: MsgProvisionResponse): Uint8Array {
    return MsgProvisionResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgProvisionResponse): MsgProvisionResponseProtoMsg {
    return {
      typeUrl: '/agoric.swingset.MsgProvisionResponse',
      value: MsgProvisionResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgInstallBundle(): MsgInstallBundle {
  return {
    bundle: '',
    submitter: new Uint8Array(),
    compressedBundle: new Uint8Array(),
    uncompressedSize: BigInt(0),
    chunkedArtifact: undefined,
  };
}
export const MsgInstallBundle = {
  typeUrl: '/agoric.swingset.MsgInstallBundle' as const,
  encode(
    message: MsgInstallBundle,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.bundle !== '') {
      writer.uint32(10).string(message.bundle);
    }
    if (message.submitter.length !== 0) {
      writer.uint32(18).bytes(message.submitter);
    }
    if (message.compressedBundle.length !== 0) {
      writer.uint32(26).bytes(message.compressedBundle);
    }
    if (message.uncompressedSize !== BigInt(0)) {
      writer.uint32(32).int64(message.uncompressedSize);
    }
    if (message.chunkedArtifact !== undefined) {
      ChunkedArtifact.encode(
        message.chunkedArtifact,
        writer.uint32(42).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgInstallBundle {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgInstallBundle();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.bundle = reader.string();
          break;
        case 2:
          message.submitter = reader.bytes();
          break;
        case 3:
          message.compressedBundle = reader.bytes();
          break;
        case 4:
          message.uncompressedSize = reader.int64();
          break;
        case 5:
          message.chunkedArtifact = ChunkedArtifact.decode(
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
  fromJSON(object: any): MsgInstallBundle {
    return {
      bundle: isSet(object.bundle) ? String(object.bundle) : '',
      submitter: isSet(object.submitter)
        ? bytesFromBase64(object.submitter)
        : new Uint8Array(),
      compressedBundle: isSet(object.compressedBundle)
        ? bytesFromBase64(object.compressedBundle)
        : new Uint8Array(),
      uncompressedSize: isSet(object.uncompressedSize)
        ? BigInt(object.uncompressedSize.toString())
        : BigInt(0),
      chunkedArtifact: isSet(object.chunkedArtifact)
        ? ChunkedArtifact.fromJSON(object.chunkedArtifact)
        : undefined,
    };
  },
  toJSON(message: MsgInstallBundle): JsonSafe<MsgInstallBundle> {
    const obj: any = {};
    message.bundle !== undefined && (obj.bundle = message.bundle);
    message.submitter !== undefined &&
      (obj.submitter = base64FromBytes(
        message.submitter !== undefined ? message.submitter : new Uint8Array(),
      ));
    message.compressedBundle !== undefined &&
      (obj.compressedBundle = base64FromBytes(
        message.compressedBundle !== undefined
          ? message.compressedBundle
          : new Uint8Array(),
      ));
    message.uncompressedSize !== undefined &&
      (obj.uncompressedSize = (
        message.uncompressedSize || BigInt(0)
      ).toString());
    message.chunkedArtifact !== undefined &&
      (obj.chunkedArtifact = message.chunkedArtifact
        ? ChunkedArtifact.toJSON(message.chunkedArtifact)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgInstallBundle>): MsgInstallBundle {
    const message = createBaseMsgInstallBundle();
    message.bundle = object.bundle ?? '';
    message.submitter = object.submitter ?? new Uint8Array();
    message.compressedBundle = object.compressedBundle ?? new Uint8Array();
    message.uncompressedSize =
      object.uncompressedSize !== undefined && object.uncompressedSize !== null
        ? BigInt(object.uncompressedSize.toString())
        : BigInt(0);
    message.chunkedArtifact =
      object.chunkedArtifact !== undefined && object.chunkedArtifact !== null
        ? ChunkedArtifact.fromPartial(object.chunkedArtifact)
        : undefined;
    return message;
  },
  fromProtoMsg(message: MsgInstallBundleProtoMsg): MsgInstallBundle {
    return MsgInstallBundle.decode(message.value);
  },
  toProto(message: MsgInstallBundle): Uint8Array {
    return MsgInstallBundle.encode(message).finish();
  },
  toProtoMsg(message: MsgInstallBundle): MsgInstallBundleProtoMsg {
    return {
      typeUrl: '/agoric.swingset.MsgInstallBundle',
      value: MsgInstallBundle.encode(message).finish(),
    };
  },
};
function createBaseMsgCoreEval(): MsgCoreEval {
  return {
    authority: '',
    jsonPermits: '',
    jsCode: '',
  };
}
export const MsgCoreEval = {
  typeUrl: '/agoric.swingset.MsgCoreEval' as const,
  encode(
    message: MsgCoreEval,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authority !== '') {
      writer.uint32(10).string(message.authority);
    }
    if (message.jsonPermits !== '') {
      writer.uint32(18).string(message.jsonPermits);
    }
    if (message.jsCode !== '') {
      writer.uint32(26).string(message.jsCode);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgCoreEval {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCoreEval();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          message.jsonPermits = reader.string();
          break;
        case 3:
          message.jsCode = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCoreEval {
    return {
      authority: isSet(object.authority) ? String(object.authority) : '',
      jsonPermits: isSet(object.jsonPermits) ? String(object.jsonPermits) : '',
      jsCode: isSet(object.jsCode) ? String(object.jsCode) : '',
    };
  },
  toJSON(message: MsgCoreEval): JsonSafe<MsgCoreEval> {
    const obj: any = {};
    message.authority !== undefined && (obj.authority = message.authority);
    message.jsonPermits !== undefined &&
      (obj.jsonPermits = message.jsonPermits);
    message.jsCode !== undefined && (obj.jsCode = message.jsCode);
    return obj;
  },
  fromPartial(object: Partial<MsgCoreEval>): MsgCoreEval {
    const message = createBaseMsgCoreEval();
    message.authority = object.authority ?? '';
    message.jsonPermits = object.jsonPermits ?? '';
    message.jsCode = object.jsCode ?? '';
    return message;
  },
  fromProtoMsg(message: MsgCoreEvalProtoMsg): MsgCoreEval {
    return MsgCoreEval.decode(message.value);
  },
  toProto(message: MsgCoreEval): Uint8Array {
    return MsgCoreEval.encode(message).finish();
  },
  toProtoMsg(message: MsgCoreEval): MsgCoreEvalProtoMsg {
    return {
      typeUrl: '/agoric.swingset.MsgCoreEval',
      value: MsgCoreEval.encode(message).finish(),
    };
  },
};
function createBaseMsgCoreEvalResponse(): MsgCoreEvalResponse {
  return {
    result: '',
  };
}
export const MsgCoreEvalResponse = {
  typeUrl: '/agoric.swingset.MsgCoreEvalResponse' as const,
  encode(
    message: MsgCoreEvalResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.result !== '') {
      writer.uint32(10).string(message.result);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgCoreEvalResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCoreEvalResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.result = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgCoreEvalResponse {
    return {
      result: isSet(object.result) ? String(object.result) : '',
    };
  },
  toJSON(message: MsgCoreEvalResponse): JsonSafe<MsgCoreEvalResponse> {
    const obj: any = {};
    message.result !== undefined && (obj.result = message.result);
    return obj;
  },
  fromPartial(object: Partial<MsgCoreEvalResponse>): MsgCoreEvalResponse {
    const message = createBaseMsgCoreEvalResponse();
    message.result = object.result ?? '';
    return message;
  },
  fromProtoMsg(message: MsgCoreEvalResponseProtoMsg): MsgCoreEvalResponse {
    return MsgCoreEvalResponse.decode(message.value);
  },
  toProto(message: MsgCoreEvalResponse): Uint8Array {
    return MsgCoreEvalResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgCoreEvalResponse): MsgCoreEvalResponseProtoMsg {
    return {
      typeUrl: '/agoric.swingset.MsgCoreEvalResponse',
      value: MsgCoreEvalResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgInstallBundleResponse(): MsgInstallBundleResponse {
  return {
    chunkedArtifactId: BigInt(0),
  };
}
export const MsgInstallBundleResponse = {
  typeUrl: '/agoric.swingset.MsgInstallBundleResponse' as const,
  encode(
    message: MsgInstallBundleResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.chunkedArtifactId !== BigInt(0)) {
      writer.uint32(8).uint64(message.chunkedArtifactId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgInstallBundleResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgInstallBundleResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.chunkedArtifactId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgInstallBundleResponse {
    return {
      chunkedArtifactId: isSet(object.chunkedArtifactId)
        ? BigInt(object.chunkedArtifactId.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: MsgInstallBundleResponse,
  ): JsonSafe<MsgInstallBundleResponse> {
    const obj: any = {};
    message.chunkedArtifactId !== undefined &&
      (obj.chunkedArtifactId = (
        message.chunkedArtifactId || BigInt(0)
      ).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgInstallBundleResponse>,
  ): MsgInstallBundleResponse {
    const message = createBaseMsgInstallBundleResponse();
    message.chunkedArtifactId =
      object.chunkedArtifactId !== undefined &&
      object.chunkedArtifactId !== null
        ? BigInt(object.chunkedArtifactId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgInstallBundleResponseProtoMsg,
  ): MsgInstallBundleResponse {
    return MsgInstallBundleResponse.decode(message.value);
  },
  toProto(message: MsgInstallBundleResponse): Uint8Array {
    return MsgInstallBundleResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgInstallBundleResponse,
  ): MsgInstallBundleResponseProtoMsg {
    return {
      typeUrl: '/agoric.swingset.MsgInstallBundleResponse',
      value: MsgInstallBundleResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgSendChunk(): MsgSendChunk {
  return {
    chunkedArtifactId: BigInt(0),
    submitter: new Uint8Array(),
    chunkIndex: BigInt(0),
    chunkData: new Uint8Array(),
  };
}
export const MsgSendChunk = {
  typeUrl: '/agoric.swingset.MsgSendChunk' as const,
  encode(
    message: MsgSendChunk,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.chunkedArtifactId !== BigInt(0)) {
      writer.uint32(8).uint64(message.chunkedArtifactId);
    }
    if (message.submitter.length !== 0) {
      writer.uint32(18).bytes(message.submitter);
    }
    if (message.chunkIndex !== BigInt(0)) {
      writer.uint32(24).uint64(message.chunkIndex);
    }
    if (message.chunkData.length !== 0) {
      writer.uint32(34).bytes(message.chunkData);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgSendChunk {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSendChunk();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.chunkedArtifactId = reader.uint64();
          break;
        case 2:
          message.submitter = reader.bytes();
          break;
        case 3:
          message.chunkIndex = reader.uint64();
          break;
        case 4:
          message.chunkData = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSendChunk {
    return {
      chunkedArtifactId: isSet(object.chunkedArtifactId)
        ? BigInt(object.chunkedArtifactId.toString())
        : BigInt(0),
      submitter: isSet(object.submitter)
        ? bytesFromBase64(object.submitter)
        : new Uint8Array(),
      chunkIndex: isSet(object.chunkIndex)
        ? BigInt(object.chunkIndex.toString())
        : BigInt(0),
      chunkData: isSet(object.chunkData)
        ? bytesFromBase64(object.chunkData)
        : new Uint8Array(),
    };
  },
  toJSON(message: MsgSendChunk): JsonSafe<MsgSendChunk> {
    const obj: any = {};
    message.chunkedArtifactId !== undefined &&
      (obj.chunkedArtifactId = (
        message.chunkedArtifactId || BigInt(0)
      ).toString());
    message.submitter !== undefined &&
      (obj.submitter = base64FromBytes(
        message.submitter !== undefined ? message.submitter : new Uint8Array(),
      ));
    message.chunkIndex !== undefined &&
      (obj.chunkIndex = (message.chunkIndex || BigInt(0)).toString());
    message.chunkData !== undefined &&
      (obj.chunkData = base64FromBytes(
        message.chunkData !== undefined ? message.chunkData : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MsgSendChunk>): MsgSendChunk {
    const message = createBaseMsgSendChunk();
    message.chunkedArtifactId =
      object.chunkedArtifactId !== undefined &&
      object.chunkedArtifactId !== null
        ? BigInt(object.chunkedArtifactId.toString())
        : BigInt(0);
    message.submitter = object.submitter ?? new Uint8Array();
    message.chunkIndex =
      object.chunkIndex !== undefined && object.chunkIndex !== null
        ? BigInt(object.chunkIndex.toString())
        : BigInt(0);
    message.chunkData = object.chunkData ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: MsgSendChunkProtoMsg): MsgSendChunk {
    return MsgSendChunk.decode(message.value);
  },
  toProto(message: MsgSendChunk): Uint8Array {
    return MsgSendChunk.encode(message).finish();
  },
  toProtoMsg(message: MsgSendChunk): MsgSendChunkProtoMsg {
    return {
      typeUrl: '/agoric.swingset.MsgSendChunk',
      value: MsgSendChunk.encode(message).finish(),
    };
  },
};
function createBaseMsgSendChunkResponse(): MsgSendChunkResponse {
  return {
    chunkedArtifactId: BigInt(0),
    chunk: undefined,
  };
}
export const MsgSendChunkResponse = {
  typeUrl: '/agoric.swingset.MsgSendChunkResponse' as const,
  encode(
    message: MsgSendChunkResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.chunkedArtifactId !== BigInt(0)) {
      writer.uint32(8).uint64(message.chunkedArtifactId);
    }
    if (message.chunk !== undefined) {
      ChunkInfo.encode(message.chunk, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSendChunkResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSendChunkResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.chunkedArtifactId = reader.uint64();
          break;
        case 2:
          message.chunk = ChunkInfo.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSendChunkResponse {
    return {
      chunkedArtifactId: isSet(object.chunkedArtifactId)
        ? BigInt(object.chunkedArtifactId.toString())
        : BigInt(0),
      chunk: isSet(object.chunk) ? ChunkInfo.fromJSON(object.chunk) : undefined,
    };
  },
  toJSON(message: MsgSendChunkResponse): JsonSafe<MsgSendChunkResponse> {
    const obj: any = {};
    message.chunkedArtifactId !== undefined &&
      (obj.chunkedArtifactId = (
        message.chunkedArtifactId || BigInt(0)
      ).toString());
    message.chunk !== undefined &&
      (obj.chunk = message.chunk ? ChunkInfo.toJSON(message.chunk) : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgSendChunkResponse>): MsgSendChunkResponse {
    const message = createBaseMsgSendChunkResponse();
    message.chunkedArtifactId =
      object.chunkedArtifactId !== undefined &&
      object.chunkedArtifactId !== null
        ? BigInt(object.chunkedArtifactId.toString())
        : BigInt(0);
    message.chunk =
      object.chunk !== undefined && object.chunk !== null
        ? ChunkInfo.fromPartial(object.chunk)
        : undefined;
    return message;
  },
  fromProtoMsg(message: MsgSendChunkResponseProtoMsg): MsgSendChunkResponse {
    return MsgSendChunkResponse.decode(message.value);
  },
  toProto(message: MsgSendChunkResponse): Uint8Array {
    return MsgSendChunkResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgSendChunkResponse): MsgSendChunkResponseProtoMsg {
    return {
      typeUrl: '/agoric.swingset.MsgSendChunkResponse',
      value: MsgSendChunkResponse.encode(message).finish(),
    };
  },
};
