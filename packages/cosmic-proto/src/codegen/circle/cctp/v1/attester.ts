//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * A public key used to verify message signatures
 * @param attester ECDSA uncompressed public key, hex encoded
 */
export interface Attester {
  attester: string;
}
export interface AttesterProtoMsg {
  typeUrl: '/circle.cctp.v1.Attester';
  value: Uint8Array;
}
/**
 * A public key used to verify message signatures
 * @param attester ECDSA uncompressed public key, hex encoded
 */
export interface AttesterSDKType {
  attester: string;
}
function createBaseAttester(): Attester {
  return {
    attester: '',
  };
}
export const Attester = {
  typeUrl: '/circle.cctp.v1.Attester' as const,
  encode(
    message: Attester,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.attester !== '') {
      writer.uint32(10).string(message.attester);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Attester {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAttester();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.attester = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Attester {
    return {
      attester: isSet(object.attester) ? String(object.attester) : '',
    };
  },
  toJSON(message: Attester): JsonSafe<Attester> {
    const obj: any = {};
    message.attester !== undefined && (obj.attester = message.attester);
    return obj;
  },
  fromPartial(object: Partial<Attester>): Attester {
    const message = createBaseAttester();
    message.attester = object.attester ?? '';
    return message;
  },
  fromProtoMsg(message: AttesterProtoMsg): Attester {
    return Attester.decode(message.value);
  },
  toProto(message: Attester): Uint8Array {
    return Attester.encode(message).finish();
  },
  toProtoMsg(message: Attester): AttesterProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.Attester',
      value: Attester.encode(message).finish(),
    };
  },
};
