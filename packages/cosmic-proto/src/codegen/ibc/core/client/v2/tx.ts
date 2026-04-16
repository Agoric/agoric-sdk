//@ts-nocheck
import { Config, type ConfigSDKType } from './config.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * MsgRegisterCounterparty defines a message to register a counterparty on a client
 * @name MsgRegisterCounterparty
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.MsgRegisterCounterparty
 */
export interface MsgRegisterCounterparty {
  /**
   * client identifier
   */
  clientId: string;
  /**
   * counterparty merkle prefix
   */
  counterpartyMerklePrefix: Uint8Array[];
  /**
   * counterparty client identifier
   */
  counterpartyClientId: string;
  /**
   * signer address
   */
  signer: string;
}
export interface MsgRegisterCounterpartyProtoMsg {
  typeUrl: '/ibc.core.client.v2.MsgRegisterCounterparty';
  value: Uint8Array;
}
/**
 * MsgRegisterCounterparty defines a message to register a counterparty on a client
 * @name MsgRegisterCounterpartySDKType
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.MsgRegisterCounterparty
 */
export interface MsgRegisterCounterpartySDKType {
  client_id: string;
  counterparty_merkle_prefix: Uint8Array[];
  counterparty_client_id: string;
  signer: string;
}
/**
 * MsgRegisterCounterpartyResponse defines the Msg/RegisterCounterparty response type.
 * @name MsgRegisterCounterpartyResponse
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.MsgRegisterCounterpartyResponse
 */
export interface MsgRegisterCounterpartyResponse {}
export interface MsgRegisterCounterpartyResponseProtoMsg {
  typeUrl: '/ibc.core.client.v2.MsgRegisterCounterpartyResponse';
  value: Uint8Array;
}
/**
 * MsgRegisterCounterpartyResponse defines the Msg/RegisterCounterparty response type.
 * @name MsgRegisterCounterpartyResponseSDKType
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.MsgRegisterCounterpartyResponse
 */
export interface MsgRegisterCounterpartyResponseSDKType {}
/**
 * MsgUpdateClientConfig defines the sdk.Msg type to update the configuration for a given client
 * @name MsgUpdateClientConfig
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.MsgUpdateClientConfig
 */
export interface MsgUpdateClientConfig {
  /**
   * client identifier
   */
  clientId: string;
  /**
   * allowed relayers
   *
   * NOTE: All fields in the config must be supplied.
   */
  config: Config;
  /**
   * signer address
   */
  signer: string;
}
export interface MsgUpdateClientConfigProtoMsg {
  typeUrl: '/ibc.core.client.v2.MsgUpdateClientConfig';
  value: Uint8Array;
}
/**
 * MsgUpdateClientConfig defines the sdk.Msg type to update the configuration for a given client
 * @name MsgUpdateClientConfigSDKType
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.MsgUpdateClientConfig
 */
export interface MsgUpdateClientConfigSDKType {
  client_id: string;
  config: ConfigSDKType;
  signer: string;
}
/**
 * MsgUpdateClientConfigResponse defines the MsgUpdateClientConfig response type.
 * @name MsgUpdateClientConfigResponse
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.MsgUpdateClientConfigResponse
 */
export interface MsgUpdateClientConfigResponse {}
export interface MsgUpdateClientConfigResponseProtoMsg {
  typeUrl: '/ibc.core.client.v2.MsgUpdateClientConfigResponse';
  value: Uint8Array;
}
/**
 * MsgUpdateClientConfigResponse defines the MsgUpdateClientConfig response type.
 * @name MsgUpdateClientConfigResponseSDKType
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.MsgUpdateClientConfigResponse
 */
export interface MsgUpdateClientConfigResponseSDKType {}
function createBaseMsgRegisterCounterparty(): MsgRegisterCounterparty {
  return {
    clientId: '',
    counterpartyMerklePrefix: [],
    counterpartyClientId: '',
    signer: '',
  };
}
/**
 * MsgRegisterCounterparty defines a message to register a counterparty on a client
 * @name MsgRegisterCounterparty
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.MsgRegisterCounterparty
 */
export const MsgRegisterCounterparty = {
  typeUrl: '/ibc.core.client.v2.MsgRegisterCounterparty' as const,
  aminoType: 'cosmos-sdk/MsgRegisterCounterparty' as const,
  is(o: any): o is MsgRegisterCounterparty {
    return (
      o &&
      (o.$typeUrl === MsgRegisterCounterparty.typeUrl ||
        (typeof o.clientId === 'string' &&
          Array.isArray(o.counterpartyMerklePrefix) &&
          (!o.counterpartyMerklePrefix.length ||
            o.counterpartyMerklePrefix[0] instanceof Uint8Array ||
            typeof o.counterpartyMerklePrefix[0] === 'string') &&
          typeof o.counterpartyClientId === 'string' &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgRegisterCounterpartySDKType {
    return (
      o &&
      (o.$typeUrl === MsgRegisterCounterparty.typeUrl ||
        (typeof o.client_id === 'string' &&
          Array.isArray(o.counterparty_merkle_prefix) &&
          (!o.counterparty_merkle_prefix.length ||
            o.counterparty_merkle_prefix[0] instanceof Uint8Array ||
            typeof o.counterparty_merkle_prefix[0] === 'string') &&
          typeof o.counterparty_client_id === 'string' &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgRegisterCounterparty,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    for (const v of message.counterpartyMerklePrefix) {
      writer.uint32(18).bytes(v!);
    }
    if (message.counterpartyClientId !== '') {
      writer.uint32(26).string(message.counterpartyClientId);
    }
    if (message.signer !== '') {
      writer.uint32(34).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRegisterCounterparty {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRegisterCounterparty();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          message.counterpartyMerklePrefix.push(reader.bytes());
          break;
        case 3:
          message.counterpartyClientId = reader.string();
          break;
        case 4:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRegisterCounterparty {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      counterpartyMerklePrefix: Array.isArray(object?.counterpartyMerklePrefix)
        ? object.counterpartyMerklePrefix.map((e: any) => bytesFromBase64(e))
        : [],
      counterpartyClientId: isSet(object.counterpartyClientId)
        ? String(object.counterpartyClientId)
        : '',
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgRegisterCounterparty): JsonSafe<MsgRegisterCounterparty> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    if (message.counterpartyMerklePrefix) {
      obj.counterpartyMerklePrefix = message.counterpartyMerklePrefix.map(e =>
        base64FromBytes(e !== undefined ? e : new Uint8Array()),
      );
    } else {
      obj.counterpartyMerklePrefix = [];
    }
    message.counterpartyClientId !== undefined &&
      (obj.counterpartyClientId = message.counterpartyClientId);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(
    object: Partial<MsgRegisterCounterparty>,
  ): MsgRegisterCounterparty {
    const message = createBaseMsgRegisterCounterparty();
    message.clientId = object.clientId ?? '';
    message.counterpartyMerklePrefix =
      object.counterpartyMerklePrefix?.map(e => e) || [];
    message.counterpartyClientId = object.counterpartyClientId ?? '';
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgRegisterCounterpartyProtoMsg,
  ): MsgRegisterCounterparty {
    return MsgRegisterCounterparty.decode(message.value);
  },
  toProto(message: MsgRegisterCounterparty): Uint8Array {
    return MsgRegisterCounterparty.encode(message).finish();
  },
  toProtoMsg(
    message: MsgRegisterCounterparty,
  ): MsgRegisterCounterpartyProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v2.MsgRegisterCounterparty',
      value: MsgRegisterCounterparty.encode(message).finish(),
    };
  },
};
function createBaseMsgRegisterCounterpartyResponse(): MsgRegisterCounterpartyResponse {
  return {};
}
/**
 * MsgRegisterCounterpartyResponse defines the Msg/RegisterCounterparty response type.
 * @name MsgRegisterCounterpartyResponse
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.MsgRegisterCounterpartyResponse
 */
export const MsgRegisterCounterpartyResponse = {
  typeUrl: '/ibc.core.client.v2.MsgRegisterCounterpartyResponse' as const,
  aminoType: 'cosmos-sdk/MsgRegisterCounterpartyResponse' as const,
  is(o: any): o is MsgRegisterCounterpartyResponse {
    return o && o.$typeUrl === MsgRegisterCounterpartyResponse.typeUrl;
  },
  isSDK(o: any): o is MsgRegisterCounterpartyResponseSDKType {
    return o && o.$typeUrl === MsgRegisterCounterpartyResponse.typeUrl;
  },
  encode(
    _: MsgRegisterCounterpartyResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRegisterCounterpartyResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRegisterCounterpartyResponse();
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
  fromJSON(_: any): MsgRegisterCounterpartyResponse {
    return {};
  },
  toJSON(
    _: MsgRegisterCounterpartyResponse,
  ): JsonSafe<MsgRegisterCounterpartyResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgRegisterCounterpartyResponse>,
  ): MsgRegisterCounterpartyResponse {
    const message = createBaseMsgRegisterCounterpartyResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgRegisterCounterpartyResponseProtoMsg,
  ): MsgRegisterCounterpartyResponse {
    return MsgRegisterCounterpartyResponse.decode(message.value);
  },
  toProto(message: MsgRegisterCounterpartyResponse): Uint8Array {
    return MsgRegisterCounterpartyResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgRegisterCounterpartyResponse,
  ): MsgRegisterCounterpartyResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v2.MsgRegisterCounterpartyResponse',
      value: MsgRegisterCounterpartyResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateClientConfig(): MsgUpdateClientConfig {
  return {
    clientId: '',
    config: Config.fromPartial({}),
    signer: '',
  };
}
/**
 * MsgUpdateClientConfig defines the sdk.Msg type to update the configuration for a given client
 * @name MsgUpdateClientConfig
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.MsgUpdateClientConfig
 */
export const MsgUpdateClientConfig = {
  typeUrl: '/ibc.core.client.v2.MsgUpdateClientConfig' as const,
  aminoType: 'cosmos-sdk/MsgUpdateClientConfig' as const,
  is(o: any): o is MsgUpdateClientConfig {
    return (
      o &&
      (o.$typeUrl === MsgUpdateClientConfig.typeUrl ||
        (typeof o.clientId === 'string' &&
          Config.is(o.config) &&
          typeof o.signer === 'string'))
    );
  },
  isSDK(o: any): o is MsgUpdateClientConfigSDKType {
    return (
      o &&
      (o.$typeUrl === MsgUpdateClientConfig.typeUrl ||
        (typeof o.client_id === 'string' &&
          Config.isSDK(o.config) &&
          typeof o.signer === 'string'))
    );
  },
  encode(
    message: MsgUpdateClientConfig,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    if (message.config !== undefined) {
      Config.encode(message.config, writer.uint32(18).fork()).ldelim();
    }
    if (message.signer !== '') {
      writer.uint32(26).string(message.signer);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateClientConfig {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateClientConfig();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        case 2:
          message.config = Config.decode(reader, reader.uint32());
          break;
        case 3:
          message.signer = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgUpdateClientConfig {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
      config: isSet(object.config) ? Config.fromJSON(object.config) : undefined,
      signer: isSet(object.signer) ? String(object.signer) : '',
    };
  },
  toJSON(message: MsgUpdateClientConfig): JsonSafe<MsgUpdateClientConfig> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    message.config !== undefined &&
      (obj.config = message.config ? Config.toJSON(message.config) : undefined);
    message.signer !== undefined && (obj.signer = message.signer);
    return obj;
  },
  fromPartial(object: Partial<MsgUpdateClientConfig>): MsgUpdateClientConfig {
    const message = createBaseMsgUpdateClientConfig();
    message.clientId = object.clientId ?? '';
    message.config =
      object.config !== undefined && object.config !== null
        ? Config.fromPartial(object.config)
        : undefined;
    message.signer = object.signer ?? '';
    return message;
  },
  fromProtoMsg(message: MsgUpdateClientConfigProtoMsg): MsgUpdateClientConfig {
    return MsgUpdateClientConfig.decode(message.value);
  },
  toProto(message: MsgUpdateClientConfig): Uint8Array {
    return MsgUpdateClientConfig.encode(message).finish();
  },
  toProtoMsg(message: MsgUpdateClientConfig): MsgUpdateClientConfigProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v2.MsgUpdateClientConfig',
      value: MsgUpdateClientConfig.encode(message).finish(),
    };
  },
};
function createBaseMsgUpdateClientConfigResponse(): MsgUpdateClientConfigResponse {
  return {};
}
/**
 * MsgUpdateClientConfigResponse defines the MsgUpdateClientConfig response type.
 * @name MsgUpdateClientConfigResponse
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.MsgUpdateClientConfigResponse
 */
export const MsgUpdateClientConfigResponse = {
  typeUrl: '/ibc.core.client.v2.MsgUpdateClientConfigResponse' as const,
  aminoType: 'cosmos-sdk/MsgUpdateClientConfigResponse' as const,
  is(o: any): o is MsgUpdateClientConfigResponse {
    return o && o.$typeUrl === MsgUpdateClientConfigResponse.typeUrl;
  },
  isSDK(o: any): o is MsgUpdateClientConfigResponseSDKType {
    return o && o.$typeUrl === MsgUpdateClientConfigResponse.typeUrl;
  },
  encode(
    _: MsgUpdateClientConfigResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgUpdateClientConfigResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgUpdateClientConfigResponse();
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
  fromJSON(_: any): MsgUpdateClientConfigResponse {
    return {};
  },
  toJSON(
    _: MsgUpdateClientConfigResponse,
  ): JsonSafe<MsgUpdateClientConfigResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgUpdateClientConfigResponse>,
  ): MsgUpdateClientConfigResponse {
    const message = createBaseMsgUpdateClientConfigResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgUpdateClientConfigResponseProtoMsg,
  ): MsgUpdateClientConfigResponse {
    return MsgUpdateClientConfigResponse.decode(message.value);
  },
  toProto(message: MsgUpdateClientConfigResponse): Uint8Array {
    return MsgUpdateClientConfigResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgUpdateClientConfigResponse,
  ): MsgUpdateClientConfigResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v2.MsgUpdateClientConfigResponse',
      value: MsgUpdateClientConfigResponse.encode(message).finish(),
    };
  },
};
