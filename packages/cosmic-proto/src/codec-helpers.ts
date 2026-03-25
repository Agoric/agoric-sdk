import type { BinaryReader, BinaryWriter, JsonSafe } from './codegen/index.js';
import type { MessageBody, TypedJson } from './helpers.js';

const { freeze } = Object;

/** Name of a field to its boolean annotation. */
type BooleanAnnotations = Record<string, boolean>;

/** Name of a field to its alias. */
type EmbedAnnotations = Record<string, string>;
interface ManualAnnotations {
  'gogoproto.nullable'?: BooleanAnnotations;
  'gogoproto.embed'?: EmbedAnnotations;
}

// This is a mapping from typeUrl to maps of annotation metadata.
// TODO: codegen
const manualAnnotationsFromTypeUrl: Record<string, ManualAnnotations> = {
  '/ibc.applications.transfer.v1.MsgTransfer': {
    'gogoproto.nullable': {
      timeout_height: false,
      timeoutHeight: false,
      token: false,
    },
  },
  '/cosmos.auth.v1beta1.ModuleAccount': {
    'gogoproto.embed': {
      base_account: 'baseAccount',
    },
  },
  '/cosmos.tx.v1beta1.TxBody': {
    'gogoproto.nullable': {
      timeout_timestamp: true,
      timeoutTimestamp: true,
    },
  },
};

const makeFromPartial = <TU = string, MT = MessageBody<TU>, IM = MT>(
  codec: Proto3Codec<TU, MT, IM>,
  annotations: ManualAnnotations,
) => {
  const embedPropMap = {
    ...manualAnnotationsFromTypeUrl[codec.typeUrl as string]?.[
      'gogoproto.embed'
    ],
    ...annotations?.['gogoproto.embed'],
  };

  const nullableAnnotations = {
    ...manualAnnotationsFromTypeUrl[codec.typeUrl as string]?.[
      'gogoproto.nullable'
    ],
    ...annotations?.['gogoproto.nullable'],
  };

  const nullableFields = [] as string[];
  const nonNullableFields = [] as string[];
  for (const [fieldName, isNullable] of Object.entries(nullableAnnotations)) {
    if (isNullable) {
      nullableFields.push(fieldName);
    } else {
      nonNullableFields.push(fieldName);
    }
  }

  const fromPartial = (message: Partial<MT>): MT => {
    const input = { ...message };

    // For each embedded field, if the message is missing the message property
    // but has the value property, copy the value to the message property. This
    // allows users to provide either the embedded object or its fields
    // directly.
    for (const [valueProp, messageProp] of Object.entries(embedPropMap)) {
      if (input[messageProp] == null) {
        input[messageProp] = input[valueProp] ?? input;
      }
    }

    for (const prop of nonNullableFields) {
      if (input[prop] == null) {
        input[prop] = {};
      }
    }

    freeze(input);
    const filled = { ...codec.fromPartial(input) };

    // Spread the object embeddeds into the filled object.
    for (const messageProp of Object.values(embedPropMap)) {
      const embedded = filled[messageProp] ?? filled;
      if (Object(embedded) !== embedded) continue;
      for (const [key, val] of Object.entries(embedded)) {
        if (filled[key] == null) {
          filled[key] = val;
        }
      }
    }

    // Delete the empty nullable fields from the impartial object.
    for (const prop of nullableFields) {
      if (message[prop] == null) {
        // impartial[prop] = undefined;
        delete filled[prop];
      }
    }

    return freeze(filled);
  };

  return fromPartial;
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
 * @param {ManualAnnotations} [annotations] The value for `(gogoproto.nullable)`-annotated fields.
 * @returns {Proto3Codec<TU, MT, Partial<MT>>} A new codec that can handle partial input messages.
 */
export const Codec = <TU = string, MT = MessageBody<TU>>(
  codec: Proto3Codec<TU, MT>,
  annotations: ManualAnnotations = {},
): Proto3Codec<TU, MT, Partial<MT>> => {
  const fromPartial = makeFromPartial(codec, annotations);

  const cdc = freeze({
    typeUrl: codec.typeUrl,
    encode(message, writer) {
      return codec.encode(fromPartial(message), writer);
    },
    decode(reader, length) {
      return fromPartial(codec.decode(reader, length));
    },
    fromJSON(object) {
      return fromPartial(codec.fromJSON(object));
    },
    toJSON(message) {
      return codec.toJSON(fromPartial(message));
    },
    fromPartial(object) {
      return fromPartial(object);
    },
    fromProtoMsg(message) {
      return fromPartial(codec.fromProtoMsg(message));
    },
    toProto(message) {
      return codec.toProto(fromPartial(message));
    },
    toProtoMsg(message) {
      return codec.toProtoMsg(fromPartial(message));
    },
  });
  return cdc;
};

export interface Proto3CodecHelper<
  TU = string,
  MT = MessageBody<TU>,
> extends Proto3Codec<TU, MT, Partial<MT>> {
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
 * @param {ManualAnnotations} [annotations] The fields that are marked with `gogoproto.nullable`.
 * @returns {Proto3CodecHelper<TU, MT>} Codec and helpers that can handle partial input messages.
 */
export const CodecHelper = <TU = string, MT = MessageBody<TU>>(
  codec: Proto3Codec<TU, MT>,
  annotations: ManualAnnotations = {},
): Proto3CodecHelper<TU, MT> => {
  const cdc = Codec(codec, annotations);
  const fromPartial = makeFromPartial(cdc, annotations);

  const help: Proto3CodecHelper<TU, MT> = freeze({
    ...cdc,
    typedAmino(message) {
      return { type: codec.typeUrl, value: fromPartial(message) };
    },
    typedEncode(message) {
      return {
        typeUrl: codec.typeUrl,
        value: fromPartial(message),
      } as EncodeObject<TU>;
    },
    typedJson(message) {
      return {
        '@type': codec.typeUrl,
        ...fromPartial(message),
      } as TypedJson<TU>;
    },
    fromTyped(object) {
      const { typeUrl, value } = extractTypeUrlAndValue(object);
      if (typeUrl !== codec.typeUrl) {
        throw TypeError(
          `Invalid typeUrl: ${typeUrl}. Must be ${codec.typeUrl}.`,
        );
      }

      if (value instanceof Uint8Array) {
        // ProtoMsg
        return cdc.fromProtoMsg({ typeUrl, value });
      }

      return fromPartial(value);
    },
  });
  return help;
};
