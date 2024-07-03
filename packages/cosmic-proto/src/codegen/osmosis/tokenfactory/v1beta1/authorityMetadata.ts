//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/**
 * DenomAuthorityMetadata specifies metadata for addresses that have specific
 * capabilities over a token factory denom. Right now there is only one Admin
 * permission, but is planned to be extended to the future.
 */
export interface DenomAuthorityMetadata {
  /** Can be empty for no admin, or a valid osmosis address */
  admin: string;
}
export interface DenomAuthorityMetadataProtoMsg {
  typeUrl: '/osmosis.tokenfactory.v1beta1.DenomAuthorityMetadata';
  value: Uint8Array;
}
/**
 * DenomAuthorityMetadata specifies metadata for addresses that have specific
 * capabilities over a token factory denom. Right now there is only one Admin
 * permission, but is planned to be extended to the future.
 */
export interface DenomAuthorityMetadataSDKType {
  admin: string;
}
function createBaseDenomAuthorityMetadata(): DenomAuthorityMetadata {
  return {
    admin: '',
  };
}
export const DenomAuthorityMetadata = {
  typeUrl: '/osmosis.tokenfactory.v1beta1.DenomAuthorityMetadata',
  encode(
    message: DenomAuthorityMetadata,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.admin !== '') {
      writer.uint32(10).string(message.admin);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): DenomAuthorityMetadata {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDenomAuthorityMetadata();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.admin = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DenomAuthorityMetadata {
    return {
      admin: isSet(object.admin) ? String(object.admin) : '',
    };
  },
  toJSON(message: DenomAuthorityMetadata): JsonSafe<DenomAuthorityMetadata> {
    const obj: any = {};
    message.admin !== undefined && (obj.admin = message.admin);
    return obj;
  },
  fromPartial(object: Partial<DenomAuthorityMetadata>): DenomAuthorityMetadata {
    const message = createBaseDenomAuthorityMetadata();
    message.admin = object.admin ?? '';
    return message;
  },
  fromProtoMsg(
    message: DenomAuthorityMetadataProtoMsg,
  ): DenomAuthorityMetadata {
    return DenomAuthorityMetadata.decode(message.value);
  },
  toProto(message: DenomAuthorityMetadata): Uint8Array {
    return DenomAuthorityMetadata.encode(message).finish();
  },
  toProtoMsg(message: DenomAuthorityMetadata): DenomAuthorityMetadataProtoMsg {
    return {
      typeUrl: '/osmosis.tokenfactory.v1beta1.DenomAuthorityMetadata',
      value: DenomAuthorityMetadata.encode(message).finish(),
    };
  },
};
