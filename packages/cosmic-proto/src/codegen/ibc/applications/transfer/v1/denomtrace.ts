//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * DenomTrace contains the base denomination for ICS20 fungible tokens and the
 * source tracing information path.
 * @name DenomTrace
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.DenomTrace
 * @deprecated
 */
export interface DenomTrace {
  /**
   * path defines the chain of port/channel identifiers used for tracing the
   * source of the fungible token.
   */
  path: string;
  /**
   * base denomination of the relayed fungible token.
   */
  baseDenom: string;
}
export interface DenomTraceProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.DenomTrace';
  value: Uint8Array;
}
/**
 * DenomTrace contains the base denomination for ICS20 fungible tokens and the
 * source tracing information path.
 * @name DenomTraceSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.DenomTrace
 * @deprecated
 */
export interface DenomTraceSDKType {
  path: string;
  base_denom: string;
}
function createBaseDenomTrace(): DenomTrace {
  return {
    path: '',
    baseDenom: '',
  };
}
/**
 * DenomTrace contains the base denomination for ICS20 fungible tokens and the
 * source tracing information path.
 * @name DenomTrace
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.DenomTrace
 * @deprecated
 */
export const DenomTrace = {
  typeUrl: '/ibc.applications.transfer.v1.DenomTrace' as const,
  aminoType: 'cosmos-sdk/DenomTrace' as const,
  is(o: any): o is DenomTrace {
    return (
      o &&
      (o.$typeUrl === DenomTrace.typeUrl ||
        (typeof o.path === 'string' && typeof o.baseDenom === 'string'))
    );
  },
  isSDK(o: any): o is DenomTraceSDKType {
    return (
      o &&
      (o.$typeUrl === DenomTrace.typeUrl ||
        (typeof o.path === 'string' && typeof o.base_denom === 'string'))
    );
  },
  encode(
    message: DenomTrace,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.path !== '') {
      writer.uint32(10).string(message.path);
    }
    if (message.baseDenom !== '') {
      writer.uint32(18).string(message.baseDenom);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): DenomTrace {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDenomTrace();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.path = reader.string();
          break;
        case 2:
          message.baseDenom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DenomTrace {
    return {
      path: isSet(object.path) ? String(object.path) : '',
      baseDenom: isSet(object.baseDenom) ? String(object.baseDenom) : '',
    };
  },
  toJSON(message: DenomTrace): JsonSafe<DenomTrace> {
    const obj: any = {};
    message.path !== undefined && (obj.path = message.path);
    message.baseDenom !== undefined && (obj.baseDenom = message.baseDenom);
    return obj;
  },
  fromPartial(object: Partial<DenomTrace>): DenomTrace {
    const message = createBaseDenomTrace();
    message.path = object.path ?? '';
    message.baseDenom = object.baseDenom ?? '';
    return message;
  },
  fromProtoMsg(message: DenomTraceProtoMsg): DenomTrace {
    return DenomTrace.decode(message.value);
  },
  toProto(message: DenomTrace): Uint8Array {
    return DenomTrace.encode(message).finish();
  },
  toProtoMsg(message: DenomTrace): DenomTraceProtoMsg {
    return {
      typeUrl: '/ibc.applications.transfer.v1.DenomTrace',
      value: DenomTrace.encode(message).finish(),
    };
  },
};
