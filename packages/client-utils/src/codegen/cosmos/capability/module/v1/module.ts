//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/** Module is the config object of the capability module. */
export interface Module {
  /**
   * seal_keeper defines if keeper.Seal() will run on BeginBlock() to prevent further modules from creating a scoped
   * keeper. For more details check x/capability/keeper.go.
   */
  sealKeeper: boolean;
}
export interface ModuleProtoMsg {
  typeUrl: '/cosmos.capability.module.v1.Module';
  value: Uint8Array;
}
/** Module is the config object of the capability module. */
export interface ModuleSDKType {
  seal_keeper: boolean;
}
function createBaseModule(): Module {
  return {
    sealKeeper: false,
  };
}
export const Module = {
  typeUrl: '/cosmos.capability.module.v1.Module' as const,
  encode(
    message: Module,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sealKeeper === true) {
      writer.uint32(8).bool(message.sealKeeper);
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
          message.sealKeeper = reader.bool();
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
      sealKeeper: isSet(object.sealKeeper) ? Boolean(object.sealKeeper) : false,
    };
  },
  toJSON(message: Module): JsonSafe<Module> {
    const obj: any = {};
    message.sealKeeper !== undefined && (obj.sealKeeper = message.sealKeeper);
    return obj;
  },
  fromPartial(object: Partial<Module>): Module {
    const message = createBaseModule();
    message.sealKeeper = object.sealKeeper ?? false;
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
      typeUrl: '/cosmos.capability.module.v1.Module',
      value: Module.encode(message).finish(),
    };
  },
};
