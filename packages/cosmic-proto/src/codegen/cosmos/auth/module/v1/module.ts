//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Module is the config object for the auth module.
 * @name Module
 * @package cosmos.auth.module.v1
 * @see proto type: cosmos.auth.module.v1.Module
 */
export interface Module {
  /**
   * bech32_prefix is the bech32 account prefix for the app.
   */
  bech32Prefix: string;
  /**
   * module_account_permissions are module account permissions.
   */
  moduleAccountPermissions: ModuleAccountPermission[];
  /**
   * authority defines the custom module authority. If not set, defaults to the governance module.
   */
  authority: string;
}
export interface ModuleProtoMsg {
  typeUrl: '/cosmos.auth.module.v1.Module';
  value: Uint8Array;
}
/**
 * Module is the config object for the auth module.
 * @name ModuleSDKType
 * @package cosmos.auth.module.v1
 * @see proto type: cosmos.auth.module.v1.Module
 */
export interface ModuleSDKType {
  bech32_prefix: string;
  module_account_permissions: ModuleAccountPermissionSDKType[];
  authority: string;
}
/**
 * ModuleAccountPermission represents permissions for a module account.
 * @name ModuleAccountPermission
 * @package cosmos.auth.module.v1
 * @see proto type: cosmos.auth.module.v1.ModuleAccountPermission
 */
export interface ModuleAccountPermission {
  /**
   * account is the name of the module.
   */
  account: string;
  /**
   * permissions are the permissions this module has. Currently recognized
   * values are minter, burner and staking.
   */
  permissions: string[];
}
export interface ModuleAccountPermissionProtoMsg {
  typeUrl: '/cosmos.auth.module.v1.ModuleAccountPermission';
  value: Uint8Array;
}
/**
 * ModuleAccountPermission represents permissions for a module account.
 * @name ModuleAccountPermissionSDKType
 * @package cosmos.auth.module.v1
 * @see proto type: cosmos.auth.module.v1.ModuleAccountPermission
 */
export interface ModuleAccountPermissionSDKType {
  account: string;
  permissions: string[];
}
function createBaseModule(): Module {
  return {
    bech32Prefix: '',
    moduleAccountPermissions: [],
    authority: '',
  };
}
/**
 * Module is the config object for the auth module.
 * @name Module
 * @package cosmos.auth.module.v1
 * @see proto type: cosmos.auth.module.v1.Module
 */
export const Module = {
  typeUrl: '/cosmos.auth.module.v1.Module' as const,
  aminoType: 'cosmos-sdk/Module' as const,
  is(o: any): o is Module {
    return (
      o &&
      (o.$typeUrl === Module.typeUrl ||
        (typeof o.bech32Prefix === 'string' &&
          Array.isArray(o.moduleAccountPermissions) &&
          (!o.moduleAccountPermissions.length ||
            ModuleAccountPermission.is(o.moduleAccountPermissions[0])) &&
          typeof o.authority === 'string'))
    );
  },
  isSDK(o: any): o is ModuleSDKType {
    return (
      o &&
      (o.$typeUrl === Module.typeUrl ||
        (typeof o.bech32_prefix === 'string' &&
          Array.isArray(o.module_account_permissions) &&
          (!o.module_account_permissions.length ||
            ModuleAccountPermission.isSDK(o.module_account_permissions[0])) &&
          typeof o.authority === 'string'))
    );
  },
  encode(
    message: Module,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.bech32Prefix !== '') {
      writer.uint32(10).string(message.bech32Prefix);
    }
    for (const v of message.moduleAccountPermissions) {
      ModuleAccountPermission.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.authority !== '') {
      writer.uint32(26).string(message.authority);
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
          message.bech32Prefix = reader.string();
          break;
        case 2:
          message.moduleAccountPermissions.push(
            ModuleAccountPermission.decode(reader, reader.uint32()),
          );
          break;
        case 3:
          message.authority = reader.string();
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
      bech32Prefix: isSet(object.bech32Prefix)
        ? String(object.bech32Prefix)
        : '',
      moduleAccountPermissions: Array.isArray(object?.moduleAccountPermissions)
        ? object.moduleAccountPermissions.map((e: any) =>
            ModuleAccountPermission.fromJSON(e),
          )
        : [],
      authority: isSet(object.authority) ? String(object.authority) : '',
    };
  },
  toJSON(message: Module): JsonSafe<Module> {
    const obj: any = {};
    message.bech32Prefix !== undefined &&
      (obj.bech32Prefix = message.bech32Prefix);
    if (message.moduleAccountPermissions) {
      obj.moduleAccountPermissions = message.moduleAccountPermissions.map(e =>
        e ? ModuleAccountPermission.toJSON(e) : undefined,
      );
    } else {
      obj.moduleAccountPermissions = [];
    }
    message.authority !== undefined && (obj.authority = message.authority);
    return obj;
  },
  fromPartial(object: Partial<Module>): Module {
    const message = createBaseModule();
    message.bech32Prefix = object.bech32Prefix ?? '';
    message.moduleAccountPermissions =
      object.moduleAccountPermissions?.map(e =>
        ModuleAccountPermission.fromPartial(e),
      ) || [];
    message.authority = object.authority ?? '';
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
      typeUrl: '/cosmos.auth.module.v1.Module',
      value: Module.encode(message).finish(),
    };
  },
};
function createBaseModuleAccountPermission(): ModuleAccountPermission {
  return {
    account: '',
    permissions: [],
  };
}
/**
 * ModuleAccountPermission represents permissions for a module account.
 * @name ModuleAccountPermission
 * @package cosmos.auth.module.v1
 * @see proto type: cosmos.auth.module.v1.ModuleAccountPermission
 */
export const ModuleAccountPermission = {
  typeUrl: '/cosmos.auth.module.v1.ModuleAccountPermission' as const,
  aminoType: 'cosmos-sdk/ModuleAccountPermission' as const,
  is(o: any): o is ModuleAccountPermission {
    return (
      o &&
      (o.$typeUrl === ModuleAccountPermission.typeUrl ||
        (typeof o.account === 'string' &&
          Array.isArray(o.permissions) &&
          (!o.permissions.length || typeof o.permissions[0] === 'string')))
    );
  },
  isSDK(o: any): o is ModuleAccountPermissionSDKType {
    return (
      o &&
      (o.$typeUrl === ModuleAccountPermission.typeUrl ||
        (typeof o.account === 'string' &&
          Array.isArray(o.permissions) &&
          (!o.permissions.length || typeof o.permissions[0] === 'string')))
    );
  },
  encode(
    message: ModuleAccountPermission,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.account !== '') {
      writer.uint32(10).string(message.account);
    }
    for (const v of message.permissions) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ModuleAccountPermission {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseModuleAccountPermission();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.account = reader.string();
          break;
        case 2:
          message.permissions.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ModuleAccountPermission {
    return {
      account: isSet(object.account) ? String(object.account) : '',
      permissions: Array.isArray(object?.permissions)
        ? object.permissions.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: ModuleAccountPermission): JsonSafe<ModuleAccountPermission> {
    const obj: any = {};
    message.account !== undefined && (obj.account = message.account);
    if (message.permissions) {
      obj.permissions = message.permissions.map(e => e);
    } else {
      obj.permissions = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<ModuleAccountPermission>,
  ): ModuleAccountPermission {
    const message = createBaseModuleAccountPermission();
    message.account = object.account ?? '';
    message.permissions = object.permissions?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(
    message: ModuleAccountPermissionProtoMsg,
  ): ModuleAccountPermission {
    return ModuleAccountPermission.decode(message.value);
  },
  toProto(message: ModuleAccountPermission): Uint8Array {
    return ModuleAccountPermission.encode(message).finish();
  },
  toProtoMsg(
    message: ModuleAccountPermission,
  ): ModuleAccountPermissionProtoMsg {
    return {
      typeUrl: '/cosmos.auth.module.v1.ModuleAccountPermission',
      value: ModuleAccountPermission.encode(message).finish(),
    };
  },
};
