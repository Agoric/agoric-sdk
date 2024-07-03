//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { Decimal } from '@cosmjs/math';
import { isSet } from '../../helpers.js';
import { JsonSafe } from '../../json-safe.js';
/** Params holds parameters for the superfluid module */
export interface Params {
  /**
   * minimum_risk_factor is to be cut on OSMO equivalent value of lp tokens for
   * superfluid staking, default: 5%. The minimum risk factor works
   * to counter-balance the staked amount on chain's exposure to various asset
   * volatilities, and have base staking be 'resistant' to volatility.
   */
  minimumRiskFactor: string;
}
export interface ParamsProtoMsg {
  typeUrl: '/osmosis.superfluid.Params';
  value: Uint8Array;
}
/** Params holds parameters for the superfluid module */
export interface ParamsSDKType {
  minimum_risk_factor: string;
}
function createBaseParams(): Params {
  return {
    minimumRiskFactor: '',
  };
}
export const Params = {
  typeUrl: '/osmosis.superfluid.Params',
  encode(
    message: Params,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.minimumRiskFactor !== '') {
      writer
        .uint32(10)
        .string(Decimal.fromUserInput(message.minimumRiskFactor, 18).atomics);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Params {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.minimumRiskFactor = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Params {
    return {
      minimumRiskFactor: isSet(object.minimumRiskFactor)
        ? String(object.minimumRiskFactor)
        : '',
    };
  },
  toJSON(message: Params): JsonSafe<Params> {
    const obj: any = {};
    message.minimumRiskFactor !== undefined &&
      (obj.minimumRiskFactor = message.minimumRiskFactor);
    return obj;
  },
  fromPartial(object: Partial<Params>): Params {
    const message = createBaseParams();
    message.minimumRiskFactor = object.minimumRiskFactor ?? '';
    return message;
  },
  fromProtoMsg(message: ParamsProtoMsg): Params {
    return Params.decode(message.value);
  },
  toProto(message: Params): Uint8Array {
    return Params.encode(message).finish();
  },
  toProtoMsg(message: Params): ParamsProtoMsg {
    return {
      typeUrl: '/osmosis.superfluid.Params',
      value: Params.encode(message).finish(),
    };
  },
};
