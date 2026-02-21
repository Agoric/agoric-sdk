//@ts-nocheck
import {
  RequestFinalizeBlock,
  type RequestFinalizeBlockSDKType,
  ResponseFinalizeBlock,
  type ResponseFinalizeBlockSDKType,
  ResponseCommit,
  type ResponseCommitSDKType,
} from '../../../../tendermint/abci/types.js';
import {
  StoreKVPair,
  type StoreKVPairSDKType,
} from '../../v1beta1/listening.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/** ListenEndBlockRequest is the request type for the ListenEndBlock RPC method */
export interface ListenFinalizeBlockRequest {
  req?: RequestFinalizeBlock;
  res?: ResponseFinalizeBlock;
}
export interface ListenFinalizeBlockRequestProtoMsg {
  typeUrl: '/cosmos.store.streaming.abci.ListenFinalizeBlockRequest';
  value: Uint8Array;
}
/** ListenEndBlockRequest is the request type for the ListenEndBlock RPC method */
export interface ListenFinalizeBlockRequestSDKType {
  req?: RequestFinalizeBlockSDKType;
  res?: ResponseFinalizeBlockSDKType;
}
/** ListenEndBlockResponse is the response type for the ListenEndBlock RPC method */
export interface ListenFinalizeBlockResponse {}
export interface ListenFinalizeBlockResponseProtoMsg {
  typeUrl: '/cosmos.store.streaming.abci.ListenFinalizeBlockResponse';
  value: Uint8Array;
}
/** ListenEndBlockResponse is the response type for the ListenEndBlock RPC method */
export interface ListenFinalizeBlockResponseSDKType {}
/** ListenCommitRequest is the request type for the ListenCommit RPC method */
export interface ListenCommitRequest {
  /** explicitly pass in block height as ResponseCommit does not contain this info */
  blockHeight: bigint;
  res?: ResponseCommit;
  changeSet: StoreKVPair[];
}
export interface ListenCommitRequestProtoMsg {
  typeUrl: '/cosmos.store.streaming.abci.ListenCommitRequest';
  value: Uint8Array;
}
/** ListenCommitRequest is the request type for the ListenCommit RPC method */
export interface ListenCommitRequestSDKType {
  block_height: bigint;
  res?: ResponseCommitSDKType;
  change_set: StoreKVPairSDKType[];
}
/** ListenCommitResponse is the response type for the ListenCommit RPC method */
export interface ListenCommitResponse {}
export interface ListenCommitResponseProtoMsg {
  typeUrl: '/cosmos.store.streaming.abci.ListenCommitResponse';
  value: Uint8Array;
}
/** ListenCommitResponse is the response type for the ListenCommit RPC method */
export interface ListenCommitResponseSDKType {}
function createBaseListenFinalizeBlockRequest(): ListenFinalizeBlockRequest {
  return {
    req: undefined,
    res: undefined,
  };
}
export const ListenFinalizeBlockRequest = {
  typeUrl: '/cosmos.store.streaming.abci.ListenFinalizeBlockRequest' as const,
  encode(
    message: ListenFinalizeBlockRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.req !== undefined) {
      RequestFinalizeBlock.encode(
        message.req,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    if (message.res !== undefined) {
      ResponseFinalizeBlock.encode(
        message.res,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ListenFinalizeBlockRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseListenFinalizeBlockRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.req = RequestFinalizeBlock.decode(reader, reader.uint32());
          break;
        case 2:
          message.res = ResponseFinalizeBlock.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ListenFinalizeBlockRequest {
    return {
      req: isSet(object.req)
        ? RequestFinalizeBlock.fromJSON(object.req)
        : undefined,
      res: isSet(object.res)
        ? ResponseFinalizeBlock.fromJSON(object.res)
        : undefined,
    };
  },
  toJSON(
    message: ListenFinalizeBlockRequest,
  ): JsonSafe<ListenFinalizeBlockRequest> {
    const obj: any = {};
    message.req !== undefined &&
      (obj.req = message.req
        ? RequestFinalizeBlock.toJSON(message.req)
        : undefined);
    message.res !== undefined &&
      (obj.res = message.res
        ? ResponseFinalizeBlock.toJSON(message.res)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<ListenFinalizeBlockRequest>,
  ): ListenFinalizeBlockRequest {
    const message = createBaseListenFinalizeBlockRequest();
    message.req =
      object.req !== undefined && object.req !== null
        ? RequestFinalizeBlock.fromPartial(object.req)
        : undefined;
    message.res =
      object.res !== undefined && object.res !== null
        ? ResponseFinalizeBlock.fromPartial(object.res)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: ListenFinalizeBlockRequestProtoMsg,
  ): ListenFinalizeBlockRequest {
    return ListenFinalizeBlockRequest.decode(message.value);
  },
  toProto(message: ListenFinalizeBlockRequest): Uint8Array {
    return ListenFinalizeBlockRequest.encode(message).finish();
  },
  toProtoMsg(
    message: ListenFinalizeBlockRequest,
  ): ListenFinalizeBlockRequestProtoMsg {
    return {
      typeUrl: '/cosmos.store.streaming.abci.ListenFinalizeBlockRequest',
      value: ListenFinalizeBlockRequest.encode(message).finish(),
    };
  },
};
function createBaseListenFinalizeBlockResponse(): ListenFinalizeBlockResponse {
  return {};
}
export const ListenFinalizeBlockResponse = {
  typeUrl: '/cosmos.store.streaming.abci.ListenFinalizeBlockResponse' as const,
  encode(
    _: ListenFinalizeBlockResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ListenFinalizeBlockResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseListenFinalizeBlockResponse();
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
  fromJSON(_: any): ListenFinalizeBlockResponse {
    return {};
  },
  toJSON(
    _: ListenFinalizeBlockResponse,
  ): JsonSafe<ListenFinalizeBlockResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<ListenFinalizeBlockResponse>,
  ): ListenFinalizeBlockResponse {
    const message = createBaseListenFinalizeBlockResponse();
    return message;
  },
  fromProtoMsg(
    message: ListenFinalizeBlockResponseProtoMsg,
  ): ListenFinalizeBlockResponse {
    return ListenFinalizeBlockResponse.decode(message.value);
  },
  toProto(message: ListenFinalizeBlockResponse): Uint8Array {
    return ListenFinalizeBlockResponse.encode(message).finish();
  },
  toProtoMsg(
    message: ListenFinalizeBlockResponse,
  ): ListenFinalizeBlockResponseProtoMsg {
    return {
      typeUrl: '/cosmos.store.streaming.abci.ListenFinalizeBlockResponse',
      value: ListenFinalizeBlockResponse.encode(message).finish(),
    };
  },
};
function createBaseListenCommitRequest(): ListenCommitRequest {
  return {
    blockHeight: BigInt(0),
    res: undefined,
    changeSet: [],
  };
}
export const ListenCommitRequest = {
  typeUrl: '/cosmos.store.streaming.abci.ListenCommitRequest' as const,
  encode(
    message: ListenCommitRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.blockHeight !== BigInt(0)) {
      writer.uint32(8).int64(message.blockHeight);
    }
    if (message.res !== undefined) {
      ResponseCommit.encode(message.res, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.changeSet) {
      StoreKVPair.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ListenCommitRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseListenCommitRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.blockHeight = reader.int64();
          break;
        case 2:
          message.res = ResponseCommit.decode(reader, reader.uint32());
          break;
        case 3:
          message.changeSet.push(StoreKVPair.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ListenCommitRequest {
    return {
      blockHeight: isSet(object.blockHeight)
        ? BigInt(object.blockHeight.toString())
        : BigInt(0),
      res: isSet(object.res) ? ResponseCommit.fromJSON(object.res) : undefined,
      changeSet: Array.isArray(object?.changeSet)
        ? object.changeSet.map((e: any) => StoreKVPair.fromJSON(e))
        : [],
    };
  },
  toJSON(message: ListenCommitRequest): JsonSafe<ListenCommitRequest> {
    const obj: any = {};
    message.blockHeight !== undefined &&
      (obj.blockHeight = (message.blockHeight || BigInt(0)).toString());
    message.res !== undefined &&
      (obj.res = message.res ? ResponseCommit.toJSON(message.res) : undefined);
    if (message.changeSet) {
      obj.changeSet = message.changeSet.map(e =>
        e ? StoreKVPair.toJSON(e) : undefined,
      );
    } else {
      obj.changeSet = [];
    }
    return obj;
  },
  fromPartial(object: Partial<ListenCommitRequest>): ListenCommitRequest {
    const message = createBaseListenCommitRequest();
    message.blockHeight =
      object.blockHeight !== undefined && object.blockHeight !== null
        ? BigInt(object.blockHeight.toString())
        : BigInt(0);
    message.res =
      object.res !== undefined && object.res !== null
        ? ResponseCommit.fromPartial(object.res)
        : undefined;
    message.changeSet =
      object.changeSet?.map(e => StoreKVPair.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: ListenCommitRequestProtoMsg): ListenCommitRequest {
    return ListenCommitRequest.decode(message.value);
  },
  toProto(message: ListenCommitRequest): Uint8Array {
    return ListenCommitRequest.encode(message).finish();
  },
  toProtoMsg(message: ListenCommitRequest): ListenCommitRequestProtoMsg {
    return {
      typeUrl: '/cosmos.store.streaming.abci.ListenCommitRequest',
      value: ListenCommitRequest.encode(message).finish(),
    };
  },
};
function createBaseListenCommitResponse(): ListenCommitResponse {
  return {};
}
export const ListenCommitResponse = {
  typeUrl: '/cosmos.store.streaming.abci.ListenCommitResponse' as const,
  encode(
    _: ListenCommitResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ListenCommitResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseListenCommitResponse();
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
  fromJSON(_: any): ListenCommitResponse {
    return {};
  },
  toJSON(_: ListenCommitResponse): JsonSafe<ListenCommitResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<ListenCommitResponse>): ListenCommitResponse {
    const message = createBaseListenCommitResponse();
    return message;
  },
  fromProtoMsg(message: ListenCommitResponseProtoMsg): ListenCommitResponse {
    return ListenCommitResponse.decode(message.value);
  },
  toProto(message: ListenCommitResponse): Uint8Array {
    return ListenCommitResponse.encode(message).finish();
  },
  toProtoMsg(message: ListenCommitResponse): ListenCommitResponseProtoMsg {
    return {
      typeUrl: '/cosmos.store.streaming.abci.ListenCommitResponse',
      value: ListenCommitResponse.encode(message).finish(),
    };
  },
};
