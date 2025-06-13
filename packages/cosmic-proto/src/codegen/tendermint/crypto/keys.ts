//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
import { type JsonSafe } from '../../json-safe.js';
/** PublicKey defines the keys available for use with Tendermint Validators */
export interface PublicKey {
  ed25519?: Uint8Array;
  secp256k1?: Uint8Array;
}
export interface PublicKeyProtoMsg {
  typeUrl: '/tendermint.crypto.PublicKey';
  value: Uint8Array;
}
/** PublicKey defines the keys available for use with Tendermint Validators */
export interface PublicKeySDKType {
  ed25519?: Uint8Array;
  secp256k1?: Uint8Array;
}
function createBasePublicKey(): PublicKey {
  return {
    ed25519: undefined,
    secp256k1: undefined,
  };
}
export const PublicKey = {
  typeUrl: '/tendermint.crypto.PublicKey',
  encode(
    message: PublicKey,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.ed25519 !== undefined) {
      writer.uint32(10).bytes(message.ed25519);
    }
    if (message.secp256k1 !== undefined) {
      writer.uint32(18).bytes(message.secp256k1);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): PublicKey {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePublicKey();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.ed25519 = reader.bytes();
          break;
        case 2:
          message.secp256k1 = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): PublicKey {
    return {
      ed25519: isSet(object.ed25519)
        ? bytesFromBase64(object.ed25519)
        : undefined,
      secp256k1: isSet(object.secp256k1)
        ? bytesFromBase64(object.secp256k1)
        : undefined,
    };
  },
  toJSON(message: PublicKey): JsonSafe<PublicKey> {
    const obj: any = {};
    message.ed25519 !== undefined &&
      (obj.ed25519 =
        message.ed25519 !== undefined
          ? base64FromBytes(message.ed25519)
          : undefined);
    message.secp256k1 !== undefined &&
      (obj.secp256k1 =
        message.secp256k1 !== undefined
          ? base64FromBytes(message.secp256k1)
          : undefined);
    return obj;
  },
  fromPartial(object: Partial<PublicKey>): PublicKey {
    const message = createBasePublicKey();
    message.ed25519 = object.ed25519 ?? undefined;
    message.secp256k1 = object.secp256k1 ?? undefined;
    return message;
  },
  fromProtoMsg(message: PublicKeyProtoMsg): PublicKey {
    return PublicKey.decode(message.value);
  },
  toProto(message: PublicKey): Uint8Array {
    return PublicKey.encode(message).finish();
  },
  toProtoMsg(message: PublicKey): PublicKeyProtoMsg {
    return {
      typeUrl: '/tendermint.crypto.PublicKey',
      value: PublicKey.encode(message).finish(),
    };
  },
};
