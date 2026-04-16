//@ts-nocheck
import {
  Timestamp,
  type TimestampSDKType,
} from '../../../google/protobuf/timestamp.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { Decimal } from '../../../decimals.js';
import { isSet, fromJsonTimestamp, fromTimestamp } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * ContinuousFund defines the fields of continuous fund proposal.
 * @name ContinuousFund
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.ContinuousFund
 */
export interface ContinuousFund {
  /**
   * Recipient is the address string of the account receiving funds.
   */
  recipient: string;
  /**
   * Percentage is the percentage of funds to be allocated from Community pool.
   */
  percentage: string;
  /**
   * Optional, if expiry is set, removes the state object when expired.
   */
  expiry?: Timestamp;
}
export interface ContinuousFundProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.ContinuousFund';
  value: Uint8Array;
}
/**
 * ContinuousFund defines the fields of continuous fund proposal.
 * @name ContinuousFundSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.ContinuousFund
 */
export interface ContinuousFundSDKType {
  recipient: string;
  percentage: string;
  expiry?: TimestampSDKType;
}
/**
 * Params defines the parameters for the protocolpool module.
 * @name Params
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.Params
 */
export interface Params {
  /**
   * EnabledDistributionDenoms lists the denoms that are allowed to be distributed.
   * This is to avoid spending time distributing undesired tokens to continuous funds and budgets.
   */
  enabledDistributionDenoms: string[];
  /**
   * DistributionFrequency is the frequency (in terms of blocks) that funds are distributed out from the
   * x/protocolpool module.
   */
  distributionFrequency: bigint;
}
export interface ParamsProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.Params';
  value: Uint8Array;
}
/**
 * Params defines the parameters for the protocolpool module.
 * @name ParamsSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.Params
 */
export interface ParamsSDKType {
  enabled_distribution_denoms: string[];
  distribution_frequency: bigint;
}
function createBaseContinuousFund(): ContinuousFund {
  return {
    recipient: '',
    percentage: '',
    expiry: undefined,
  };
}
/**
 * ContinuousFund defines the fields of continuous fund proposal.
 * @name ContinuousFund
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.ContinuousFund
 */
export const ContinuousFund = {
  typeUrl: '/cosmos.protocolpool.v1.ContinuousFund' as const,
  aminoType: 'cosmos-sdk/ContinuousFund' as const,
  is(o: any): o is ContinuousFund {
    return (
      o &&
      (o.$typeUrl === ContinuousFund.typeUrl ||
        (typeof o.recipient === 'string' && typeof o.percentage === 'string'))
    );
  },
  isSDK(o: any): o is ContinuousFundSDKType {
    return (
      o &&
      (o.$typeUrl === ContinuousFund.typeUrl ||
        (typeof o.recipient === 'string' && typeof o.percentage === 'string'))
    );
  },
  encode(
    message: ContinuousFund,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.recipient !== '') {
      writer.uint32(10).string(message.recipient);
    }
    if (message.percentage !== '') {
      writer
        .uint32(18)
        .string(Decimal.fromUserInput(message.percentage, 18).atomics);
    }
    if (message.expiry !== undefined) {
      Timestamp.encode(message.expiry, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ContinuousFund {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseContinuousFund();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.recipient = reader.string();
          break;
        case 2:
          message.percentage = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        case 3:
          message.expiry = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ContinuousFund {
    return {
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
      percentage: isSet(object.percentage) ? String(object.percentage) : '',
      expiry: isSet(object.expiry)
        ? fromJsonTimestamp(object.expiry)
        : undefined,
    };
  },
  toJSON(message: ContinuousFund): JsonSafe<ContinuousFund> {
    const obj: any = {};
    message.recipient !== undefined && (obj.recipient = message.recipient);
    message.percentage !== undefined && (obj.percentage = message.percentage);
    message.expiry !== undefined &&
      (obj.expiry = fromTimestamp(message.expiry).toISOString());
    return obj;
  },
  fromPartial(object: Partial<ContinuousFund>): ContinuousFund {
    const message = createBaseContinuousFund();
    message.recipient = object.recipient ?? '';
    message.percentage = object.percentage ?? '';
    message.expiry =
      object.expiry !== undefined && object.expiry !== null
        ? Timestamp.fromPartial(object.expiry)
        : undefined;
    return message;
  },
  fromProtoMsg(message: ContinuousFundProtoMsg): ContinuousFund {
    return ContinuousFund.decode(message.value);
  },
  toProto(message: ContinuousFund): Uint8Array {
    return ContinuousFund.encode(message).finish();
  },
  toProtoMsg(message: ContinuousFund): ContinuousFundProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.ContinuousFund',
      value: ContinuousFund.encode(message).finish(),
    };
  },
};
function createBaseParams(): Params {
  return {
    enabledDistributionDenoms: [],
    distributionFrequency: BigInt(0),
  };
}
/**
 * Params defines the parameters for the protocolpool module.
 * @name Params
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.Params
 */
export const Params = {
  typeUrl: '/cosmos.protocolpool.v1.Params' as const,
  aminoType: 'cosmos-sdk/Params' as const,
  is(o: any): o is Params {
    return (
      o &&
      (o.$typeUrl === Params.typeUrl ||
        (Array.isArray(o.enabledDistributionDenoms) &&
          (!o.enabledDistributionDenoms.length ||
            typeof o.enabledDistributionDenoms[0] === 'string') &&
          typeof o.distributionFrequency === 'bigint'))
    );
  },
  isSDK(o: any): o is ParamsSDKType {
    return (
      o &&
      (o.$typeUrl === Params.typeUrl ||
        (Array.isArray(o.enabled_distribution_denoms) &&
          (!o.enabled_distribution_denoms.length ||
            typeof o.enabled_distribution_denoms[0] === 'string') &&
          typeof o.distribution_frequency === 'bigint'))
    );
  },
  encode(
    message: Params,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.enabledDistributionDenoms) {
      writer.uint32(10).string(v!);
    }
    if (message.distributionFrequency !== BigInt(0)) {
      writer.uint32(16).uint64(message.distributionFrequency);
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
          message.enabledDistributionDenoms.push(reader.string());
          break;
        case 2:
          message.distributionFrequency = reader.uint64();
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
      enabledDistributionDenoms: Array.isArray(
        object?.enabledDistributionDenoms,
      )
        ? object.enabledDistributionDenoms.map((e: any) => String(e))
        : [],
      distributionFrequency: isSet(object.distributionFrequency)
        ? BigInt(object.distributionFrequency.toString())
        : BigInt(0),
    };
  },
  toJSON(message: Params): JsonSafe<Params> {
    const obj: any = {};
    if (message.enabledDistributionDenoms) {
      obj.enabledDistributionDenoms = message.enabledDistributionDenoms.map(
        e => e,
      );
    } else {
      obj.enabledDistributionDenoms = [];
    }
    message.distributionFrequency !== undefined &&
      (obj.distributionFrequency = (
        message.distributionFrequency || BigInt(0)
      ).toString());
    return obj;
  },
  fromPartial(object: Partial<Params>): Params {
    const message = createBaseParams();
    message.enabledDistributionDenoms =
      object.enabledDistributionDenoms?.map(e => e) || [];
    message.distributionFrequency =
      object.distributionFrequency !== undefined &&
      object.distributionFrequency !== null
        ? BigInt(object.distributionFrequency.toString())
        : BigInt(0);
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
      typeUrl: '/cosmos.protocolpool.v1.Params',
      value: Params.encode(message).finish(),
    };
  },
};
