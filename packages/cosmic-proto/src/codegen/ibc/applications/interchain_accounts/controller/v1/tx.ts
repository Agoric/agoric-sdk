//@ts-nocheck
import {
  InterchainAccountPacketData,
  InterchainAccountPacketDataAmino,
  InterchainAccountPacketDataSDKType,
} from '../../v1/packet.js';
import { BinaryReader, BinaryWriter } from '../../../../../binary.js';
import { isSet } from '../../../../../helpers.js';
/** MsgRegisterInterchainAccount defines the payload for Msg/MsgRegisterInterchainAccount */
export interface MsgRegisterInterchainAccount {
  owner: string;
  connectionId: string;
  version: string;
}
export interface MsgRegisterInterchainAccountProtoMsg {
  typeUrl: '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount';
  value: Uint8Array;
}
/** MsgRegisterInterchainAccount defines the payload for Msg/MsgRegisterInterchainAccount */
export interface MsgRegisterInterchainAccountAmino {
  owner?: string;
  connection_id?: string;
  version?: string;
}
export interface MsgRegisterInterchainAccountAminoMsg {
  type: 'cosmos-sdk/MsgRegisterInterchainAccount';
  value: MsgRegisterInterchainAccountAmino;
}
/** MsgRegisterInterchainAccount defines the payload for Msg/MsgRegisterInterchainAccount */
export interface MsgRegisterInterchainAccountSDKType {
  owner: string;
  connection_id: string;
  version: string;
}
/** MsgRegisterInterchainAccountResponse defines the response for Msg/MsgRegisterInterchainAccountResponse */
export interface MsgRegisterInterchainAccountResponse {
  channelId: string;
}
export interface MsgRegisterInterchainAccountResponseProtoMsg {
  typeUrl: '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccountResponse';
  value: Uint8Array;
}
/** MsgRegisterInterchainAccountResponse defines the response for Msg/MsgRegisterInterchainAccountResponse */
export interface MsgRegisterInterchainAccountResponseAmino {
  channel_id?: string;
}
export interface MsgRegisterInterchainAccountResponseAminoMsg {
  type: 'cosmos-sdk/MsgRegisterInterchainAccountResponse';
  value: MsgRegisterInterchainAccountResponseAmino;
}
/** MsgRegisterInterchainAccountResponse defines the response for Msg/MsgRegisterInterchainAccountResponse */
export interface MsgRegisterInterchainAccountResponseSDKType {
  channel_id: string;
}
/** MsgSendTx defines the payload for Msg/SendTx */
export interface MsgSendTx {
  owner: string;
  connectionId: string;
  packetData: InterchainAccountPacketData;
  /**
   * Relative timeout timestamp provided will be added to the current block time during transaction execution.
   * The timeout timestamp must be non-zero.
   */
  relativeTimeout: bigint;
}
export interface MsgSendTxProtoMsg {
  typeUrl: '/ibc.applications.interchain_accounts.controller.v1.MsgSendTx';
  value: Uint8Array;
}
/** MsgSendTx defines the payload for Msg/SendTx */
export interface MsgSendTxAmino {
  owner?: string;
  connection_id?: string;
  packet_data?: InterchainAccountPacketDataAmino;
  /**
   * Relative timeout timestamp provided will be added to the current block time during transaction execution.
   * The timeout timestamp must be non-zero.
   */
  relative_timeout?: string;
}
export interface MsgSendTxAminoMsg {
  type: 'cosmos-sdk/MsgSendTx';
  value: MsgSendTxAmino;
}
/** MsgSendTx defines the payload for Msg/SendTx */
export interface MsgSendTxSDKType {
  owner: string;
  connection_id: string;
  packet_data: InterchainAccountPacketDataSDKType;
  relative_timeout: bigint;
}
/** MsgSendTxResponse defines the response for MsgSendTx */
export interface MsgSendTxResponse {
  sequence: bigint;
}
export interface MsgSendTxResponseProtoMsg {
  typeUrl: '/ibc.applications.interchain_accounts.controller.v1.MsgSendTxResponse';
  value: Uint8Array;
}
/** MsgSendTxResponse defines the response for MsgSendTx */
export interface MsgSendTxResponseAmino {
  sequence?: string;
}
export interface MsgSendTxResponseAminoMsg {
  type: 'cosmos-sdk/MsgSendTxResponse';
  value: MsgSendTxResponseAmino;
}
/** MsgSendTxResponse defines the response for MsgSendTx */
export interface MsgSendTxResponseSDKType {
  sequence: bigint;
}
function createBaseMsgRegisterInterchainAccount(): MsgRegisterInterchainAccount {
  return {
    owner: '',
    connectionId: '',
    version: '',
  };
}
export const MsgRegisterInterchainAccount = {
  typeUrl:
    '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount',
  encode(
    message: MsgRegisterInterchainAccount,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.connectionId !== '') {
      writer.uint32(18).string(message.connectionId);
    }
    if (message.version !== '') {
      writer.uint32(26).string(message.version);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRegisterInterchainAccount {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRegisterInterchainAccount();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.connectionId = reader.string();
          break;
        case 3:
          message.version = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRegisterInterchainAccount {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      connectionId: isSet(object.connectionId)
        ? String(object.connectionId)
        : '',
      version: isSet(object.version) ? String(object.version) : '',
    };
  },
  toJSON(message: MsgRegisterInterchainAccount): unknown {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.connectionId !== undefined &&
      (obj.connectionId = message.connectionId);
    message.version !== undefined && (obj.version = message.version);
    return obj;
  },
  fromPartial(
    object: Partial<MsgRegisterInterchainAccount>,
  ): MsgRegisterInterchainAccount {
    const message = createBaseMsgRegisterInterchainAccount();
    message.owner = object.owner ?? '';
    message.connectionId = object.connectionId ?? '';
    message.version = object.version ?? '';
    return message;
  },
  fromAmino(
    object: MsgRegisterInterchainAccountAmino,
  ): MsgRegisterInterchainAccount {
    const message = createBaseMsgRegisterInterchainAccount();
    if (object.owner !== undefined && object.owner !== null) {
      message.owner = object.owner;
    }
    if (object.connection_id !== undefined && object.connection_id !== null) {
      message.connectionId = object.connection_id;
    }
    if (object.version !== undefined && object.version !== null) {
      message.version = object.version;
    }
    return message;
  },
  toAmino(
    message: MsgRegisterInterchainAccount,
  ): MsgRegisterInterchainAccountAmino {
    const obj: any = {};
    obj.owner = message.owner;
    obj.connection_id = message.connectionId;
    obj.version = message.version;
    return obj;
  },
  fromAminoMsg(
    object: MsgRegisterInterchainAccountAminoMsg,
  ): MsgRegisterInterchainAccount {
    return MsgRegisterInterchainAccount.fromAmino(object.value);
  },
  toAminoMsg(
    message: MsgRegisterInterchainAccount,
  ): MsgRegisterInterchainAccountAminoMsg {
    return {
      type: 'cosmos-sdk/MsgRegisterInterchainAccount',
      value: MsgRegisterInterchainAccount.toAmino(message),
    };
  },
  fromProtoMsg(
    message: MsgRegisterInterchainAccountProtoMsg,
  ): MsgRegisterInterchainAccount {
    return MsgRegisterInterchainAccount.decode(message.value);
  },
  toProto(message: MsgRegisterInterchainAccount): Uint8Array {
    return MsgRegisterInterchainAccount.encode(message).finish();
  },
  toProtoMsg(
    message: MsgRegisterInterchainAccount,
  ): MsgRegisterInterchainAccountProtoMsg {
    return {
      typeUrl:
        '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccount',
      value: MsgRegisterInterchainAccount.encode(message).finish(),
    };
  },
};
function createBaseMsgRegisterInterchainAccountResponse(): MsgRegisterInterchainAccountResponse {
  return {
    channelId: '',
  };
}
export const MsgRegisterInterchainAccountResponse = {
  typeUrl:
    '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccountResponse',
  encode(
    message: MsgRegisterInterchainAccountResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.channelId !== '') {
      writer.uint32(10).string(message.channelId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRegisterInterchainAccountResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRegisterInterchainAccountResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.channelId = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRegisterInterchainAccountResponse {
    return {
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
    };
  },
  toJSON(message: MsgRegisterInterchainAccountResponse): unknown {
    const obj: any = {};
    message.channelId !== undefined && (obj.channelId = message.channelId);
    return obj;
  },
  fromPartial(
    object: Partial<MsgRegisterInterchainAccountResponse>,
  ): MsgRegisterInterchainAccountResponse {
    const message = createBaseMsgRegisterInterchainAccountResponse();
    message.channelId = object.channelId ?? '';
    return message;
  },
  fromAmino(
    object: MsgRegisterInterchainAccountResponseAmino,
  ): MsgRegisterInterchainAccountResponse {
    const message = createBaseMsgRegisterInterchainAccountResponse();
    if (object.channel_id !== undefined && object.channel_id !== null) {
      message.channelId = object.channel_id;
    }
    return message;
  },
  toAmino(
    message: MsgRegisterInterchainAccountResponse,
  ): MsgRegisterInterchainAccountResponseAmino {
    const obj: any = {};
    obj.channel_id = message.channelId;
    return obj;
  },
  fromAminoMsg(
    object: MsgRegisterInterchainAccountResponseAminoMsg,
  ): MsgRegisterInterchainAccountResponse {
    return MsgRegisterInterchainAccountResponse.fromAmino(object.value);
  },
  toAminoMsg(
    message: MsgRegisterInterchainAccountResponse,
  ): MsgRegisterInterchainAccountResponseAminoMsg {
    return {
      type: 'cosmos-sdk/MsgRegisterInterchainAccountResponse',
      value: MsgRegisterInterchainAccountResponse.toAmino(message),
    };
  },
  fromProtoMsg(
    message: MsgRegisterInterchainAccountResponseProtoMsg,
  ): MsgRegisterInterchainAccountResponse {
    return MsgRegisterInterchainAccountResponse.decode(message.value);
  },
  toProto(message: MsgRegisterInterchainAccountResponse): Uint8Array {
    return MsgRegisterInterchainAccountResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgRegisterInterchainAccountResponse,
  ): MsgRegisterInterchainAccountResponseProtoMsg {
    return {
      typeUrl:
        '/ibc.applications.interchain_accounts.controller.v1.MsgRegisterInterchainAccountResponse',
      value: MsgRegisterInterchainAccountResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgSendTx(): MsgSendTx {
  return {
    owner: '',
    connectionId: '',
    packetData: InterchainAccountPacketData.fromPartial({}),
    relativeTimeout: BigInt(0),
  };
}
export const MsgSendTx = {
  typeUrl: '/ibc.applications.interchain_accounts.controller.v1.MsgSendTx',
  encode(
    message: MsgSendTx,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.connectionId !== '') {
      writer.uint32(18).string(message.connectionId);
    }
    if (message.packetData !== undefined) {
      InterchainAccountPacketData.encode(
        message.packetData,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    if (message.relativeTimeout !== BigInt(0)) {
      writer.uint32(32).uint64(message.relativeTimeout);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgSendTx {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSendTx();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.connectionId = reader.string();
          break;
        case 3:
          message.packetData = InterchainAccountPacketData.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 4:
          message.relativeTimeout = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSendTx {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      connectionId: isSet(object.connectionId)
        ? String(object.connectionId)
        : '',
      packetData: isSet(object.packetData)
        ? InterchainAccountPacketData.fromJSON(object.packetData)
        : undefined,
      relativeTimeout: isSet(object.relativeTimeout)
        ? BigInt(object.relativeTimeout.toString())
        : BigInt(0),
    };
  },
  toJSON(message: MsgSendTx): unknown {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.connectionId !== undefined &&
      (obj.connectionId = message.connectionId);
    message.packetData !== undefined &&
      (obj.packetData = message.packetData
        ? InterchainAccountPacketData.toJSON(message.packetData)
        : undefined);
    message.relativeTimeout !== undefined &&
      (obj.relativeTimeout = (message.relativeTimeout || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<MsgSendTx>): MsgSendTx {
    const message = createBaseMsgSendTx();
    message.owner = object.owner ?? '';
    message.connectionId = object.connectionId ?? '';
    message.packetData =
      object.packetData !== undefined && object.packetData !== null
        ? InterchainAccountPacketData.fromPartial(object.packetData)
        : undefined;
    message.relativeTimeout =
      object.relativeTimeout !== undefined && object.relativeTimeout !== null
        ? BigInt(object.relativeTimeout.toString())
        : BigInt(0);
    return message;
  },
  fromAmino(object: MsgSendTxAmino): MsgSendTx {
    const message = createBaseMsgSendTx();
    if (object.owner !== undefined && object.owner !== null) {
      message.owner = object.owner;
    }
    if (object.connection_id !== undefined && object.connection_id !== null) {
      message.connectionId = object.connection_id;
    }
    if (object.packet_data !== undefined && object.packet_data !== null) {
      message.packetData = InterchainAccountPacketData.fromAmino(
        object.packet_data,
      );
    }
    if (
      object.relative_timeout !== undefined &&
      object.relative_timeout !== null
    ) {
      message.relativeTimeout = BigInt(object.relative_timeout);
    }
    return message;
  },
  toAmino(message: MsgSendTx): MsgSendTxAmino {
    const obj: any = {};
    obj.owner = message.owner;
    obj.connection_id = message.connectionId;
    obj.packet_data = message.packetData
      ? InterchainAccountPacketData.toAmino(message.packetData)
      : undefined;
    obj.relative_timeout = message.relativeTimeout
      ? message.relativeTimeout.toString()
      : undefined;
    return obj;
  },
  fromAminoMsg(object: MsgSendTxAminoMsg): MsgSendTx {
    return MsgSendTx.fromAmino(object.value);
  },
  toAminoMsg(message: MsgSendTx): MsgSendTxAminoMsg {
    return {
      type: 'cosmos-sdk/MsgSendTx',
      value: MsgSendTx.toAmino(message),
    };
  },
  fromProtoMsg(message: MsgSendTxProtoMsg): MsgSendTx {
    return MsgSendTx.decode(message.value);
  },
  toProto(message: MsgSendTx): Uint8Array {
    return MsgSendTx.encode(message).finish();
  },
  toProtoMsg(message: MsgSendTx): MsgSendTxProtoMsg {
    return {
      typeUrl: '/ibc.applications.interchain_accounts.controller.v1.MsgSendTx',
      value: MsgSendTx.encode(message).finish(),
    };
  },
};
function createBaseMsgSendTxResponse(): MsgSendTxResponse {
  return {
    sequence: BigInt(0),
  };
}
export const MsgSendTxResponse = {
  typeUrl:
    '/ibc.applications.interchain_accounts.controller.v1.MsgSendTxResponse',
  encode(
    message: MsgSendTxResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sequence !== BigInt(0)) {
      writer.uint32(8).uint64(message.sequence);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgSendTxResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSendTxResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sequence = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSendTxResponse {
    return {
      sequence: isSet(object.sequence)
        ? BigInt(object.sequence.toString())
        : BigInt(0),
    };
  },
  toJSON(message: MsgSendTxResponse): unknown {
    const obj: any = {};
    message.sequence !== undefined &&
      (obj.sequence = (message.sequence || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<MsgSendTxResponse>): MsgSendTxResponse {
    const message = createBaseMsgSendTxResponse();
    message.sequence =
      object.sequence !== undefined && object.sequence !== null
        ? BigInt(object.sequence.toString())
        : BigInt(0);
    return message;
  },
  fromAmino(object: MsgSendTxResponseAmino): MsgSendTxResponse {
    const message = createBaseMsgSendTxResponse();
    if (object.sequence !== undefined && object.sequence !== null) {
      message.sequence = BigInt(object.sequence);
    }
    return message;
  },
  toAmino(message: MsgSendTxResponse): MsgSendTxResponseAmino {
    const obj: any = {};
    obj.sequence = message.sequence ? message.sequence.toString() : undefined;
    return obj;
  },
  fromAminoMsg(object: MsgSendTxResponseAminoMsg): MsgSendTxResponse {
    return MsgSendTxResponse.fromAmino(object.value);
  },
  toAminoMsg(message: MsgSendTxResponse): MsgSendTxResponseAminoMsg {
    return {
      type: 'cosmos-sdk/MsgSendTxResponse',
      value: MsgSendTxResponse.toAmino(message),
    };
  },
  fromProtoMsg(message: MsgSendTxResponseProtoMsg): MsgSendTxResponse {
    return MsgSendTxResponse.decode(message.value);
  },
  toProto(message: MsgSendTxResponse): Uint8Array {
    return MsgSendTxResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgSendTxResponse): MsgSendTxResponseProtoMsg {
    return {
      typeUrl:
        '/ibc.applications.interchain_accounts.controller.v1.MsgSendTxResponse',
      value: MsgSendTxResponse.encode(message).finish(),
    };
  },
};
