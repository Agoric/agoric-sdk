//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * CounterpartyInfo defines the key that the counterparty will use to message our client
 * @name CounterpartyInfo
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.CounterpartyInfo
 */
export interface CounterpartyInfo {
  /**
   * merkle prefix key is the prefix that ics provable keys are stored under
   */
  merklePrefix: Uint8Array[];
  /**
   * client identifier is the identifier used to send packet messages to our client
   */
  clientId: string;
}
export interface CounterpartyInfoProtoMsg {
  typeUrl: '/ibc.core.client.v2.CounterpartyInfo';
  value: Uint8Array;
}
/**
 * CounterpartyInfo defines the key that the counterparty will use to message our client
 * @name CounterpartyInfoSDKType
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.CounterpartyInfo
 */
export interface CounterpartyInfoSDKType {
  merkle_prefix: Uint8Array[];
  client_id: string;
}
function createBaseCounterpartyInfo(): CounterpartyInfo {
  return {
    merklePrefix: [],
    clientId: '',
  };
}
/**
 * CounterpartyInfo defines the key that the counterparty will use to message our client
 * @name CounterpartyInfo
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.CounterpartyInfo
 */
export const CounterpartyInfo = {
  typeUrl: '/ibc.core.client.v2.CounterpartyInfo' as const,
  aminoType: 'cosmos-sdk/CounterpartyInfo' as const,
  is(o: any): o is CounterpartyInfo {
    return (
      o &&
      (o.$typeUrl === CounterpartyInfo.typeUrl ||
        (Array.isArray(o.merklePrefix) &&
          (!o.merklePrefix.length ||
            o.merklePrefix[0] instanceof Uint8Array ||
            typeof o.merklePrefix[0] === 'string') &&
          typeof o.clientId === 'string'))
    );
  },
  isSDK(o: any): o is CounterpartyInfoSDKType {
    return (
      o &&
      (o.$typeUrl === CounterpartyInfo.typeUrl ||
        (Array.isArray(o.merkle_prefix) &&
          (!o.merkle_prefix.length ||
            o.merkle_prefix[0] instanceof Uint8Array ||
            typeof o.merkle_prefix[0] === 'string') &&
          typeof o.client_id === 'string'))
    );
  },
  encode(
    message: CounterpartyInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.merklePrefix) {
      writer.uint32(10).bytes(v!);
    }
    if (message.clientId !== '') {
      writer.uint32(18).string(message.clientId);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): CounterpartyInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCounterpartyInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.merklePrefix.push(reader.bytes());
          break;
        case 2:
          message.clientId = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): CounterpartyInfo {
    return {
      merklePrefix: Array.isArray(object?.merklePrefix)
        ? object.merklePrefix.map((e: any) => bytesFromBase64(e))
        : [],
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
    };
  },
  toJSON(message: CounterpartyInfo): JsonSafe<CounterpartyInfo> {
    const obj: any = {};
    if (message.merklePrefix) {
      obj.merklePrefix = message.merklePrefix.map(e =>
        base64FromBytes(e !== undefined ? e : new Uint8Array()),
      );
    } else {
      obj.merklePrefix = [];
    }
    message.clientId !== undefined && (obj.clientId = message.clientId);
    return obj;
  },
  fromPartial(object: Partial<CounterpartyInfo>): CounterpartyInfo {
    const message = createBaseCounterpartyInfo();
    message.merklePrefix = object.merklePrefix?.map(e => e) || [];
    message.clientId = object.clientId ?? '';
    return message;
  },
  fromProtoMsg(message: CounterpartyInfoProtoMsg): CounterpartyInfo {
    return CounterpartyInfo.decode(message.value);
  },
  toProto(message: CounterpartyInfo): Uint8Array {
    return CounterpartyInfo.encode(message).finish();
  },
  toProtoMsg(message: CounterpartyInfo): CounterpartyInfoProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v2.CounterpartyInfo',
      value: CounterpartyInfo.encode(message).finish(),
    };
  },
};
