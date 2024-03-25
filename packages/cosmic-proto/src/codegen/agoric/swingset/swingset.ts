//@ts-nocheck
import {
  Coin,
  CoinAmino,
  CoinSDKType,
} from '../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet, bytesFromBase64, base64FromBytes } from '../../helpers.js';
/**
 * CoreEvalProposal is a gov Content type for evaluating code in the SwingSet
 * core.
 * See `bridgeCoreEval` in agoric-sdk packages/vats/src/core/chain-behaviors.js.
 */
export interface CoreEvalProposal {
  title: string;
  description: string;
  /**
   * Although evals are sequential, they may run concurrently, since they each
   * can return a Promise.
   */
  evals: CoreEval[];
}
export interface CoreEvalProposalProtoMsg {
  typeUrl: '/agoric.swingset.CoreEvalProposal';
  value: Uint8Array;
}
/**
 * CoreEvalProposal is a gov Content type for evaluating code in the SwingSet
 * core.
 * See `bridgeCoreEval` in agoric-sdk packages/vats/src/core/chain-behaviors.js.
 */
export interface CoreEvalProposalAmino {
  title?: string;
  description?: string;
  /**
   * Although evals are sequential, they may run concurrently, since they each
   * can return a Promise.
   */
  evals?: CoreEvalAmino[];
}
export interface CoreEvalProposalAminoMsg {
  type: '/agoric.swingset.CoreEvalProposal';
  value: CoreEvalProposalAmino;
}
/**
 * CoreEvalProposal is a gov Content type for evaluating code in the SwingSet
 * core.
 * See `bridgeCoreEval` in agoric-sdk packages/vats/src/core/chain-behaviors.js.
 */
export interface CoreEvalProposalSDKType {
  title: string;
  description: string;
  evals: CoreEvalSDKType[];
}
/**
 * CoreEval defines an individual SwingSet core evaluation, for use in
 * CoreEvalProposal.
 */
export interface CoreEval {
  /**
   * Grant these JSON-stringified core bootstrap permits to the jsCode, as the
   * `powers` endowment.
   */
  jsonPermits: string;
  /**
   * Evaluate this JavaScript code in a Compartment endowed with `powers` as
   * well as some powerless helpers.
   */
  jsCode: string;
}
export interface CoreEvalProtoMsg {
  typeUrl: '/agoric.swingset.CoreEval';
  value: Uint8Array;
}
/**
 * CoreEval defines an individual SwingSet core evaluation, for use in
 * CoreEvalProposal.
 */
export interface CoreEvalAmino {
  /**
   * Grant these JSON-stringified core bootstrap permits to the jsCode, as the
   * `powers` endowment.
   */
  json_permits?: string;
  /**
   * Evaluate this JavaScript code in a Compartment endowed with `powers` as
   * well as some powerless helpers.
   */
  js_code?: string;
}
export interface CoreEvalAminoMsg {
  type: '/agoric.swingset.CoreEval';
  value: CoreEvalAmino;
}
/**
 * CoreEval defines an individual SwingSet core evaluation, for use in
 * CoreEvalProposal.
 */
export interface CoreEvalSDKType {
  json_permits: string;
  js_code: string;
}
/** Params are the swingset configuration/governance parameters. */
export interface Params {
  /**
   * Map from unit name to a value in SwingSet "beans".
   * Must not be negative.
   *
   * These values are used by SwingSet to normalize named per-resource charges
   * (maybe rent) in a single Nat usage unit, the "bean".
   *
   * There is no required order to this list of entries, but all the chain
   * nodes must all serialize and deserialize the existing order without
   * permuting it.
   */
  beansPerUnit: StringBeans[];
  /**
   * The price in Coins per the unit named "fee".  This value is used by
   * cosmic-swingset JS code to decide how many tokens to charge.
   *
   * cost = beans_used * fee_unit_price / beans_per_unit["fee"]
   */
  feeUnitPrice: Coin[];
  /**
   * The SwingSet bootstrap vat configuration file.  Not usefully modifiable
   * via governance as it is only referenced by the chain's initial
   * construction.
   */
  bootstrapVatConfig: string;
  /**
   * If the provision submitter doesn't hold a provisionpass, their requested
   * power flags are looked up in this fee menu (first match wins) and the sum
   * is charged.  If any power flag is not found in this menu, the request is
   * rejected.
   */
  powerFlagFees: PowerFlagFee[];
  /**
   * Maximum sizes for queues.
   * These values are used by SwingSet to compute how many messages should be
   * accepted in a block.
   *
   * There is no required order to this list of entries, but all the chain
   * nodes must all serialize and deserialize the existing order without
   * permuting it.
   */
  queueMax: QueueSize[];
}
export interface ParamsProtoMsg {
  typeUrl: '/agoric.swingset.Params';
  value: Uint8Array;
}
/** Params are the swingset configuration/governance parameters. */
export interface ParamsAmino {
  /**
   * Map from unit name to a value in SwingSet "beans".
   * Must not be negative.
   *
   * These values are used by SwingSet to normalize named per-resource charges
   * (maybe rent) in a single Nat usage unit, the "bean".
   *
   * There is no required order to this list of entries, but all the chain
   * nodes must all serialize and deserialize the existing order without
   * permuting it.
   */
  beans_per_unit?: StringBeansAmino[];
  /**
   * The price in Coins per the unit named "fee".  This value is used by
   * cosmic-swingset JS code to decide how many tokens to charge.
   *
   * cost = beans_used * fee_unit_price / beans_per_unit["fee"]
   */
  fee_unit_price?: CoinAmino[];
  /**
   * The SwingSet bootstrap vat configuration file.  Not usefully modifiable
   * via governance as it is only referenced by the chain's initial
   * construction.
   */
  bootstrap_vat_config?: string;
  /**
   * If the provision submitter doesn't hold a provisionpass, their requested
   * power flags are looked up in this fee menu (first match wins) and the sum
   * is charged.  If any power flag is not found in this menu, the request is
   * rejected.
   */
  power_flag_fees?: PowerFlagFeeAmino[];
  /**
   * Maximum sizes for queues.
   * These values are used by SwingSet to compute how many messages should be
   * accepted in a block.
   *
   * There is no required order to this list of entries, but all the chain
   * nodes must all serialize and deserialize the existing order without
   * permuting it.
   */
  queue_max?: QueueSizeAmino[];
}
export interface ParamsAminoMsg {
  type: '/agoric.swingset.Params';
  value: ParamsAmino;
}
/** Params are the swingset configuration/governance parameters. */
export interface ParamsSDKType {
  beans_per_unit: StringBeansSDKType[];
  fee_unit_price: CoinSDKType[];
  bootstrap_vat_config: string;
  power_flag_fees: PowerFlagFeeSDKType[];
  queue_max: QueueSizeSDKType[];
}
/** The current state of the module. */
export interface State {
  /**
   * The allowed number of items to add to queues, as determined by SwingSet.
   * Transactions which attempt to enqueue more should be rejected.
   */
  queueAllowed: QueueSize[];
}
export interface StateProtoMsg {
  typeUrl: '/agoric.swingset.State';
  value: Uint8Array;
}
/** The current state of the module. */
export interface StateAmino {
  /**
   * The allowed number of items to add to queues, as determined by SwingSet.
   * Transactions which attempt to enqueue more should be rejected.
   */
  queue_allowed?: QueueSizeAmino[];
}
export interface StateAminoMsg {
  type: '/agoric.swingset.State';
  value: StateAmino;
}
/** The current state of the module. */
export interface StateSDKType {
  queue_allowed: QueueSizeSDKType[];
}
/** Map element of a string key to a Nat bean count. */
export interface StringBeans {
  /** What the beans are for. */
  key: string;
  /** The actual bean value. */
  beans: string;
}
export interface StringBeansProtoMsg {
  typeUrl: '/agoric.swingset.StringBeans';
  value: Uint8Array;
}
/** Map element of a string key to a Nat bean count. */
export interface StringBeansAmino {
  /** What the beans are for. */
  key?: string;
  /** The actual bean value. */
  beans?: string;
}
export interface StringBeansAminoMsg {
  type: '/agoric.swingset.StringBeans';
  value: StringBeansAmino;
}
/** Map element of a string key to a Nat bean count. */
export interface StringBeansSDKType {
  key: string;
  beans: string;
}
/** Map a provisioning power flag to its corresponding fee. */
export interface PowerFlagFee {
  powerFlag: string;
  fee: Coin[];
}
export interface PowerFlagFeeProtoMsg {
  typeUrl: '/agoric.swingset.PowerFlagFee';
  value: Uint8Array;
}
/** Map a provisioning power flag to its corresponding fee. */
export interface PowerFlagFeeAmino {
  power_flag?: string;
  fee?: CoinAmino[];
}
export interface PowerFlagFeeAminoMsg {
  type: '/agoric.swingset.PowerFlagFee';
  value: PowerFlagFeeAmino;
}
/** Map a provisioning power flag to its corresponding fee. */
export interface PowerFlagFeeSDKType {
  power_flag: string;
  fee: CoinSDKType[];
}
/** Map element of a string key to a size. */
export interface QueueSize {
  /** What the size is for. */
  key: string;
  /** The actual size value. */
  size: number;
}
export interface QueueSizeProtoMsg {
  typeUrl: '/agoric.swingset.QueueSize';
  value: Uint8Array;
}
/** Map element of a string key to a size. */
export interface QueueSizeAmino {
  /** What the size is for. */
  key?: string;
  /** The actual size value. */
  size?: number;
}
export interface QueueSizeAminoMsg {
  type: '/agoric.swingset.QueueSize';
  value: QueueSizeAmino;
}
/** Map element of a string key to a size. */
export interface QueueSizeSDKType {
  key: string;
  size: number;
}
/** Egress is the format for a swingset egress. */
export interface Egress {
  nickname: string;
  peer: Uint8Array;
  /** TODO: Remove these power flags as they are deprecated and have no effect. */
  powerFlags: string[];
}
export interface EgressProtoMsg {
  typeUrl: '/agoric.swingset.Egress';
  value: Uint8Array;
}
/** Egress is the format for a swingset egress. */
export interface EgressAmino {
  nickname: string;
  peer: string;
  /** TODO: Remove these power flags as they are deprecated and have no effect. */
  power_flags: string[];
}
export interface EgressAminoMsg {
  type: '/agoric.swingset.Egress';
  value: EgressAmino;
}
/** Egress is the format for a swingset egress. */
export interface EgressSDKType {
  nickname: string;
  peer: Uint8Array;
  power_flags: string[];
}
/**
 * SwingStoreArtifact encodes an artifact of a swing-store export.
 * Artifacts may be stored or transmitted in any order. Most handlers do
 * maintain the artifact order from their original source as an effect of how
 * they handle the artifacts.
 */
export interface SwingStoreArtifact {
  name: string;
  data: Uint8Array;
}
export interface SwingStoreArtifactProtoMsg {
  typeUrl: '/agoric.swingset.SwingStoreArtifact';
  value: Uint8Array;
}
/**
 * SwingStoreArtifact encodes an artifact of a swing-store export.
 * Artifacts may be stored or transmitted in any order. Most handlers do
 * maintain the artifact order from their original source as an effect of how
 * they handle the artifacts.
 */
export interface SwingStoreArtifactAmino {
  name: string;
  data: string;
}
export interface SwingStoreArtifactAminoMsg {
  type: '/agoric.swingset.SwingStoreArtifact';
  value: SwingStoreArtifactAmino;
}
/**
 * SwingStoreArtifact encodes an artifact of a swing-store export.
 * Artifacts may be stored or transmitted in any order. Most handlers do
 * maintain the artifact order from their original source as an effect of how
 * they handle the artifacts.
 */
export interface SwingStoreArtifactSDKType {
  name: string;
  data: Uint8Array;
}
function createBaseCoreEvalProposal(): CoreEvalProposal {
  return {
    title: '',
    description: '',
    evals: [],
  };
}
export const CoreEvalProposal = {
  typeUrl: '/agoric.swingset.CoreEvalProposal',
  encode(
    message: CoreEvalProposal,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.title !== '') {
      writer.uint32(10).string(message.title);
    }
    if (message.description !== '') {
      writer.uint32(18).string(message.description);
    }
    for (const v of message.evals) {
      CoreEval.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): CoreEvalProposal {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCoreEvalProposal();
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
          message.evals.push(CoreEval.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): CoreEvalProposal {
    return {
      title: isSet(object.title) ? String(object.title) : '',
      description: isSet(object.description) ? String(object.description) : '',
      evals: Array.isArray(object?.evals)
        ? object.evals.map((e: any) => CoreEval.fromJSON(e))
        : [],
    };
  },
  toJSON(message: CoreEvalProposal): unknown {
    const obj: any = {};
    message.title !== undefined && (obj.title = message.title);
    message.description !== undefined &&
      (obj.description = message.description);
    if (message.evals) {
      obj.evals = message.evals.map(e => (e ? CoreEval.toJSON(e) : undefined));
    } else {
      obj.evals = [];
    }
    return obj;
  },
  fromPartial(object: Partial<CoreEvalProposal>): CoreEvalProposal {
    const message = createBaseCoreEvalProposal();
    message.title = object.title ?? '';
    message.description = object.description ?? '';
    message.evals = object.evals?.map(e => CoreEval.fromPartial(e)) || [];
    return message;
  },
  fromAmino(object: CoreEvalProposalAmino): CoreEvalProposal {
    const message = createBaseCoreEvalProposal();
    if (object.title !== undefined && object.title !== null) {
      message.title = object.title;
    }
    if (object.description !== undefined && object.description !== null) {
      message.description = object.description;
    }
    message.evals = object.evals?.map(e => CoreEval.fromAmino(e)) || [];
    return message;
  },
  toAmino(message: CoreEvalProposal): CoreEvalProposalAmino {
    const obj: any = {};
    obj.title = message.title === '' ? undefined : message.title;
    obj.description =
      message.description === '' ? undefined : message.description;
    if (message.evals) {
      obj.evals = message.evals.map(e => (e ? CoreEval.toAmino(e) : undefined));
    } else {
      obj.evals = message.evals;
    }
    return obj;
  },
  fromAminoMsg(object: CoreEvalProposalAminoMsg): CoreEvalProposal {
    return CoreEvalProposal.fromAmino(object.value);
  },
  fromProtoMsg(message: CoreEvalProposalProtoMsg): CoreEvalProposal {
    return CoreEvalProposal.decode(message.value);
  },
  toProto(message: CoreEvalProposal): Uint8Array {
    return CoreEvalProposal.encode(message).finish();
  },
  toProtoMsg(message: CoreEvalProposal): CoreEvalProposalProtoMsg {
    return {
      typeUrl: '/agoric.swingset.CoreEvalProposal',
      value: CoreEvalProposal.encode(message).finish(),
    };
  },
};
function createBaseCoreEval(): CoreEval {
  return {
    jsonPermits: '',
    jsCode: '',
  };
}
export const CoreEval = {
  typeUrl: '/agoric.swingset.CoreEval',
  encode(
    message: CoreEval,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.jsonPermits !== '') {
      writer.uint32(10).string(message.jsonPermits);
    }
    if (message.jsCode !== '') {
      writer.uint32(18).string(message.jsCode);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): CoreEval {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCoreEval();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.jsonPermits = reader.string();
          break;
        case 2:
          message.jsCode = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): CoreEval {
    return {
      jsonPermits: isSet(object.jsonPermits) ? String(object.jsonPermits) : '',
      jsCode: isSet(object.jsCode) ? String(object.jsCode) : '',
    };
  },
  toJSON(message: CoreEval): unknown {
    const obj: any = {};
    message.jsonPermits !== undefined &&
      (obj.jsonPermits = message.jsonPermits);
    message.jsCode !== undefined && (obj.jsCode = message.jsCode);
    return obj;
  },
  fromPartial(object: Partial<CoreEval>): CoreEval {
    const message = createBaseCoreEval();
    message.jsonPermits = object.jsonPermits ?? '';
    message.jsCode = object.jsCode ?? '';
    return message;
  },
  fromAmino(object: CoreEvalAmino): CoreEval {
    const message = createBaseCoreEval();
    if (object.json_permits !== undefined && object.json_permits !== null) {
      message.jsonPermits = object.json_permits;
    }
    if (object.js_code !== undefined && object.js_code !== null) {
      message.jsCode = object.js_code;
    }
    return message;
  },
  toAmino(message: CoreEval): CoreEvalAmino {
    const obj: any = {};
    obj.json_permits =
      message.jsonPermits === '' ? undefined : message.jsonPermits;
    obj.js_code = message.jsCode === '' ? undefined : message.jsCode;
    return obj;
  },
  fromAminoMsg(object: CoreEvalAminoMsg): CoreEval {
    return CoreEval.fromAmino(object.value);
  },
  fromProtoMsg(message: CoreEvalProtoMsg): CoreEval {
    return CoreEval.decode(message.value);
  },
  toProto(message: CoreEval): Uint8Array {
    return CoreEval.encode(message).finish();
  },
  toProtoMsg(message: CoreEval): CoreEvalProtoMsg {
    return {
      typeUrl: '/agoric.swingset.CoreEval',
      value: CoreEval.encode(message).finish(),
    };
  },
};
function createBaseParams(): Params {
  return {
    beansPerUnit: [],
    feeUnitPrice: [],
    bootstrapVatConfig: '',
    powerFlagFees: [],
    queueMax: [],
  };
}
export const Params = {
  typeUrl: '/agoric.swingset.Params',
  encode(
    message: Params,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.beansPerUnit) {
      StringBeans.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.feeUnitPrice) {
      Coin.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.bootstrapVatConfig !== '') {
      writer.uint32(26).string(message.bootstrapVatConfig);
    }
    for (const v of message.powerFlagFees) {
      PowerFlagFee.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    for (const v of message.queueMax) {
      QueueSize.encode(v!, writer.uint32(42).fork()).ldelim();
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
          message.beansPerUnit.push(
            StringBeans.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.feeUnitPrice.push(Coin.decode(reader, reader.uint32()));
          break;
        case 3:
          message.bootstrapVatConfig = reader.string();
          break;
        case 4:
          message.powerFlagFees.push(
            PowerFlagFee.decode(reader, reader.uint32()),
          );
          break;
        case 5:
          message.queueMax.push(QueueSize.decode(reader, reader.uint32()));
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
      beansPerUnit: Array.isArray(object?.beansPerUnit)
        ? object.beansPerUnit.map((e: any) => StringBeans.fromJSON(e))
        : [],
      feeUnitPrice: Array.isArray(object?.feeUnitPrice)
        ? object.feeUnitPrice.map((e: any) => Coin.fromJSON(e))
        : [],
      bootstrapVatConfig: isSet(object.bootstrapVatConfig)
        ? String(object.bootstrapVatConfig)
        : '',
      powerFlagFees: Array.isArray(object?.powerFlagFees)
        ? object.powerFlagFees.map((e: any) => PowerFlagFee.fromJSON(e))
        : [],
      queueMax: Array.isArray(object?.queueMax)
        ? object.queueMax.map((e: any) => QueueSize.fromJSON(e))
        : [],
    };
  },
  toJSON(message: Params): unknown {
    const obj: any = {};
    if (message.beansPerUnit) {
      obj.beansPerUnit = message.beansPerUnit.map(e =>
        e ? StringBeans.toJSON(e) : undefined,
      );
    } else {
      obj.beansPerUnit = [];
    }
    if (message.feeUnitPrice) {
      obj.feeUnitPrice = message.feeUnitPrice.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.feeUnitPrice = [];
    }
    message.bootstrapVatConfig !== undefined &&
      (obj.bootstrapVatConfig = message.bootstrapVatConfig);
    if (message.powerFlagFees) {
      obj.powerFlagFees = message.powerFlagFees.map(e =>
        e ? PowerFlagFee.toJSON(e) : undefined,
      );
    } else {
      obj.powerFlagFees = [];
    }
    if (message.queueMax) {
      obj.queueMax = message.queueMax.map(e =>
        e ? QueueSize.toJSON(e) : undefined,
      );
    } else {
      obj.queueMax = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Params>): Params {
    const message = createBaseParams();
    message.beansPerUnit =
      object.beansPerUnit?.map(e => StringBeans.fromPartial(e)) || [];
    message.feeUnitPrice =
      object.feeUnitPrice?.map(e => Coin.fromPartial(e)) || [];
    message.bootstrapVatConfig = object.bootstrapVatConfig ?? '';
    message.powerFlagFees =
      object.powerFlagFees?.map(e => PowerFlagFee.fromPartial(e)) || [];
    message.queueMax =
      object.queueMax?.map(e => QueueSize.fromPartial(e)) || [];
    return message;
  },
  fromAmino(object: ParamsAmino): Params {
    const message = createBaseParams();
    message.beansPerUnit =
      object.beans_per_unit?.map(e => StringBeans.fromAmino(e)) || [];
    message.feeUnitPrice =
      object.fee_unit_price?.map(e => Coin.fromAmino(e)) || [];
    if (
      object.bootstrap_vat_config !== undefined &&
      object.bootstrap_vat_config !== null
    ) {
      message.bootstrapVatConfig = object.bootstrap_vat_config;
    }
    message.powerFlagFees =
      object.power_flag_fees?.map(e => PowerFlagFee.fromAmino(e)) || [];
    message.queueMax = object.queue_max?.map(e => QueueSize.fromAmino(e)) || [];
    return message;
  },
  toAmino(message: Params): ParamsAmino {
    const obj: any = {};
    if (message.beansPerUnit) {
      obj.beans_per_unit = message.beansPerUnit.map(e =>
        e ? StringBeans.toAmino(e) : undefined,
      );
    } else {
      obj.beans_per_unit = message.beansPerUnit;
    }
    if (message.feeUnitPrice) {
      obj.fee_unit_price = message.feeUnitPrice.map(e =>
        e ? Coin.toAmino(e) : undefined,
      );
    } else {
      obj.fee_unit_price = message.feeUnitPrice;
    }
    obj.bootstrap_vat_config =
      message.bootstrapVatConfig === ''
        ? undefined
        : message.bootstrapVatConfig;
    if (message.powerFlagFees) {
      obj.power_flag_fees = message.powerFlagFees.map(e =>
        e ? PowerFlagFee.toAmino(e) : undefined,
      );
    } else {
      obj.power_flag_fees = message.powerFlagFees;
    }
    if (message.queueMax) {
      obj.queue_max = message.queueMax.map(e =>
        e ? QueueSize.toAmino(e) : undefined,
      );
    } else {
      obj.queue_max = message.queueMax;
    }
    return obj;
  },
  fromAminoMsg(object: ParamsAminoMsg): Params {
    return Params.fromAmino(object.value);
  },
  fromProtoMsg(message: ParamsProtoMsg): Params {
    return Params.decode(message.value);
  },
  toProto(message: Params): Uint8Array {
    return Params.encode(message).finish();
  },
  toProtoMsg(message: Params): ParamsProtoMsg {
    return {
      typeUrl: '/agoric.swingset.Params',
      value: Params.encode(message).finish(),
    };
  },
};
function createBaseState(): State {
  return {
    queueAllowed: [],
  };
}
export const State = {
  typeUrl: '/agoric.swingset.State',
  encode(
    message: State,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.queueAllowed) {
      QueueSize.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): State {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.queueAllowed.push(QueueSize.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): State {
    return {
      queueAllowed: Array.isArray(object?.queueAllowed)
        ? object.queueAllowed.map((e: any) => QueueSize.fromJSON(e))
        : [],
    };
  },
  toJSON(message: State): unknown {
    const obj: any = {};
    if (message.queueAllowed) {
      obj.queueAllowed = message.queueAllowed.map(e =>
        e ? QueueSize.toJSON(e) : undefined,
      );
    } else {
      obj.queueAllowed = [];
    }
    return obj;
  },
  fromPartial(object: Partial<State>): State {
    const message = createBaseState();
    message.queueAllowed =
      object.queueAllowed?.map(e => QueueSize.fromPartial(e)) || [];
    return message;
  },
  fromAmino(object: StateAmino): State {
    const message = createBaseState();
    message.queueAllowed =
      object.queue_allowed?.map(e => QueueSize.fromAmino(e)) || [];
    return message;
  },
  toAmino(message: State): StateAmino {
    const obj: any = {};
    if (message.queueAllowed) {
      obj.queue_allowed = message.queueAllowed.map(e =>
        e ? QueueSize.toAmino(e) : undefined,
      );
    } else {
      obj.queue_allowed = message.queueAllowed;
    }
    return obj;
  },
  fromAminoMsg(object: StateAminoMsg): State {
    return State.fromAmino(object.value);
  },
  fromProtoMsg(message: StateProtoMsg): State {
    return State.decode(message.value);
  },
  toProto(message: State): Uint8Array {
    return State.encode(message).finish();
  },
  toProtoMsg(message: State): StateProtoMsg {
    return {
      typeUrl: '/agoric.swingset.State',
      value: State.encode(message).finish(),
    };
  },
};
function createBaseStringBeans(): StringBeans {
  return {
    key: '',
    beans: '',
  };
}
export const StringBeans = {
  typeUrl: '/agoric.swingset.StringBeans',
  encode(
    message: StringBeans,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.key !== '') {
      writer.uint32(10).string(message.key);
    }
    if (message.beans !== '') {
      writer.uint32(18).string(message.beans);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): StringBeans {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStringBeans();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.string();
          break;
        case 2:
          message.beans = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): StringBeans {
    return {
      key: isSet(object.key) ? String(object.key) : '',
      beans: isSet(object.beans) ? String(object.beans) : '',
    };
  },
  toJSON(message: StringBeans): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.beans !== undefined && (obj.beans = message.beans);
    return obj;
  },
  fromPartial(object: Partial<StringBeans>): StringBeans {
    const message = createBaseStringBeans();
    message.key = object.key ?? '';
    message.beans = object.beans ?? '';
    return message;
  },
  fromAmino(object: StringBeansAmino): StringBeans {
    const message = createBaseStringBeans();
    if (object.key !== undefined && object.key !== null) {
      message.key = object.key;
    }
    if (object.beans !== undefined && object.beans !== null) {
      message.beans = object.beans;
    }
    return message;
  },
  toAmino(message: StringBeans): StringBeansAmino {
    const obj: any = {};
    obj.key = message.key === '' ? undefined : message.key;
    obj.beans = message.beans === '' ? undefined : message.beans;
    return obj;
  },
  fromAminoMsg(object: StringBeansAminoMsg): StringBeans {
    return StringBeans.fromAmino(object.value);
  },
  fromProtoMsg(message: StringBeansProtoMsg): StringBeans {
    return StringBeans.decode(message.value);
  },
  toProto(message: StringBeans): Uint8Array {
    return StringBeans.encode(message).finish();
  },
  toProtoMsg(message: StringBeans): StringBeansProtoMsg {
    return {
      typeUrl: '/agoric.swingset.StringBeans',
      value: StringBeans.encode(message).finish(),
    };
  },
};
function createBasePowerFlagFee(): PowerFlagFee {
  return {
    powerFlag: '',
    fee: [],
  };
}
export const PowerFlagFee = {
  typeUrl: '/agoric.swingset.PowerFlagFee',
  encode(
    message: PowerFlagFee,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.powerFlag !== '') {
      writer.uint32(10).string(message.powerFlag);
    }
    for (const v of message.fee) {
      Coin.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): PowerFlagFee {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePowerFlagFee();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.powerFlag = reader.string();
          break;
        case 2:
          message.fee.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): PowerFlagFee {
    return {
      powerFlag: isSet(object.powerFlag) ? String(object.powerFlag) : '',
      fee: Array.isArray(object?.fee)
        ? object.fee.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: PowerFlagFee): unknown {
    const obj: any = {};
    message.powerFlag !== undefined && (obj.powerFlag = message.powerFlag);
    if (message.fee) {
      obj.fee = message.fee.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.fee = [];
    }
    return obj;
  },
  fromPartial(object: Partial<PowerFlagFee>): PowerFlagFee {
    const message = createBasePowerFlagFee();
    message.powerFlag = object.powerFlag ?? '';
    message.fee = object.fee?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromAmino(object: PowerFlagFeeAmino): PowerFlagFee {
    const message = createBasePowerFlagFee();
    if (object.power_flag !== undefined && object.power_flag !== null) {
      message.powerFlag = object.power_flag;
    }
    message.fee = object.fee?.map(e => Coin.fromAmino(e)) || [];
    return message;
  },
  toAmino(message: PowerFlagFee): PowerFlagFeeAmino {
    const obj: any = {};
    obj.power_flag = message.powerFlag === '' ? undefined : message.powerFlag;
    if (message.fee) {
      obj.fee = message.fee.map(e => (e ? Coin.toAmino(e) : undefined));
    } else {
      obj.fee = message.fee;
    }
    return obj;
  },
  fromAminoMsg(object: PowerFlagFeeAminoMsg): PowerFlagFee {
    return PowerFlagFee.fromAmino(object.value);
  },
  fromProtoMsg(message: PowerFlagFeeProtoMsg): PowerFlagFee {
    return PowerFlagFee.decode(message.value);
  },
  toProto(message: PowerFlagFee): Uint8Array {
    return PowerFlagFee.encode(message).finish();
  },
  toProtoMsg(message: PowerFlagFee): PowerFlagFeeProtoMsg {
    return {
      typeUrl: '/agoric.swingset.PowerFlagFee',
      value: PowerFlagFee.encode(message).finish(),
    };
  },
};
function createBaseQueueSize(): QueueSize {
  return {
    key: '',
    size: 0,
  };
}
export const QueueSize = {
  typeUrl: '/agoric.swingset.QueueSize',
  encode(
    message: QueueSize,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.key !== '') {
      writer.uint32(10).string(message.key);
    }
    if (message.size !== 0) {
      writer.uint32(16).int32(message.size);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): QueueSize {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueueSize();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.string();
          break;
        case 2:
          message.size = reader.int32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueueSize {
    return {
      key: isSet(object.key) ? String(object.key) : '',
      size: isSet(object.size) ? Number(object.size) : 0,
    };
  },
  toJSON(message: QueueSize): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.size !== undefined && (obj.size = Math.round(message.size));
    return obj;
  },
  fromPartial(object: Partial<QueueSize>): QueueSize {
    const message = createBaseQueueSize();
    message.key = object.key ?? '';
    message.size = object.size ?? 0;
    return message;
  },
  fromAmino(object: QueueSizeAmino): QueueSize {
    const message = createBaseQueueSize();
    if (object.key !== undefined && object.key !== null) {
      message.key = object.key;
    }
    if (object.size !== undefined && object.size !== null) {
      message.size = object.size;
    }
    return message;
  },
  toAmino(message: QueueSize): QueueSizeAmino {
    const obj: any = {};
    obj.key = message.key === '' ? undefined : message.key;
    obj.size = message.size === 0 ? undefined : message.size;
    return obj;
  },
  fromAminoMsg(object: QueueSizeAminoMsg): QueueSize {
    return QueueSize.fromAmino(object.value);
  },
  fromProtoMsg(message: QueueSizeProtoMsg): QueueSize {
    return QueueSize.decode(message.value);
  },
  toProto(message: QueueSize): Uint8Array {
    return QueueSize.encode(message).finish();
  },
  toProtoMsg(message: QueueSize): QueueSizeProtoMsg {
    return {
      typeUrl: '/agoric.swingset.QueueSize',
      value: QueueSize.encode(message).finish(),
    };
  },
};
function createBaseEgress(): Egress {
  return {
    nickname: '',
    peer: new Uint8Array(),
    powerFlags: [],
  };
}
export const Egress = {
  typeUrl: '/agoric.swingset.Egress',
  encode(
    message: Egress,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.nickname !== '') {
      writer.uint32(10).string(message.nickname);
    }
    if (message.peer.length !== 0) {
      writer.uint32(18).bytes(message.peer);
    }
    for (const v of message.powerFlags) {
      writer.uint32(26).string(v!);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Egress {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEgress();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nickname = reader.string();
          break;
        case 2:
          message.peer = reader.bytes();
          break;
        case 3:
          message.powerFlags.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Egress {
    return {
      nickname: isSet(object.nickname) ? String(object.nickname) : '',
      peer: isSet(object.peer)
        ? bytesFromBase64(object.peer)
        : new Uint8Array(),
      powerFlags: Array.isArray(object?.powerFlags)
        ? object.powerFlags.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: Egress): unknown {
    const obj: any = {};
    message.nickname !== undefined && (obj.nickname = message.nickname);
    message.peer !== undefined &&
      (obj.peer = base64FromBytes(
        message.peer !== undefined ? message.peer : new Uint8Array(),
      ));
    if (message.powerFlags) {
      obj.powerFlags = message.powerFlags.map(e => e);
    } else {
      obj.powerFlags = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Egress>): Egress {
    const message = createBaseEgress();
    message.nickname = object.nickname ?? '';
    message.peer = object.peer ?? new Uint8Array();
    message.powerFlags = object.powerFlags?.map(e => e) || [];
    return message;
  },
  fromAmino(object: EgressAmino): Egress {
    const message = createBaseEgress();
    if (object.nickname !== undefined && object.nickname !== null) {
      message.nickname = object.nickname;
    }
    if (object.peer !== undefined && object.peer !== null) {
      message.peer = bytesFromBase64(object.peer);
    }
    message.powerFlags = object.power_flags?.map(e => e) || [];
    return message;
  },
  toAmino(message: Egress): EgressAmino {
    const obj: any = {};
    obj.nickname = message.nickname ?? '';
    obj.peer = message.peer ? base64FromBytes(message.peer) : '';
    if (message.powerFlags) {
      obj.power_flags = message.powerFlags.map(e => e);
    } else {
      obj.power_flags = message.powerFlags;
    }
    return obj;
  },
  fromAminoMsg(object: EgressAminoMsg): Egress {
    return Egress.fromAmino(object.value);
  },
  fromProtoMsg(message: EgressProtoMsg): Egress {
    return Egress.decode(message.value);
  },
  toProto(message: Egress): Uint8Array {
    return Egress.encode(message).finish();
  },
  toProtoMsg(message: Egress): EgressProtoMsg {
    return {
      typeUrl: '/agoric.swingset.Egress',
      value: Egress.encode(message).finish(),
    };
  },
};
function createBaseSwingStoreArtifact(): SwingStoreArtifact {
  return {
    name: '',
    data: new Uint8Array(),
  };
}
export const SwingStoreArtifact = {
  typeUrl: '/agoric.swingset.SwingStoreArtifact',
  encode(
    message: SwingStoreArtifact,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    if (message.data.length !== 0) {
      writer.uint32(18).bytes(message.data);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SwingStoreArtifact {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSwingStoreArtifact();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.data = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SwingStoreArtifact {
    return {
      name: isSet(object.name) ? String(object.name) : '',
      data: isSet(object.data)
        ? bytesFromBase64(object.data)
        : new Uint8Array(),
    };
  },
  toJSON(message: SwingStoreArtifact): unknown {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    message.data !== undefined &&
      (obj.data = base64FromBytes(
        message.data !== undefined ? message.data : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<SwingStoreArtifact>): SwingStoreArtifact {
    const message = createBaseSwingStoreArtifact();
    message.name = object.name ?? '';
    message.data = object.data ?? new Uint8Array();
    return message;
  },
  fromAmino(object: SwingStoreArtifactAmino): SwingStoreArtifact {
    const message = createBaseSwingStoreArtifact();
    if (object.name !== undefined && object.name !== null) {
      message.name = object.name;
    }
    if (object.data !== undefined && object.data !== null) {
      message.data = bytesFromBase64(object.data);
    }
    return message;
  },
  toAmino(message: SwingStoreArtifact): SwingStoreArtifactAmino {
    const obj: any = {};
    obj.name = message.name ?? '';
    obj.data = message.data ? base64FromBytes(message.data) : '';
    return obj;
  },
  fromAminoMsg(object: SwingStoreArtifactAminoMsg): SwingStoreArtifact {
    return SwingStoreArtifact.fromAmino(object.value);
  },
  fromProtoMsg(message: SwingStoreArtifactProtoMsg): SwingStoreArtifact {
    return SwingStoreArtifact.decode(message.value);
  },
  toProto(message: SwingStoreArtifact): Uint8Array {
    return SwingStoreArtifact.encode(message).finish();
  },
  toProtoMsg(message: SwingStoreArtifact): SwingStoreArtifactProtoMsg {
    return {
      typeUrl: '/agoric.swingset.SwingStoreArtifact',
      value: SwingStoreArtifact.encode(message).finish(),
    };
  },
};
