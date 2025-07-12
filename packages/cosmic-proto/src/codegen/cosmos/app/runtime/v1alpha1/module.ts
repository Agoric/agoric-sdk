//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/** Module is the config object for the runtime module. */
export interface Module {
  /** app_name is the name of the app. */
  appName: string;
  /**
   * begin_blockers specifies the module names of begin blockers
   * to call in the order in which they should be called. If this is left empty
   * no begin blocker will be registered.
   */
  beginBlockers: string[];
  /**
   * end_blockers specifies the module names of the end blockers
   * to call in the order in which they should be called. If this is left empty
   * no end blocker will be registered.
   */
  endBlockers: string[];
  /**
   * init_genesis specifies the module names of init genesis functions
   * to call in the order in which they should be called. If this is left empty
   * no init genesis function will be registered.
   */
  initGenesis: string[];
  /**
   * export_genesis specifies the order in which to export module genesis data.
   * If this is left empty, the init_genesis order will be used for export genesis
   * if it is specified.
   */
  exportGenesis: string[];
  /**
   * override_store_keys is an optional list of overrides for the module store keys
   * to be used in keeper construction.
   */
  overrideStoreKeys: StoreKeyConfig[];
  /**
   * order_migrations defines the order in which module migrations are performed.
   * If this is left empty, it uses the default migration order.
   * https://pkg.go.dev/github.com/cosmos/cosmos-sdk@v0.47.0-alpha2/types/module#DefaultMigrationsOrder
   */
  orderMigrations: string[];
}
export interface ModuleProtoMsg {
  typeUrl: '/cosmos.app.runtime.v1alpha1.Module';
  value: Uint8Array;
}
/** Module is the config object for the runtime module. */
export interface ModuleSDKType {
  app_name: string;
  begin_blockers: string[];
  end_blockers: string[];
  init_genesis: string[];
  export_genesis: string[];
  override_store_keys: StoreKeyConfigSDKType[];
  order_migrations: string[];
}
/**
 * StoreKeyConfig may be supplied to override the default module store key, which
 * is the module name.
 */
export interface StoreKeyConfig {
  /** name of the module to override the store key of */
  moduleName: string;
  /** the kv store key to use instead of the module name. */
  kvStoreKey: string;
}
export interface StoreKeyConfigProtoMsg {
  typeUrl: '/cosmos.app.runtime.v1alpha1.StoreKeyConfig';
  value: Uint8Array;
}
/**
 * StoreKeyConfig may be supplied to override the default module store key, which
 * is the module name.
 */
export interface StoreKeyConfigSDKType {
  module_name: string;
  kv_store_key: string;
}
function createBaseModule(): Module {
  return {
    appName: '',
    beginBlockers: [],
    endBlockers: [],
    initGenesis: [],
    exportGenesis: [],
    overrideStoreKeys: [],
    orderMigrations: [],
  };
}
export const Module = {
  typeUrl: '/cosmos.app.runtime.v1alpha1.Module' as const,
  encode(
    message: Module,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.appName !== '') {
      writer.uint32(10).string(message.appName);
    }
    for (const v of message.beginBlockers) {
      writer.uint32(18).string(v!);
    }
    for (const v of message.endBlockers) {
      writer.uint32(26).string(v!);
    }
    for (const v of message.initGenesis) {
      writer.uint32(34).string(v!);
    }
    for (const v of message.exportGenesis) {
      writer.uint32(42).string(v!);
    }
    for (const v of message.overrideStoreKeys) {
      StoreKeyConfig.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    for (const v of message.orderMigrations) {
      writer.uint32(58).string(v!);
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
          message.appName = reader.string();
          break;
        case 2:
          message.beginBlockers.push(reader.string());
          break;
        case 3:
          message.endBlockers.push(reader.string());
          break;
        case 4:
          message.initGenesis.push(reader.string());
          break;
        case 5:
          message.exportGenesis.push(reader.string());
          break;
        case 6:
          message.overrideStoreKeys.push(
            StoreKeyConfig.decode(reader, reader.uint32()),
          );
          break;
        case 7:
          message.orderMigrations.push(reader.string());
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
      appName: isSet(object.appName) ? String(object.appName) : '',
      beginBlockers: Array.isArray(object?.beginBlockers)
        ? object.beginBlockers.map((e: any) => String(e))
        : [],
      endBlockers: Array.isArray(object?.endBlockers)
        ? object.endBlockers.map((e: any) => String(e))
        : [],
      initGenesis: Array.isArray(object?.initGenesis)
        ? object.initGenesis.map((e: any) => String(e))
        : [],
      exportGenesis: Array.isArray(object?.exportGenesis)
        ? object.exportGenesis.map((e: any) => String(e))
        : [],
      overrideStoreKeys: Array.isArray(object?.overrideStoreKeys)
        ? object.overrideStoreKeys.map((e: any) => StoreKeyConfig.fromJSON(e))
        : [],
      orderMigrations: Array.isArray(object?.orderMigrations)
        ? object.orderMigrations.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: Module): JsonSafe<Module> {
    const obj: any = {};
    message.appName !== undefined && (obj.appName = message.appName);
    if (message.beginBlockers) {
      obj.beginBlockers = message.beginBlockers.map(e => e);
    } else {
      obj.beginBlockers = [];
    }
    if (message.endBlockers) {
      obj.endBlockers = message.endBlockers.map(e => e);
    } else {
      obj.endBlockers = [];
    }
    if (message.initGenesis) {
      obj.initGenesis = message.initGenesis.map(e => e);
    } else {
      obj.initGenesis = [];
    }
    if (message.exportGenesis) {
      obj.exportGenesis = message.exportGenesis.map(e => e);
    } else {
      obj.exportGenesis = [];
    }
    if (message.overrideStoreKeys) {
      obj.overrideStoreKeys = message.overrideStoreKeys.map(e =>
        e ? StoreKeyConfig.toJSON(e) : undefined,
      );
    } else {
      obj.overrideStoreKeys = [];
    }
    if (message.orderMigrations) {
      obj.orderMigrations = message.orderMigrations.map(e => e);
    } else {
      obj.orderMigrations = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Module>): Module {
    const message = createBaseModule();
    message.appName = object.appName ?? '';
    message.beginBlockers = object.beginBlockers?.map(e => e) || [];
    message.endBlockers = object.endBlockers?.map(e => e) || [];
    message.initGenesis = object.initGenesis?.map(e => e) || [];
    message.exportGenesis = object.exportGenesis?.map(e => e) || [];
    message.overrideStoreKeys =
      object.overrideStoreKeys?.map(e => StoreKeyConfig.fromPartial(e)) || [];
    message.orderMigrations = object.orderMigrations?.map(e => e) || [];
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
      typeUrl: '/cosmos.app.runtime.v1alpha1.Module',
      value: Module.encode(message).finish(),
    };
  },
};
function createBaseStoreKeyConfig(): StoreKeyConfig {
  return {
    moduleName: '',
    kvStoreKey: '',
  };
}
export const StoreKeyConfig = {
  typeUrl: '/cosmos.app.runtime.v1alpha1.StoreKeyConfig' as const,
  encode(
    message: StoreKeyConfig,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.moduleName !== '') {
      writer.uint32(10).string(message.moduleName);
    }
    if (message.kvStoreKey !== '') {
      writer.uint32(18).string(message.kvStoreKey);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): StoreKeyConfig {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStoreKeyConfig();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.moduleName = reader.string();
          break;
        case 2:
          message.kvStoreKey = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): StoreKeyConfig {
    return {
      moduleName: isSet(object.moduleName) ? String(object.moduleName) : '',
      kvStoreKey: isSet(object.kvStoreKey) ? String(object.kvStoreKey) : '',
    };
  },
  toJSON(message: StoreKeyConfig): JsonSafe<StoreKeyConfig> {
    const obj: any = {};
    message.moduleName !== undefined && (obj.moduleName = message.moduleName);
    message.kvStoreKey !== undefined && (obj.kvStoreKey = message.kvStoreKey);
    return obj;
  },
  fromPartial(object: Partial<StoreKeyConfig>): StoreKeyConfig {
    const message = createBaseStoreKeyConfig();
    message.moduleName = object.moduleName ?? '';
    message.kvStoreKey = object.kvStoreKey ?? '';
    return message;
  },
  fromProtoMsg(message: StoreKeyConfigProtoMsg): StoreKeyConfig {
    return StoreKeyConfig.decode(message.value);
  },
  toProto(message: StoreKeyConfig): Uint8Array {
    return StoreKeyConfig.encode(message).finish();
  },
  toProtoMsg(message: StoreKeyConfig): StoreKeyConfigProtoMsg {
    return {
      typeUrl: '/cosmos.app.runtime.v1alpha1.StoreKeyConfig',
      value: StoreKeyConfig.encode(message).finish(),
    };
  },
};
