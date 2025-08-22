//@ts-nocheck
import {
  FileDescriptorProto,
  type FileDescriptorProtoSDKType,
} from '../../../google/protobuf/descriptor.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/** FileDescriptorsRequest is the Query/FileDescriptors request type. */
export interface FileDescriptorsRequest {}
export interface FileDescriptorsRequestProtoMsg {
  typeUrl: '/cosmos.reflection.v1.FileDescriptorsRequest';
  value: Uint8Array;
}
/** FileDescriptorsRequest is the Query/FileDescriptors request type. */
export interface FileDescriptorsRequestSDKType {}
/** FileDescriptorsResponse is the Query/FileDescriptors response type. */
export interface FileDescriptorsResponse {
  /** files is the file descriptors. */
  files: FileDescriptorProto[];
}
export interface FileDescriptorsResponseProtoMsg {
  typeUrl: '/cosmos.reflection.v1.FileDescriptorsResponse';
  value: Uint8Array;
}
/** FileDescriptorsResponse is the Query/FileDescriptors response type. */
export interface FileDescriptorsResponseSDKType {
  files: FileDescriptorProtoSDKType[];
}
function createBaseFileDescriptorsRequest(): FileDescriptorsRequest {
  return {};
}
export const FileDescriptorsRequest = {
  typeUrl: '/cosmos.reflection.v1.FileDescriptorsRequest',
  encode(
    _: FileDescriptorsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): FileDescriptorsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFileDescriptorsRequest();
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
  fromJSON(_: any): FileDescriptorsRequest {
    return {};
  },
  toJSON(_: FileDescriptorsRequest): JsonSafe<FileDescriptorsRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<FileDescriptorsRequest>): FileDescriptorsRequest {
    const message = createBaseFileDescriptorsRequest();
    return message;
  },
  fromProtoMsg(
    message: FileDescriptorsRequestProtoMsg,
  ): FileDescriptorsRequest {
    return FileDescriptorsRequest.decode(message.value);
  },
  toProto(message: FileDescriptorsRequest): Uint8Array {
    return FileDescriptorsRequest.encode(message).finish();
  },
  toProtoMsg(message: FileDescriptorsRequest): FileDescriptorsRequestProtoMsg {
    return {
      typeUrl: '/cosmos.reflection.v1.FileDescriptorsRequest',
      value: FileDescriptorsRequest.encode(message).finish(),
    };
  },
};
function createBaseFileDescriptorsResponse(): FileDescriptorsResponse {
  return {
    files: [],
  };
}
export const FileDescriptorsResponse = {
  typeUrl: '/cosmos.reflection.v1.FileDescriptorsResponse',
  encode(
    message: FileDescriptorsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.files) {
      FileDescriptorProto.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): FileDescriptorsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFileDescriptorsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.files.push(
            FileDescriptorProto.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): FileDescriptorsResponse {
    return {
      files: Array.isArray(object?.files)
        ? object.files.map((e: any) => FileDescriptorProto.fromJSON(e))
        : [],
    };
  },
  toJSON(message: FileDescriptorsResponse): JsonSafe<FileDescriptorsResponse> {
    const obj: any = {};
    if (message.files) {
      obj.files = message.files.map(e =>
        e ? FileDescriptorProto.toJSON(e) : undefined,
      );
    } else {
      obj.files = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<FileDescriptorsResponse>,
  ): FileDescriptorsResponse {
    const message = createBaseFileDescriptorsResponse();
    message.files =
      object.files?.map(e => FileDescriptorProto.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: FileDescriptorsResponseProtoMsg,
  ): FileDescriptorsResponse {
    return FileDescriptorsResponse.decode(message.value);
  },
  toProto(message: FileDescriptorsResponse): Uint8Array {
    return FileDescriptorsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: FileDescriptorsResponse,
  ): FileDescriptorsResponseProtoMsg {
    return {
      typeUrl: '/cosmos.reflection.v1.FileDescriptorsResponse',
      value: FileDescriptorsResponse.encode(message).finish(),
    };
  },
};
