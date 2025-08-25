//@ts-nocheck
import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * SendAuthorization allows the grantee to spend up to spend_limit coins from
 * the granter's account.
 *
 * Since: cosmos-sdk 0.43
 */
export interface SendAuthorization {
  spendLimit: Coin[];
  /**
   * allow_list specifies an optional list of addresses to whom the grantee can send tokens on behalf of the
   * granter. If omitted, any recipient is allowed.
   *
   * Since: cosmos-sdk 0.47
   */
  allowList: string[];
}
export interface SendAuthorizationProtoMsg {
  typeUrl: '/cosmos.bank.v1beta1.SendAuthorization';
  value: Uint8Array;
}
/**
 * SendAuthorization allows the grantee to spend up to spend_limit coins from
 * the granter's account.
 *
 * Since: cosmos-sdk 0.43
 */
export interface SendAuthorizationSDKType {
  spend_limit: CoinSDKType[];
  allow_list: string[];
}
function createBaseSendAuthorization(): SendAuthorization {
  return {
    spendLimit: [],
    allowList: [],
  };
}
export const SendAuthorization = {
  typeUrl: '/cosmos.bank.v1beta1.SendAuthorization',
  encode(
    message: SendAuthorization,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.spendLimit) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.allowList) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): SendAuthorization {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSendAuthorization();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.spendLimit.push(Coin.decode(reader, reader.uint32()));
          break;
        case 2:
          message.allowList.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SendAuthorization {
    return {
      spendLimit: Array.isArray(object?.spendLimit)
        ? object.spendLimit.map((e: any) => Coin.fromJSON(e))
        : [],
      allowList: Array.isArray(object?.allowList)
        ? object.allowList.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: SendAuthorization): JsonSafe<SendAuthorization> {
    const obj: any = {};
    if (message.spendLimit) {
      obj.spendLimit = message.spendLimit.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.spendLimit = [];
    }
    if (message.allowList) {
      obj.allowList = message.allowList.map(e => e);
    } else {
      obj.allowList = [];
    }
    return obj;
  },
  fromPartial(object: Partial<SendAuthorization>): SendAuthorization {
    const message = createBaseSendAuthorization();
    message.spendLimit = object.spendLimit?.map(e => Coin.fromPartial(e)) || [];
    message.allowList = object.allowList?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: SendAuthorizationProtoMsg): SendAuthorization {
    return SendAuthorization.decode(message.value);
  },
  toProto(message: SendAuthorization): Uint8Array {
    return SendAuthorization.encode(message).finish();
  },
  toProtoMsg(message: SendAuthorization): SendAuthorizationProtoMsg {
    return {
      typeUrl: '/cosmos.bank.v1beta1.SendAuthorization',
      value: SendAuthorization.encode(message).finish(),
    };
  },
};
