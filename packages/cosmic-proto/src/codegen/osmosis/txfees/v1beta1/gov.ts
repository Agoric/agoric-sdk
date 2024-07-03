//@ts-nocheck
import { FeeToken, FeeTokenSDKType } from './feetoken.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/**
 * UpdateFeeTokenProposal is a gov Content type for adding a new whitelisted fee
 * token. It must specify a denom along with gamm pool ID to use as a spot price
 * calculator. It can be used to add a new denom to the whitelist It can also be
 * used to update the Pool to associate with the denom. If Pool ID is set to 0,
 * it will remove the denom from the whitelisted set.
 */
export interface UpdateFeeTokenProposal {
  $typeUrl?: '/osmosis.txfees.v1beta1.UpdateFeeTokenProposal';
  title: string;
  description: string;
  feetoken: FeeToken;
}
export interface UpdateFeeTokenProposalProtoMsg {
  typeUrl: '/osmosis.txfees.v1beta1.UpdateFeeTokenProposal';
  value: Uint8Array;
}
/**
 * UpdateFeeTokenProposal is a gov Content type for adding a new whitelisted fee
 * token. It must specify a denom along with gamm pool ID to use as a spot price
 * calculator. It can be used to add a new denom to the whitelist It can also be
 * used to update the Pool to associate with the denom. If Pool ID is set to 0,
 * it will remove the denom from the whitelisted set.
 */
export interface UpdateFeeTokenProposalSDKType {
  $typeUrl?: '/osmosis.txfees.v1beta1.UpdateFeeTokenProposal';
  title: string;
  description: string;
  feetoken: FeeTokenSDKType;
}
function createBaseUpdateFeeTokenProposal(): UpdateFeeTokenProposal {
  return {
    $typeUrl: '/osmosis.txfees.v1beta1.UpdateFeeTokenProposal',
    title: '',
    description: '',
    feetoken: FeeToken.fromPartial({}),
  };
}
export const UpdateFeeTokenProposal = {
  typeUrl: '/osmosis.txfees.v1beta1.UpdateFeeTokenProposal',
  encode(
    message: UpdateFeeTokenProposal,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.title !== '') {
      writer.uint32(10).string(message.title);
    }
    if (message.description !== '') {
      writer.uint32(18).string(message.description);
    }
    if (message.feetoken !== undefined) {
      FeeToken.encode(message.feetoken, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): UpdateFeeTokenProposal {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUpdateFeeTokenProposal();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.title = reader.string();
          break;
        case 2:
          message.description = reader.string();
          break;
        case 3:
          message.feetoken = FeeToken.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): UpdateFeeTokenProposal {
    return {
      title: isSet(object.title) ? String(object.title) : '',
      description: isSet(object.description) ? String(object.description) : '',
      feetoken: isSet(object.feetoken)
        ? FeeToken.fromJSON(object.feetoken)
        : undefined,
    };
  },
  toJSON(message: UpdateFeeTokenProposal): JsonSafe<UpdateFeeTokenProposal> {
    const obj: any = {};
    message.title !== undefined && (obj.title = message.title);
    message.description !== undefined &&
      (obj.description = message.description);
    message.feetoken !== undefined &&
      (obj.feetoken = message.feetoken
        ? FeeToken.toJSON(message.feetoken)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<UpdateFeeTokenProposal>): UpdateFeeTokenProposal {
    const message = createBaseUpdateFeeTokenProposal();
    message.title = object.title ?? '';
    message.description = object.description ?? '';
    message.feetoken =
      object.feetoken !== undefined && object.feetoken !== null
        ? FeeToken.fromPartial(object.feetoken)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: UpdateFeeTokenProposalProtoMsg,
  ): UpdateFeeTokenProposal {
    return UpdateFeeTokenProposal.decode(message.value);
  },
  toProto(message: UpdateFeeTokenProposal): Uint8Array {
    return UpdateFeeTokenProposal.encode(message).finish();
  },
  toProtoMsg(message: UpdateFeeTokenProposal): UpdateFeeTokenProposalProtoMsg {
    return {
      typeUrl: '/osmosis.txfees.v1beta1.UpdateFeeTokenProposal',
      value: UpdateFeeTokenProposal.encode(message).finish(),
    };
  },
};
