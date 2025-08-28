import type { BinaryReader, BinaryWriter, JsonSafe } from './codegen/index.js';
import type { MessageBody, TypedJson } from './helpers.js';

const { freeze } = Object;

export type ProtoMsg<TU = string> = {
  readonly typeUrl: TU;
  readonly value: Uint8Array;
};

export interface EncodeObject<TU = string> {
  readonly typeUrl: TU;
  readonly value: MessageBody<TU>;
}

export interface TypedAmino<TU = string, MT = MessageBody<TU>> {
  readonly type: TU;
  readonly value: MT;
}

const extractTypeUrlAndValue = (input: any) => {
  if ('@type' in input) {
    // TypedJson
    const { '@type': typeUrl, ...value } = input;
    return { typeUrl, value };
  } else if ('typeUrl' in input) {
    // ProtoMsg (value: Uint8Array) or EncodeObject (value: MessageBody)
    const { typeUrl, value } = input;
    return {
      typeUrl,
      value: value instanceof Uint8Array ? value : { ...value },
    };
  } else if ('type' in input) {
    // TypedAmino
    const { type: typeUrl, value } = input;
    // We assert later that typeUrl matches the Codec's, so we can know
    // that the value is Proto3Json.
    return { typeUrl, value };
  }
  throw TypeError(`Unrecognized input: ${input}`);
};

export interface Proto3Codec<TU = string, MT = MessageBody<TU>, IM = MT> {
  readonly typeUrl: TU;
  encode(message: IM, writer?: BinaryWriter): BinaryWriter;
  decode(input: BinaryReader | Uint8Array, length?: number): MT;
  fromJSON(object: any): MT;
  toJSON(message: IM): JsonSafe<MT>;
  fromPartial(object: Partial<MT>): MT;
  fromProtoMsg(message: ProtoMsg<TU>): MT;
  toProto(message: IM): Uint8Array;
  toProtoMsg(message: IM): ProtoMsg<TU>;
}

/**
 * Wraps a codec, adding built-in partial message support.
 *
 * @template [TU=string]
 * @template [MT=MessageBody<TU>]
 * @param codec The original codec.
 * @returns {Proto3Codec<TU, MT, Partial<MT>>} A new codec that can handle partial input messages.
 */
export const Codec = <TU = string, MT = MessageBody<TU>>(
  codec: Proto3Codec<TU, MT>,
): Proto3Codec<TU, MT, Partial<MT>> =>
  freeze({
    typeUrl: codec.typeUrl,
    encode(message, writer) {
      return codec.encode(codec.fromPartial(message), writer);
    },
    decode(reader, length) {
      return codec.decode(reader, length);
    },
    fromJSON(object) {
      return codec.fromJSON(object);
    },
    toJSON(message) {
      return codec.toJSON(codec.fromPartial(message));
    },
    fromPartial(object) {
      return codec.fromPartial(object);
    },
    fromProtoMsg(message) {
      return codec.fromProtoMsg(message);
    },
    toProto(message) {
      return codec.toProto(codec.fromPartial(message));
    },
    toProtoMsg(message) {
      return codec.toProtoMsg(codec.fromPartial(message));
    },
  });

export interface Proto3CodecHelper<TU = string, MT = MessageBody<TU>>
  extends Proto3Codec<TU, MT, Partial<MT>> {
  typedJson(message: Partial<MT>): TypedJson<TU>;
  typedAmino(message: Partial<MT>): TypedAmino<TU, MT>;
  typedEncode(message: Partial<MT>): EncodeObject<TU>;
  fromTyped(
    object:
      | TypedJson<TU>
      | TypedAmino<TU, MT>
      | EncodeObject<TU>
      | ProtoMsg<TU>,
    embeddedProps?: string[],
  ): MT;
}

/**
 * Wraps a codec, adding built-in partial message support and helpers for common
 * manipulations.
 *
 * @template [TU=string]
 * @template [MT=MessageBody<TU>]
 * @returns {Proto3CodecHelper<TU, MT>} Codec and helpers that can handle partial input messages.
 */
export const CodecHelper = <TU = string, MT = MessageBody<TU>>(
  codec: Proto3Codec<TU, MT>,
): Proto3CodecHelper<TU, MT> =>
  freeze({
    ...Codec(codec),
    typedAmino(message) {
      return { type: codec.typeUrl, value: codec.fromPartial(message) };
    },
    typedEncode(message) {
      return {
        typeUrl: codec.typeUrl,
        value: codec.fromPartial(message),
      } as EncodeObject<TU>;
    },
    typedJson(message) {
      return {
        '@type': codec.typeUrl,
        ...codec.fromPartial(message),
      } as TypedJson<TU>;
    },
    fromTyped(object, embeddedFields = []) {
      const { typeUrl, value } = extractTypeUrlAndValue(object);
      if (typeUrl !== codec.typeUrl) {
        throw TypeError(
          `Invalid typeUrl: ${typeUrl}. Must be ${codec.typeUrl}.`,
        );
      }

      const embedFields =
        embeddedFields ?? embeddedFieldsFromTypeUrl[codec.typeUrl] ?? [];
      const spreadEmbedded = (message: MT) => {
        for (const prop of embedFields) {
          Object.assign(message as any, value[prop], message[prop]);
        }
        return message;
      };

      if (value instanceof Uint8Array) {
        // ProtoMsg
        return spreadEmbedded(cdc.fromProtoMsg({ typeUrl, value }));
      }

      return spreadEmbedded(cdc.fromPartial(value));
    },
  });
