import { BinaryReader, BinaryWriter } from '../binary.js';
import { type JsonSafe } from '../json-safe.js';
export declare enum ScalarType {
    SCALAR_TYPE_UNSPECIFIED = 0,
    SCALAR_TYPE_STRING = 1,
    SCALAR_TYPE_BYTES = 2,
    UNRECOGNIZED = -1
}
export declare const ScalarTypeSDKType: typeof ScalarType;
export declare function scalarTypeFromJSON(object: any): ScalarType;
export declare function scalarTypeToJSON(object: ScalarType): string;
/**
 * InterfaceDescriptor describes an interface type to be used with
 * accepts_interface and implements_interface and declared by declare_interface.
 * @name InterfaceDescriptor
 * @package cosmos_proto
 * @see proto type: cosmos_proto.InterfaceDescriptor
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
export interface InterfaceDescriptorProtoMsg {
    typeUrl: '/cosmos_proto.InterfaceDescriptor';
    value: Uint8Array;
}
/**
 * InterfaceDescriptor describes an interface type to be used with
 * accepts_interface and implements_interface and declared by declare_interface.
 * @name InterfaceDescriptorSDKType
 * @package cosmos_proto
 * @see proto type: cosmos_proto.InterfaceDescriptor
 */
export interface InterfaceDescriptorSDKType {
    name: string;
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
 * @name ScalarDescriptor
 * @package cosmos_proto
 * @see proto type: cosmos_proto.ScalarDescriptor
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
export interface ScalarDescriptorProtoMsg {
    typeUrl: '/cosmos_proto.ScalarDescriptor';
    value: Uint8Array;
}
/**
 * ScalarDescriptor describes an scalar type to be used with
 * the scalar field option and declared by declare_scalar.
 * Scalars extend simple protobuf built-in types with additional
 * syntax and semantics, for instance to represent big integers.
 * Scalars should ideally define an encoding such that there is only one
 * valid syntactical representation for a given semantic meaning,
 * i.e. the encoding should be deterministic.
 * @name ScalarDescriptorSDKType
 * @package cosmos_proto
 * @see proto type: cosmos_proto.ScalarDescriptor
 */
export interface ScalarDescriptorSDKType {
    name: string;
    description: string;
    field_type: ScalarType[];
}
/**
 * InterfaceDescriptor describes an interface type to be used with
 * accepts_interface and implements_interface and declared by declare_interface.
 * @name InterfaceDescriptor
 * @package cosmos_proto
 * @see proto type: cosmos_proto.InterfaceDescriptor
 */
export declare const InterfaceDescriptor: {
    typeUrl: "/cosmos_proto.InterfaceDescriptor";
    is(o: any): o is InterfaceDescriptor;
    isSDK(o: any): o is InterfaceDescriptorSDKType;
    encode(message: InterfaceDescriptor, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): InterfaceDescriptor;
    fromJSON(object: any): InterfaceDescriptor;
    toJSON(message: InterfaceDescriptor): JsonSafe<InterfaceDescriptor>;
    fromPartial(object: Partial<InterfaceDescriptor>): InterfaceDescriptor;
    fromProtoMsg(message: InterfaceDescriptorProtoMsg): InterfaceDescriptor;
    toProto(message: InterfaceDescriptor): Uint8Array;
    toProtoMsg(message: InterfaceDescriptor): InterfaceDescriptorProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ScalarDescriptor describes an scalar type to be used with
 * the scalar field option and declared by declare_scalar.
 * Scalars extend simple protobuf built-in types with additional
 * syntax and semantics, for instance to represent big integers.
 * Scalars should ideally define an encoding such that there is only one
 * valid syntactical representation for a given semantic meaning,
 * i.e. the encoding should be deterministic.
 * @name ScalarDescriptor
 * @package cosmos_proto
 * @see proto type: cosmos_proto.ScalarDescriptor
 */
export declare const ScalarDescriptor: {
    typeUrl: "/cosmos_proto.ScalarDescriptor";
    is(o: any): o is ScalarDescriptor;
    isSDK(o: any): o is ScalarDescriptorSDKType;
    encode(message: ScalarDescriptor, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ScalarDescriptor;
    fromJSON(object: any): ScalarDescriptor;
    toJSON(message: ScalarDescriptor): JsonSafe<ScalarDescriptor>;
    fromPartial(object: Partial<ScalarDescriptor>): ScalarDescriptor;
    fromProtoMsg(message: ScalarDescriptorProtoMsg): ScalarDescriptor;
    toProto(message: ScalarDescriptor): Uint8Array;
    toProtoMsg(message: ScalarDescriptor): ScalarDescriptorProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=cosmos.d.ts.map