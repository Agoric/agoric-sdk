//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/** Module is the config object of the evidence module. */
export interface Module {}
export interface ModuleProtoMsg {
  typeUrl: '/cosmos.evidence.module.v1.Module';
  value: Uint8Array;
}
/** Module is the config object of the evidence module. */
export interface ModuleSDKType {}
function createBaseModule(): Module {
  return {};
}
export const Module = {
  typeUrl: '/cosmos.evidence.module.v1.Module' as const,
  encode(
    _: Module,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
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
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): Module {
    return {};
  },
  toJSON(_: Module): JsonSafe<Module> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<Module>): Module {
    const message = createBaseModule();
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
      typeUrl: '/cosmos.evidence.module.v1.Module',
      value: Module.encode(message).finish(),
    };
  },
};
