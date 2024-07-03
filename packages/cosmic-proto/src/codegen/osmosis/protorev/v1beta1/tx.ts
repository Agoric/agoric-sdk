//@ts-nocheck
import { TokenPairArbRoutes, TokenPairArbRoutesSDKType } from './protorev.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/** MsgSetHotRoutes defines the Msg/SetHotRoutes request type. */
export interface MsgSetHotRoutes {
  /** admin is the account that is authorized to set the hot routes. */
  admin: string;
  /** hot_routes is the list of hot routes to set. */
  hotRoutes: TokenPairArbRoutes[];
}
export interface MsgSetHotRoutesProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.MsgSetHotRoutes';
  value: Uint8Array;
}
/** MsgSetHotRoutes defines the Msg/SetHotRoutes request type. */
export interface MsgSetHotRoutesSDKType {
  admin: string;
  hot_routes: TokenPairArbRoutesSDKType[];
}
/** MsgSetHotRoutesResponse defines the Msg/SetHotRoutes response type. */
export interface MsgSetHotRoutesResponse {}
export interface MsgSetHotRoutesResponseProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.MsgSetHotRoutesResponse';
  value: Uint8Array;
}
/** MsgSetHotRoutesResponse defines the Msg/SetHotRoutes response type. */
export interface MsgSetHotRoutesResponseSDKType {}
/** MsgSetDeveloperAccount defines the Msg/SetDeveloperAccount request type. */
export interface MsgSetDeveloperAccount {
  /** admin is the account that is authorized to set the developer account. */
  admin: string;
  /**
   * developer_account is the account that will receive a portion of the profits
   * from the protorev module.
   */
  developerAccount: string;
}
export interface MsgSetDeveloperAccountProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.MsgSetDeveloperAccount';
  value: Uint8Array;
}
/** MsgSetDeveloperAccount defines the Msg/SetDeveloperAccount request type. */
export interface MsgSetDeveloperAccountSDKType {
  admin: string;
  developer_account: string;
}
/**
 * MsgSetDeveloperAccountResponse defines the Msg/SetDeveloperAccount response
 * type.
 */
export interface MsgSetDeveloperAccountResponse {}
export interface MsgSetDeveloperAccountResponseProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.MsgSetDeveloperAccountResponse';
  value: Uint8Array;
}
/**
 * MsgSetDeveloperAccountResponse defines the Msg/SetDeveloperAccount response
 * type.
 */
export interface MsgSetDeveloperAccountResponseSDKType {}
function createBaseMsgSetHotRoutes(): MsgSetHotRoutes {
  return {
    admin: '',
    hotRoutes: [],
  };
}
export const MsgSetHotRoutes = {
  typeUrl: '/osmosis.protorev.v1beta1.MsgSetHotRoutes',
  encode(
    message: MsgSetHotRoutes,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.admin !== '') {
      writer.uint32(10).string(message.admin);
    }
    for (const v of message.hotRoutes) {
      TokenPairArbRoutes.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgSetHotRoutes {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetHotRoutes();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.admin = reader.string();
          break;
        case 2:
          message.hotRoutes.push(
            TokenPairArbRoutes.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSetHotRoutes {
    return {
      admin: isSet(object.admin) ? String(object.admin) : '',
      hotRoutes: Array.isArray(object?.hotRoutes)
        ? object.hotRoutes.map((e: any) => TokenPairArbRoutes.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgSetHotRoutes): JsonSafe<MsgSetHotRoutes> {
    const obj: any = {};
    message.admin !== undefined && (obj.admin = message.admin);
    if (message.hotRoutes) {
      obj.hotRoutes = message.hotRoutes.map(e =>
        e ? TokenPairArbRoutes.toJSON(e) : undefined,
      );
    } else {
      obj.hotRoutes = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgSetHotRoutes>): MsgSetHotRoutes {
    const message = createBaseMsgSetHotRoutes();
    message.admin = object.admin ?? '';
    message.hotRoutes =
      object.hotRoutes?.map(e => TokenPairArbRoutes.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: MsgSetHotRoutesProtoMsg): MsgSetHotRoutes {
    return MsgSetHotRoutes.decode(message.value);
  },
  toProto(message: MsgSetHotRoutes): Uint8Array {
    return MsgSetHotRoutes.encode(message).finish();
  },
  toProtoMsg(message: MsgSetHotRoutes): MsgSetHotRoutesProtoMsg {
    return {
      typeUrl: '/osmosis.protorev.v1beta1.MsgSetHotRoutes',
      value: MsgSetHotRoutes.encode(message).finish(),
    };
  },
};
function createBaseMsgSetHotRoutesResponse(): MsgSetHotRoutesResponse {
  return {};
}
export const MsgSetHotRoutesResponse = {
  typeUrl: '/osmosis.protorev.v1beta1.MsgSetHotRoutesResponse',
  encode(
    _: MsgSetHotRoutesResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetHotRoutesResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetHotRoutesResponse();
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
  fromJSON(_: any): MsgSetHotRoutesResponse {
    return {};
  },
  toJSON(_: MsgSetHotRoutesResponse): JsonSafe<MsgSetHotRoutesResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgSetHotRoutesResponse>): MsgSetHotRoutesResponse {
    const message = createBaseMsgSetHotRoutesResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgSetHotRoutesResponseProtoMsg,
  ): MsgSetHotRoutesResponse {
    return MsgSetHotRoutesResponse.decode(message.value);
  },
  toProto(message: MsgSetHotRoutesResponse): Uint8Array {
    return MsgSetHotRoutesResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSetHotRoutesResponse,
  ): MsgSetHotRoutesResponseProtoMsg {
    return {
      typeUrl: '/osmosis.protorev.v1beta1.MsgSetHotRoutesResponse',
      value: MsgSetHotRoutesResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgSetDeveloperAccount(): MsgSetDeveloperAccount {
  return {
    admin: '',
    developerAccount: '',
  };
}
export const MsgSetDeveloperAccount = {
  typeUrl: '/osmosis.protorev.v1beta1.MsgSetDeveloperAccount',
  encode(
    message: MsgSetDeveloperAccount,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.admin !== '') {
      writer.uint32(10).string(message.admin);
    }
    if (message.developerAccount !== '') {
      writer.uint32(18).string(message.developerAccount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetDeveloperAccount {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetDeveloperAccount();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.admin = reader.string();
          break;
        case 2:
          message.developerAccount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSetDeveloperAccount {
    return {
      admin: isSet(object.admin) ? String(object.admin) : '',
      developerAccount: isSet(object.developerAccount)
        ? String(object.developerAccount)
        : '',
    };
  },
  toJSON(message: MsgSetDeveloperAccount): JsonSafe<MsgSetDeveloperAccount> {
    const obj: any = {};
    message.admin !== undefined && (obj.admin = message.admin);
    message.developerAccount !== undefined &&
      (obj.developerAccount = message.developerAccount);
    return obj;
  },
  fromPartial(object: Partial<MsgSetDeveloperAccount>): MsgSetDeveloperAccount {
    const message = createBaseMsgSetDeveloperAccount();
    message.admin = object.admin ?? '';
    message.developerAccount = object.developerAccount ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgSetDeveloperAccountProtoMsg,
  ): MsgSetDeveloperAccount {
    return MsgSetDeveloperAccount.decode(message.value);
  },
  toProto(message: MsgSetDeveloperAccount): Uint8Array {
    return MsgSetDeveloperAccount.encode(message).finish();
  },
  toProtoMsg(message: MsgSetDeveloperAccount): MsgSetDeveloperAccountProtoMsg {
    return {
      typeUrl: '/osmosis.protorev.v1beta1.MsgSetDeveloperAccount',
      value: MsgSetDeveloperAccount.encode(message).finish(),
    };
  },
};
function createBaseMsgSetDeveloperAccountResponse(): MsgSetDeveloperAccountResponse {
  return {};
}
export const MsgSetDeveloperAccountResponse = {
  typeUrl: '/osmosis.protorev.v1beta1.MsgSetDeveloperAccountResponse',
  encode(
    _: MsgSetDeveloperAccountResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetDeveloperAccountResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetDeveloperAccountResponse();
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
  fromJSON(_: any): MsgSetDeveloperAccountResponse {
    return {};
  },
  toJSON(
    _: MsgSetDeveloperAccountResponse,
  ): JsonSafe<MsgSetDeveloperAccountResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgSetDeveloperAccountResponse>,
  ): MsgSetDeveloperAccountResponse {
    const message = createBaseMsgSetDeveloperAccountResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgSetDeveloperAccountResponseProtoMsg,
  ): MsgSetDeveloperAccountResponse {
    return MsgSetDeveloperAccountResponse.decode(message.value);
  },
  toProto(message: MsgSetDeveloperAccountResponse): Uint8Array {
    return MsgSetDeveloperAccountResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSetDeveloperAccountResponse,
  ): MsgSetDeveloperAccountResponseProtoMsg {
    return {
      typeUrl: '/osmosis.protorev.v1beta1.MsgSetDeveloperAccountResponse',
      value: MsgSetDeveloperAccountResponse.encode(message).finish(),
    };
  },
};
