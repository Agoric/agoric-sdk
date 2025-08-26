//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/** Config is the config object of the x/auth/tx package. */
export interface Config {
  /**
   * skip_ante_handler defines whether the ante handler registration should be skipped in case an app wants to override
   * this functionality.
   */
  skipAnteHandler: boolean;
  /**
   * skip_post_handler defines whether the post handler registration should be skipped in case an app wants to override
   * this functionality.
   */
  skipPostHandler: boolean;
}
export interface ConfigProtoMsg {
  typeUrl: '/cosmos.tx.config.v1.Config';
  value: Uint8Array;
}
/** Config is the config object of the x/auth/tx package. */
export interface ConfigSDKType {
  skip_ante_handler: boolean;
  skip_post_handler: boolean;
}
function createBaseConfig(): Config {
  return {
    skipAnteHandler: false,
    skipPostHandler: false,
  };
}
export const Config = {
  typeUrl: '/cosmos.tx.config.v1.Config' as const,
  encode(
    message: Config,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.skipAnteHandler === true) {
      writer.uint32(8).bool(message.skipAnteHandler);
    }
    if (message.skipPostHandler === true) {
      writer.uint32(16).bool(message.skipPostHandler);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Config {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseConfig();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.skipAnteHandler = reader.bool();
          break;
        case 2:
          message.skipPostHandler = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Config {
    return {
      skipAnteHandler: isSet(object.skipAnteHandler)
        ? Boolean(object.skipAnteHandler)
        : false,
      skipPostHandler: isSet(object.skipPostHandler)
        ? Boolean(object.skipPostHandler)
        : false,
    };
  },
  toJSON(message: Config): JsonSafe<Config> {
    const obj: any = {};
    message.skipAnteHandler !== undefined &&
      (obj.skipAnteHandler = message.skipAnteHandler);
    message.skipPostHandler !== undefined &&
      (obj.skipPostHandler = message.skipPostHandler);
    return obj;
  },
  fromPartial(object: Partial<Config>): Config {
    const message = createBaseConfig();
    message.skipAnteHandler = object.skipAnteHandler ?? false;
    message.skipPostHandler = object.skipPostHandler ?? false;
    return message;
  },
  fromProtoMsg(message: ConfigProtoMsg): Config {
    return Config.decode(message.value);
  },
  toProto(message: Config): Uint8Array {
    return Config.encode(message).finish();
  },
  toProtoMsg(message: Config): ConfigProtoMsg {
    return {
      typeUrl: '/cosmos.tx.config.v1.Config',
      value: Config.encode(message).finish(),
    };
  },
};
