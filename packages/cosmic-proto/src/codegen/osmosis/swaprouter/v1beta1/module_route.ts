//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/** PoolType is an enumeration of all supported pool types. */
export enum PoolType {
  /** Balancer - Balancer is the standard xy=k curve. Its pool model is defined in x/gamm. */
  Balancer = 0,
  /**
   * Stableswap - Stableswap is the Solidly cfmm stable swap curve. Its pool model is defined
   * in x/gamm.
   */
  Stableswap = 1,
  /**
   * Concentrated - Concentrated is the pool model specific to concentrated liquidity. It is
   * defined in x/concentrated-liquidity.
   */
  Concentrated = 2,
  UNRECOGNIZED = -1,
}
export const PoolTypeSDKType = PoolType;
export function poolTypeFromJSON(object: any): PoolType {
  switch (object) {
    case 0:
    case 'Balancer':
      return PoolType.Balancer;
    case 1:
    case 'Stableswap':
      return PoolType.Stableswap;
    case 2:
    case 'Concentrated':
      return PoolType.Concentrated;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return PoolType.UNRECOGNIZED;
  }
}
export function poolTypeToJSON(object: PoolType): string {
  switch (object) {
    case PoolType.Balancer:
      return 'Balancer';
    case PoolType.Stableswap:
      return 'Stableswap';
    case PoolType.Concentrated:
      return 'Concentrated';
    case PoolType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/**
 * ModuleRouter defines a route encapsulating pool type.
 * It is used as the value of a mapping from pool id to the pool type,
 * allowing the swap router to know which module to route swaps to given the
 * pool id.
 */
export interface ModuleRoute {
  /** pool_type specifies the type of the pool */
  poolType: PoolType;
}
export interface ModuleRouteProtoMsg {
  typeUrl: '/osmosis.swaprouter.v1beta1.ModuleRoute';
  value: Uint8Array;
}
/**
 * ModuleRouter defines a route encapsulating pool type.
 * It is used as the value of a mapping from pool id to the pool type,
 * allowing the swap router to know which module to route swaps to given the
 * pool id.
 */
export interface ModuleRouteSDKType {
  pool_type: PoolType;
}
function createBaseModuleRoute(): ModuleRoute {
  return {
    poolType: 0,
  };
}
export const ModuleRoute = {
  typeUrl: '/osmosis.swaprouter.v1beta1.ModuleRoute',
  encode(
    message: ModuleRoute,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolType !== 0) {
      writer.uint32(8).int32(message.poolType);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ModuleRoute {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseModuleRoute();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolType = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ModuleRoute {
    return {
      poolType: isSet(object.poolType) ? poolTypeFromJSON(object.poolType) : -1,
    };
  },
  toJSON(message: ModuleRoute): JsonSafe<ModuleRoute> {
    const obj: any = {};
    message.poolType !== undefined &&
      (obj.poolType = poolTypeToJSON(message.poolType));
    return obj;
  },
  fromPartial(object: Partial<ModuleRoute>): ModuleRoute {
    const message = createBaseModuleRoute();
    message.poolType = object.poolType ?? 0;
    return message;
  },
  fromProtoMsg(message: ModuleRouteProtoMsg): ModuleRoute {
    return ModuleRoute.decode(message.value);
  },
  toProto(message: ModuleRoute): Uint8Array {
    return ModuleRoute.encode(message).finish();
  },
  toProtoMsg(message: ModuleRoute): ModuleRouteProtoMsg {
    return {
      typeUrl: '/osmosis.swaprouter.v1beta1.ModuleRoute',
      value: ModuleRoute.encode(message).finish(),
    };
  },
};
