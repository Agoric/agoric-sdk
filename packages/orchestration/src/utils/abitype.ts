import type { TypedDataType, TypedData } from 'abitype';

// Redefine abitype's TypedDataParameter to make it generic
export type TypedDataParameter<
  TN extends string = string,
  TT extends string =
    | TypedDataType
    | keyof TypedData
    | `${keyof TypedData}[${string | ''}]`,
> = {
  name: TN;
  type: TT;
};
