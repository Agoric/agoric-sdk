import type { BinaryReader, BinaryWriter, JsonSafe } from './codegen/index.js';
import type { MessageBody, TypedJson } from './helpers.js';

const { freeze } = Object;

// This is a mapping from typeUrl to the fields that should be non-nullish.
// TODO: codegen
const nonNullishFieldsFromTypeUrl: Record<string, string[]> = {
  '/ibc.applications.transfer.v1.MsgTransfer': [
    'timeout_height',
    'timeoutHeight',
  ],
};

// This is a mapping from typeUrl to the fields that are embedded.
// TODO: codegen
const embeddedFieldsFromTypeUrl: Record<
  string,
  { [valueProp: string]: string }
> = {
  '/cosmos.auth.v1beta1.ModuleAccount': { base_account: 'baseAccount' },
};

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
  } else if ('$typeUrl' in input) {
    const { $typeUrl: typeUrl, ...value } = input;
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
 * @param {Proto3Codec<TU, MT>} codec The original codec.
 * @param {string[]} [nonNullishFields] The properties that should be replaced with `{}` if nullish.
 * @returns {Proto3Codec<TU, MT, Partial<MT>>} A new codec that can handle partial input messages.
 */
export const Codec = <TU = string, MT = MessageBody<TU>>(
  codec: Proto3Codec<TU, MT>,
  nonNullishFields?: string[],
): Proto3Codec<TU, MT, Partial<MT>> => {
  const nonNullish =
    nonNullishFields ??
    nonNullishFieldsFromTypeUrl[codec.typeUrl as string] ??
    [];
  const cdc = freeze({
    typeUrl: codec.typeUrl,
    encode(message, writer) {
      return codec.encode(cdc.fromPartial(message), writer);
    },
    decode(reader, length) {
      return codec.decode(reader, length);
    },
    fromJSON(object) {
      return codec.fromJSON(object);
    },
    toJSON(message) {
      return codec.toJSON(cdc.fromPartial(message));
    },
    fromPartial(object) {
      const filled = { ...object };
      for (const prop of nonNullish) {
        if (filled[prop] == null) {
          // XXX We replace them with empty objects, at least until codegen
          // understands this is how `(gogoproto.nullable = false)` should
          // behave.
          filled[prop] = {};
        }
      }
      return codec.fromPartial(filled);
    },
    fromProtoMsg(message) {
      return codec.fromProtoMsg(message);
    },
    toProto(message) {
      return codec.toProto(cdc.fromPartial(message));
    },
    toProtoMsg(message) {
      return codec.toProtoMsg(cdc.fromPartial(message));
    },
  });
  return cdc;
};
export interface Proto3CodecHelper<TU = string, MT = MessageBody<TU>>
  extends Proto3Codec<TU, MT, Partial<MT>> {
  typedJson(message: Partial<MT>): TypedJson<TU>;
  typedAmino(message: Partial<MT>): TypedAmino<TU, MT>;
  typedEncode(message: Partial<MT>): EncodeObject<TU>;
  fromTyped(
    object: unknown,
    embeddedFields?: { [valueProp: string]: string },
  ): MT;
}

/**
 * Wraps a codec, adding built-in partial message support and helpers for common
 * manipulations.
 *
 * @template [TU=string]
 * @template [MT=MessageBody<TU>]
 * @param {Proto3Codec<TU, MT>} codec The original codec.
 * @param {string[]} [nonNullishFields] The fields that should be replaced with `{}` if nullish.
 * @returns {Proto3CodecHelper<TU, MT>} Codec and helpers that can handle partial input messages.
 */
export const CodecHelper = <TU = string, MT = MessageBody<TU>>(
  codec: Proto3Codec<TU, MT>,
  nonNullishFields?: string[],
): Proto3CodecHelper<TU, MT> => {
  const cdc = Codec(codec, nonNullishFields);
  const help: Proto3CodecHelper<TU, MT> = freeze({
    ...cdc,
    typedAmino(message) {
      return { type: codec.typeUrl, value: cdc.fromPartial(message) };
    },
    typedEncode(message) {
      return {
        typeUrl: codec.typeUrl,
        value: cdc.fromPartial(message),
      } as EncodeObject<TU>;
    },
    typedJson(message) {
      return {
        '@type': codec.typeUrl,
        ...cdc.fromPartial(message),
      } as TypedJson<TU>;
    },
    fromTyped(object, embeddedFields) {
      const { typeUrl, value } = extractTypeUrlAndValue(object);
      if (typeUrl !== codec.typeUrl) {
        throw TypeError(
          `Invalid typeUrl: ${typeUrl}. Must be ${codec.typeUrl}.`,
        );
      }

      const embedPropMap =
        embeddedFields ?? embeddedFieldsFromTypeUrl[typeUrl] ?? {};
      const spreadEmbedded = (message: MT) => {
        for (const [valueProp, messageProp] of Object.entries(embedPropMap)) {
          if (message[messageProp] == null) {
            message[messageProp] = value[valueProp] ?? value;
          }
        }

        const filled = cdc.fromPartial(message);

        // Spread the embeddeds into the filled object.
        for (const messageProp of Object.values(embedPropMap)) {
          const embedded = filled[messageProp] ?? filled;
          if (Object(embedded) === embedded) {
            for (const [key, val] of Object.entries(embedded)) {
              if (filled[key] == null) {
                filled[key] = val;
              }
            }
          }
        }

        return filled;
      };

      if (value instanceof Uint8Array) {
        // ProtoMsg
        return spreadEmbedded(cdc.fromProtoMsg({ typeUrl, value }));
      }

      return spreadEmbedded(cdc.fromPartial(value));
    },
  });
  return help;
};
