//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/** Module is the config object of the bank module. */
export interface Module {
  /**
   * blocked_module_accounts configures exceptional module accounts which should be blocked from receiving funds.
   * If left empty it defaults to the list of account names supplied in the auth module configuration as
   * module_account_permissions
   */
  blockedModuleAccountsOverride: string[];
  /** authority defines the custom module authority. If not set, defaults to the governance module. */
  authority: string;
}
export interface ModuleProtoMsg {
  typeUrl: '/cosmos.bank.module.v1.Module';
  value: Uint8Array;
}
/** Module is the config object of the bank module. */
export interface ModuleSDKType {
  blocked_module_accounts_override: string[];
  authority: string;
}
function createBaseModule(): Module {
  return {
    blockedModuleAccountsOverride: [],
    authority: '',
  };
}
export const Module = {
  typeUrl: '/cosmos.bank.module.v1.Module' as const,
  encode(
    message: Module,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.blockedModuleAccountsOverride) {
      writer.uint32(10).string(v!);
    }
    if (message.authority !== '') {
      writer.uint32(18).string(message.authority);
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
          message.blockedModuleAccountsOverride.push(reader.string());
          break;
        case 2:
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
      blockedModuleAccountsOverride: Array.isArray(
        object?.blockedModuleAccountsOverride,
      )
        ? object.blockedModuleAccountsOverride.map((e: any) => String(e))
        : [],
      authority: isSet(object.authority) ? String(object.authority) : '',
    };
  },
  toJSON(message: Module): JsonSafe<Module> {
    const obj: any = {};
    if (message.blockedModuleAccountsOverride) {
      obj.blockedModuleAccountsOverride =
        message.blockedModuleAccountsOverride.map(e => e);
    } else {
      obj.blockedModuleAccountsOverride = [];
    }
    message.authority !== undefined && (obj.authority = message.authority);
    return obj;
  },
  fromPartial(object: Partial<Module>): Module {
    const message = createBaseModule();
    message.blockedModuleAccountsOverride =
      object.blockedModuleAccountsOverride?.map(e => e) || [];
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
      typeUrl: '/cosmos.bank.module.v1.Module',
      value: Module.encode(message).finish(),
    };
  },
};
