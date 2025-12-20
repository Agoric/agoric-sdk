//@ts-nocheck
import {
  Metadata,
  type MetadataSDKType,
} from '../../cosmos/bank/v1beta1/bank.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { type JsonSafe } from '../../json-safe.js';
/** MsgSetDenomMetaData represents a message to set the metadata for a denom. */
export interface MsgSetDenomMetaData {
  /** authority is the address that controls the module (defaults to x/gov unless overwritten). */
  authority: string;
  /** metadata is the bank denom metadata to set. */
  metadata: Metadata;
}
export interface MsgSetDenomMetaDataProtoMsg {
  typeUrl: '/agoric.vbank.MsgSetDenomMetaData';
  value: Uint8Array;
}
/** MsgSetDenomMetaData represents a message to set the metadata for a denom. */
export interface MsgSetDenomMetaDataSDKType {
  authority: string;
  metadata: MetadataSDKType;
}
/** MsgSetDenomMetaDataResponse is the response type for the Msg/SetDenomMetaData RPC method. */
export interface MsgSetDenomMetaDataResponse {}
export interface MsgSetDenomMetaDataResponseProtoMsg {
  typeUrl: '/agoric.vbank.MsgSetDenomMetaDataResponse';
  value: Uint8Array;
}
/** MsgSetDenomMetaDataResponse is the response type for the Msg/SetDenomMetaData RPC method. */
export interface MsgSetDenomMetaDataResponseSDKType {}
function createBaseMsgSetDenomMetaData(): MsgSetDenomMetaData {
  return {
    authority: '',
    metadata: Metadata.fromPartial({}),
  };
}
export const MsgSetDenomMetaData = {
  typeUrl: '/agoric.vbank.MsgSetDenomMetaData' as const,
  encode(
    message: MsgSetDenomMetaData,
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
  ): MsgSetDenomMetaData {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetDenomMetaData();
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
  fromJSON(object: any): MsgSetDenomMetaData {
    return {
      authority: isSet(object.authority) ? String(object.authority) : '',
      metadata: isSet(object.metadata)
        ? Metadata.fromJSON(object.metadata)
        : undefined,
    };
  },
  toJSON(message: MsgSetDenomMetaData): JsonSafe<MsgSetDenomMetaData> {
    const obj: any = {};
    message.authority !== undefined && (obj.authority = message.authority);
    message.metadata !== undefined &&
      (obj.metadata = message.metadata
        ? Metadata.toJSON(message.metadata)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgSetDenomMetaData>): MsgSetDenomMetaData {
    const message = createBaseMsgSetDenomMetaData();
    message.authority = object.authority ?? '';
    message.metadata =
      object.metadata !== undefined && object.metadata !== null
        ? Metadata.fromPartial(object.metadata)
        : undefined;
    return message;
  },
  fromProtoMsg(message: MsgSetDenomMetaDataProtoMsg): MsgSetDenomMetaData {
    return MsgSetDenomMetaData.decode(message.value);
  },
  toProto(message: MsgSetDenomMetaData): Uint8Array {
    return MsgSetDenomMetaData.encode(message).finish();
  },
  toProtoMsg(message: MsgSetDenomMetaData): MsgSetDenomMetaDataProtoMsg {
    return {
      typeUrl: '/agoric.vbank.MsgSetDenomMetaData',
      value: MsgSetDenomMetaData.encode(message).finish(),
    };
  },
};
function createBaseMsgSetDenomMetaDataResponse(): MsgSetDenomMetaDataResponse {
  return {};
}
export const MsgSetDenomMetaDataResponse = {
  typeUrl: '/agoric.vbank.MsgSetDenomMetaDataResponse' as const,
  encode(
    _: MsgSetDenomMetaDataResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetDenomMetaDataResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetDenomMetaDataResponse();
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
  fromJSON(_: any): MsgSetDenomMetaDataResponse {
    return {};
  },
  toJSON(
    _: MsgSetDenomMetaDataResponse,
  ): JsonSafe<MsgSetDenomMetaDataResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgSetDenomMetaDataResponse>,
  ): MsgSetDenomMetaDataResponse {
    const message = createBaseMsgSetDenomMetaDataResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgSetDenomMetaDataResponseProtoMsg,
  ): MsgSetDenomMetaDataResponse {
    return MsgSetDenomMetaDataResponse.decode(message.value);
  },
  toProto(message: MsgSetDenomMetaDataResponse): Uint8Array {
    return MsgSetDenomMetaDataResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSetDenomMetaDataResponse,
  ): MsgSetDenomMetaDataResponseProtoMsg {
    return {
      typeUrl: '/agoric.vbank.MsgSetDenomMetaDataResponse',
      value: MsgSetDenomMetaDataResponse.encode(message).finish(),
    };
  },
};
