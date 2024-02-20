import Long from "long";
import _m0 from "protobufjs/minimal.js";
export declare const protobufPackage = "cosmos_proto";
export declare enum ScalarType {
    SCALAR_TYPE_UNSPECIFIED = 0,
    SCALAR_TYPE_STRING = 1,
    SCALAR_TYPE_BYTES = 2,
    UNRECOGNIZED = -1
}
export declare function scalarTypeFromJSON(object: any): ScalarType;
export declare function scalarTypeToJSON(object: ScalarType): string;
/**
 * InterfaceDescriptor describes an interface type to be used with
 * accepts_interface and implements_interface and declared by declare_interface.
 */
export interface InterfaceDescriptor {
    /**
     * name is the name of the interface. It should be a short-name (without
     * a period) such that the fully qualified name of the interface will be
     * package.name, ex. for the package a.b and interface named C, the
     * fully-qualified name will be a.b.C.
     */
    name: string;
    /**
     * description is a human-readable description of the interface and its
     * purpose.
     */
    description: string;
}
/**
 * ScalarDescriptor describes an scalar type to be used with
 * the scalar field option and declared by declare_scalar.
 * Scalars extend simple protobuf built-in types with additional
 * syntax and semantics, for instance to represent big integers.
 * Scalars should ideally define an encoding such that there is only one
 * valid syntactical representation for a given semantic meaning,
 * i.e. the encoding should be deterministic.
 */
export interface ScalarDescriptor {
    /**
     * name is the name of the scalar. It should be a short-name (without
     * a period) such that the fully qualified name of the scalar will be
     * package.name, ex. for the package a.b and scalar named C, the
     * fully-qualified name will be a.b.C.
     */
    name: string;
    /**
     * description is a human-readable description of the scalar and its
     * encoding format. For instance a big integer or decimal scalar should
     * specify precisely the expected encoding format.
     */
    description: string;
    /**
     * field_type is the type of field with which this scalar can be used.
     * Scalars can be used with one and only one type of field so that
     * encoding standards and simple and clear. Currently only string and
     * bytes fields are supported for scalars.
     */
    fieldType: ScalarType[];
}
export declare const InterfaceDescriptor: {
    encode(message: InterfaceDescriptor, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): InterfaceDescriptor;
    fromJSON(object: any): InterfaceDescriptor;
    toJSON(message: InterfaceDescriptor): unknown;
    fromPartial<I extends {
        name?: string | undefined;
        description?: string | undefined;
    } & {
        name?: string | undefined;
        description?: string | undefined;
    } & { [K in Exclude<keyof I, keyof InterfaceDescriptor>]: never; }>(object: I): InterfaceDescriptor;
};
export declare const ScalarDescriptor: {
    encode(message: ScalarDescriptor, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ScalarDescriptor;
    fromJSON(object: any): ScalarDescriptor;
    toJSON(message: ScalarDescriptor): unknown;
    fromPartial<I extends {
        name?: string | undefined;
        description?: string | undefined;
        fieldType?: ScalarType[] | undefined;
    } & {
        name?: string | undefined;
        description?: string | undefined;
        fieldType?: (ScalarType[] & ScalarType[] & { [K in Exclude<keyof I["fieldType"], keyof ScalarType[]>]: never; }) | undefined;
    } & { [K_1 in Exclude<keyof I, keyof ScalarDescriptor>]: never; }>(object: I): ScalarDescriptor;
};
declare type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export declare type DeepPartial<T> = T extends Builtin ? T : T extends Long ? string | number | Long : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
declare type KeysOfUnion<T> = T extends T ? keyof T : never;
export declare type Exact<P, I extends P> = P extends Builtin ? P : P & {
    [K in keyof P]: Exact<P[K], I[K]>;
} & {
    [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
};
export {};
