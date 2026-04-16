export type TypeUrl = string;
export type ProtoFieldName = string;

/** Record for select annotations of the fields for a protobuf message. */
export interface FieldAnnotationsRecord {
  typeUrlFromField?: Record<ProtoFieldName, TypeUrl>;
  'gogoproto.nullable'?: Record<ProtoFieldName, boolean>;
  'gogoproto.embed'?: Record<ProtoFieldName, string>;
  'amino.dont_omitempty'?: Record<ProtoFieldName, boolean>;
}

/** Map for select annotations of the fields for a protobuf message */
export type FieldAnnotations = Map<
  keyof FieldAnnotationsRecord,
  Map<ProtoFieldName, any>
>;

const annotationsFromRecord = (
  record: FieldAnnotationsRecord,
): FieldAnnotations =>
  new Map(
    Object.entries(record).map(([name, valueRecord]) => [
      name as keyof FieldAnnotationsRecord,
      new Map(Object.entries(valueRecord)),
    ]),
  );

const typeUrlMapFromRecord = (
  record: Record<TypeUrl, FieldAnnotationsRecord>,
): Map<TypeUrl, FieldAnnotations> =>
  new Map(
    Object.entries(record).map(([typeUrl, annotationsRecord]) => [
      typeUrl as TypeUrl,
      annotationsFromRecord(annotationsRecord),
    ]),
  );

/**
 * A map from typeUrl to Map<annotationId, Map<fieldName, annotationValue>> data.
 * XXX we should codegen this data rather than manually updating it.
 */
export const defaultAnnotationsFromTypeUrl = typeUrlMapFromRecord({
  '/ibc.applications.transfer.v1.MsgTransfer': {
    typeUrlFromField: {
      timeoutHeight: '/ibc.core.client.v1.Height',
      token: '/cosmos.base.v1beta1.Coin',
    },
    'gogoproto.nullable': {
      timeoutHeight: false,
      token: false,
    },
  },
  '/cosmos.auth.v1beta1.ModuleAccount': {
    'gogoproto.embed': {
      base_account: 'baseAccount',
    },
  },
  '/cosmos.base.v1beta1.Coin': {
    typeUrlFromField: {
      amount: 'cosmos.Int',
    },
    'gogoproto.nullable': {
      amount: false,
    },
    'amino.dont_omitempty': {
      amount: true,
    },
  },
  '/cosmos.tx.v1beta1.TxBody': {
    'gogoproto.nullable': {
      timeoutTimestamp: true,
    },
  },
} as const satisfies Record<TypeUrl, FieldAnnotationsRecord>);

const scalarMakersRecord = {
  'cosmos.Int': (input: any) => `${BigInt(input || 0)}`,
};
export const scalarMakersFromType = new Map<string, (input: any) => unknown>(
  Object.entries(scalarMakersRecord),
);
