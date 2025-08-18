//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/** EventGrant is emitted on Msg/Grant */
export interface EventGrant {
  /** Msg type URL for which an autorization is granted */
  msgTypeUrl: string;
  /** Granter account address */
  granter: string;
  /** Grantee account address */
  grantee: string;
}
export interface EventGrantProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.EventGrant';
  value: Uint8Array;
}
/** EventGrant is emitted on Msg/Grant */
export interface EventGrantSDKType {
  msg_type_url: string;
  granter: string;
  grantee: string;
}
/** EventRevoke is emitted on Msg/Revoke */
export interface EventRevoke {
  /** Msg type URL for which an autorization is revoked */
  msgTypeUrl: string;
  /** Granter account address */
  granter: string;
  /** Grantee account address */
  grantee: string;
}
export interface EventRevokeProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.EventRevoke';
  value: Uint8Array;
}
/** EventRevoke is emitted on Msg/Revoke */
export interface EventRevokeSDKType {
  msg_type_url: string;
  granter: string;
  grantee: string;
}
function createBaseEventGrant(): EventGrant {
  return {
    msgTypeUrl: '',
    granter: '',
    grantee: '',
  };
}
export const EventGrant = {
  typeUrl: '/cosmos.authz.v1beta1.EventGrant',
  encode(
    message: EventGrant,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.msgTypeUrl !== '') {
      writer.uint32(18).string(message.msgTypeUrl);
    }
    if (message.granter !== '') {
      writer.uint32(26).string(message.granter);
    }
    if (message.grantee !== '') {
      writer.uint32(34).string(message.grantee);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EventGrant {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventGrant();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          message.msgTypeUrl = reader.string();
          break;
        case 3:
          message.granter = reader.string();
          break;
        case 4:
          message.grantee = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EventGrant {
    return {
      msgTypeUrl: isSet(object.msgTypeUrl) ? String(object.msgTypeUrl) : '',
      granter: isSet(object.granter) ? String(object.granter) : '',
      grantee: isSet(object.grantee) ? String(object.grantee) : '',
    };
  },
  toJSON(message: EventGrant): JsonSafe<EventGrant> {
    const obj: any = {};
    message.msgTypeUrl !== undefined && (obj.msgTypeUrl = message.msgTypeUrl);
    message.granter !== undefined && (obj.granter = message.granter);
    message.grantee !== undefined && (obj.grantee = message.grantee);
    return obj;
  },
  fromPartial(object: Partial<EventGrant>): EventGrant {
    const message = createBaseEventGrant();
    message.msgTypeUrl = object.msgTypeUrl ?? '';
    message.granter = object.granter ?? '';
    message.grantee = object.grantee ?? '';
    return message;
  },
  fromProtoMsg(message: EventGrantProtoMsg): EventGrant {
    return EventGrant.decode(message.value);
  },
  toProto(message: EventGrant): Uint8Array {
    return EventGrant.encode(message).finish();
  },
  toProtoMsg(message: EventGrant): EventGrantProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.EventGrant',
      value: EventGrant.encode(message).finish(),
    };
  },
};
function createBaseEventRevoke(): EventRevoke {
  return {
    msgTypeUrl: '',
    granter: '',
    grantee: '',
  };
}
export const EventRevoke = {
  typeUrl: '/cosmos.authz.v1beta1.EventRevoke',
  encode(
    message: EventRevoke,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.msgTypeUrl !== '') {
      writer.uint32(18).string(message.msgTypeUrl);
    }
    if (message.granter !== '') {
      writer.uint32(26).string(message.granter);
    }
    if (message.grantee !== '') {
      writer.uint32(34).string(message.grantee);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EventRevoke {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventRevoke();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          message.msgTypeUrl = reader.string();
          break;
        case 3:
          message.granter = reader.string();
          break;
        case 4:
          message.grantee = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EventRevoke {
    return {
      msgTypeUrl: isSet(object.msgTypeUrl) ? String(object.msgTypeUrl) : '',
      granter: isSet(object.granter) ? String(object.granter) : '',
      grantee: isSet(object.grantee) ? String(object.grantee) : '',
    };
  },
  toJSON(message: EventRevoke): JsonSafe<EventRevoke> {
    const obj: any = {};
    message.msgTypeUrl !== undefined && (obj.msgTypeUrl = message.msgTypeUrl);
    message.granter !== undefined && (obj.granter = message.granter);
    message.grantee !== undefined && (obj.grantee = message.grantee);
    return obj;
  },
  fromPartial(object: Partial<EventRevoke>): EventRevoke {
    const message = createBaseEventRevoke();
    message.msgTypeUrl = object.msgTypeUrl ?? '';
    message.granter = object.granter ?? '';
    message.grantee = object.grantee ?? '';
    return message;
  },
  fromProtoMsg(message: EventRevokeProtoMsg): EventRevoke {
    return EventRevoke.decode(message.value);
  },
  toProto(message: EventRevoke): Uint8Array {
    return EventRevoke.encode(message).finish();
  },
  toProtoMsg(message: EventRevoke): EventRevokeProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.EventRevoke',
      value: EventRevoke.encode(message).finish(),
    };
  },
};
