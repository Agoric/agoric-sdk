//@ts-nocheck
import {
  Metadata,
  type MetadataSDKType,
} from '../../cosmos/bank/v1beta1/bank.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { type JsonSafe } from '../../json-safe.js';
/** MsgSetDenomMetadata represents a message to set the metadata for a denom. */
export interface MsgSetDenomMetadata {
  /** authority is the address that controls the module (defaults to x/gov unless overwritten). */
  authority: string;
  /** metadata is the bank denom metadata to set. */
  metadata: Metadata;
}
export interface MsgSetDenomMetadataProtoMsg {
  typeUrl: '/agoric.vbank.MsgSetDenomMetadata';
  value: Uint8Array;
}
/** MsgSetDenomMetadata represents a message to set the metadata for a denom. */
export interface MsgSetDenomMetadataSDKType {
  authority: string;
  metadata: MetadataSDKType;
}
/** MsgSetDenomMetadataResponse is the response type for the Msg/SetDenomMetadata RPC method. */
export interface MsgSetDenomMetadataResponse {}
export interface MsgSetDenomMetadataResponseProtoMsg {
  typeUrl: '/agoric.vbank.MsgSetDenomMetadataResponse';
  value: Uint8Array;
}
/** MsgSetDenomMetadataResponse is the response type for the Msg/SetDenomMetadata RPC method. */
export interface MsgSetDenomMetadataResponseSDKType {}
function createBaseMsgSetDenomMetadata(): MsgSetDenomMetadata {
  return {
    authority: '',
    metadata: Metadata.fromPartial({}),
  };
}
export const MsgSetDenomMetadata = {
  typeUrl: '/agoric.vbank.MsgSetDenomMetadata' as const,
  encode(
    message: MsgSetDenomMetadata,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authority !== '') {
      writer.uint32(10).string(message.authority);
    }
    if (message.metadata !== undefined) {
      Metadata.encode(message.metadata, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetDenomMetadata {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetDenomMetadata();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          message.metadata = Metadata.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSetDenomMetadata {
    return {
      authority: isSet(object.authority) ? String(object.authority) : '',
      metadata: isSet(object.metadata)
        ? Metadata.fromJSON(object.metadata)
        : undefined,
    };
  },
  toJSON(message: MsgSetDenomMetadata): JsonSafe<MsgSetDenomMetadata> {
    const obj: any = {};
    message.authority !== undefined && (obj.authority = message.authority);
    message.metadata !== undefined &&
      (obj.metadata = message.metadata
        ? Metadata.toJSON(message.metadata)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgSetDenomMetadata>): MsgSetDenomMetadata {
    const message = createBaseMsgSetDenomMetadata();
    message.authority = object.authority ?? '';
    message.metadata =
      object.metadata !== undefined && object.metadata !== null
        ? Metadata.fromPartial(object.metadata)
        : undefined;
    return message;
  },
  fromProtoMsg(message: MsgSetDenomMetadataProtoMsg): MsgSetDenomMetadata {
    return MsgSetDenomMetadata.decode(message.value);
  },
  toProto(message: MsgSetDenomMetadata): Uint8Array {
    return MsgSetDenomMetadata.encode(message).finish();
  },
  toProtoMsg(message: MsgSetDenomMetadata): MsgSetDenomMetadataProtoMsg {
    return {
      typeUrl: '/agoric.vbank.MsgSetDenomMetadata',
      value: MsgSetDenomMetadata.encode(message).finish(),
    };
  },
};
function createBaseMsgSetDenomMetadataResponse(): MsgSetDenomMetadataResponse {
  return {};
}
export const MsgSetDenomMetadataResponse = {
  typeUrl: '/agoric.vbank.MsgSetDenomMetadataResponse' as const,
  encode(
    _: MsgSetDenomMetadataResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetDenomMetadataResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetDenomMetadataResponse();
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
  fromJSON(_: any): MsgSetDenomMetadataResponse {
    return {};
  },
  toJSON(
    _: MsgSetDenomMetadataResponse,
  ): JsonSafe<MsgSetDenomMetadataResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgSetDenomMetadataResponse>,
  ): MsgSetDenomMetadataResponse {
    const message = createBaseMsgSetDenomMetadataResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgSetDenomMetadataResponseProtoMsg,
  ): MsgSetDenomMetadataResponse {
    return MsgSetDenomMetadataResponse.decode(message.value);
  },
  toProto(message: MsgSetDenomMetadataResponse): Uint8Array {
    return MsgSetDenomMetadataResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSetDenomMetadataResponse,
  ): MsgSetDenomMetadataResponseProtoMsg {
    return {
      typeUrl: '/agoric.vbank.MsgSetDenomMetadataResponse',
      value: MsgSetDenomMetadataResponse.encode(message).finish(),
    };
  },
};
