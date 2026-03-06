//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Module is the config object of the benchmark module.
 * @name Module
 * @package cosmos.benchmark.module.v1
 * @see proto type: cosmos.benchmark.module.v1.Module
 */
export interface Module {
  genesisParams?: GeneratorParams;
}
export interface ModuleProtoMsg {
  typeUrl: '/cosmos.benchmark.module.v1.Module';
  value: Uint8Array;
}
/**
 * Module is the config object of the benchmark module.
 * @name ModuleSDKType
 * @package cosmos.benchmark.module.v1
 * @see proto type: cosmos.benchmark.module.v1.Module
 */
export interface ModuleSDKType {
  genesis_params?: GeneratorParamsSDKType;
}
/**
 * GenesisParams defines the genesis parameters for the benchmark module.
 * @name GeneratorParams
 * @package cosmos.benchmark.module.v1
 * @see proto type: cosmos.benchmark.module.v1.GeneratorParams
 */
export interface GeneratorParams {
  /**
   * seed is the seed for the random number generator.
   */
  seed: bigint;
  /**
   * bucket_count is the number of store keys to uniformly distribute genesis_count keys across.
   */
  bucketCount: bigint;
  /**
   * key_mean is the mean size (in normal distribution) of keys in each bucket.
   */
  keyMean: bigint;
  /**
   * key_std_dev is the standard deviation of key sizes in each bucket.
   */
  keyStdDev: bigint;
  /**
   * value_mean is the mean size (in normal distribution) of values in each bucket.
   */
  valueMean: bigint;
  /**
   * value_std_dev is the standard deviation of value sizes in each bucket.
   */
  valueStdDev: bigint;
  /**
   * genesis_count is the number of keys to insert in the store, distributed across all buckets.
   */
  genesisCount: bigint;
  /**
   * insert_weight is the weight of insert operations.
   */
  insertWeight: number;
  /**
   * update_weight is the weight of update operations.
   */
  updateWeight: number;
  /**
   * get_weight is the weight of get operations.
   */
  getWeight: number;
  /**
   * delete_weight is the weight of delete operations.
   */
  deleteWeight: number;
}
export interface GeneratorParamsProtoMsg {
  typeUrl: '/cosmos.benchmark.module.v1.GeneratorParams';
  value: Uint8Array;
}
/**
 * GenesisParams defines the genesis parameters for the benchmark module.
 * @name GeneratorParamsSDKType
 * @package cosmos.benchmark.module.v1
 * @see proto type: cosmos.benchmark.module.v1.GeneratorParams
 */
export interface GeneratorParamsSDKType {
  seed: bigint;
  bucket_count: bigint;
  key_mean: bigint;
  key_std_dev: bigint;
  value_mean: bigint;
  value_std_dev: bigint;
  genesis_count: bigint;
  insert_weight: number;
  update_weight: number;
  get_weight: number;
  delete_weight: number;
}
function createBaseModule(): Module {
  return {
    genesisParams: undefined,
  };
}
/**
 * Module is the config object of the benchmark module.
 * @name Module
 * @package cosmos.benchmark.module.v1
 * @see proto type: cosmos.benchmark.module.v1.Module
 */
export const Module = {
  typeUrl: '/cosmos.benchmark.module.v1.Module' as const,
  aminoType: 'cosmos-sdk/Module' as const,
  is(o: any): o is Module {
    return o && o.$typeUrl === Module.typeUrl;
  },
  isSDK(o: any): o is ModuleSDKType {
    return o && o.$typeUrl === Module.typeUrl;
  },
  encode(
    message: Module,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.genesisParams !== undefined) {
      GeneratorParams.encode(
        message.genesisParams,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Module {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseModule();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.genesisParams = GeneratorParams.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Module {
    return {
      genesisParams: isSet(object.genesisParams)
        ? GeneratorParams.fromJSON(object.genesisParams)
        : undefined,
    };
  },
  toJSON(message: Module): JsonSafe<Module> {
    const obj: any = {};
    message.genesisParams !== undefined &&
      (obj.genesisParams = message.genesisParams
        ? GeneratorParams.toJSON(message.genesisParams)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<Module>): Module {
    const message = createBaseModule();
    message.genesisParams =
      object.genesisParams !== undefined && object.genesisParams !== null
        ? GeneratorParams.fromPartial(object.genesisParams)
        : undefined;
    return message;
  },
  fromProtoMsg(message: ModuleProtoMsg): Module {
    return Module.decode(message.value);
  },
  toProto(message: Module): Uint8Array {
    return Module.encode(message).finish();
  },
  toProtoMsg(message: Module): ModuleProtoMsg {
    return {
      typeUrl: '/cosmos.benchmark.module.v1.Module',
      value: Module.encode(message).finish(),
    };
  },
};
function createBaseGeneratorParams(): GeneratorParams {
  return {
    seed: BigInt(0),
    bucketCount: BigInt(0),
    keyMean: BigInt(0),
    keyStdDev: BigInt(0),
    valueMean: BigInt(0),
    valueStdDev: BigInt(0),
    genesisCount: BigInt(0),
    insertWeight: 0,
    updateWeight: 0,
    getWeight: 0,
    deleteWeight: 0,
  };
}
/**
 * GenesisParams defines the genesis parameters for the benchmark module.
 * @name GeneratorParams
 * @package cosmos.benchmark.module.v1
 * @see proto type: cosmos.benchmark.module.v1.GeneratorParams
 */
export const GeneratorParams = {
  typeUrl: '/cosmos.benchmark.module.v1.GeneratorParams' as const,
  aminoType: 'cosmos-sdk/GeneratorParams' as const,
  is(o: any): o is GeneratorParams {
    return (
      o &&
      (o.$typeUrl === GeneratorParams.typeUrl ||
        (typeof o.seed === 'bigint' &&
          typeof o.bucketCount === 'bigint' &&
          typeof o.keyMean === 'bigint' &&
          typeof o.keyStdDev === 'bigint' &&
          typeof o.valueMean === 'bigint' &&
          typeof o.valueStdDev === 'bigint' &&
          typeof o.genesisCount === 'bigint' &&
          typeof o.insertWeight === 'number' &&
          typeof o.updateWeight === 'number' &&
          typeof o.getWeight === 'number' &&
          typeof o.deleteWeight === 'number'))
    );
  },
  isSDK(o: any): o is GeneratorParamsSDKType {
    return (
      o &&
      (o.$typeUrl === GeneratorParams.typeUrl ||
        (typeof o.seed === 'bigint' &&
          typeof o.bucket_count === 'bigint' &&
          typeof o.key_mean === 'bigint' &&
          typeof o.key_std_dev === 'bigint' &&
          typeof o.value_mean === 'bigint' &&
          typeof o.value_std_dev === 'bigint' &&
          typeof o.genesis_count === 'bigint' &&
          typeof o.insert_weight === 'number' &&
          typeof o.update_weight === 'number' &&
          typeof o.get_weight === 'number' &&
          typeof o.delete_weight === 'number'))
    );
  },
  encode(
    message: GeneratorParams,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.seed !== BigInt(0)) {
      writer.uint32(8).uint64(message.seed);
    }
    if (message.bucketCount !== BigInt(0)) {
      writer.uint32(16).uint64(message.bucketCount);
    }
    if (message.keyMean !== BigInt(0)) {
      writer.uint32(24).uint64(message.keyMean);
    }
    if (message.keyStdDev !== BigInt(0)) {
      writer.uint32(32).uint64(message.keyStdDev);
    }
    if (message.valueMean !== BigInt(0)) {
      writer.uint32(48).uint64(message.valueMean);
    }
    if (message.valueStdDev !== BigInt(0)) {
      writer.uint32(56).uint64(message.valueStdDev);
    }
    if (message.genesisCount !== BigInt(0)) {
      writer.uint32(64).uint64(message.genesisCount);
    }
    if (message.insertWeight !== 0) {
      writer.uint32(77).float(message.insertWeight);
    }
    if (message.updateWeight !== 0) {
      writer.uint32(85).float(message.updateWeight);
    }
    if (message.getWeight !== 0) {
      writer.uint32(101).float(message.getWeight);
    }
    if (message.deleteWeight !== 0) {
      writer.uint32(93).float(message.deleteWeight);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): GeneratorParams {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGeneratorParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.seed = reader.uint64();
          break;
        case 2:
          message.bucketCount = reader.uint64();
          break;
        case 3:
          message.keyMean = reader.uint64();
          break;
        case 4:
          message.keyStdDev = reader.uint64();
          break;
        case 6:
          message.valueMean = reader.uint64();
          break;
        case 7:
          message.valueStdDev = reader.uint64();
          break;
        case 8:
          message.genesisCount = reader.uint64();
          break;
        case 9:
          message.insertWeight = reader.float();
          break;
        case 10:
          message.updateWeight = reader.float();
          break;
        case 12:
          message.getWeight = reader.float();
          break;
        case 11:
          message.deleteWeight = reader.float();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GeneratorParams {
    return {
      seed: isSet(object.seed) ? BigInt(object.seed.toString()) : BigInt(0),
      bucketCount: isSet(object.bucketCount)
        ? BigInt(object.bucketCount.toString())
        : BigInt(0),
      keyMean: isSet(object.keyMean)
        ? BigInt(object.keyMean.toString())
        : BigInt(0),
      keyStdDev: isSet(object.keyStdDev)
        ? BigInt(object.keyStdDev.toString())
        : BigInt(0),
      valueMean: isSet(object.valueMean)
        ? BigInt(object.valueMean.toString())
        : BigInt(0),
      valueStdDev: isSet(object.valueStdDev)
        ? BigInt(object.valueStdDev.toString())
        : BigInt(0),
      genesisCount: isSet(object.genesisCount)
        ? BigInt(object.genesisCount.toString())
        : BigInt(0),
      insertWeight: isSet(object.insertWeight)
        ? Number(object.insertWeight)
        : 0,
      updateWeight: isSet(object.updateWeight)
        ? Number(object.updateWeight)
        : 0,
      getWeight: isSet(object.getWeight) ? Number(object.getWeight) : 0,
      deleteWeight: isSet(object.deleteWeight)
        ? Number(object.deleteWeight)
        : 0,
    };
  },
  toJSON(message: GeneratorParams): JsonSafe<GeneratorParams> {
    const obj: any = {};
    message.seed !== undefined &&
      (obj.seed = (message.seed || BigInt(0)).toString());
    message.bucketCount !== undefined &&
      (obj.bucketCount = (message.bucketCount || BigInt(0)).toString());
    message.keyMean !== undefined &&
      (obj.keyMean = (message.keyMean || BigInt(0)).toString());
    message.keyStdDev !== undefined &&
      (obj.keyStdDev = (message.keyStdDev || BigInt(0)).toString());
    message.valueMean !== undefined &&
      (obj.valueMean = (message.valueMean || BigInt(0)).toString());
    message.valueStdDev !== undefined &&
      (obj.valueStdDev = (message.valueStdDev || BigInt(0)).toString());
    message.genesisCount !== undefined &&
      (obj.genesisCount = (message.genesisCount || BigInt(0)).toString());
    message.insertWeight !== undefined &&
      (obj.insertWeight = message.insertWeight);
    message.updateWeight !== undefined &&
      (obj.updateWeight = message.updateWeight);
    message.getWeight !== undefined && (obj.getWeight = message.getWeight);
    message.deleteWeight !== undefined &&
      (obj.deleteWeight = message.deleteWeight);
    return obj;
  },
  fromPartial(object: Partial<GeneratorParams>): GeneratorParams {
    const message = createBaseGeneratorParams();
    message.seed =
      object.seed !== undefined && object.seed !== null
        ? BigInt(object.seed.toString())
        : BigInt(0);
    message.bucketCount =
      object.bucketCount !== undefined && object.bucketCount !== null
        ? BigInt(object.bucketCount.toString())
        : BigInt(0);
    message.keyMean =
      object.keyMean !== undefined && object.keyMean !== null
        ? BigInt(object.keyMean.toString())
        : BigInt(0);
    message.keyStdDev =
      object.keyStdDev !== undefined && object.keyStdDev !== null
        ? BigInt(object.keyStdDev.toString())
        : BigInt(0);
    message.valueMean =
      object.valueMean !== undefined && object.valueMean !== null
        ? BigInt(object.valueMean.toString())
        : BigInt(0);
    message.valueStdDev =
      object.valueStdDev !== undefined && object.valueStdDev !== null
        ? BigInt(object.valueStdDev.toString())
        : BigInt(0);
    message.genesisCount =
      object.genesisCount !== undefined && object.genesisCount !== null
        ? BigInt(object.genesisCount.toString())
        : BigInt(0);
    message.insertWeight = object.insertWeight ?? 0;
    message.updateWeight = object.updateWeight ?? 0;
    message.getWeight = object.getWeight ?? 0;
    message.deleteWeight = object.deleteWeight ?? 0;
    return message;
  },
  fromProtoMsg(message: GeneratorParamsProtoMsg): GeneratorParams {
    return GeneratorParams.decode(message.value);
  },
  toProto(message: GeneratorParams): Uint8Array {
    return GeneratorParams.encode(message).finish();
  },
  toProtoMsg(message: GeneratorParams): GeneratorParamsProtoMsg {
    return {
      typeUrl: '/cosmos.benchmark.module.v1.GeneratorParams',
      value: GeneratorParams.encode(message).finish(),
    };
  },
};
