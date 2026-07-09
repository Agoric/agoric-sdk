export type TypeUrl = string;
export type ProtoFieldName = string;

export interface AnnotatedCodec {
  readonly typeUrl: TypeUrl;
  readonly annotations?: FieldAnnotationsRecord;
}

export type AnnotatedCodecResolver = () => AnnotatedCodec;
export type FieldTypeReference =
  | TypeUrl
  | AnnotatedCodec
  | AnnotatedCodecResolver;

/** Record for select annotations of the fields for a protobuf message. */
export interface FieldAnnotationsRecord {
  typeUrlFromField?: Record<ProtoFieldName, FieldTypeReference>;
  'gogoproto.nullable'?: Record<ProtoFieldName, boolean>;
  'gogoproto.embed'?: Record<ProtoFieldName, string>;
  'amino.dont_omitempty'?: Record<ProtoFieldName, boolean>;
}

/** Map for select annotations of the fields for a protobuf message */
export type FieldAnnotations = Map<
  keyof FieldAnnotationsRecord,
  Map<ProtoFieldName, any>
>;

export const annotationsFromRecord = (
  record: FieldAnnotationsRecord,
): FieldAnnotations =>
  new Map(
    Object.entries(record).map(([name, valueRecord]) => [
      name as keyof FieldAnnotationsRecord,
      new Map(Object.entries(valueRecord)),
    ]),
  );

export const typeUrlMapFromRecord = (
  record: Record<TypeUrl, FieldAnnotationsRecord>,
): Map<TypeUrl, FieldAnnotations> =>
  new Map(
    Object.entries(record).map(([typeUrl, annotationsRecord]) => [
      typeUrl as TypeUrl,
      annotationsFromRecord(annotationsRecord),
    ]),
  );

export const codecFromFieldType = (
  fieldType: FieldTypeReference | undefined,
): AnnotatedCodec | undefined => {
  if (typeof fieldType === 'function') {
    return fieldType();
  }
  if (typeof fieldType === 'object' && fieldType !== null) {
    return fieldType;
  }
  return undefined;
};

export const typeUrlFromFieldType = (
  fieldType: FieldTypeReference | undefined,
): TypeUrl | undefined =>
  typeof fieldType === 'string'
    ? fieldType
    : codecFromFieldType(fieldType)?.typeUrl;

export const annotationsFromTypeUrlForCodec = (
  codec: AnnotatedCodec,
  annotationsFromTypeUrl: Map<TypeUrl, FieldAnnotations> = new Map(),
): Map<TypeUrl, FieldAnnotations> => {
  const withCodecAnnotations = new Map(annotationsFromTypeUrl);
  const visited = new Set<TypeUrl>();

  const collect = (fieldType: FieldTypeReference | undefined) => {
    const fieldCodec = codecFromFieldType(fieldType);
    if (!fieldCodec || visited.has(fieldCodec.typeUrl)) {
      return;
    }
    visited.add(fieldCodec.typeUrl);

    const { annotations } = fieldCodec;
    if (!annotations) {
      return;
    }
    if (!withCodecAnnotations.has(fieldCodec.typeUrl)) {
      withCodecAnnotations.set(
        fieldCodec.typeUrl,
        annotationsFromRecord(annotations),
      );
    }
    for (const childFieldType of Object.values(
      annotations.typeUrlFromField ?? {},
    )) {
      collect(childFieldType);
    }
  };

  collect(codec);
  return withCodecAnnotations;
};

const scalarMakersRecord = {
  'cosmos.Int': (input: any) => `${BigInt(input || 0)}`,
};
export const scalarMakersFromType = new Map<string, (input: any) => unknown>(
  Object.entries(scalarMakersRecord),
);
