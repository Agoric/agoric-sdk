//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * MsgStoreCode defines the request type for the StoreCode rpc.
 * @name MsgStoreCode
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgStoreCode
 */
export interface MsgStoreCode {
  /**
   * signer address
   */
  signer: string;
  /**
   * wasm byte code of light client contract. It can be raw or gzip compressed
   */
  wasmByteCode: Uint8Array;
}
export interface MsgStoreCodeProtoMsg {
  typeUrl: '/ibc.lightclients.wasm.v1.MsgStoreCode';
  value: Uint8Array;
}
/**
 * MsgStoreCode defines the request type for the StoreCode rpc.
 * @name MsgStoreCodeSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgStoreCode
 */
export interface MsgStoreCodeSDKType {
  signer: string;
  wasm_byte_code: Uint8Array;
}
/**
 * MsgStoreCodeResponse defines the response type for the StoreCode rpc
 * @name MsgStoreCodeResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgStoreCodeResponse
 */
export interface MsgStoreCodeResponse {
  /**
   * checksum is the sha256 hash of the stored code
   */
  checksum: Uint8Array;
}
export interface MsgStoreCodeResponseProtoMsg {
  typeUrl: '/ibc.lightclients.wasm.v1.MsgStoreCodeResponse';
  value: Uint8Array;
}
/**
 * MsgStoreCodeResponse defines the response type for the StoreCode rpc
 * @name MsgStoreCodeResponseSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgStoreCodeResponse
 */
export interface MsgStoreCodeResponseSDKType {
  checksum: Uint8Array;
}
/**
 * MsgRemoveChecksum defines the request type for the MsgRemoveChecksum rpc.
 * @name MsgRemoveChecksum
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgRemoveChecksum
 */
export interface MsgRemoveChecksum {
  /**
   * signer address
   */
  signer: string;
  /**
   * checksum is the sha256 hash to be removed from the store
   */
  checksum: Uint8Array;
}
export interface MsgRemoveChecksumProtoMsg {
  typeUrl: '/ibc.lightclients.wasm.v1.MsgRemoveChecksum';
  value: Uint8Array;
}
/**
 * MsgRemoveChecksum defines the request type for the MsgRemoveChecksum rpc.
 * @name MsgRemoveChecksumSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgRemoveChecksum
 */
export interface MsgRemoveChecksumSDKType {
  signer: string;
  checksum: Uint8Array;
}
/**
 * MsgStoreChecksumResponse defines the response type for the StoreCode rpc
 * @name MsgRemoveChecksumResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgRemoveChecksumResponse
 */
export interface MsgRemoveChecksumResponse {}
export interface MsgRemoveChecksumResponseProtoMsg {
  typeUrl: '/ibc.lightclients.wasm.v1.MsgRemoveChecksumResponse';
  value: Uint8Array;
}
/**
 * MsgStoreChecksumResponse defines the response type for the StoreCode rpc
 * @name MsgRemoveChecksumResponseSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgRemoveChecksumResponse
 */
export interface MsgRemoveChecksumResponseSDKType {}
/**
 * MsgMigrateContract defines the request type for the MigrateContract rpc.
 * @name MsgMigrateContract
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgMigrateContract
 */
export interface MsgMigrateContract {
  /**
   * signer address
   */
  signer: string;
  /**
   * the client id of the contract
   */
  clientId: string;
  /**
   * checksum is the sha256 hash of the new wasm byte code for the contract
   */
  checksum: Uint8Array;
  /**
   * the json encoded message to be passed to the contract on migration
   */
  msg: Uint8Array;
}
export interface MsgMigrateContractProtoMsg {
  typeUrl: '/ibc.lightclients.wasm.v1.MsgMigrateContract';
  value: Uint8Array;
}
/**
 * MsgMigrateContract defines the request type for the MigrateContract rpc.
 * @name MsgMigrateContractSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgMigrateContract
 */
export interface MsgMigrateContractSDKType {
  signer: string;
  client_id: string;
  checksum: Uint8Array;
  msg: Uint8Array;
}
/**
 * MsgMigrateContractResponse defines the response type for the MigrateContract rpc
 * @name MsgMigrateContractResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgMigrateContractResponse
 */
export interface MsgMigrateContractResponse {}
export interface MsgMigrateContractResponseProtoMsg {
  typeUrl: '/ibc.lightclients.wasm.v1.MsgMigrateContractResponse';
  value: Uint8Array;
}
/**
 * MsgMigrateContractResponse defines the response type for the MigrateContract rpc
 * @name MsgMigrateContractResponseSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgMigrateContractResponse
 */
export interface MsgMigrateContractResponseSDKType {}
function createBaseMsgStoreCode(): MsgStoreCode {
  return {
    signer: '',
    wasmByteCode: new Uint8Array(),
  };
}
/**
 * MsgStoreCode defines the request type for the StoreCode rpc.
 * @name MsgStoreCode
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgStoreCode
 */
export const MsgStoreCode = {
  typeUrl: '/ibc.lightclients.wasm.v1.MsgStoreCode' as const,
  aminoType: 'cosmos-sdk/MsgStoreCode' as const,
  is(o: any): o is MsgStoreCode {
    return (
      o &&
      (o.$typeUrl === MsgStoreCode.typeUrl ||
        (typeof o.signer === 'string' &&
          (o.wasmByteCode instanceof Uint8Array ||
            typeof o.wasmByteCode === 'string')))
    );
  },
  isSDK(o: any): o is MsgStoreCodeSDKType {
    return (
      o &&
      (o.$typeUrl === MsgStoreCode.typeUrl ||
        (typeof o.signer === 'string' &&
          (o.wasm_byte_code instanceof Uint8Array ||
            typeof o.wasm_byte_code === 'string')))
    );
  },
  encode(
    message: MsgStoreCode,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.wasmByteCode.length !== 0) {
      writer.uint32(18).bytes(message.wasmByteCode);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgStoreCode {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgStoreCode();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.wasmByteCode = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgStoreCode {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      wasmByteCode: isSet(object.wasmByteCode)
        ? bytesFromBase64(object.wasmByteCode)
        : new Uint8Array(),
    };
  },
  toJSON(message: MsgStoreCode): JsonSafe<MsgStoreCode> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.wasmByteCode !== undefined &&
      (obj.wasmByteCode = base64FromBytes(
        message.wasmByteCode !== undefined
          ? message.wasmByteCode
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MsgStoreCode>): MsgStoreCode {
    const message = createBaseMsgStoreCode();
    message.signer = object.signer ?? '';
    message.wasmByteCode = object.wasmByteCode ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: MsgStoreCodeProtoMsg): MsgStoreCode {
    return MsgStoreCode.decode(message.value);
  },
  toProto(message: MsgStoreCode): Uint8Array {
    return MsgStoreCode.encode(message).finish();
  },
  toProtoMsg(message: MsgStoreCode): MsgStoreCodeProtoMsg {
    return {
      typeUrl: '/ibc.lightclients.wasm.v1.MsgStoreCode',
      value: MsgStoreCode.encode(message).finish(),
    };
  },
};
function createBaseMsgStoreCodeResponse(): MsgStoreCodeResponse {
  return {
    checksum: new Uint8Array(),
  };
}
/**
 * MsgStoreCodeResponse defines the response type for the StoreCode rpc
 * @name MsgStoreCodeResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgStoreCodeResponse
 */
export const MsgStoreCodeResponse = {
  typeUrl: '/ibc.lightclients.wasm.v1.MsgStoreCodeResponse' as const,
  aminoType: 'cosmos-sdk/MsgStoreCodeResponse' as const,
  is(o: any): o is MsgStoreCodeResponse {
    return (
      o &&
      (o.$typeUrl === MsgStoreCodeResponse.typeUrl ||
        o.checksum instanceof Uint8Array ||
        typeof o.checksum === 'string')
    );
  },
  isSDK(o: any): o is MsgStoreCodeResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgStoreCodeResponse.typeUrl ||
        o.checksum instanceof Uint8Array ||
        typeof o.checksum === 'string')
    );
  },
  encode(
    message: MsgStoreCodeResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.checksum.length !== 0) {
      writer.uint32(10).bytes(message.checksum);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgStoreCodeResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgStoreCodeResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.checksum = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgStoreCodeResponse {
    return {
      checksum: isSet(object.checksum)
        ? bytesFromBase64(object.checksum)
        : new Uint8Array(),
    };
  },
  toJSON(message: MsgStoreCodeResponse): JsonSafe<MsgStoreCodeResponse> {
    const obj: any = {};
    message.checksum !== undefined &&
      (obj.checksum = base64FromBytes(
        message.checksum !== undefined ? message.checksum : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MsgStoreCodeResponse>): MsgStoreCodeResponse {
    const message = createBaseMsgStoreCodeResponse();
    message.checksum = object.checksum ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: MsgStoreCodeResponseProtoMsg): MsgStoreCodeResponse {
    return MsgStoreCodeResponse.decode(message.value);
  },
  toProto(message: MsgStoreCodeResponse): Uint8Array {
    return MsgStoreCodeResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgStoreCodeResponse): MsgStoreCodeResponseProtoMsg {
    return {
      typeUrl: '/ibc.lightclients.wasm.v1.MsgStoreCodeResponse',
      value: MsgStoreCodeResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgRemoveChecksum(): MsgRemoveChecksum {
  return {
    signer: '',
    checksum: new Uint8Array(),
  };
}
/**
 * MsgRemoveChecksum defines the request type for the MsgRemoveChecksum rpc.
 * @name MsgRemoveChecksum
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgRemoveChecksum
 */
export const MsgRemoveChecksum = {
  typeUrl: '/ibc.lightclients.wasm.v1.MsgRemoveChecksum' as const,
  aminoType: 'cosmos-sdk/MsgRemoveChecksum' as const,
  is(o: any): o is MsgRemoveChecksum {
    return (
      o &&
      (o.$typeUrl === MsgRemoveChecksum.typeUrl ||
        (typeof o.signer === 'string' &&
          (o.checksum instanceof Uint8Array || typeof o.checksum === 'string')))
    );
  },
  isSDK(o: any): o is MsgRemoveChecksumSDKType {
    return (
      o &&
      (o.$typeUrl === MsgRemoveChecksum.typeUrl ||
        (typeof o.signer === 'string' &&
          (o.checksum instanceof Uint8Array || typeof o.checksum === 'string')))
    );
  },
  encode(
    message: MsgRemoveChecksum,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.checksum.length !== 0) {
      writer.uint32(18).bytes(message.checksum);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgRemoveChecksum {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRemoveChecksum();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.checksum = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRemoveChecksum {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      checksum: isSet(object.checksum)
        ? bytesFromBase64(object.checksum)
        : new Uint8Array(),
    };
  },
  toJSON(message: MsgRemoveChecksum): JsonSafe<MsgRemoveChecksum> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.checksum !== undefined &&
      (obj.checksum = base64FromBytes(
        message.checksum !== undefined ? message.checksum : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MsgRemoveChecksum>): MsgRemoveChecksum {
    const message = createBaseMsgRemoveChecksum();
    message.signer = object.signer ?? '';
    message.checksum = object.checksum ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: MsgRemoveChecksumProtoMsg): MsgRemoveChecksum {
    return MsgRemoveChecksum.decode(message.value);
  },
  toProto(message: MsgRemoveChecksum): Uint8Array {
    return MsgRemoveChecksum.encode(message).finish();
  },
  toProtoMsg(message: MsgRemoveChecksum): MsgRemoveChecksumProtoMsg {
    return {
      typeUrl: '/ibc.lightclients.wasm.v1.MsgRemoveChecksum',
      value: MsgRemoveChecksum.encode(message).finish(),
    };
  },
};
function createBaseMsgRemoveChecksumResponse(): MsgRemoveChecksumResponse {
  return {};
}
/**
 * MsgStoreChecksumResponse defines the response type for the StoreCode rpc
 * @name MsgRemoveChecksumResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgRemoveChecksumResponse
 */
export const MsgRemoveChecksumResponse = {
  typeUrl: '/ibc.lightclients.wasm.v1.MsgRemoveChecksumResponse' as const,
  aminoType: 'cosmos-sdk/MsgRemoveChecksumResponse' as const,
  is(o: any): o is MsgRemoveChecksumResponse {
    return o && o.$typeUrl === MsgRemoveChecksumResponse.typeUrl;
  },
  isSDK(o: any): o is MsgRemoveChecksumResponseSDKType {
    return o && o.$typeUrl === MsgRemoveChecksumResponse.typeUrl;
  },
  encode(
    _: MsgRemoveChecksumResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRemoveChecksumResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRemoveChecksumResponse();
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
  fromJSON(_: any): MsgRemoveChecksumResponse {
    return {};
  },
  toJSON(_: MsgRemoveChecksumResponse): JsonSafe<MsgRemoveChecksumResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgRemoveChecksumResponse>,
  ): MsgRemoveChecksumResponse {
    const message = createBaseMsgRemoveChecksumResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgRemoveChecksumResponseProtoMsg,
  ): MsgRemoveChecksumResponse {
    return MsgRemoveChecksumResponse.decode(message.value);
  },
  toProto(message: MsgRemoveChecksumResponse): Uint8Array {
    return MsgRemoveChecksumResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgRemoveChecksumResponse,
  ): MsgRemoveChecksumResponseProtoMsg {
    return {
      typeUrl: '/ibc.lightclients.wasm.v1.MsgRemoveChecksumResponse',
      value: MsgRemoveChecksumResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgMigrateContract(): MsgMigrateContract {
  return {
    signer: '',
    clientId: '',
    checksum: new Uint8Array(),
    msg: new Uint8Array(),
  };
}
/**
 * MsgMigrateContract defines the request type for the MigrateContract rpc.
 * @name MsgMigrateContract
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgMigrateContract
 */
export const MsgMigrateContract = {
  typeUrl: '/ibc.lightclients.wasm.v1.MsgMigrateContract' as const,
  aminoType: 'cosmos-sdk/MsgMigrateContract' as const,
  is(o: any): o is MsgMigrateContract {
    return (
      o &&
      (o.$typeUrl === MsgMigrateContract.typeUrl ||
        (typeof o.signer === 'string' &&
          typeof o.clientId === 'string' &&
          (o.checksum instanceof Uint8Array ||
            typeof o.checksum === 'string') &&
          (o.msg instanceof Uint8Array || typeof o.msg === 'string')))
    );
  },
  isSDK(o: any): o is MsgMigrateContractSDKType {
    return (
      o &&
      (o.$typeUrl === MsgMigrateContract.typeUrl ||
        (typeof o.signer === 'string' &&
          typeof o.client_id === 'string' &&
          (o.checksum instanceof Uint8Array ||
            typeof o.checksum === 'string') &&
          (o.msg instanceof Uint8Array || typeof o.msg === 'string')))
    );
  },
  encode(
    message: MsgMigrateContract,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.clientId !== '') {
      writer.uint32(18).string(message.clientId);
    }
    if (message.checksum.length !== 0) {
      writer.uint32(26).bytes(message.checksum);
    }
    if (message.msg.length !== 0) {
      writer.uint32(34).bytes(message.msg);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgMigrateContract {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgMigrateContract();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.clientId = reader.string();
          break;
        case 3:
          message.checksum = reader.bytes();
          break;
        case 4:
          message.msg = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgMigrateContract {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      checksum: isSet(object.checksum)
        ? bytesFromBase64(object.checksum)
        : new Uint8Array(),
      msg: isSet(object.msg) ? bytesFromBase64(object.msg) : new Uint8Array(),
    };
  },
  toJSON(message: MsgMigrateContract): JsonSafe<MsgMigrateContract> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.checksum !== undefined &&
      (obj.checksum = base64FromBytes(
        message.checksum !== undefined ? message.checksum : new Uint8Array(),
      ));
    message.msg !== undefined &&
      (obj.msg = base64FromBytes(
        message.msg !== undefined ? message.msg : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<MsgMigrateContract>): MsgMigrateContract {
    const message = createBaseMsgMigrateContract();
    message.signer = object.signer ?? '';
    message.clientId = object.clientId ?? '';
    message.checksum = object.checksum ?? new Uint8Array();
    message.msg = object.msg ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: MsgMigrateContractProtoMsg): MsgMigrateContract {
    return MsgMigrateContract.decode(message.value);
  },
  toProto(message: MsgMigrateContract): Uint8Array {
    return MsgMigrateContract.encode(message).finish();
  },
  toProtoMsg(message: MsgMigrateContract): MsgMigrateContractProtoMsg {
    return {
      typeUrl: '/ibc.lightclients.wasm.v1.MsgMigrateContract',
      value: MsgMigrateContract.encode(message).finish(),
    };
  },
};
function createBaseMsgMigrateContractResponse(): MsgMigrateContractResponse {
  return {};
}
/**
 * MsgMigrateContractResponse defines the response type for the MigrateContract rpc
 * @name MsgMigrateContractResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.MsgMigrateContractResponse
 */
export const MsgMigrateContractResponse = {
  typeUrl: '/ibc.lightclients.wasm.v1.MsgMigrateContractResponse' as const,
  aminoType: 'cosmos-sdk/MsgMigrateContractResponse' as const,
  is(o: any): o is MsgMigrateContractResponse {
    return o && o.$typeUrl === MsgMigrateContractResponse.typeUrl;
  },
  isSDK(o: any): o is MsgMigrateContractResponseSDKType {
    return o && o.$typeUrl === MsgMigrateContractResponse.typeUrl;
  },
  encode(
    _: MsgMigrateContractResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgMigrateContractResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgMigrateContractResponse();
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
  fromJSON(_: any): MsgMigrateContractResponse {
    return {};
  },
  toJSON(_: MsgMigrateContractResponse): JsonSafe<MsgMigrateContractResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgMigrateContractResponse>,
  ): MsgMigrateContractResponse {
    const message = createBaseMsgMigrateContractResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgMigrateContractResponseProtoMsg,
  ): MsgMigrateContractResponse {
    return MsgMigrateContractResponse.decode(message.value);
  },
  toProto(message: MsgMigrateContractResponse): Uint8Array {
    return MsgMigrateContractResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgMigrateContractResponse,
  ): MsgMigrateContractResponseProtoMsg {
    return {
      typeUrl: '/ibc.lightclients.wasm.v1.MsgMigrateContractResponse',
      value: MsgMigrateContractResponse.encode(message).finish(),
    };
  },
};
