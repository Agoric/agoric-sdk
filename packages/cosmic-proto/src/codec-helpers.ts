import type { DeepPartial } from './codegen/helpers.ts';
import type { BinaryReader, BinaryWriter, JsonSafe } from './codegen/index.js';
import type { MessageBody, TypedJson } from './helpers.js';
import {
  type FieldAnnotations,
  type ProtoFieldName,
  type TypeUrl,
  defaultAnnotationsFromTypeUrl,
  scalarMakersFromType,
} from './type-url-annotations.js';

const { freeze } = Object;

type ChildFieldProcessor = (
  child: Record<string, unknown>,
  field: string,
  typeUrlToAnnotations: Map<TypeUrl, FieldAnnotations>,
  valueTypeUrl: string | undefined,
) => void;

const processChildFields = (
  process: ChildFieldProcessor,
  typeUrl: string | undefined,
  input: unknown,
  annotationsFromTypeUrl: Map<TypeUrl, FieldAnnotations>,
) => {
  if (typeUrl == null || !typeUrl.startsWith('/')) {
    // Default to no elision when we don't recognize the typeUrl.
    return input;
  }

  // Shallow copy to avoid mutating the input, but we will mutate the child as
  // we process it.
  const child = { ...(typeof input === 'object' && input) };

  const typeUrlFromField = annotationsFromTypeUrl
    .get(typeUrl)
    ?.get('typeUrlFromField');

  for (const [field, originalValue] of Object.entries(child)) {
    let value = originalValue;
    const fieldTypeUrl = typeUrlFromField?.get(field);
    if (value) {
      value = processChildFields(
        process,
        fieldTypeUrl,
        value,
        annotationsFromTypeUrl,
      );
    }

    child[field] = value;
    process(child, field, annotationsFromTypeUrl, fieldTypeUrl);
  }

  freeze(child);
  return child;
};

const addNonNullablePlaceholders = (
  typeUrl: string | undefined,
  input: unknown,
  annotationsFromTypeUrl: Map<TypeUrl, FieldAnnotations>,
) => {
  if (typeUrl == null) {
    return input;
  } else if (!typeUrl.startsWith('/')) {
    const scalarMaker = scalarMakersFromType.get(typeUrl);
    if (scalarMaker) {
      return scalarMaker(input);
    } else {
      // Default to no transformation when we don't recognize the typeUrl.
      return input;
    }
  }

  // Shallow copy to avoid mutating the input, but we will mutate the child as
  // we process it.
  const child = { ...(typeof input === 'object' && input) };

  const fieldAnnotations = annotationsFromTypeUrl.get(typeUrl);
  const typeUrlFromField = fieldAnnotations?.get('typeUrlFromField');
  const nullableAnnotationFromField =
    fieldAnnotations?.get('gogoproto.nullable');
  const remainingNonNullableFields = new Set<string>(
    [...(nullableAnnotationFromField?.entries() ?? [])].flatMap(
      ([fieldName, isNullable]) => (!isNullable ? [fieldName] : []),
    ),
  );

  for (const [field, value] of Object.entries(child)) {
    if (nullableAnnotationFromField?.get(field) !== false) {
      continue;
    }
    remainingNonNullableFields.delete(field);
    const message = addNonNullablePlaceholders(
      typeUrlFromField?.get(field),
      value,
      annotationsFromTypeUrl,
    );
    if (message != null) {
      child[field] = message;
    }
  }
  for (const field of remainingNonNullableFields.keys()) {
    const message = addNonNullablePlaceholders(
      typeUrlFromField?.get(field),
      child[field],
      annotationsFromTypeUrl,
    );
    if (message != null) {
      child[field] = message;
    }
  }
  freeze(child);
  return child;
};

const processGogo3PackedChildField = (
  child: Record<string, unknown>,
  field: string,
  typeUrlToAnnotations: Map<TypeUrl, FieldAnnotations>,
  fieldTypeUrl: string | undefined,
) => {
  const nullableAnnotationFromField = fieldTypeUrl
    ? typeUrlToAnnotations.get(fieldTypeUrl)?.get('gogoproto.nullable')
    : undefined;

  if (
    child[field] == null &&
    nullableAnnotationFromField?.get(field) === false
  ) {
    // Add an empty message for the fromPartial to fill in.
    child[field] = {};
  } else if (!child[field]) {
    delete child[field];
  }
};

const processGogo3UndefinedChildField = (
  child: Record<string, unknown>,
  field: string,
  _typeUrlToAnnotations: Map<TypeUrl, FieldAnnotations>,
  _fieldTypeUrl: string | undefined,
) => {
  // Undefined values should be omitted.
  const maybeEmpty = child[field];
  if (maybeEmpty === undefined) {
    delete child[field];
  }
};

/**
 * The underlying Proto3Codecs are ignorant of Gogoproto annotations. Our
 * decoder/encoder transformations implement them, and the new Codec applies
 * the transformations as if the Proto3Codec handled them natively.
 *
 * So, we have two types of Proto3Json, which are indistinguishable at
 * runtime:
 * - Proto3Jsonable: what Telescope generates and consumes, ignorant of
 *   Gogoproto annotations.
 * - GogoProto3Jsonable: the Proto3Json type honoring Gogoproto annotations.
 *
 * XXX Ideally, Telescope would implement Gogoproto annotations directly, and
 * we wouldn't need to do this.
 */
const makeGogo3Transformations = <TU extends string = string>(
  codec: Pick<Proto3Codec<TU>, 'typeUrl' | 'fromPartial'>,
  annotationsFromTypeUrl: Map<TypeUrl, FieldAnnotations>,
) => {
  type FullMessage = MessageBody<TU>;
  type InputMessage = DeepPartial<FullMessage>;

  const fieldAnnotations = annotationsFromTypeUrl.get(codec.typeUrl);
  const embedPropMap = fieldAnnotations?.get('gogoproto.embed');
  const childNullableAnnotations = fieldAnnotations?.get('gogoproto.nullable');

  const nonNullableFields: ProtoFieldName[] = [
    ...(childNullableAnnotations?.entries() ?? []),
  ].flatMap(([fieldName, isNullable]) => (isNullable ? [] : [fieldName]));
  freeze(nonNullableFields);

  const encoderInputFromGogo3 = (object: InputMessage): FullMessage => {
    const input = { ...(typeof object === 'object' && Object(object)) };

    // For each embedded field, if the message is missing the message property
    // but has the value property, copy the value to the message property. This
    // allows users to provide either the embedded object or its fields
    // directly.
    for (const [valueProp, messageProp] of embedPropMap?.entries() ?? []) {
      if (input[messageProp] == null) {
        input[messageProp] = input[valueProp] ?? input;
      }
    }

    const newInput = addNonNullablePlaceholders(
      codec.typeUrl,
      input,
      annotationsFromTypeUrl,
    ) as InputMessage;

    const filled = codec.fromPartial(newInput ?? input);
    freeze(filled);
    return filled;
  };

  const packedFromGogo3 = (object: InputMessage): FullMessage => {
    const input = encoderInputFromGogo3(object);

    const packed = processChildFields(
      processGogo3PackedChildField,
      codec.typeUrl,
      input,
      annotationsFromTypeUrl,
    );
    freeze(packed);
    return (packed ?? input) as FullMessage;
  };

  const strippedFromDecoderOutput = (object: InputMessage): FullMessage => {
    const output = gogo3FromDecoderOutput(object as FullMessage);

    const newOutput = processChildFields(
      processGogo3UndefinedChildField,
      codec.typeUrl,
      output,
      annotationsFromTypeUrl,
    );
    return freeze(newOutput) as FullMessage;
  };

  const gogo3FromDecoderOutput = (message: FullMessage): FullMessage => {
    const output = { ...message };

    // Spread the object embeddeds into the filled object.
    for (const messageProp of embedPropMap?.keys() ?? []) {
      const embedded = output[messageProp] ?? output;
      if (Object(embedded) !== embedded) continue;
      for (const [key, val] of Object.entries(embedded)) {
        if (output[key] == null) {
          output[key] = val;
        }
      }
      delete output[messageProp];
    }

    const newOutput = addNonNullablePlaceholders(
      codec.typeUrl,
      output,
      annotationsFromTypeUrl,
    );

    return freeze(newOutput) as FullMessage;
  };

  return freeze({
    encoderInputFromGogo3,
    gogo3FromDecoderOutput,
    packedFromGogo3,
    strippedFromDecoderOutput,
  });
};

export type ProtoMsg<TU extends string = string> = {
  readonly typeUrl: TU;
  readonly value: Uint8Array;
};

export interface EncodeObject<TU extends string = string> {
  readonly typeUrl: TU;
  readonly value: MessageBody<TU>;
}

export interface TypedAmino<TU extends string = string> {
  readonly type: TU;
  readonly value: MessageBody<TU>;
}

const extractTypeUrlAndValue = (input: any) => {
  if ('@type' in input) {
    // TypedJson
    const { '@type': typeUrl, ...value } = input;
    return { typeUrl, value };
  } else if ('$typeUrl' in input) {
    // Any (with the special $typeUrl field to avoid conflicts with the actual
    // typeUrl field in ProtoMsg and EncodeObject)
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
    const { type: typeUrl, value } = input;
    // We assert later that typeUrl matches the Codec's, so we can know
    // that the value is Proto3Json.
    return { typeUrl, value };
  }
  throw TypeError(`Unrecognized input: ${input}`);
};

/**
 * The TU parameter is the TypeUrl of the "naive" Telescope message, which for
 * all intents and purposes, is good enough to use as the GogoProto3Jsonable
 * type.
 *
 * The rest of these methods are highly dependent on our specific Telescope
 * codegen configuration.
 */
export interface Proto3Codec<
  TU extends string = string,
  DP extends boolean = false,
> {
  readonly typeUrl: TU;
  encode(message: DeepMessage<TU, DP>, writer?: BinaryWriter): BinaryWriter;
  decode(input: BinaryReader | Uint8Array, length?: number): MessageBody<TU>;
  fromJSON(object: any): MessageBody<TU>;
  toJSON(message: DeepMessage<TU, DP>): JsonSafe<MessageBody<TU>>;
  fromPartial(object: DeepMessage<TU, true>): MessageBody<TU>;
  fromProtoMsg(message: ProtoMsg<TU>): MessageBody<TU>;
  toProto(message: DeepMessage<TU, DP>): Uint8Array;
  toProtoMsg(message: DeepMessage<TU, DP>): ProtoMsg<TU>;
}

type DeepMessage<
  TU extends string = string,
  DP extends boolean = true,
> = DP extends true ? DeepPartial<MessageBody<TU>> : MessageBody<TU>;

/**
 * Wraps a codec, adding built-in partial message support.
 *
 * @template TU TypeUrl
 * @param codec The original codec.
 * @param annotationsFromTypeUrl The field annotations by TypeUrl.
 * @returns A new codec that can handle partial input messages.
 */
export const Codec = <TU extends string = string>(
  codec: Proto3Codec<TU>,
  annotationsFromTypeUrl: Map<
    TypeUrl,
    FieldAnnotations
  > = defaultAnnotationsFromTypeUrl,
): Proto3Codec<TU, true> => {
  const { gogo3FromDecoderOutput, encoderInputFromGogo3 } =
    makeGogo3Transformations(codec, annotationsFromTypeUrl);

  const cdc: Proto3Codec<TU, true> = {
    typeUrl: codec.typeUrl,
    encode(message, writer) {
      return codec.encode(encoderInputFromGogo3(message), writer);
    },
    decode(reader, length) {
      return gogo3FromDecoderOutput(codec.decode(reader, length));
    },
    fromJSON(object) {
      return gogo3FromDecoderOutput(codec.fromJSON(object));
    },
    toJSON(message) {
      return codec.toJSON(encoderInputFromGogo3(message));
    },
    fromPartial(object) {
      return encoderInputFromGogo3(object);
    },
    fromProtoMsg(message) {
      return gogo3FromDecoderOutput(codec.fromProtoMsg(message));
    },
    toProto(message) {
      return codec.toProto(encoderInputFromGogo3(message));
    },
    toProtoMsg(message) {
      return codec.toProtoMsg(encoderInputFromGogo3(message));
    },
  };
  freeze(cdc);
  return cdc;
};

export interface Proto3CodecHelper<
  TU extends string = string,
> extends Proto3Codec<TU, true> {
  typedJson(message: DeepMessage<TU>): TypedJson<TU>;
  fromTyped(object: TypedJson): MessageBody<TU>;
  fromTyped(object: TypedAmino): MessageBody<TU>;
  fromTyped(object: EncodeObject): MessageBody<TU>;
  fromTyped(object: DeepMessage): MessageBody<TU>;
  fromTyped(object: unknown): MessageBody<TU>;
}

/**
 * Wraps a codec, adding built-in partial message support and helpers for common
 * manipulations.
 *
 * @template TU TypeUrl
 * @param codec The original codec.
 * @param annotationsFromTypeUrl The fields that are marked with `gogoproto.nullable`.
 * @returns Codec extended by helpers that can handle partial input messages.
 */
export const CodecHelper = <TU extends string = string>(
  codec: Proto3Codec<TU>,
  annotationsFromTypeUrl: Map<
    TypeUrl,
    FieldAnnotations
  > = defaultAnnotationsFromTypeUrl,
): Proto3CodecHelper<TU> => {
  const cdc = Codec(codec, annotationsFromTypeUrl);
  const { strippedFromDecoderOutput, packedFromGogo3 } =
    makeGogo3Transformations(cdc, annotationsFromTypeUrl);

  const help: Proto3CodecHelper<TU> = {
    ...cdc,
    typedJson(message) {
      const value = packedFromGogo3(message);
      return {
        '@type': codec.typeUrl,
        ...(typeof value === 'object' && value),
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

      return strippedFromDecoderOutput(value);
    },
  };
  freeze(help);
  return help;
};
