//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet, bytesFromBase64, base64FromBytes } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * @param domain_id
 * @param address
 */
export interface RemoteTokenMessenger {
  domainId: number;
  address: Uint8Array;
}
export interface RemoteTokenMessengerProtoMsg {
  typeUrl: '/circle.cctp.v1.RemoteTokenMessenger';
  value: Uint8Array;
}
/**
 * @param domain_id
 * @param address
 */
export interface RemoteTokenMessengerSDKType {
  domain_id: number;
  address: Uint8Array;
}
function createBaseRemoteTokenMessenger(): RemoteTokenMessenger {
  return {
    domainId: 0,
    address: new Uint8Array(),
  };
}
export const RemoteTokenMessenger = {
  typeUrl: '/circle.cctp.v1.RemoteTokenMessenger',
  encode(
    message: RemoteTokenMessenger,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.domainId !== 0) {
      writer.uint32(8).uint32(message.domainId);
    }
    if (message.address.length !== 0) {
      writer.uint32(18).bytes(message.address);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RemoteTokenMessenger {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRemoteTokenMessenger();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.domainId = reader.uint32();
          break;
        case 2:
          message.address = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RemoteTokenMessenger {
    return {
      domainId: isSet(object.domainId) ? Number(object.domainId) : 0,
      address: isSet(object.address)
        ? bytesFromBase64(object.address)
        : new Uint8Array(),
    };
  },
  toJSON(message: RemoteTokenMessenger): JsonSafe<RemoteTokenMessenger> {
    const obj: any = {};
    message.domainId !== undefined &&
      (obj.domainId = Math.round(message.domainId));
    message.address !== undefined &&
      (obj.address = base64FromBytes(
        message.address !== undefined ? message.address : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<RemoteTokenMessenger>): RemoteTokenMessenger {
    const message = createBaseRemoteTokenMessenger();
    message.domainId = object.domainId ?? 0;
    message.address = object.address ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: RemoteTokenMessengerProtoMsg): RemoteTokenMessenger {
    return RemoteTokenMessenger.decode(message.value);
  },
  toProto(message: RemoteTokenMessenger): Uint8Array {
    return RemoteTokenMessenger.encode(message).finish();
  },
  toProtoMsg(message: RemoteTokenMessenger): RemoteTokenMessengerProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.RemoteTokenMessenger',
      value: RemoteTokenMessenger.encode(message).finish(),
    };
  },
};
