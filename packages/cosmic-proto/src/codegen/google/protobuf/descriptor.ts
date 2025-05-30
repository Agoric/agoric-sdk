//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
import { isSet } from '../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
export enum FieldDescriptorProto_Type {
  /**
   * TYPE_DOUBLE - 0 is reserved for errors.
   * Order is weird for historical reasons.
   */
  TYPE_DOUBLE = 1,
  TYPE_FLOAT = 2,
  /**
   * TYPE_INT64 - Not ZigZag encoded.  Negative numbers take 10 bytes.  Use TYPE_SINT64 if
   * negative values are likely.
   */
  TYPE_INT64 = 3,
  TYPE_UINT64 = 4,
  /**
   * TYPE_INT32 - Not ZigZag encoded.  Negative numbers take 10 bytes.  Use TYPE_SINT32 if
   * negative values are likely.
   */
  TYPE_INT32 = 5,
  TYPE_FIXED64 = 6,
  TYPE_FIXED32 = 7,
  TYPE_BOOL = 8,
  TYPE_STRING = 9,
  /**
   * TYPE_GROUP - Tag-delimited aggregate.
   * Group type is deprecated and not supported in proto3. However, Proto3
   * implementations should still be able to parse the group wire format and
   * treat group fields as unknown fields.
   */
  TYPE_GROUP = 10,
  /** TYPE_MESSAGE - Length-delimited aggregate. */
  TYPE_MESSAGE = 11,
  /** TYPE_BYTES - New in version 2. */
  TYPE_BYTES = 12,
  TYPE_UINT32 = 13,
  TYPE_ENUM = 14,
  TYPE_SFIXED32 = 15,
  TYPE_SFIXED64 = 16,
  /** TYPE_SINT32 - Uses ZigZag encoding. */
  TYPE_SINT32 = 17,
  /** TYPE_SINT64 - Uses ZigZag encoding. */
  TYPE_SINT64 = 18,
  UNRECOGNIZED = -1,
}
export const FieldDescriptorProto_TypeSDKType = FieldDescriptorProto_Type;
export function fieldDescriptorProto_TypeFromJSON(
  object: any,
): FieldDescriptorProto_Type {
  switch (object) {
    case 1:
    case 'TYPE_DOUBLE':
      return FieldDescriptorProto_Type.TYPE_DOUBLE;
    case 2:
    case 'TYPE_FLOAT':
      return FieldDescriptorProto_Type.TYPE_FLOAT;
    case 3:
    case 'TYPE_INT64':
      return FieldDescriptorProto_Type.TYPE_INT64;
    case 4:
    case 'TYPE_UINT64':
      return FieldDescriptorProto_Type.TYPE_UINT64;
    case 5:
    case 'TYPE_INT32':
      return FieldDescriptorProto_Type.TYPE_INT32;
    case 6:
    case 'TYPE_FIXED64':
      return FieldDescriptorProto_Type.TYPE_FIXED64;
    case 7:
    case 'TYPE_FIXED32':
      return FieldDescriptorProto_Type.TYPE_FIXED32;
    case 8:
    case 'TYPE_BOOL':
      return FieldDescriptorProto_Type.TYPE_BOOL;
    case 9:
    case 'TYPE_STRING':
      return FieldDescriptorProto_Type.TYPE_STRING;
    case 10:
    case 'TYPE_GROUP':
      return FieldDescriptorProto_Type.TYPE_GROUP;
    case 11:
    case 'TYPE_MESSAGE':
      return FieldDescriptorProto_Type.TYPE_MESSAGE;
    case 12:
    case 'TYPE_BYTES':
      return FieldDescriptorProto_Type.TYPE_BYTES;
    case 13:
    case 'TYPE_UINT32':
      return FieldDescriptorProto_Type.TYPE_UINT32;
    case 14:
    case 'TYPE_ENUM':
      return FieldDescriptorProto_Type.TYPE_ENUM;
    case 15:
    case 'TYPE_SFIXED32':
      return FieldDescriptorProto_Type.TYPE_SFIXED32;
    case 16:
    case 'TYPE_SFIXED64':
      return FieldDescriptorProto_Type.TYPE_SFIXED64;
    case 17:
    case 'TYPE_SINT32':
      return FieldDescriptorProto_Type.TYPE_SINT32;
    case 18:
    case 'TYPE_SINT64':
      return FieldDescriptorProto_Type.TYPE_SINT64;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return FieldDescriptorProto_Type.UNRECOGNIZED;
  }
}
export function fieldDescriptorProto_TypeToJSON(
  object: FieldDescriptorProto_Type,
): string {
  switch (object) {
    case FieldDescriptorProto_Type.TYPE_DOUBLE:
      return 'TYPE_DOUBLE';
    case FieldDescriptorProto_Type.TYPE_FLOAT:
      return 'TYPE_FLOAT';
    case FieldDescriptorProto_Type.TYPE_INT64:
      return 'TYPE_INT64';
    case FieldDescriptorProto_Type.TYPE_UINT64:
      return 'TYPE_UINT64';
    case FieldDescriptorProto_Type.TYPE_INT32:
      return 'TYPE_INT32';
    case FieldDescriptorProto_Type.TYPE_FIXED64:
      return 'TYPE_FIXED64';
    case FieldDescriptorProto_Type.TYPE_FIXED32:
      return 'TYPE_FIXED32';
    case FieldDescriptorProto_Type.TYPE_BOOL:
      return 'TYPE_BOOL';
    case FieldDescriptorProto_Type.TYPE_STRING:
      return 'TYPE_STRING';
    case FieldDescriptorProto_Type.TYPE_GROUP:
      return 'TYPE_GROUP';
    case FieldDescriptorProto_Type.TYPE_MESSAGE:
      return 'TYPE_MESSAGE';
    case FieldDescriptorProto_Type.TYPE_BYTES:
      return 'TYPE_BYTES';
    case FieldDescriptorProto_Type.TYPE_UINT32:
      return 'TYPE_UINT32';
    case FieldDescriptorProto_Type.TYPE_ENUM:
      return 'TYPE_ENUM';
    case FieldDescriptorProto_Type.TYPE_SFIXED32:
      return 'TYPE_SFIXED32';
    case FieldDescriptorProto_Type.TYPE_SFIXED64:
      return 'TYPE_SFIXED64';
    case FieldDescriptorProto_Type.TYPE_SINT32:
      return 'TYPE_SINT32';
    case FieldDescriptorProto_Type.TYPE_SINT64:
      return 'TYPE_SINT64';
    case FieldDescriptorProto_Type.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
export enum FieldDescriptorProto_Label {
  /** LABEL_OPTIONAL - 0 is reserved for errors */
  LABEL_OPTIONAL = 1,
  LABEL_REQUIRED = 2,
  LABEL_REPEATED = 3,
  UNRECOGNIZED = -1,
}
export const FieldDescriptorProto_LabelSDKType = FieldDescriptorProto_Label;
export function fieldDescriptorProto_LabelFromJSON(
  object: any,
): FieldDescriptorProto_Label {
  switch (object) {
    case 1:
    case 'LABEL_OPTIONAL':
      return FieldDescriptorProto_Label.LABEL_OPTIONAL;
    case 2:
    case 'LABEL_REQUIRED':
      return FieldDescriptorProto_Label.LABEL_REQUIRED;
    case 3:
    case 'LABEL_REPEATED':
      return FieldDescriptorProto_Label.LABEL_REPEATED;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return FieldDescriptorProto_Label.UNRECOGNIZED;
  }
}
export function fieldDescriptorProto_LabelToJSON(
  object: FieldDescriptorProto_Label,
): string {
  switch (object) {
    case FieldDescriptorProto_Label.LABEL_OPTIONAL:
      return 'LABEL_OPTIONAL';
    case FieldDescriptorProto_Label.LABEL_REQUIRED:
      return 'LABEL_REQUIRED';
    case FieldDescriptorProto_Label.LABEL_REPEATED:
      return 'LABEL_REPEATED';
    case FieldDescriptorProto_Label.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/** Generated classes can be optimized for speed or code size. */
export enum FileOptions_OptimizeMode {
  /** SPEED - Generate complete code for parsing, serialization, */
  SPEED = 1,
  /** CODE_SIZE - etc. */
  CODE_SIZE = 2,
  /** LITE_RUNTIME - Generate code using MessageLite and the lite runtime. */
  LITE_RUNTIME = 3,
  UNRECOGNIZED = -1,
}
export const FileOptions_OptimizeModeSDKType = FileOptions_OptimizeMode;
export function fileOptions_OptimizeModeFromJSON(
  object: any,
): FileOptions_OptimizeMode {
  switch (object) {
    case 1:
    case 'SPEED':
      return FileOptions_OptimizeMode.SPEED;
    case 2:
    case 'CODE_SIZE':
      return FileOptions_OptimizeMode.CODE_SIZE;
    case 3:
    case 'LITE_RUNTIME':
      return FileOptions_OptimizeMode.LITE_RUNTIME;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return FileOptions_OptimizeMode.UNRECOGNIZED;
  }
}
export function fileOptions_OptimizeModeToJSON(
  object: FileOptions_OptimizeMode,
): string {
  switch (object) {
    case FileOptions_OptimizeMode.SPEED:
      return 'SPEED';
    case FileOptions_OptimizeMode.CODE_SIZE:
      return 'CODE_SIZE';
    case FileOptions_OptimizeMode.LITE_RUNTIME:
      return 'LITE_RUNTIME';
    case FileOptions_OptimizeMode.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
export enum FieldOptions_CType {
  /** STRING - Default mode. */
  STRING = 0,
  CORD = 1,
  STRING_PIECE = 2,
  UNRECOGNIZED = -1,
}
export const FieldOptions_CTypeSDKType = FieldOptions_CType;
export function fieldOptions_CTypeFromJSON(object: any): FieldOptions_CType {
  switch (object) {
    case 0:
    case 'STRING':
      return FieldOptions_CType.STRING;
    case 1:
    case 'CORD':
      return FieldOptions_CType.CORD;
    case 2:
    case 'STRING_PIECE':
      return FieldOptions_CType.STRING_PIECE;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return FieldOptions_CType.UNRECOGNIZED;
  }
}
export function fieldOptions_CTypeToJSON(object: FieldOptions_CType): string {
  switch (object) {
    case FieldOptions_CType.STRING:
      return 'STRING';
    case FieldOptions_CType.CORD:
      return 'CORD';
    case FieldOptions_CType.STRING_PIECE:
      return 'STRING_PIECE';
    case FieldOptions_CType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
export enum FieldOptions_JSType {
  /** JS_NORMAL - Use the default type. */
  JS_NORMAL = 0,
  /** JS_STRING - Use JavaScript strings. */
  JS_STRING = 1,
  /** JS_NUMBER - Use JavaScript numbers. */
  JS_NUMBER = 2,
  UNRECOGNIZED = -1,
}
export const FieldOptions_JSTypeSDKType = FieldOptions_JSType;
export function fieldOptions_JSTypeFromJSON(object: any): FieldOptions_JSType {
  switch (object) {
    case 0:
    case 'JS_NORMAL':
      return FieldOptions_JSType.JS_NORMAL;
    case 1:
    case 'JS_STRING':
      return FieldOptions_JSType.JS_STRING;
    case 2:
    case 'JS_NUMBER':
      return FieldOptions_JSType.JS_NUMBER;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return FieldOptions_JSType.UNRECOGNIZED;
  }
}
export function fieldOptions_JSTypeToJSON(object: FieldOptions_JSType): string {
  switch (object) {
    case FieldOptions_JSType.JS_NORMAL:
      return 'JS_NORMAL';
    case FieldOptions_JSType.JS_STRING:
      return 'JS_STRING';
    case FieldOptions_JSType.JS_NUMBER:
      return 'JS_NUMBER';
    case FieldOptions_JSType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/**
 * Is this method side-effect-free (or safe in HTTP parlance), or idempotent,
 * or neither? HTTP based RPC implementation may choose GET verb for safe
 * methods, and PUT verb for idempotent methods instead of the default POST.
 */
export enum MethodOptions_IdempotencyLevel {
  IDEMPOTENCY_UNKNOWN = 0,
  /** NO_SIDE_EFFECTS - implies idempotent */
  NO_SIDE_EFFECTS = 1,
  /** IDEMPOTENT - idempotent, but may have side effects */
  IDEMPOTENT = 2,
  UNRECOGNIZED = -1,
}
export const MethodOptions_IdempotencyLevelSDKType =
  MethodOptions_IdempotencyLevel;
export function methodOptions_IdempotencyLevelFromJSON(
  object: any,
): MethodOptions_IdempotencyLevel {
  switch (object) {
    case 0:
    case 'IDEMPOTENCY_UNKNOWN':
      return MethodOptions_IdempotencyLevel.IDEMPOTENCY_UNKNOWN;
    case 1:
    case 'NO_SIDE_EFFECTS':
      return MethodOptions_IdempotencyLevel.NO_SIDE_EFFECTS;
    case 2:
    case 'IDEMPOTENT':
      return MethodOptions_IdempotencyLevel.IDEMPOTENT;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return MethodOptions_IdempotencyLevel.UNRECOGNIZED;
  }
}
export function methodOptions_IdempotencyLevelToJSON(
  object: MethodOptions_IdempotencyLevel,
): string {
  switch (object) {
    case MethodOptions_IdempotencyLevel.IDEMPOTENCY_UNKNOWN:
      return 'IDEMPOTENCY_UNKNOWN';
    case MethodOptions_IdempotencyLevel.NO_SIDE_EFFECTS:
      return 'NO_SIDE_EFFECTS';
    case MethodOptions_IdempotencyLevel.IDEMPOTENT:
      return 'IDEMPOTENT';
    case MethodOptions_IdempotencyLevel.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/**
 * The protocol compiler can output a FileDescriptorSet containing the .proto
 * files it parses.
 */
export interface FileDescriptorSet {
  file: FileDescriptorProto[];
}
export interface FileDescriptorSetProtoMsg {
  typeUrl: '/google.protobuf.FileDescriptorSet';
  value: Uint8Array;
}
/**
 * The protocol compiler can output a FileDescriptorSet containing the .proto
 * files it parses.
 */
export interface FileDescriptorSetSDKType {
  file: FileDescriptorProtoSDKType[];
}
/** Describes a complete .proto file. */
export interface FileDescriptorProto {
  /** file name, relative to root of source tree */
  name: string;
  /** e.g. "foo", "foo.bar", etc. */
  package: string;
  /** Names of files imported by this file. */
  dependency: string[];
  /** Indexes of the public imported files in the dependency list above. */
  publicDependency: number[];
  /**
   * Indexes of the weak imported files in the dependency list.
   * For Google-internal migration only. Do not use.
   */
  weakDependency: number[];
  /** All top-level definitions in this file. */
  messageType: DescriptorProto[];
  enumType: EnumDescriptorProto[];
  service: ServiceDescriptorProto[];
  extension: FieldDescriptorProto[];
  options?: FileOptions;
  /**
   * This field contains optional information about the original source code.
   * You may safely remove this entire field without harming runtime
   * functionality of the descriptors -- the information is needed only by
   * development tools.
   */
  sourceCodeInfo?: SourceCodeInfo;
  /**
   * The syntax of the proto file.
   * The supported values are "proto2" and "proto3".
   */
  syntax: string;
}
export interface FileDescriptorProtoProtoMsg {
  typeUrl: '/google.protobuf.FileDescriptorProto';
  value: Uint8Array;
}
/** Describes a complete .proto file. */
export interface FileDescriptorProtoSDKType {
  name: string;
  package: string;
  dependency: string[];
  public_dependency: number[];
  weak_dependency: number[];
  message_type: DescriptorProtoSDKType[];
  enum_type: EnumDescriptorProtoSDKType[];
  service: ServiceDescriptorProtoSDKType[];
  extension: FieldDescriptorProtoSDKType[];
  options?: FileOptionsSDKType;
  source_code_info?: SourceCodeInfoSDKType;
  syntax: string;
}
/** Describes a message type. */
export interface DescriptorProto {
  name: string;
  field: FieldDescriptorProto[];
  extension: FieldDescriptorProto[];
  nestedType: DescriptorProto[];
  enumType: EnumDescriptorProto[];
  extensionRange: DescriptorProto_ExtensionRange[];
  oneofDecl: OneofDescriptorProto[];
  options?: MessageOptions;
  reservedRange: DescriptorProto_ReservedRange[];
  /**
   * Reserved field names, which may not be used by fields in the same message.
   * A given name may only be reserved once.
   */
  reservedName: string[];
}
export interface DescriptorProtoProtoMsg {
  typeUrl: '/google.protobuf.DescriptorProto';
  value: Uint8Array;
}
/** Describes a message type. */
export interface DescriptorProtoSDKType {
  name: string;
  field: FieldDescriptorProtoSDKType[];
  extension: FieldDescriptorProtoSDKType[];
  nested_type: DescriptorProtoSDKType[];
  enum_type: EnumDescriptorProtoSDKType[];
  extension_range: DescriptorProto_ExtensionRangeSDKType[];
  oneof_decl: OneofDescriptorProtoSDKType[];
  options?: MessageOptionsSDKType;
  reserved_range: DescriptorProto_ReservedRangeSDKType[];
  reserved_name: string[];
}
export interface DescriptorProto_ExtensionRange {
  /** Inclusive. */
  start: number;
  /** Exclusive. */
  end: number;
  options?: ExtensionRangeOptions;
}
export interface DescriptorProto_ExtensionRangeProtoMsg {
  typeUrl: '/google.protobuf.ExtensionRange';
  value: Uint8Array;
}
export interface DescriptorProto_ExtensionRangeSDKType {
  start: number;
  end: number;
  options?: ExtensionRangeOptionsSDKType;
}
/**
 * Range of reserved tag numbers. Reserved tag numbers may not be used by
 * fields or extension ranges in the same message. Reserved ranges may
 * not overlap.
 */
export interface DescriptorProto_ReservedRange {
  /** Inclusive. */
  start: number;
  /** Exclusive. */
  end: number;
}
export interface DescriptorProto_ReservedRangeProtoMsg {
  typeUrl: '/google.protobuf.ReservedRange';
  value: Uint8Array;
}
/**
 * Range of reserved tag numbers. Reserved tag numbers may not be used by
 * fields or extension ranges in the same message. Reserved ranges may
 * not overlap.
 */
export interface DescriptorProto_ReservedRangeSDKType {
  start: number;
  end: number;
}
export interface ExtensionRangeOptions {
  /** The parser stores options it doesn't recognize here. See above. */
  uninterpretedOption: UninterpretedOption[];
}
export interface ExtensionRangeOptionsProtoMsg {
  typeUrl: '/google.protobuf.ExtensionRangeOptions';
  value: Uint8Array;
}
export interface ExtensionRangeOptionsSDKType {
  uninterpreted_option: UninterpretedOptionSDKType[];
}
/** Describes a field within a message. */
export interface FieldDescriptorProto {
  name: string;
  number: number;
  label: FieldDescriptorProto_Label;
  /**
   * If type_name is set, this need not be set.  If both this and type_name
   * are set, this must be one of TYPE_ENUM, TYPE_MESSAGE or TYPE_GROUP.
   */
  type: FieldDescriptorProto_Type;
  /**
   * For message and enum types, this is the name of the type.  If the name
   * starts with a '.', it is fully-qualified.  Otherwise, C++-like scoping
   * rules are used to find the type (i.e. first the nested types within this
   * message are searched, then within the parent, on up to the root
   * namespace).
   */
  typeName: string;
  /**
   * For extensions, this is the name of the type being extended.  It is
   * resolved in the same manner as type_name.
   */
  extendee: string;
  /**
   * For numeric types, contains the original text representation of the value.
   * For booleans, "true" or "false".
   * For strings, contains the default text contents (not escaped in any way).
   * For bytes, contains the C escaped value.  All bytes >= 128 are escaped.
   * TODO(kenton):  Base-64 encode?
   */
  defaultValue: string;
  /**
   * If set, gives the index of a oneof in the containing type's oneof_decl
   * list.  This field is a member of that oneof.
   */
  oneofIndex: number;
  /**
   * JSON name of this field. The value is set by protocol compiler. If the
   * user has set a "json_name" option on this field, that option's value
   * will be used. Otherwise, it's deduced from the field's name by converting
   * it to camelCase.
   */
  jsonName: string;
  options?: FieldOptions;
}
export interface FieldDescriptorProtoProtoMsg {
  typeUrl: '/google.protobuf.FieldDescriptorProto';
  value: Uint8Array;
}
/** Describes a field within a message. */
export interface FieldDescriptorProtoSDKType {
  name: string;
  number: number;
  label: FieldDescriptorProto_Label;
  type: FieldDescriptorProto_Type;
  type_name: string;
  extendee: string;
  default_value: string;
  oneof_index: number;
  json_name: string;
  options?: FieldOptionsSDKType;
}
/** Describes a oneof. */
export interface OneofDescriptorProto {
  name: string;
  options?: OneofOptions;
}
export interface OneofDescriptorProtoProtoMsg {
  typeUrl: '/google.protobuf.OneofDescriptorProto';
  value: Uint8Array;
}
/** Describes a oneof. */
export interface OneofDescriptorProtoSDKType {
  name: string;
  options?: OneofOptionsSDKType;
}
/** Describes an enum type. */
export interface EnumDescriptorProto {
  name: string;
  value: EnumValueDescriptorProto[];
  options?: EnumOptions;
  /**
   * Range of reserved numeric values. Reserved numeric values may not be used
   * by enum values in the same enum declaration. Reserved ranges may not
   * overlap.
   */
  reservedRange: EnumDescriptorProto_EnumReservedRange[];
  /**
   * Reserved enum value names, which may not be reused. A given name may only
   * be reserved once.
   */
  reservedName: string[];
}
export interface EnumDescriptorProtoProtoMsg {
  typeUrl: '/google.protobuf.EnumDescriptorProto';
  value: Uint8Array;
}
/** Describes an enum type. */
export interface EnumDescriptorProtoSDKType {
  name: string;
  value: EnumValueDescriptorProtoSDKType[];
  options?: EnumOptionsSDKType;
  reserved_range: EnumDescriptorProto_EnumReservedRangeSDKType[];
  reserved_name: string[];
}
/**
 * Range of reserved numeric values. Reserved values may not be used by
 * entries in the same enum. Reserved ranges may not overlap.
 *
 * Note that this is distinct from DescriptorProto.ReservedRange in that it
 * is inclusive such that it can appropriately represent the entire int32
 * domain.
 */
export interface EnumDescriptorProto_EnumReservedRange {
  /** Inclusive. */
  start: number;
  /** Inclusive. */
  end: number;
}
export interface EnumDescriptorProto_EnumReservedRangeProtoMsg {
  typeUrl: '/google.protobuf.EnumReservedRange';
  value: Uint8Array;
}
/**
 * Range of reserved numeric values. Reserved values may not be used by
 * entries in the same enum. Reserved ranges may not overlap.
 *
 * Note that this is distinct from DescriptorProto.ReservedRange in that it
 * is inclusive such that it can appropriately represent the entire int32
 * domain.
 */
export interface EnumDescriptorProto_EnumReservedRangeSDKType {
  start: number;
  end: number;
}
/** Describes a value within an enum. */
export interface EnumValueDescriptorProto {
  name: string;
  number: number;
  options?: EnumValueOptions;
}
export interface EnumValueDescriptorProtoProtoMsg {
  typeUrl: '/google.protobuf.EnumValueDescriptorProto';
  value: Uint8Array;
}
/** Describes a value within an enum. */
export interface EnumValueDescriptorProtoSDKType {
  name: string;
  number: number;
  options?: EnumValueOptionsSDKType;
}
/** Describes a service. */
export interface ServiceDescriptorProto {
  name: string;
  method: MethodDescriptorProto[];
  options?: ServiceOptions;
}
export interface ServiceDescriptorProtoProtoMsg {
  typeUrl: '/google.protobuf.ServiceDescriptorProto';
  value: Uint8Array;
}
/** Describes a service. */
export interface ServiceDescriptorProtoSDKType {
  name: string;
  method: MethodDescriptorProtoSDKType[];
  options?: ServiceOptionsSDKType;
}
/** Describes a method of a service. */
export interface MethodDescriptorProto {
  name: string;
  /**
   * Input and output type names.  These are resolved in the same way as
   * FieldDescriptorProto.type_name, but must refer to a message type.
   */
  inputType: string;
  outputType: string;
  options?: MethodOptions;
  /** Identifies if client streams multiple client messages */
  clientStreaming: boolean;
  /** Identifies if server streams multiple server messages */
  serverStreaming: boolean;
}
export interface MethodDescriptorProtoProtoMsg {
  typeUrl: '/google.protobuf.MethodDescriptorProto';
  value: Uint8Array;
}
/** Describes a method of a service. */
export interface MethodDescriptorProtoSDKType {
  name: string;
  input_type: string;
  output_type: string;
  options?: MethodOptionsSDKType;
  client_streaming: boolean;
  server_streaming: boolean;
}
export interface FileOptions {
  /**
   * Sets the Java package where classes generated from this .proto will be
   * placed.  By default, the proto package is used, but this is often
   * inappropriate because proto packages do not normally start with backwards
   * domain names.
   */
  javaPackage: string;
  /**
   * If set, all the classes from the .proto file are wrapped in a single
   * outer class with the given name.  This applies to both Proto1
   * (equivalent to the old "--one_java_file" option) and Proto2 (where
   * a .proto always translates to a single class, but you may want to
   * explicitly choose the class name).
   */
  javaOuterClassname: string;
  /**
   * If set true, then the Java code generator will generate a separate .java
   * file for each top-level message, enum, and service defined in the .proto
   * file.  Thus, these types will *not* be nested inside the outer class
   * named by java_outer_classname.  However, the outer class will still be
   * generated to contain the file's getDescriptor() method as well as any
   * top-level extensions defined in the file.
   */
  javaMultipleFiles: boolean;
  /** This option does nothing. */
  /** @deprecated */
  javaGenerateEqualsAndHash: boolean;
  /**
   * If set true, then the Java2 code generator will generate code that
   * throws an exception whenever an attempt is made to assign a non-UTF-8
   * byte sequence to a string field.
   * Message reflection will do the same.
   * However, an extension field still accepts non-UTF-8 byte sequences.
   * This option has no effect on when used with the lite runtime.
   */
  javaStringCheckUtf8: boolean;
  optimizeFor: FileOptions_OptimizeMode;
  /**
   * Sets the Go package where structs generated from this .proto will be
   * placed. If omitted, the Go package will be derived from the following:
   *   - The basename of the package import path, if provided.
   *   - Otherwise, the package statement in the .proto file, if present.
   *   - Otherwise, the basename of the .proto file, without extension.
   */
  goPackage: string;
  /**
   * Should generic services be generated in each language?  "Generic" services
   * are not specific to any particular RPC system.  They are generated by the
   * main code generators in each language (without additional plugins).
   * Generic services were the only kind of service generation supported by
   * early versions of google.protobuf.
   *
   * Generic services are now considered deprecated in favor of using plugins
   * that generate code specific to your particular RPC system.  Therefore,
   * these default to false.  Old code which depends on generic services should
   * explicitly set them to true.
   */
  ccGenericServices: boolean;
  javaGenericServices: boolean;
  pyGenericServices: boolean;
  phpGenericServices: boolean;
  /**
   * Is this file deprecated?
   * Depending on the target platform, this can emit Deprecated annotations
   * for everything in the file, or it will be completely ignored; in the very
   * least, this is a formalization for deprecating files.
   */
  deprecated: boolean;
  /**
   * Enables the use of arenas for the proto messages in this file. This applies
   * only to generated classes for C++.
   */
  ccEnableArenas: boolean;
  /**
   * Sets the objective c class prefix which is prepended to all objective c
   * generated classes from this .proto. There is no default.
   */
  objcClassPrefix: string;
  /** Namespace for generated classes; defaults to the package. */
  csharpNamespace: string;
  /**
   * By default Swift generators will take the proto package and CamelCase it
   * replacing '.' with underscore and use that to prefix the types/symbols
   * defined. When this options is provided, they will use this value instead
   * to prefix the types/symbols defined.
   */
  swiftPrefix: string;
  /**
   * Sets the php class prefix which is prepended to all php generated classes
   * from this .proto. Default is empty.
   */
  phpClassPrefix: string;
  /**
   * Use this option to change the namespace of php generated classes. Default
   * is empty. When this option is empty, the package name will be used for
   * determining the namespace.
   */
  phpNamespace: string;
  /**
   * Use this option to change the namespace of php generated metadata classes.
   * Default is empty. When this option is empty, the proto file name will be
   * used for determining the namespace.
   */
  phpMetadataNamespace: string;
  /**
   * Use this option to change the package of ruby generated classes. Default
   * is empty. When this option is not set, the package name will be used for
   * determining the ruby package.
   */
  rubyPackage: string;
  /**
   * The parser stores options it doesn't recognize here.
   * See the documentation for the "Options" section above.
   */
  uninterpretedOption: UninterpretedOption[];
}
export interface FileOptionsProtoMsg {
  typeUrl: '/google.protobuf.FileOptions';
  value: Uint8Array;
}
export interface FileOptionsSDKType {
  java_package: string;
  java_outer_classname: string;
  java_multiple_files: boolean;
  /** @deprecated */
  java_generate_equals_and_hash: boolean;
  java_string_check_utf8: boolean;
  optimize_for: FileOptions_OptimizeMode;
  go_package: string;
  cc_generic_services: boolean;
  java_generic_services: boolean;
  py_generic_services: boolean;
  php_generic_services: boolean;
  deprecated: boolean;
  cc_enable_arenas: boolean;
  objc_class_prefix: string;
  csharp_namespace: string;
  swift_prefix: string;
  php_class_prefix: string;
  php_namespace: string;
  php_metadata_namespace: string;
  ruby_package: string;
  uninterpreted_option: UninterpretedOptionSDKType[];
}
export interface MessageOptions {
  /**
   * Set true to use the old proto1 MessageSet wire format for extensions.
   * This is provided for backwards-compatibility with the MessageSet wire
   * format.  You should not use this for any other reason:  It's less
   * efficient, has fewer features, and is more complicated.
   *
   * The message must be defined exactly as follows:
   *   message Foo {
   *     option message_set_wire_format = true;
   *     extensions 4 to max;
   *   }
   * Note that the message cannot have any defined fields; MessageSets only
   * have extensions.
   *
   * All extensions of your type must be singular messages; e.g. they cannot
   * be int32s, enums, or repeated messages.
   *
   * Because this is an option, the above two restrictions are not enforced by
   * the protocol compiler.
   */
  messageSetWireFormat: boolean;
  /**
   * Disables the generation of the standard "descriptor()" accessor, which can
   * conflict with a field of the same name.  This is meant to make migration
   * from proto1 easier; new code should avoid fields named "descriptor".
   */
  noStandardDescriptorAccessor: boolean;
  /**
   * Is this message deprecated?
   * Depending on the target platform, this can emit Deprecated annotations
   * for the message, or it will be completely ignored; in the very least,
   * this is a formalization for deprecating messages.
   */
  deprecated: boolean;
  /**
   * Whether the message is an automatically generated map entry type for the
   * maps field.
   *
   * For maps fields:
   *     map<KeyType, ValueType> map_field = 1;
   * The parsed descriptor looks like:
   *     message MapFieldEntry {
   *         option map_entry = true;
   *         optional KeyType key = 1;
   *         optional ValueType value = 2;
   *     }
   *     repeated MapFieldEntry map_field = 1;
   *
   * Implementations may choose not to generate the map_entry=true message, but
   * use a native map in the target language to hold the keys and values.
   * The reflection APIs in such implementations still need to work as
   * if the field is a repeated message field.
   *
   * NOTE: Do not set the option in .proto files. Always use the maps syntax
   * instead. The option should only be implicitly set by the proto compiler
   * parser.
   */
  mapEntry: boolean;
  /** The parser stores options it doesn't recognize here. See above. */
  uninterpretedOption: UninterpretedOption[];
}
export interface MessageOptionsProtoMsg {
  typeUrl: '/google.protobuf.MessageOptions';
  value: Uint8Array;
}
export interface MessageOptionsSDKType {
  message_set_wire_format: boolean;
  no_standard_descriptor_accessor: boolean;
  deprecated: boolean;
  map_entry: boolean;
  uninterpreted_option: UninterpretedOptionSDKType[];
}
export interface FieldOptions {
  /**
   * The ctype option instructs the C++ code generator to use a different
   * representation of the field than it normally would.  See the specific
   * options below.  This option is not yet implemented in the open source
   * release -- sorry, we'll try to include it in a future version!
   */
  ctype: FieldOptions_CType;
  /**
   * The packed option can be enabled for repeated primitive fields to enable
   * a more efficient representation on the wire. Rather than repeatedly
   * writing the tag and type for each element, the entire array is encoded as
   * a single length-delimited blob. In proto3, only explicit setting it to
   * false will avoid using packed encoding.
   */
  packed: boolean;
  /**
   * The jstype option determines the JavaScript type used for values of the
   * field.  The option is permitted only for 64 bit integral and fixed types
   * (int64, uint64, sint64, fixed64, sfixed64).  A field with jstype JS_STRING
   * is represented as JavaScript string, which avoids loss of precision that
   * can happen when a large value is converted to a floating point JavaScript.
   * Specifying JS_NUMBER for the jstype causes the generated JavaScript code to
   * use the JavaScript "number" type.  The behavior of the default option
   * JS_NORMAL is implementation dependent.
   *
   * This option is an enum to permit additional types to be added, e.g.
   * goog.math.Integer.
   */
  jstype: FieldOptions_JSType;
  /**
   * Should this field be parsed lazily?  Lazy applies only to message-type
   * fields.  It means that when the outer message is initially parsed, the
   * inner message's contents will not be parsed but instead stored in encoded
   * form.  The inner message will actually be parsed when it is first accessed.
   *
   * This is only a hint.  Implementations are free to choose whether to use
   * eager or lazy parsing regardless of the value of this option.  However,
   * setting this option true suggests that the protocol author believes that
   * using lazy parsing on this field is worth the additional bookkeeping
   * overhead typically needed to implement it.
   *
   * This option does not affect the public interface of any generated code;
   * all method signatures remain the same.  Furthermore, thread-safety of the
   * interface is not affected by this option; const methods remain safe to
   * call from multiple threads concurrently, while non-const methods continue
   * to require exclusive access.
   *
   *
   * Note that implementations may choose not to check required fields within
   * a lazy sub-message.  That is, calling IsInitialized() on the outer message
   * may return true even if the inner message has missing required fields.
   * This is necessary because otherwise the inner message would have to be
   * parsed in order to perform the check, defeating the purpose of lazy
   * parsing.  An implementation which chooses not to check required fields
   * must be consistent about it.  That is, for any particular sub-message, the
   * implementation must either *always* check its required fields, or *never*
   * check its required fields, regardless of whether or not the message has
   * been parsed.
   */
  lazy: boolean;
  /**
   * Is this field deprecated?
   * Depending on the target platform, this can emit Deprecated annotations
   * for accessors, or it will be completely ignored; in the very least, this
   * is a formalization for deprecating fields.
   */
  deprecated: boolean;
  /** For Google-internal migration only. Do not use. */
  weak: boolean;
  /** The parser stores options it doesn't recognize here. See above. */
  uninterpretedOption: UninterpretedOption[];
}
export interface FieldOptionsProtoMsg {
  typeUrl: '/google.protobuf.FieldOptions';
  value: Uint8Array;
}
export interface FieldOptionsSDKType {
  ctype: FieldOptions_CType;
  packed: boolean;
  jstype: FieldOptions_JSType;
  lazy: boolean;
  deprecated: boolean;
  weak: boolean;
  uninterpreted_option: UninterpretedOptionSDKType[];
}
export interface OneofOptions {
  /** The parser stores options it doesn't recognize here. See above. */
  uninterpretedOption: UninterpretedOption[];
}
export interface OneofOptionsProtoMsg {
  typeUrl: '/google.protobuf.OneofOptions';
  value: Uint8Array;
}
export interface OneofOptionsSDKType {
  uninterpreted_option: UninterpretedOptionSDKType[];
}
export interface EnumOptions {
  /**
   * Set this option to true to allow mapping different tag names to the same
   * value.
   */
  allowAlias: boolean;
  /**
   * Is this enum deprecated?
   * Depending on the target platform, this can emit Deprecated annotations
   * for the enum, or it will be completely ignored; in the very least, this
   * is a formalization for deprecating enums.
   */
  deprecated: boolean;
  /** The parser stores options it doesn't recognize here. See above. */
  uninterpretedOption: UninterpretedOption[];
}
export interface EnumOptionsProtoMsg {
  typeUrl: '/google.protobuf.EnumOptions';
  value: Uint8Array;
}
export interface EnumOptionsSDKType {
  allow_alias: boolean;
  deprecated: boolean;
  uninterpreted_option: UninterpretedOptionSDKType[];
}
export interface EnumValueOptions {
  /**
   * Is this enum value deprecated?
   * Depending on the target platform, this can emit Deprecated annotations
   * for the enum value, or it will be completely ignored; in the very least,
   * this is a formalization for deprecating enum values.
   */
  deprecated: boolean;
  /** The parser stores options it doesn't recognize here. See above. */
  uninterpretedOption: UninterpretedOption[];
}
export interface EnumValueOptionsProtoMsg {
  typeUrl: '/google.protobuf.EnumValueOptions';
  value: Uint8Array;
}
export interface EnumValueOptionsSDKType {
  deprecated: boolean;
  uninterpreted_option: UninterpretedOptionSDKType[];
}
export interface ServiceOptions {
  /**
   * Is this service deprecated?
   * Depending on the target platform, this can emit Deprecated annotations
   * for the service, or it will be completely ignored; in the very least,
   * this is a formalization for deprecating services.
   */
  deprecated: boolean;
  /** The parser stores options it doesn't recognize here. See above. */
  uninterpretedOption: UninterpretedOption[];
}
export interface ServiceOptionsProtoMsg {
  typeUrl: '/google.protobuf.ServiceOptions';
  value: Uint8Array;
}
export interface ServiceOptionsSDKType {
  deprecated: boolean;
  uninterpreted_option: UninterpretedOptionSDKType[];
}
export interface MethodOptions {
  /**
   * Is this method deprecated?
   * Depending on the target platform, this can emit Deprecated annotations
   * for the method, or it will be completely ignored; in the very least,
   * this is a formalization for deprecating methods.
   */
  deprecated: boolean;
  idempotencyLevel: MethodOptions_IdempotencyLevel;
  /** The parser stores options it doesn't recognize here. See above. */
  uninterpretedOption: UninterpretedOption[];
}
export interface MethodOptionsProtoMsg {
  typeUrl: '/google.protobuf.MethodOptions';
  value: Uint8Array;
}
export interface MethodOptionsSDKType {
  deprecated: boolean;
  idempotency_level: MethodOptions_IdempotencyLevel;
  uninterpreted_option: UninterpretedOptionSDKType[];
}
/**
 * A message representing a option the parser does not recognize. This only
 * appears in options protos created by the compiler::Parser class.
 * DescriptorPool resolves these when building Descriptor objects. Therefore,
 * options protos in descriptor objects (e.g. returned by Descriptor::options(),
 * or produced by Descriptor::CopyTo()) will never have UninterpretedOptions
 * in them.
 */
export interface UninterpretedOption {
  name: UninterpretedOption_NamePart[];
  /**
   * The value of the uninterpreted option, in whatever type the tokenizer
   * identified it as during parsing. Exactly one of these should be set.
   */
  identifierValue: string;
  positiveIntValue: bigint;
  negativeIntValue: bigint;
  doubleValue: number;
  stringValue: Uint8Array;
  aggregateValue: string;
}
export interface UninterpretedOptionProtoMsg {
  typeUrl: '/google.protobuf.UninterpretedOption';
  value: Uint8Array;
}
/**
 * A message representing a option the parser does not recognize. This only
 * appears in options protos created by the compiler::Parser class.
 * DescriptorPool resolves these when building Descriptor objects. Therefore,
 * options protos in descriptor objects (e.g. returned by Descriptor::options(),
 * or produced by Descriptor::CopyTo()) will never have UninterpretedOptions
 * in them.
 */
export interface UninterpretedOptionSDKType {
  name: UninterpretedOption_NamePartSDKType[];
  identifier_value: string;
  positive_int_value: bigint;
  negative_int_value: bigint;
  double_value: number;
  string_value: Uint8Array;
  aggregate_value: string;
}
/**
 * The name of the uninterpreted option.  Each string represents a segment in
 * a dot-separated name.  is_extension is true iff a segment represents an
 * extension (denoted with parentheses in options specs in .proto files).
 * E.g.,{ ["foo", false], ["bar.baz", true], ["qux", false] } represents
 * "foo.(bar.baz).qux".
 */
export interface UninterpretedOption_NamePart {
  namePart: string;
  isExtension: boolean;
}
export interface UninterpretedOption_NamePartProtoMsg {
  typeUrl: '/google.protobuf.NamePart';
  value: Uint8Array;
}
/**
 * The name of the uninterpreted option.  Each string represents a segment in
 * a dot-separated name.  is_extension is true iff a segment represents an
 * extension (denoted with parentheses in options specs in .proto files).
 * E.g.,{ ["foo", false], ["bar.baz", true], ["qux", false] } represents
 * "foo.(bar.baz).qux".
 */
export interface UninterpretedOption_NamePartSDKType {
  name_part: string;
  is_extension: boolean;
}
/**
 * Encapsulates information about the original source file from which a
 * FileDescriptorProto was generated.
 */
export interface SourceCodeInfo {
  /**
   * A Location identifies a piece of source code in a .proto file which
   * corresponds to a particular definition.  This information is intended
   * to be useful to IDEs, code indexers, documentation generators, and similar
   * tools.
   *
   * For example, say we have a file like:
   *   message Foo {
   *     optional string foo = 1;
   *   }
   * Let's look at just the field definition:
   *   optional string foo = 1;
   *   ^       ^^     ^^  ^  ^^^
   *   a       bc     de  f  ghi
   * We have the following locations:
   *   span   path               represents
   *   [a,i)  [ 4, 0, 2, 0 ]     The whole field definition.
   *   [a,b)  [ 4, 0, 2, 0, 4 ]  The label (optional).
   *   [c,d)  [ 4, 0, 2, 0, 5 ]  The type (string).
   *   [e,f)  [ 4, 0, 2, 0, 1 ]  The name (foo).
   *   [g,h)  [ 4, 0, 2, 0, 3 ]  The number (1).
   *
   * Notes:
   * - A location may refer to a repeated field itself (i.e. not to any
   *   particular index within it).  This is used whenever a set of elements are
   *   logically enclosed in a single code segment.  For example, an entire
   *   extend block (possibly containing multiple extension definitions) will
   *   have an outer location whose path refers to the "extensions" repeated
   *   field without an index.
   * - Multiple locations may have the same path.  This happens when a single
   *   logical declaration is spread out across multiple places.  The most
   *   obvious example is the "extend" block again -- there may be multiple
   *   extend blocks in the same scope, each of which will have the same path.
   * - A location's span is not always a subset of its parent's span.  For
   *   example, the "extendee" of an extension declaration appears at the
   *   beginning of the "extend" block and is shared by all extensions within
   *   the block.
   * - Just because a location's span is a subset of some other location's span
   *   does not mean that it is a descendant.  For example, a "group" defines
   *   both a type and a field in a single declaration.  Thus, the locations
   *   corresponding to the type and field and their components will overlap.
   * - Code which tries to interpret locations should probably be designed to
   *   ignore those that it doesn't understand, as more types of locations could
   *   be recorded in the future.
   */
  location: SourceCodeInfo_Location[];
}
export interface SourceCodeInfoProtoMsg {
  typeUrl: '/google.protobuf.SourceCodeInfo';
  value: Uint8Array;
}
/**
 * Encapsulates information about the original source file from which a
 * FileDescriptorProto was generated.
 */
export interface SourceCodeInfoSDKType {
  location: SourceCodeInfo_LocationSDKType[];
}
export interface SourceCodeInfo_Location {
  /**
   * Identifies which part of the FileDescriptorProto was defined at this
   * location.
   *
   * Each element is a field number or an index.  They form a path from
   * the root FileDescriptorProto to the place where the definition.  For
   * example, this path:
   *   [ 4, 3, 2, 7, 1 ]
   * refers to:
   *   file.message_type(3)  // 4, 3
   *       .field(7)         // 2, 7
   *       .name()           // 1
   * This is because FileDescriptorProto.message_type has field number 4:
   *   repeated DescriptorProto message_type = 4;
   * and DescriptorProto.field has field number 2:
   *   repeated FieldDescriptorProto field = 2;
   * and FieldDescriptorProto.name has field number 1:
   *   optional string name = 1;
   *
   * Thus, the above path gives the location of a field name.  If we removed
   * the last element:
   *   [ 4, 3, 2, 7 ]
   * this path refers to the whole field declaration (from the beginning
   * of the label to the terminating semicolon).
   */
  path: number[];
  /**
   * Always has exactly three or four elements: start line, start column,
   * end line (optional, otherwise assumed same as start line), end column.
   * These are packed into a single field for efficiency.  Note that line
   * and column numbers are zero-based -- typically you will want to add
   * 1 to each before displaying to a user.
   */
  span: number[];
  /**
   * If this SourceCodeInfo represents a complete declaration, these are any
   * comments appearing before and after the declaration which appear to be
   * attached to the declaration.
   *
   * A series of line comments appearing on consecutive lines, with no other
   * tokens appearing on those lines, will be treated as a single comment.
   *
   * leading_detached_comments will keep paragraphs of comments that appear
   * before (but not connected to) the current element. Each paragraph,
   * separated by empty lines, will be one comment element in the repeated
   * field.
   *
   * Only the comment content is provided; comment markers (e.g. //) are
   * stripped out.  For block comments, leading whitespace and an asterisk
   * will be stripped from the beginning of each line other than the first.
   * Newlines are included in the output.
   *
   * Examples:
   *
   *   optional int32 foo = 1;  // Comment attached to foo.
   *   // Comment attached to bar.
   *   optional int32 bar = 2;
   *
   *   optional string baz = 3;
   *   // Comment attached to baz.
   *   // Another line attached to baz.
   *
   *   // Comment attached to qux.
   *   //
   *   // Another line attached to qux.
   *   optional double qux = 4;
   *
   *   // Detached comment for corge. This is not leading or trailing comments
   *   // to qux or corge because there are blank lines separating it from
   *   // both.
   *
   *   // Detached comment for corge paragraph 2.
   *
   *   optional string corge = 5;
   *   /* Block comment attached
   *    * to corge.  Leading asterisks
   *    * will be removed. *\/
   *   /* Block comment attached to
   *    * grault. *\/
   *   optional int32 grault = 6;
   *
   *   // ignored detached comments.
   */
  leadingComments: string;
  trailingComments: string;
  leadingDetachedComments: string[];
}
export interface SourceCodeInfo_LocationProtoMsg {
  typeUrl: '/google.protobuf.Location';
  value: Uint8Array;
}
export interface SourceCodeInfo_LocationSDKType {
  path: number[];
  span: number[];
  leading_comments: string;
  trailing_comments: string;
  leading_detached_comments: string[];
}
/**
 * Describes the relationship between generated code and its original source
 * file. A GeneratedCodeInfo message is associated with only one generated
 * source file, but may contain references to different source .proto files.
 */
export interface GeneratedCodeInfo {
  /**
   * An Annotation connects some span of text in generated code to an element
   * of its generating .proto file.
   */
  annotation: GeneratedCodeInfo_Annotation[];
}
export interface GeneratedCodeInfoProtoMsg {
  typeUrl: '/google.protobuf.GeneratedCodeInfo';
  value: Uint8Array;
}
/**
 * Describes the relationship between generated code and its original source
 * file. A GeneratedCodeInfo message is associated with only one generated
 * source file, but may contain references to different source .proto files.
 */
export interface GeneratedCodeInfoSDKType {
  annotation: GeneratedCodeInfo_AnnotationSDKType[];
}
export interface GeneratedCodeInfo_Annotation {
  /**
   * Identifies the element in the original source .proto file. This field
   * is formatted the same as SourceCodeInfo.Location.path.
   */
  path: number[];
  /** Identifies the filesystem path to the original source .proto. */
  sourceFile: string;
  /**
   * Identifies the starting offset in bytes in the generated code
   * that relates to the identified object.
   */
  begin: number;
  /**
   * Identifies the ending offset in bytes in the generated code that
   * relates to the identified offset. The end offset should be one past
   * the last relevant byte (so the length of the text = end - begin).
   */
  end: number;
}
export interface GeneratedCodeInfo_AnnotationProtoMsg {
  typeUrl: '/google.protobuf.Annotation';
  value: Uint8Array;
}
export interface GeneratedCodeInfo_AnnotationSDKType {
  path: number[];
  source_file: string;
  begin: number;
  end: number;
}
function createBaseFileDescriptorSet(): FileDescriptorSet {
  return {
    file: [],
  };
}
export const FileDescriptorSet = {
  typeUrl: '/google.protobuf.FileDescriptorSet',
  encode(
    message: FileDescriptorSet,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.file) {
      FileDescriptorProto.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): FileDescriptorSet {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFileDescriptorSet();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.file.push(
            FileDescriptorProto.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): FileDescriptorSet {
    return {
      file: Array.isArray(object?.file)
        ? object.file.map((e: any) => FileDescriptorProto.fromJSON(e))
        : [],
    };
  },
  toJSON(message: FileDescriptorSet): JsonSafe<FileDescriptorSet> {
    const obj: any = {};
    if (message.file) {
      obj.file = message.file.map(e =>
        e ? FileDescriptorProto.toJSON(e) : undefined,
      );
    } else {
      obj.file = [];
    }
    return obj;
  },
  fromPartial(object: Partial<FileDescriptorSet>): FileDescriptorSet {
    const message = createBaseFileDescriptorSet();
    message.file =
      object.file?.map(e => FileDescriptorProto.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: FileDescriptorSetProtoMsg): FileDescriptorSet {
    return FileDescriptorSet.decode(message.value);
  },
  toProto(message: FileDescriptorSet): Uint8Array {
    return FileDescriptorSet.encode(message).finish();
  },
  toProtoMsg(message: FileDescriptorSet): FileDescriptorSetProtoMsg {
    return {
      typeUrl: '/google.protobuf.FileDescriptorSet',
      value: FileDescriptorSet.encode(message).finish(),
    };
  },
};
function createBaseFileDescriptorProto(): FileDescriptorProto {
  return {
    name: '',
    package: '',
    dependency: [],
    publicDependency: [],
    weakDependency: [],
    messageType: [],
    enumType: [],
    service: [],
    extension: [],
    options: undefined,
    sourceCodeInfo: undefined,
    syntax: '',
  };
}
export const FileDescriptorProto = {
  typeUrl: '/google.protobuf.FileDescriptorProto',
  encode(
    message: FileDescriptorProto,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    if (message.package !== '') {
      writer.uint32(18).string(message.package);
    }
    for (const v of message.dependency) {
      writer.uint32(26).string(v!);
    }
    writer.uint32(82).fork();
    for (const v of message.publicDependency) {
      writer.int32(v);
    }
    writer.ldelim();
    writer.uint32(90).fork();
    for (const v of message.weakDependency) {
      writer.int32(v);
    }
    writer.ldelim();
    for (const v of message.messageType) {
      DescriptorProto.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    for (const v of message.enumType) {
      EnumDescriptorProto.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    for (const v of message.service) {
      ServiceDescriptorProto.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    for (const v of message.extension) {
      FieldDescriptorProto.encode(v!, writer.uint32(58).fork()).ldelim();
    }
    if (message.options !== undefined) {
      FileOptions.encode(message.options, writer.uint32(66).fork()).ldelim();
    }
    if (message.sourceCodeInfo !== undefined) {
      SourceCodeInfo.encode(
        message.sourceCodeInfo,
        writer.uint32(74).fork(),
      ).ldelim();
    }
    if (message.syntax !== '') {
      writer.uint32(98).string(message.syntax);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): FileDescriptorProto {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFileDescriptorProto();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.package = reader.string();
          break;
        case 3:
          message.dependency.push(reader.string());
          break;
        case 10:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.publicDependency.push(reader.int32());
            }
          } else {
            message.publicDependency.push(reader.int32());
          }
          break;
        case 11:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.weakDependency.push(reader.int32());
            }
          } else {
            message.weakDependency.push(reader.int32());
          }
          break;
        case 4:
          message.messageType.push(
            DescriptorProto.decode(reader, reader.uint32()),
          );
          break;
        case 5:
          message.enumType.push(
            EnumDescriptorProto.decode(reader, reader.uint32()),
          );
          break;
        case 6:
          message.service.push(
            ServiceDescriptorProto.decode(reader, reader.uint32()),
          );
          break;
        case 7:
          message.extension.push(
            FieldDescriptorProto.decode(reader, reader.uint32()),
          );
          break;
        case 8:
          message.options = FileOptions.decode(reader, reader.uint32());
          break;
        case 9:
          message.sourceCodeInfo = SourceCodeInfo.decode(
            reader,
            reader.uint32(),
          );
          break;
        case 12:
          message.syntax = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): FileDescriptorProto {
    return {
      name: isSet(object.name) ? String(object.name) : '',
      package: isSet(object.package) ? String(object.package) : '',
      dependency: Array.isArray(object?.dependency)
        ? object.dependency.map((e: any) => String(e))
        : [],
      publicDependency: Array.isArray(object?.publicDependency)
        ? object.publicDependency.map((e: any) => Number(e))
        : [],
      weakDependency: Array.isArray(object?.weakDependency)
        ? object.weakDependency.map((e: any) => Number(e))
        : [],
      messageType: Array.isArray(object?.messageType)
        ? object.messageType.map((e: any) => DescriptorProto.fromJSON(e))
        : [],
      enumType: Array.isArray(object?.enumType)
        ? object.enumType.map((e: any) => EnumDescriptorProto.fromJSON(e))
        : [],
      service: Array.isArray(object?.service)
        ? object.service.map((e: any) => ServiceDescriptorProto.fromJSON(e))
        : [],
      extension: Array.isArray(object?.extension)
        ? object.extension.map((e: any) => FieldDescriptorProto.fromJSON(e))
        : [],
      options: isSet(object.options)
        ? FileOptions.fromJSON(object.options)
        : undefined,
      sourceCodeInfo: isSet(object.sourceCodeInfo)
        ? SourceCodeInfo.fromJSON(object.sourceCodeInfo)
        : undefined,
      syntax: isSet(object.syntax) ? String(object.syntax) : '',
    };
  },
  toJSON(message: FileDescriptorProto): JsonSafe<FileDescriptorProto> {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    message.package !== undefined && (obj.package = message.package);
    if (message.dependency) {
      obj.dependency = message.dependency.map(e => e);
    } else {
      obj.dependency = [];
    }
    if (message.publicDependency) {
      obj.publicDependency = message.publicDependency.map(e => Math.round(e));
    } else {
      obj.publicDependency = [];
    }
    if (message.weakDependency) {
      obj.weakDependency = message.weakDependency.map(e => Math.round(e));
    } else {
      obj.weakDependency = [];
    }
    if (message.messageType) {
      obj.messageType = message.messageType.map(e =>
        e ? DescriptorProto.toJSON(e) : undefined,
      );
    } else {
      obj.messageType = [];
    }
    if (message.enumType) {
      obj.enumType = message.enumType.map(e =>
        e ? EnumDescriptorProto.toJSON(e) : undefined,
      );
    } else {
      obj.enumType = [];
    }
    if (message.service) {
      obj.service = message.service.map(e =>
        e ? ServiceDescriptorProto.toJSON(e) : undefined,
      );
    } else {
      obj.service = [];
    }
    if (message.extension) {
      obj.extension = message.extension.map(e =>
        e ? FieldDescriptorProto.toJSON(e) : undefined,
      );
    } else {
      obj.extension = [];
    }
    message.options !== undefined &&
      (obj.options = message.options
        ? FileOptions.toJSON(message.options)
        : undefined);
    message.sourceCodeInfo !== undefined &&
      (obj.sourceCodeInfo = message.sourceCodeInfo
        ? SourceCodeInfo.toJSON(message.sourceCodeInfo)
        : undefined);
    message.syntax !== undefined && (obj.syntax = message.syntax);
    return obj;
  },
  fromPartial(object: Partial<FileDescriptorProto>): FileDescriptorProto {
    const message = createBaseFileDescriptorProto();
    message.name = object.name ?? '';
    message.package = object.package ?? '';
    message.dependency = object.dependency?.map(e => e) || [];
    message.publicDependency = object.publicDependency?.map(e => e) || [];
    message.weakDependency = object.weakDependency?.map(e => e) || [];
    message.messageType =
      object.messageType?.map(e => DescriptorProto.fromPartial(e)) || [];
    message.enumType =
      object.enumType?.map(e => EnumDescriptorProto.fromPartial(e)) || [];
    message.service =
      object.service?.map(e => ServiceDescriptorProto.fromPartial(e)) || [];
    message.extension =
      object.extension?.map(e => FieldDescriptorProto.fromPartial(e)) || [];
    message.options =
      object.options !== undefined && object.options !== null
        ? FileOptions.fromPartial(object.options)
        : undefined;
    message.sourceCodeInfo =
      object.sourceCodeInfo !== undefined && object.sourceCodeInfo !== null
        ? SourceCodeInfo.fromPartial(object.sourceCodeInfo)
        : undefined;
    message.syntax = object.syntax ?? '';
    return message;
  },
  fromProtoMsg(message: FileDescriptorProtoProtoMsg): FileDescriptorProto {
    return FileDescriptorProto.decode(message.value);
  },
  toProto(message: FileDescriptorProto): Uint8Array {
    return FileDescriptorProto.encode(message).finish();
  },
  toProtoMsg(message: FileDescriptorProto): FileDescriptorProtoProtoMsg {
    return {
      typeUrl: '/google.protobuf.FileDescriptorProto',
      value: FileDescriptorProto.encode(message).finish(),
    };
  },
};
function createBaseDescriptorProto(): DescriptorProto {
  return {
    name: '',
    field: [],
    extension: [],
    nestedType: [],
    enumType: [],
    extensionRange: [],
    oneofDecl: [],
    options: undefined,
    reservedRange: [],
    reservedName: [],
  };
}
export const DescriptorProto = {
  typeUrl: '/google.protobuf.DescriptorProto',
  encode(
    message: DescriptorProto,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    for (const v of message.field) {
      FieldDescriptorProto.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.extension) {
      FieldDescriptorProto.encode(v!, writer.uint32(50).fork()).ldelim();
    }
    for (const v of message.nestedType) {
      DescriptorProto.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.enumType) {
      EnumDescriptorProto.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    for (const v of message.extensionRange) {
      DescriptorProto_ExtensionRange.encode(
        v!,
        writer.uint32(42).fork(),
      ).ldelim();
    }
    for (const v of message.oneofDecl) {
      OneofDescriptorProto.encode(v!, writer.uint32(66).fork()).ldelim();
    }
    if (message.options !== undefined) {
      MessageOptions.encode(message.options, writer.uint32(58).fork()).ldelim();
    }
    for (const v of message.reservedRange) {
      DescriptorProto_ReservedRange.encode(
        v!,
        writer.uint32(74).fork(),
      ).ldelim();
    }
    for (const v of message.reservedName) {
      writer.uint32(82).string(v!);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): DescriptorProto {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDescriptorProto();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.field.push(
            FieldDescriptorProto.decode(reader, reader.uint32()),
          );
          break;
        case 6:
          message.extension.push(
            FieldDescriptorProto.decode(reader, reader.uint32()),
          );
          break;
        case 3:
          message.nestedType.push(
            DescriptorProto.decode(reader, reader.uint32()),
          );
          break;
        case 4:
          message.enumType.push(
            EnumDescriptorProto.decode(reader, reader.uint32()),
          );
          break;
        case 5:
          message.extensionRange.push(
            DescriptorProto_ExtensionRange.decode(reader, reader.uint32()),
          );
          break;
        case 8:
          message.oneofDecl.push(
            OneofDescriptorProto.decode(reader, reader.uint32()),
          );
          break;
        case 7:
          message.options = MessageOptions.decode(reader, reader.uint32());
          break;
        case 9:
          message.reservedRange.push(
            DescriptorProto_ReservedRange.decode(reader, reader.uint32()),
          );
          break;
        case 10:
          message.reservedName.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DescriptorProto {
    return {
      name: isSet(object.name) ? String(object.name) : '',
      field: Array.isArray(object?.field)
        ? object.field.map((e: any) => FieldDescriptorProto.fromJSON(e))
        : [],
      extension: Array.isArray(object?.extension)
        ? object.extension.map((e: any) => FieldDescriptorProto.fromJSON(e))
        : [],
      nestedType: Array.isArray(object?.nestedType)
        ? object.nestedType.map((e: any) => DescriptorProto.fromJSON(e))
        : [],
      enumType: Array.isArray(object?.enumType)
        ? object.enumType.map((e: any) => EnumDescriptorProto.fromJSON(e))
        : [],
      extensionRange: Array.isArray(object?.extensionRange)
        ? object.extensionRange.map((e: any) =>
            DescriptorProto_ExtensionRange.fromJSON(e),
          )
        : [],
      oneofDecl: Array.isArray(object?.oneofDecl)
        ? object.oneofDecl.map((e: any) => OneofDescriptorProto.fromJSON(e))
        : [],
      options: isSet(object.options)
        ? MessageOptions.fromJSON(object.options)
        : undefined,
      reservedRange: Array.isArray(object?.reservedRange)
        ? object.reservedRange.map((e: any) =>
            DescriptorProto_ReservedRange.fromJSON(e),
          )
        : [],
      reservedName: Array.isArray(object?.reservedName)
        ? object.reservedName.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: DescriptorProto): JsonSafe<DescriptorProto> {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    if (message.field) {
      obj.field = message.field.map(e =>
        e ? FieldDescriptorProto.toJSON(e) : undefined,
      );
    } else {
      obj.field = [];
    }
    if (message.extension) {
      obj.extension = message.extension.map(e =>
        e ? FieldDescriptorProto.toJSON(e) : undefined,
      );
    } else {
      obj.extension = [];
    }
    if (message.nestedType) {
      obj.nestedType = message.nestedType.map(e =>
        e ? DescriptorProto.toJSON(e) : undefined,
      );
    } else {
      obj.nestedType = [];
    }
    if (message.enumType) {
      obj.enumType = message.enumType.map(e =>
        e ? EnumDescriptorProto.toJSON(e) : undefined,
      );
    } else {
      obj.enumType = [];
    }
    if (message.extensionRange) {
      obj.extensionRange = message.extensionRange.map(e =>
        e ? DescriptorProto_ExtensionRange.toJSON(e) : undefined,
      );
    } else {
      obj.extensionRange = [];
    }
    if (message.oneofDecl) {
      obj.oneofDecl = message.oneofDecl.map(e =>
        e ? OneofDescriptorProto.toJSON(e) : undefined,
      );
    } else {
      obj.oneofDecl = [];
    }
    message.options !== undefined &&
      (obj.options = message.options
        ? MessageOptions.toJSON(message.options)
        : undefined);
    if (message.reservedRange) {
      obj.reservedRange = message.reservedRange.map(e =>
        e ? DescriptorProto_ReservedRange.toJSON(e) : undefined,
      );
    } else {
      obj.reservedRange = [];
    }
    if (message.reservedName) {
      obj.reservedName = message.reservedName.map(e => e);
    } else {
      obj.reservedName = [];
    }
    return obj;
  },
  fromPartial(object: Partial<DescriptorProto>): DescriptorProto {
    const message = createBaseDescriptorProto();
    message.name = object.name ?? '';
    message.field =
      object.field?.map(e => FieldDescriptorProto.fromPartial(e)) || [];
    message.extension =
      object.extension?.map(e => FieldDescriptorProto.fromPartial(e)) || [];
    message.nestedType =
      object.nestedType?.map(e => DescriptorProto.fromPartial(e)) || [];
    message.enumType =
      object.enumType?.map(e => EnumDescriptorProto.fromPartial(e)) || [];
    message.extensionRange =
      object.extensionRange?.map(e =>
        DescriptorProto_ExtensionRange.fromPartial(e),
      ) || [];
    message.oneofDecl =
      object.oneofDecl?.map(e => OneofDescriptorProto.fromPartial(e)) || [];
    message.options =
      object.options !== undefined && object.options !== null
        ? MessageOptions.fromPartial(object.options)
        : undefined;
    message.reservedRange =
      object.reservedRange?.map(e =>
        DescriptorProto_ReservedRange.fromPartial(e),
      ) || [];
    message.reservedName = object.reservedName?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: DescriptorProtoProtoMsg): DescriptorProto {
    return DescriptorProto.decode(message.value);
  },
  toProto(message: DescriptorProto): Uint8Array {
    return DescriptorProto.encode(message).finish();
  },
  toProtoMsg(message: DescriptorProto): DescriptorProtoProtoMsg {
    return {
      typeUrl: '/google.protobuf.DescriptorProto',
      value: DescriptorProto.encode(message).finish(),
    };
  },
};
function createBaseDescriptorProto_ExtensionRange(): DescriptorProto_ExtensionRange {
  return {
    start: 0,
    end: 0,
    options: undefined,
  };
}
export const DescriptorProto_ExtensionRange = {
  typeUrl: '/google.protobuf.ExtensionRange',
  encode(
    message: DescriptorProto_ExtensionRange,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.start !== 0) {
      writer.uint32(8).int32(message.start);
    }
    if (message.end !== 0) {
      writer.uint32(16).int32(message.end);
    }
    if (message.options !== undefined) {
      ExtensionRangeOptions.encode(
        message.options,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): DescriptorProto_ExtensionRange {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDescriptorProto_ExtensionRange();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.start = reader.int32();
          break;
        case 2:
          message.end = reader.int32();
          break;
        case 3:
          message.options = ExtensionRangeOptions.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DescriptorProto_ExtensionRange {
    return {
      start: isSet(object.start) ? Number(object.start) : 0,
      end: isSet(object.end) ? Number(object.end) : 0,
      options: isSet(object.options)
        ? ExtensionRangeOptions.fromJSON(object.options)
        : undefined,
    };
  },
  toJSON(
    message: DescriptorProto_ExtensionRange,
  ): JsonSafe<DescriptorProto_ExtensionRange> {
    const obj: any = {};
    message.start !== undefined && (obj.start = Math.round(message.start));
    message.end !== undefined && (obj.end = Math.round(message.end));
    message.options !== undefined &&
      (obj.options = message.options
        ? ExtensionRangeOptions.toJSON(message.options)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<DescriptorProto_ExtensionRange>,
  ): DescriptorProto_ExtensionRange {
    const message = createBaseDescriptorProto_ExtensionRange();
    message.start = object.start ?? 0;
    message.end = object.end ?? 0;
    message.options =
      object.options !== undefined && object.options !== null
        ? ExtensionRangeOptions.fromPartial(object.options)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: DescriptorProto_ExtensionRangeProtoMsg,
  ): DescriptorProto_ExtensionRange {
    return DescriptorProto_ExtensionRange.decode(message.value);
  },
  toProto(message: DescriptorProto_ExtensionRange): Uint8Array {
    return DescriptorProto_ExtensionRange.encode(message).finish();
  },
  toProtoMsg(
    message: DescriptorProto_ExtensionRange,
  ): DescriptorProto_ExtensionRangeProtoMsg {
    return {
      typeUrl: '/google.protobuf.ExtensionRange',
      value: DescriptorProto_ExtensionRange.encode(message).finish(),
    };
  },
};
function createBaseDescriptorProto_ReservedRange(): DescriptorProto_ReservedRange {
  return {
    start: 0,
    end: 0,
  };
}
export const DescriptorProto_ReservedRange = {
  typeUrl: '/google.protobuf.ReservedRange',
  encode(
    message: DescriptorProto_ReservedRange,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.start !== 0) {
      writer.uint32(8).int32(message.start);
    }
    if (message.end !== 0) {
      writer.uint32(16).int32(message.end);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): DescriptorProto_ReservedRange {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDescriptorProto_ReservedRange();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.start = reader.int32();
          break;
        case 2:
          message.end = reader.int32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DescriptorProto_ReservedRange {
    return {
      start: isSet(object.start) ? Number(object.start) : 0,
      end: isSet(object.end) ? Number(object.end) : 0,
    };
  },
  toJSON(
    message: DescriptorProto_ReservedRange,
  ): JsonSafe<DescriptorProto_ReservedRange> {
    const obj: any = {};
    message.start !== undefined && (obj.start = Math.round(message.start));
    message.end !== undefined && (obj.end = Math.round(message.end));
    return obj;
  },
  fromPartial(
    object: Partial<DescriptorProto_ReservedRange>,
  ): DescriptorProto_ReservedRange {
    const message = createBaseDescriptorProto_ReservedRange();
    message.start = object.start ?? 0;
    message.end = object.end ?? 0;
    return message;
  },
  fromProtoMsg(
    message: DescriptorProto_ReservedRangeProtoMsg,
  ): DescriptorProto_ReservedRange {
    return DescriptorProto_ReservedRange.decode(message.value);
  },
  toProto(message: DescriptorProto_ReservedRange): Uint8Array {
    return DescriptorProto_ReservedRange.encode(message).finish();
  },
  toProtoMsg(
    message: DescriptorProto_ReservedRange,
  ): DescriptorProto_ReservedRangeProtoMsg {
    return {
      typeUrl: '/google.protobuf.ReservedRange',
      value: DescriptorProto_ReservedRange.encode(message).finish(),
    };
  },
};
function createBaseExtensionRangeOptions(): ExtensionRangeOptions {
  return {
    uninterpretedOption: [],
  };
}
export const ExtensionRangeOptions = {
  typeUrl: '/google.protobuf.ExtensionRangeOptions',
  encode(
    message: ExtensionRangeOptions,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.uninterpretedOption) {
      UninterpretedOption.encode(v!, writer.uint32(7994).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ExtensionRangeOptions {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseExtensionRangeOptions();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 999:
          message.uninterpretedOption.push(
            UninterpretedOption.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ExtensionRangeOptions {
    return {
      uninterpretedOption: Array.isArray(object?.uninterpretedOption)
        ? object.uninterpretedOption.map((e: any) =>
            UninterpretedOption.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: ExtensionRangeOptions): JsonSafe<ExtensionRangeOptions> {
    const obj: any = {};
    if (message.uninterpretedOption) {
      obj.uninterpretedOption = message.uninterpretedOption.map(e =>
        e ? UninterpretedOption.toJSON(e) : undefined,
      );
    } else {
      obj.uninterpretedOption = [];
    }
    return obj;
  },
  fromPartial(object: Partial<ExtensionRangeOptions>): ExtensionRangeOptions {
    const message = createBaseExtensionRangeOptions();
    message.uninterpretedOption =
      object.uninterpretedOption?.map(e =>
        UninterpretedOption.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(message: ExtensionRangeOptionsProtoMsg): ExtensionRangeOptions {
    return ExtensionRangeOptions.decode(message.value);
  },
  toProto(message: ExtensionRangeOptions): Uint8Array {
    return ExtensionRangeOptions.encode(message).finish();
  },
  toProtoMsg(message: ExtensionRangeOptions): ExtensionRangeOptionsProtoMsg {
    return {
      typeUrl: '/google.protobuf.ExtensionRangeOptions',
      value: ExtensionRangeOptions.encode(message).finish(),
    };
  },
};
function createBaseFieldDescriptorProto(): FieldDescriptorProto {
  return {
    name: '',
    number: 0,
    label: 1,
    type: 1,
    typeName: '',
    extendee: '',
    defaultValue: '',
    oneofIndex: 0,
    jsonName: '',
    options: undefined,
  };
}
export const FieldDescriptorProto = {
  typeUrl: '/google.protobuf.FieldDescriptorProto',
  encode(
    message: FieldDescriptorProto,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    if (message.number !== 0) {
      writer.uint32(24).int32(message.number);
    }
    if (message.label !== 1) {
      writer.uint32(32).int32(message.label);
    }
    if (message.type !== 1) {
      writer.uint32(40).int32(message.type);
    }
    if (message.typeName !== '') {
      writer.uint32(50).string(message.typeName);
    }
    if (message.extendee !== '') {
      writer.uint32(18).string(message.extendee);
    }
    if (message.defaultValue !== '') {
      writer.uint32(58).string(message.defaultValue);
    }
    if (message.oneofIndex !== 0) {
      writer.uint32(72).int32(message.oneofIndex);
    }
    if (message.jsonName !== '') {
      writer.uint32(82).string(message.jsonName);
    }
    if (message.options !== undefined) {
      FieldOptions.encode(message.options, writer.uint32(66).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): FieldDescriptorProto {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFieldDescriptorProto();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 3:
          message.number = reader.int32();
          break;
        case 4:
          message.label = reader.int32() as any;
          break;
        case 5:
          message.type = reader.int32() as any;
          break;
        case 6:
          message.typeName = reader.string();
          break;
        case 2:
          message.extendee = reader.string();
          break;
        case 7:
          message.defaultValue = reader.string();
          break;
        case 9:
          message.oneofIndex = reader.int32();
          break;
        case 10:
          message.jsonName = reader.string();
          break;
        case 8:
          message.options = FieldOptions.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): FieldDescriptorProto {
    return {
      name: isSet(object.name) ? String(object.name) : '',
      number: isSet(object.number) ? Number(object.number) : 0,
      label: isSet(object.label)
        ? fieldDescriptorProto_LabelFromJSON(object.label)
        : -1,
      type: isSet(object.type)
        ? fieldDescriptorProto_TypeFromJSON(object.type)
        : -1,
      typeName: isSet(object.typeName) ? String(object.typeName) : '',
      extendee: isSet(object.extendee) ? String(object.extendee) : '',
      defaultValue: isSet(object.defaultValue)
        ? String(object.defaultValue)
        : '',
      oneofIndex: isSet(object.oneofIndex) ? Number(object.oneofIndex) : 0,
      jsonName: isSet(object.jsonName) ? String(object.jsonName) : '',
      options: isSet(object.options)
        ? FieldOptions.fromJSON(object.options)
        : undefined,
    };
  },
  toJSON(message: FieldDescriptorProto): JsonSafe<FieldDescriptorProto> {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    message.number !== undefined && (obj.number = Math.round(message.number));
    message.label !== undefined &&
      (obj.label = fieldDescriptorProto_LabelToJSON(message.label));
    message.type !== undefined &&
      (obj.type = fieldDescriptorProto_TypeToJSON(message.type));
    message.typeName !== undefined && (obj.typeName = message.typeName);
    message.extendee !== undefined && (obj.extendee = message.extendee);
    message.defaultValue !== undefined &&
      (obj.defaultValue = message.defaultValue);
    message.oneofIndex !== undefined &&
      (obj.oneofIndex = Math.round(message.oneofIndex));
    message.jsonName !== undefined && (obj.jsonName = message.jsonName);
    message.options !== undefined &&
      (obj.options = message.options
        ? FieldOptions.toJSON(message.options)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<FieldDescriptorProto>): FieldDescriptorProto {
    const message = createBaseFieldDescriptorProto();
    message.name = object.name ?? '';
    message.number = object.number ?? 0;
    message.label = object.label ?? 1;
    message.type = object.type ?? 1;
    message.typeName = object.typeName ?? '';
    message.extendee = object.extendee ?? '';
    message.defaultValue = object.defaultValue ?? '';
    message.oneofIndex = object.oneofIndex ?? 0;
    message.jsonName = object.jsonName ?? '';
    message.options =
      object.options !== undefined && object.options !== null
        ? FieldOptions.fromPartial(object.options)
        : undefined;
    return message;
  },
  fromProtoMsg(message: FieldDescriptorProtoProtoMsg): FieldDescriptorProto {
    return FieldDescriptorProto.decode(message.value);
  },
  toProto(message: FieldDescriptorProto): Uint8Array {
    return FieldDescriptorProto.encode(message).finish();
  },
  toProtoMsg(message: FieldDescriptorProto): FieldDescriptorProtoProtoMsg {
    return {
      typeUrl: '/google.protobuf.FieldDescriptorProto',
      value: FieldDescriptorProto.encode(message).finish(),
    };
  },
};
function createBaseOneofDescriptorProto(): OneofDescriptorProto {
  return {
    name: '',
    options: undefined,
  };
}
export const OneofDescriptorProto = {
  typeUrl: '/google.protobuf.OneofDescriptorProto',
  encode(
    message: OneofDescriptorProto,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    if (message.options !== undefined) {
      OneofOptions.encode(message.options, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): OneofDescriptorProto {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOneofDescriptorProto();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.options = OneofOptions.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): OneofDescriptorProto {
    return {
      name: isSet(object.name) ? String(object.name) : '',
      options: isSet(object.options)
        ? OneofOptions.fromJSON(object.options)
        : undefined,
    };
  },
  toJSON(message: OneofDescriptorProto): JsonSafe<OneofDescriptorProto> {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    message.options !== undefined &&
      (obj.options = message.options
        ? OneofOptions.toJSON(message.options)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<OneofDescriptorProto>): OneofDescriptorProto {
    const message = createBaseOneofDescriptorProto();
    message.name = object.name ?? '';
    message.options =
      object.options !== undefined && object.options !== null
        ? OneofOptions.fromPartial(object.options)
        : undefined;
    return message;
  },
  fromProtoMsg(message: OneofDescriptorProtoProtoMsg): OneofDescriptorProto {
    return OneofDescriptorProto.decode(message.value);
  },
  toProto(message: OneofDescriptorProto): Uint8Array {
    return OneofDescriptorProto.encode(message).finish();
  },
  toProtoMsg(message: OneofDescriptorProto): OneofDescriptorProtoProtoMsg {
    return {
      typeUrl: '/google.protobuf.OneofDescriptorProto',
      value: OneofDescriptorProto.encode(message).finish(),
    };
  },
};
function createBaseEnumDescriptorProto(): EnumDescriptorProto {
  return {
    name: '',
    value: [],
    options: undefined,
    reservedRange: [],
    reservedName: [],
  };
}
export const EnumDescriptorProto = {
  typeUrl: '/google.protobuf.EnumDescriptorProto',
  encode(
    message: EnumDescriptorProto,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    for (const v of message.value) {
      EnumValueDescriptorProto.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.options !== undefined) {
      EnumOptions.encode(message.options, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.reservedRange) {
      EnumDescriptorProto_EnumReservedRange.encode(
        v!,
        writer.uint32(34).fork(),
      ).ldelim();
    }
    for (const v of message.reservedName) {
      writer.uint32(42).string(v!);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): EnumDescriptorProto {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEnumDescriptorProto();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.value.push(
            EnumValueDescriptorProto.decode(reader, reader.uint32()),
          );
          break;
        case 3:
          message.options = EnumOptions.decode(reader, reader.uint32());
          break;
        case 4:
          message.reservedRange.push(
            EnumDescriptorProto_EnumReservedRange.decode(
              reader,
              reader.uint32(),
            ),
          );
          break;
        case 5:
          message.reservedName.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EnumDescriptorProto {
    return {
      name: isSet(object.name) ? String(object.name) : '',
      value: Array.isArray(object?.value)
        ? object.value.map((e: any) => EnumValueDescriptorProto.fromJSON(e))
        : [],
      options: isSet(object.options)
        ? EnumOptions.fromJSON(object.options)
        : undefined,
      reservedRange: Array.isArray(object?.reservedRange)
        ? object.reservedRange.map((e: any) =>
            EnumDescriptorProto_EnumReservedRange.fromJSON(e),
          )
        : [],
      reservedName: Array.isArray(object?.reservedName)
        ? object.reservedName.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: EnumDescriptorProto): JsonSafe<EnumDescriptorProto> {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    if (message.value) {
      obj.value = message.value.map(e =>
        e ? EnumValueDescriptorProto.toJSON(e) : undefined,
      );
    } else {
      obj.value = [];
    }
    message.options !== undefined &&
      (obj.options = message.options
        ? EnumOptions.toJSON(message.options)
        : undefined);
    if (message.reservedRange) {
      obj.reservedRange = message.reservedRange.map(e =>
        e ? EnumDescriptorProto_EnumReservedRange.toJSON(e) : undefined,
      );
    } else {
      obj.reservedRange = [];
    }
    if (message.reservedName) {
      obj.reservedName = message.reservedName.map(e => e);
    } else {
      obj.reservedName = [];
    }
    return obj;
  },
  fromPartial(object: Partial<EnumDescriptorProto>): EnumDescriptorProto {
    const message = createBaseEnumDescriptorProto();
    message.name = object.name ?? '';
    message.value =
      object.value?.map(e => EnumValueDescriptorProto.fromPartial(e)) || [];
    message.options =
      object.options !== undefined && object.options !== null
        ? EnumOptions.fromPartial(object.options)
        : undefined;
    message.reservedRange =
      object.reservedRange?.map(e =>
        EnumDescriptorProto_EnumReservedRange.fromPartial(e),
      ) || [];
    message.reservedName = object.reservedName?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: EnumDescriptorProtoProtoMsg): EnumDescriptorProto {
    return EnumDescriptorProto.decode(message.value);
  },
  toProto(message: EnumDescriptorProto): Uint8Array {
    return EnumDescriptorProto.encode(message).finish();
  },
  toProtoMsg(message: EnumDescriptorProto): EnumDescriptorProtoProtoMsg {
    return {
      typeUrl: '/google.protobuf.EnumDescriptorProto',
      value: EnumDescriptorProto.encode(message).finish(),
    };
  },
};
function createBaseEnumDescriptorProto_EnumReservedRange(): EnumDescriptorProto_EnumReservedRange {
  return {
    start: 0,
    end: 0,
  };
}
export const EnumDescriptorProto_EnumReservedRange = {
  typeUrl: '/google.protobuf.EnumReservedRange',
  encode(
    message: EnumDescriptorProto_EnumReservedRange,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.start !== 0) {
      writer.uint32(8).int32(message.start);
    }
    if (message.end !== 0) {
      writer.uint32(16).int32(message.end);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): EnumDescriptorProto_EnumReservedRange {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEnumDescriptorProto_EnumReservedRange();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.start = reader.int32();
          break;
        case 2:
          message.end = reader.int32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EnumDescriptorProto_EnumReservedRange {
    return {
      start: isSet(object.start) ? Number(object.start) : 0,
      end: isSet(object.end) ? Number(object.end) : 0,
    };
  },
  toJSON(
    message: EnumDescriptorProto_EnumReservedRange,
  ): JsonSafe<EnumDescriptorProto_EnumReservedRange> {
    const obj: any = {};
    message.start !== undefined && (obj.start = Math.round(message.start));
    message.end !== undefined && (obj.end = Math.round(message.end));
    return obj;
  },
  fromPartial(
    object: Partial<EnumDescriptorProto_EnumReservedRange>,
  ): EnumDescriptorProto_EnumReservedRange {
    const message = createBaseEnumDescriptorProto_EnumReservedRange();
    message.start = object.start ?? 0;
    message.end = object.end ?? 0;
    return message;
  },
  fromProtoMsg(
    message: EnumDescriptorProto_EnumReservedRangeProtoMsg,
  ): EnumDescriptorProto_EnumReservedRange {
    return EnumDescriptorProto_EnumReservedRange.decode(message.value);
  },
  toProto(message: EnumDescriptorProto_EnumReservedRange): Uint8Array {
    return EnumDescriptorProto_EnumReservedRange.encode(message).finish();
  },
  toProtoMsg(
    message: EnumDescriptorProto_EnumReservedRange,
  ): EnumDescriptorProto_EnumReservedRangeProtoMsg {
    return {
      typeUrl: '/google.protobuf.EnumReservedRange',
      value: EnumDescriptorProto_EnumReservedRange.encode(message).finish(),
    };
  },
};
function createBaseEnumValueDescriptorProto(): EnumValueDescriptorProto {
  return {
    name: '',
    number: 0,
    options: undefined,
  };
}
export const EnumValueDescriptorProto = {
  typeUrl: '/google.protobuf.EnumValueDescriptorProto',
  encode(
    message: EnumValueDescriptorProto,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    if (message.number !== 0) {
      writer.uint32(16).int32(message.number);
    }
    if (message.options !== undefined) {
      EnumValueOptions.encode(
        message.options,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): EnumValueDescriptorProto {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEnumValueDescriptorProto();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.number = reader.int32();
          break;
        case 3:
          message.options = EnumValueOptions.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EnumValueDescriptorProto {
    return {
      name: isSet(object.name) ? String(object.name) : '',
      number: isSet(object.number) ? Number(object.number) : 0,
      options: isSet(object.options)
        ? EnumValueOptions.fromJSON(object.options)
        : undefined,
    };
  },
  toJSON(
    message: EnumValueDescriptorProto,
  ): JsonSafe<EnumValueDescriptorProto> {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    message.number !== undefined && (obj.number = Math.round(message.number));
    message.options !== undefined &&
      (obj.options = message.options
        ? EnumValueOptions.toJSON(message.options)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<EnumValueDescriptorProto>,
  ): EnumValueDescriptorProto {
    const message = createBaseEnumValueDescriptorProto();
    message.name = object.name ?? '';
    message.number = object.number ?? 0;
    message.options =
      object.options !== undefined && object.options !== null
        ? EnumValueOptions.fromPartial(object.options)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: EnumValueDescriptorProtoProtoMsg,
  ): EnumValueDescriptorProto {
    return EnumValueDescriptorProto.decode(message.value);
  },
  toProto(message: EnumValueDescriptorProto): Uint8Array {
    return EnumValueDescriptorProto.encode(message).finish();
  },
  toProtoMsg(
    message: EnumValueDescriptorProto,
  ): EnumValueDescriptorProtoProtoMsg {
    return {
      typeUrl: '/google.protobuf.EnumValueDescriptorProto',
      value: EnumValueDescriptorProto.encode(message).finish(),
    };
  },
};
function createBaseServiceDescriptorProto(): ServiceDescriptorProto {
  return {
    name: '',
    method: [],
    options: undefined,
  };
}
export const ServiceDescriptorProto = {
  typeUrl: '/google.protobuf.ServiceDescriptorProto',
  encode(
    message: ServiceDescriptorProto,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    for (const v of message.method) {
      MethodDescriptorProto.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.options !== undefined) {
      ServiceOptions.encode(message.options, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): ServiceDescriptorProto {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseServiceDescriptorProto();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.method.push(
            MethodDescriptorProto.decode(reader, reader.uint32()),
          );
          break;
        case 3:
          message.options = ServiceOptions.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ServiceDescriptorProto {
    return {
      name: isSet(object.name) ? String(object.name) : '',
      method: Array.isArray(object?.method)
        ? object.method.map((e: any) => MethodDescriptorProto.fromJSON(e))
        : [],
      options: isSet(object.options)
        ? ServiceOptions.fromJSON(object.options)
        : undefined,
    };
  },
  toJSON(message: ServiceDescriptorProto): JsonSafe<ServiceDescriptorProto> {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    if (message.method) {
      obj.method = message.method.map(e =>
        e ? MethodDescriptorProto.toJSON(e) : undefined,
      );
    } else {
      obj.method = [];
    }
    message.options !== undefined &&
      (obj.options = message.options
        ? ServiceOptions.toJSON(message.options)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<ServiceDescriptorProto>): ServiceDescriptorProto {
    const message = createBaseServiceDescriptorProto();
    message.name = object.name ?? '';
    message.method =
      object.method?.map(e => MethodDescriptorProto.fromPartial(e)) || [];
    message.options =
      object.options !== undefined && object.options !== null
        ? ServiceOptions.fromPartial(object.options)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: ServiceDescriptorProtoProtoMsg,
  ): ServiceDescriptorProto {
    return ServiceDescriptorProto.decode(message.value);
  },
  toProto(message: ServiceDescriptorProto): Uint8Array {
    return ServiceDescriptorProto.encode(message).finish();
  },
  toProtoMsg(message: ServiceDescriptorProto): ServiceDescriptorProtoProtoMsg {
    return {
      typeUrl: '/google.protobuf.ServiceDescriptorProto',
      value: ServiceDescriptorProto.encode(message).finish(),
    };
  },
};
function createBaseMethodDescriptorProto(): MethodDescriptorProto {
  return {
    name: '',
    inputType: '',
    outputType: '',
    options: undefined,
    clientStreaming: false,
    serverStreaming: false,
  };
}
export const MethodDescriptorProto = {
  typeUrl: '/google.protobuf.MethodDescriptorProto',
  encode(
    message: MethodDescriptorProto,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.name !== '') {
      writer.uint32(10).string(message.name);
    }
    if (message.inputType !== '') {
      writer.uint32(18).string(message.inputType);
    }
    if (message.outputType !== '') {
      writer.uint32(26).string(message.outputType);
    }
    if (message.options !== undefined) {
      MethodOptions.encode(message.options, writer.uint32(34).fork()).ldelim();
    }
    if (message.clientStreaming === true) {
      writer.uint32(40).bool(message.clientStreaming);
    }
    if (message.serverStreaming === true) {
      writer.uint32(48).bool(message.serverStreaming);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MethodDescriptorProto {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMethodDescriptorProto();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.name = reader.string();
          break;
        case 2:
          message.inputType = reader.string();
          break;
        case 3:
          message.outputType = reader.string();
          break;
        case 4:
          message.options = MethodOptions.decode(reader, reader.uint32());
          break;
        case 5:
          message.clientStreaming = reader.bool();
          break;
        case 6:
          message.serverStreaming = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MethodDescriptorProto {
    return {
      name: isSet(object.name) ? String(object.name) : '',
      inputType: isSet(object.inputType) ? String(object.inputType) : '',
      outputType: isSet(object.outputType) ? String(object.outputType) : '',
      options: isSet(object.options)
        ? MethodOptions.fromJSON(object.options)
        : undefined,
      clientStreaming: isSet(object.clientStreaming)
        ? Boolean(object.clientStreaming)
        : false,
      serverStreaming: isSet(object.serverStreaming)
        ? Boolean(object.serverStreaming)
        : false,
    };
  },
  toJSON(message: MethodDescriptorProto): JsonSafe<MethodDescriptorProto> {
    const obj: any = {};
    message.name !== undefined && (obj.name = message.name);
    message.inputType !== undefined && (obj.inputType = message.inputType);
    message.outputType !== undefined && (obj.outputType = message.outputType);
    message.options !== undefined &&
      (obj.options = message.options
        ? MethodOptions.toJSON(message.options)
        : undefined);
    message.clientStreaming !== undefined &&
      (obj.clientStreaming = message.clientStreaming);
    message.serverStreaming !== undefined &&
      (obj.serverStreaming = message.serverStreaming);
    return obj;
  },
  fromPartial(object: Partial<MethodDescriptorProto>): MethodDescriptorProto {
    const message = createBaseMethodDescriptorProto();
    message.name = object.name ?? '';
    message.inputType = object.inputType ?? '';
    message.outputType = object.outputType ?? '';
    message.options =
      object.options !== undefined && object.options !== null
        ? MethodOptions.fromPartial(object.options)
        : undefined;
    message.clientStreaming = object.clientStreaming ?? false;
    message.serverStreaming = object.serverStreaming ?? false;
    return message;
  },
  fromProtoMsg(message: MethodDescriptorProtoProtoMsg): MethodDescriptorProto {
    return MethodDescriptorProto.decode(message.value);
  },
  toProto(message: MethodDescriptorProto): Uint8Array {
    return MethodDescriptorProto.encode(message).finish();
  },
  toProtoMsg(message: MethodDescriptorProto): MethodDescriptorProtoProtoMsg {
    return {
      typeUrl: '/google.protobuf.MethodDescriptorProto',
      value: MethodDescriptorProto.encode(message).finish(),
    };
  },
};
function createBaseFileOptions(): FileOptions {
  return {
    javaPackage: '',
    javaOuterClassname: '',
    javaMultipleFiles: false,
    javaGenerateEqualsAndHash: false,
    javaStringCheckUtf8: false,
    optimizeFor: 1,
    goPackage: '',
    ccGenericServices: false,
    javaGenericServices: false,
    pyGenericServices: false,
    phpGenericServices: false,
    deprecated: false,
    ccEnableArenas: false,
    objcClassPrefix: '',
    csharpNamespace: '',
    swiftPrefix: '',
    phpClassPrefix: '',
    phpNamespace: '',
    phpMetadataNamespace: '',
    rubyPackage: '',
    uninterpretedOption: [],
  };
}
export const FileOptions = {
  typeUrl: '/google.protobuf.FileOptions',
  encode(
    message: FileOptions,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.javaPackage !== '') {
      writer.uint32(10).string(message.javaPackage);
    }
    if (message.javaOuterClassname !== '') {
      writer.uint32(66).string(message.javaOuterClassname);
    }
    if (message.javaMultipleFiles === true) {
      writer.uint32(80).bool(message.javaMultipleFiles);
    }
    if (message.javaGenerateEqualsAndHash === true) {
      writer.uint32(160).bool(message.javaGenerateEqualsAndHash);
    }
    if (message.javaStringCheckUtf8 === true) {
      writer.uint32(216).bool(message.javaStringCheckUtf8);
    }
    if (message.optimizeFor !== 1) {
      writer.uint32(72).int32(message.optimizeFor);
    }
    if (message.goPackage !== '') {
      writer.uint32(90).string(message.goPackage);
    }
    if (message.ccGenericServices === true) {
      writer.uint32(128).bool(message.ccGenericServices);
    }
    if (message.javaGenericServices === true) {
      writer.uint32(136).bool(message.javaGenericServices);
    }
    if (message.pyGenericServices === true) {
      writer.uint32(144).bool(message.pyGenericServices);
    }
    if (message.phpGenericServices === true) {
      writer.uint32(336).bool(message.phpGenericServices);
    }
    if (message.deprecated === true) {
      writer.uint32(184).bool(message.deprecated);
    }
    if (message.ccEnableArenas === true) {
      writer.uint32(248).bool(message.ccEnableArenas);
    }
    if (message.objcClassPrefix !== '') {
      writer.uint32(290).string(message.objcClassPrefix);
    }
    if (message.csharpNamespace !== '') {
      writer.uint32(298).string(message.csharpNamespace);
    }
    if (message.swiftPrefix !== '') {
      writer.uint32(314).string(message.swiftPrefix);
    }
    if (message.phpClassPrefix !== '') {
      writer.uint32(322).string(message.phpClassPrefix);
    }
    if (message.phpNamespace !== '') {
      writer.uint32(330).string(message.phpNamespace);
    }
    if (message.phpMetadataNamespace !== '') {
      writer.uint32(354).string(message.phpMetadataNamespace);
    }
    if (message.rubyPackage !== '') {
      writer.uint32(362).string(message.rubyPackage);
    }
    for (const v of message.uninterpretedOption) {
      UninterpretedOption.encode(v!, writer.uint32(7994).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): FileOptions {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFileOptions();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.javaPackage = reader.string();
          break;
        case 8:
          message.javaOuterClassname = reader.string();
          break;
        case 10:
          message.javaMultipleFiles = reader.bool();
          break;
        case 20:
          message.javaGenerateEqualsAndHash = reader.bool();
          break;
        case 27:
          message.javaStringCheckUtf8 = reader.bool();
          break;
        case 9:
          message.optimizeFor = reader.int32() as any;
          break;
        case 11:
          message.goPackage = reader.string();
          break;
        case 16:
          message.ccGenericServices = reader.bool();
          break;
        case 17:
          message.javaGenericServices = reader.bool();
          break;
        case 18:
          message.pyGenericServices = reader.bool();
          break;
        case 42:
          message.phpGenericServices = reader.bool();
          break;
        case 23:
          message.deprecated = reader.bool();
          break;
        case 31:
          message.ccEnableArenas = reader.bool();
          break;
        case 36:
          message.objcClassPrefix = reader.string();
          break;
        case 37:
          message.csharpNamespace = reader.string();
          break;
        case 39:
          message.swiftPrefix = reader.string();
          break;
        case 40:
          message.phpClassPrefix = reader.string();
          break;
        case 41:
          message.phpNamespace = reader.string();
          break;
        case 44:
          message.phpMetadataNamespace = reader.string();
          break;
        case 45:
          message.rubyPackage = reader.string();
          break;
        case 999:
          message.uninterpretedOption.push(
            UninterpretedOption.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): FileOptions {
    return {
      javaPackage: isSet(object.javaPackage) ? String(object.javaPackage) : '',
      javaOuterClassname: isSet(object.javaOuterClassname)
        ? String(object.javaOuterClassname)
        : '',
      javaMultipleFiles: isSet(object.javaMultipleFiles)
        ? Boolean(object.javaMultipleFiles)
        : false,
      javaGenerateEqualsAndHash: isSet(object.javaGenerateEqualsAndHash)
        ? Boolean(object.javaGenerateEqualsAndHash)
        : false,
      javaStringCheckUtf8: isSet(object.javaStringCheckUtf8)
        ? Boolean(object.javaStringCheckUtf8)
        : false,
      optimizeFor: isSet(object.optimizeFor)
        ? fileOptions_OptimizeModeFromJSON(object.optimizeFor)
        : -1,
      goPackage: isSet(object.goPackage) ? String(object.goPackage) : '',
      ccGenericServices: isSet(object.ccGenericServices)
        ? Boolean(object.ccGenericServices)
        : false,
      javaGenericServices: isSet(object.javaGenericServices)
        ? Boolean(object.javaGenericServices)
        : false,
      pyGenericServices: isSet(object.pyGenericServices)
        ? Boolean(object.pyGenericServices)
        : false,
      phpGenericServices: isSet(object.phpGenericServices)
        ? Boolean(object.phpGenericServices)
        : false,
      deprecated: isSet(object.deprecated) ? Boolean(object.deprecated) : false,
      ccEnableArenas: isSet(object.ccEnableArenas)
        ? Boolean(object.ccEnableArenas)
        : false,
      objcClassPrefix: isSet(object.objcClassPrefix)
        ? String(object.objcClassPrefix)
        : '',
      csharpNamespace: isSet(object.csharpNamespace)
        ? String(object.csharpNamespace)
        : '',
      swiftPrefix: isSet(object.swiftPrefix) ? String(object.swiftPrefix) : '',
      phpClassPrefix: isSet(object.phpClassPrefix)
        ? String(object.phpClassPrefix)
        : '',
      phpNamespace: isSet(object.phpNamespace)
        ? String(object.phpNamespace)
        : '',
      phpMetadataNamespace: isSet(object.phpMetadataNamespace)
        ? String(object.phpMetadataNamespace)
        : '',
      rubyPackage: isSet(object.rubyPackage) ? String(object.rubyPackage) : '',
      uninterpretedOption: Array.isArray(object?.uninterpretedOption)
        ? object.uninterpretedOption.map((e: any) =>
            UninterpretedOption.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: FileOptions): JsonSafe<FileOptions> {
    const obj: any = {};
    message.javaPackage !== undefined &&
      (obj.javaPackage = message.javaPackage);
    message.javaOuterClassname !== undefined &&
      (obj.javaOuterClassname = message.javaOuterClassname);
    message.javaMultipleFiles !== undefined &&
      (obj.javaMultipleFiles = message.javaMultipleFiles);
    message.javaGenerateEqualsAndHash !== undefined &&
      (obj.javaGenerateEqualsAndHash = message.javaGenerateEqualsAndHash);
    message.javaStringCheckUtf8 !== undefined &&
      (obj.javaStringCheckUtf8 = message.javaStringCheckUtf8);
    message.optimizeFor !== undefined &&
      (obj.optimizeFor = fileOptions_OptimizeModeToJSON(message.optimizeFor));
    message.goPackage !== undefined && (obj.goPackage = message.goPackage);
    message.ccGenericServices !== undefined &&
      (obj.ccGenericServices = message.ccGenericServices);
    message.javaGenericServices !== undefined &&
      (obj.javaGenericServices = message.javaGenericServices);
    message.pyGenericServices !== undefined &&
      (obj.pyGenericServices = message.pyGenericServices);
    message.phpGenericServices !== undefined &&
      (obj.phpGenericServices = message.phpGenericServices);
    message.deprecated !== undefined && (obj.deprecated = message.deprecated);
    message.ccEnableArenas !== undefined &&
      (obj.ccEnableArenas = message.ccEnableArenas);
    message.objcClassPrefix !== undefined &&
      (obj.objcClassPrefix = message.objcClassPrefix);
    message.csharpNamespace !== undefined &&
      (obj.csharpNamespace = message.csharpNamespace);
    message.swiftPrefix !== undefined &&
      (obj.swiftPrefix = message.swiftPrefix);
    message.phpClassPrefix !== undefined &&
      (obj.phpClassPrefix = message.phpClassPrefix);
    message.phpNamespace !== undefined &&
      (obj.phpNamespace = message.phpNamespace);
    message.phpMetadataNamespace !== undefined &&
      (obj.phpMetadataNamespace = message.phpMetadataNamespace);
    message.rubyPackage !== undefined &&
      (obj.rubyPackage = message.rubyPackage);
    if (message.uninterpretedOption) {
      obj.uninterpretedOption = message.uninterpretedOption.map(e =>
        e ? UninterpretedOption.toJSON(e) : undefined,
      );
    } else {
      obj.uninterpretedOption = [];
    }
    return obj;
  },
  fromPartial(object: Partial<FileOptions>): FileOptions {
    const message = createBaseFileOptions();
    message.javaPackage = object.javaPackage ?? '';
    message.javaOuterClassname = object.javaOuterClassname ?? '';
    message.javaMultipleFiles = object.javaMultipleFiles ?? false;
    message.javaGenerateEqualsAndHash =
      object.javaGenerateEqualsAndHash ?? false;
    message.javaStringCheckUtf8 = object.javaStringCheckUtf8 ?? false;
    message.optimizeFor = object.optimizeFor ?? 1;
    message.goPackage = object.goPackage ?? '';
    message.ccGenericServices = object.ccGenericServices ?? false;
    message.javaGenericServices = object.javaGenericServices ?? false;
    message.pyGenericServices = object.pyGenericServices ?? false;
    message.phpGenericServices = object.phpGenericServices ?? false;
    message.deprecated = object.deprecated ?? false;
    message.ccEnableArenas = object.ccEnableArenas ?? false;
    message.objcClassPrefix = object.objcClassPrefix ?? '';
    message.csharpNamespace = object.csharpNamespace ?? '';
    message.swiftPrefix = object.swiftPrefix ?? '';
    message.phpClassPrefix = object.phpClassPrefix ?? '';
    message.phpNamespace = object.phpNamespace ?? '';
    message.phpMetadataNamespace = object.phpMetadataNamespace ?? '';
    message.rubyPackage = object.rubyPackage ?? '';
    message.uninterpretedOption =
      object.uninterpretedOption?.map(e =>
        UninterpretedOption.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(message: FileOptionsProtoMsg): FileOptions {
    return FileOptions.decode(message.value);
  },
  toProto(message: FileOptions): Uint8Array {
    return FileOptions.encode(message).finish();
  },
  toProtoMsg(message: FileOptions): FileOptionsProtoMsg {
    return {
      typeUrl: '/google.protobuf.FileOptions',
      value: FileOptions.encode(message).finish(),
    };
  },
};
function createBaseMessageOptions(): MessageOptions {
  return {
    messageSetWireFormat: false,
    noStandardDescriptorAccessor: false,
    deprecated: false,
    mapEntry: false,
    uninterpretedOption: [],
  };
}
export const MessageOptions = {
  typeUrl: '/google.protobuf.MessageOptions',
  encode(
    message: MessageOptions,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.messageSetWireFormat === true) {
      writer.uint32(8).bool(message.messageSetWireFormat);
    }
    if (message.noStandardDescriptorAccessor === true) {
      writer.uint32(16).bool(message.noStandardDescriptorAccessor);
    }
    if (message.deprecated === true) {
      writer.uint32(24).bool(message.deprecated);
    }
    if (message.mapEntry === true) {
      writer.uint32(56).bool(message.mapEntry);
    }
    for (const v of message.uninterpretedOption) {
      UninterpretedOption.encode(v!, writer.uint32(7994).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MessageOptions {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMessageOptions();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.messageSetWireFormat = reader.bool();
          break;
        case 2:
          message.noStandardDescriptorAccessor = reader.bool();
          break;
        case 3:
          message.deprecated = reader.bool();
          break;
        case 7:
          message.mapEntry = reader.bool();
          break;
        case 999:
          message.uninterpretedOption.push(
            UninterpretedOption.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MessageOptions {
    return {
      messageSetWireFormat: isSet(object.messageSetWireFormat)
        ? Boolean(object.messageSetWireFormat)
        : false,
      noStandardDescriptorAccessor: isSet(object.noStandardDescriptorAccessor)
        ? Boolean(object.noStandardDescriptorAccessor)
        : false,
      deprecated: isSet(object.deprecated) ? Boolean(object.deprecated) : false,
      mapEntry: isSet(object.mapEntry) ? Boolean(object.mapEntry) : false,
      uninterpretedOption: Array.isArray(object?.uninterpretedOption)
        ? object.uninterpretedOption.map((e: any) =>
            UninterpretedOption.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: MessageOptions): JsonSafe<MessageOptions> {
    const obj: any = {};
    message.messageSetWireFormat !== undefined &&
      (obj.messageSetWireFormat = message.messageSetWireFormat);
    message.noStandardDescriptorAccessor !== undefined &&
      (obj.noStandardDescriptorAccessor = message.noStandardDescriptorAccessor);
    message.deprecated !== undefined && (obj.deprecated = message.deprecated);
    message.mapEntry !== undefined && (obj.mapEntry = message.mapEntry);
    if (message.uninterpretedOption) {
      obj.uninterpretedOption = message.uninterpretedOption.map(e =>
        e ? UninterpretedOption.toJSON(e) : undefined,
      );
    } else {
      obj.uninterpretedOption = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MessageOptions>): MessageOptions {
    const message = createBaseMessageOptions();
    message.messageSetWireFormat = object.messageSetWireFormat ?? false;
    message.noStandardDescriptorAccessor =
      object.noStandardDescriptorAccessor ?? false;
    message.deprecated = object.deprecated ?? false;
    message.mapEntry = object.mapEntry ?? false;
    message.uninterpretedOption =
      object.uninterpretedOption?.map(e =>
        UninterpretedOption.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(message: MessageOptionsProtoMsg): MessageOptions {
    return MessageOptions.decode(message.value);
  },
  toProto(message: MessageOptions): Uint8Array {
    return MessageOptions.encode(message).finish();
  },
  toProtoMsg(message: MessageOptions): MessageOptionsProtoMsg {
    return {
      typeUrl: '/google.protobuf.MessageOptions',
      value: MessageOptions.encode(message).finish(),
    };
  },
};
function createBaseFieldOptions(): FieldOptions {
  return {
    ctype: 1,
    packed: false,
    jstype: 1,
    lazy: false,
    deprecated: false,
    weak: false,
    uninterpretedOption: [],
  };
}
export const FieldOptions = {
  typeUrl: '/google.protobuf.FieldOptions',
  encode(
    message: FieldOptions,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.ctype !== 1) {
      writer.uint32(8).int32(message.ctype);
    }
    if (message.packed === true) {
      writer.uint32(16).bool(message.packed);
    }
    if (message.jstype !== 1) {
      writer.uint32(48).int32(message.jstype);
    }
    if (message.lazy === true) {
      writer.uint32(40).bool(message.lazy);
    }
    if (message.deprecated === true) {
      writer.uint32(24).bool(message.deprecated);
    }
    if (message.weak === true) {
      writer.uint32(80).bool(message.weak);
    }
    for (const v of message.uninterpretedOption) {
      UninterpretedOption.encode(v!, writer.uint32(7994).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): FieldOptions {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseFieldOptions();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.ctype = reader.int32() as any;
          break;
        case 2:
          message.packed = reader.bool();
          break;
        case 6:
          message.jstype = reader.int32() as any;
          break;
        case 5:
          message.lazy = reader.bool();
          break;
        case 3:
          message.deprecated = reader.bool();
          break;
        case 10:
          message.weak = reader.bool();
          break;
        case 999:
          message.uninterpretedOption.push(
            UninterpretedOption.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): FieldOptions {
    return {
      ctype: isSet(object.ctype)
        ? fieldOptions_CTypeFromJSON(object.ctype)
        : -1,
      packed: isSet(object.packed) ? Boolean(object.packed) : false,
      jstype: isSet(object.jstype)
        ? fieldOptions_JSTypeFromJSON(object.jstype)
        : -1,
      lazy: isSet(object.lazy) ? Boolean(object.lazy) : false,
      deprecated: isSet(object.deprecated) ? Boolean(object.deprecated) : false,
      weak: isSet(object.weak) ? Boolean(object.weak) : false,
      uninterpretedOption: Array.isArray(object?.uninterpretedOption)
        ? object.uninterpretedOption.map((e: any) =>
            UninterpretedOption.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: FieldOptions): JsonSafe<FieldOptions> {
    const obj: any = {};
    message.ctype !== undefined &&
      (obj.ctype = fieldOptions_CTypeToJSON(message.ctype));
    message.packed !== undefined && (obj.packed = message.packed);
    message.jstype !== undefined &&
      (obj.jstype = fieldOptions_JSTypeToJSON(message.jstype));
    message.lazy !== undefined && (obj.lazy = message.lazy);
    message.deprecated !== undefined && (obj.deprecated = message.deprecated);
    message.weak !== undefined && (obj.weak = message.weak);
    if (message.uninterpretedOption) {
      obj.uninterpretedOption = message.uninterpretedOption.map(e =>
        e ? UninterpretedOption.toJSON(e) : undefined,
      );
    } else {
      obj.uninterpretedOption = [];
    }
    return obj;
  },
  fromPartial(object: Partial<FieldOptions>): FieldOptions {
    const message = createBaseFieldOptions();
    message.ctype = object.ctype ?? 1;
    message.packed = object.packed ?? false;
    message.jstype = object.jstype ?? 1;
    message.lazy = object.lazy ?? false;
    message.deprecated = object.deprecated ?? false;
    message.weak = object.weak ?? false;
    message.uninterpretedOption =
      object.uninterpretedOption?.map(e =>
        UninterpretedOption.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(message: FieldOptionsProtoMsg): FieldOptions {
    return FieldOptions.decode(message.value);
  },
  toProto(message: FieldOptions): Uint8Array {
    return FieldOptions.encode(message).finish();
  },
  toProtoMsg(message: FieldOptions): FieldOptionsProtoMsg {
    return {
      typeUrl: '/google.protobuf.FieldOptions',
      value: FieldOptions.encode(message).finish(),
    };
  },
};
function createBaseOneofOptions(): OneofOptions {
  return {
    uninterpretedOption: [],
  };
}
export const OneofOptions = {
  typeUrl: '/google.protobuf.OneofOptions',
  encode(
    message: OneofOptions,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.uninterpretedOption) {
      UninterpretedOption.encode(v!, writer.uint32(7994).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): OneofOptions {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOneofOptions();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 999:
          message.uninterpretedOption.push(
            UninterpretedOption.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): OneofOptions {
    return {
      uninterpretedOption: Array.isArray(object?.uninterpretedOption)
        ? object.uninterpretedOption.map((e: any) =>
            UninterpretedOption.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: OneofOptions): JsonSafe<OneofOptions> {
    const obj: any = {};
    if (message.uninterpretedOption) {
      obj.uninterpretedOption = message.uninterpretedOption.map(e =>
        e ? UninterpretedOption.toJSON(e) : undefined,
      );
    } else {
      obj.uninterpretedOption = [];
    }
    return obj;
  },
  fromPartial(object: Partial<OneofOptions>): OneofOptions {
    const message = createBaseOneofOptions();
    message.uninterpretedOption =
      object.uninterpretedOption?.map(e =>
        UninterpretedOption.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(message: OneofOptionsProtoMsg): OneofOptions {
    return OneofOptions.decode(message.value);
  },
  toProto(message: OneofOptions): Uint8Array {
    return OneofOptions.encode(message).finish();
  },
  toProtoMsg(message: OneofOptions): OneofOptionsProtoMsg {
    return {
      typeUrl: '/google.protobuf.OneofOptions',
      value: OneofOptions.encode(message).finish(),
    };
  },
};
function createBaseEnumOptions(): EnumOptions {
  return {
    allowAlias: false,
    deprecated: false,
    uninterpretedOption: [],
  };
}
export const EnumOptions = {
  typeUrl: '/google.protobuf.EnumOptions',
  encode(
    message: EnumOptions,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.allowAlias === true) {
      writer.uint32(16).bool(message.allowAlias);
    }
    if (message.deprecated === true) {
      writer.uint32(24).bool(message.deprecated);
    }
    for (const v of message.uninterpretedOption) {
      UninterpretedOption.encode(v!, writer.uint32(7994).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EnumOptions {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEnumOptions();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          message.allowAlias = reader.bool();
          break;
        case 3:
          message.deprecated = reader.bool();
          break;
        case 999:
          message.uninterpretedOption.push(
            UninterpretedOption.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EnumOptions {
    return {
      allowAlias: isSet(object.allowAlias) ? Boolean(object.allowAlias) : false,
      deprecated: isSet(object.deprecated) ? Boolean(object.deprecated) : false,
      uninterpretedOption: Array.isArray(object?.uninterpretedOption)
        ? object.uninterpretedOption.map((e: any) =>
            UninterpretedOption.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: EnumOptions): JsonSafe<EnumOptions> {
    const obj: any = {};
    message.allowAlias !== undefined && (obj.allowAlias = message.allowAlias);
    message.deprecated !== undefined && (obj.deprecated = message.deprecated);
    if (message.uninterpretedOption) {
      obj.uninterpretedOption = message.uninterpretedOption.map(e =>
        e ? UninterpretedOption.toJSON(e) : undefined,
      );
    } else {
      obj.uninterpretedOption = [];
    }
    return obj;
  },
  fromPartial(object: Partial<EnumOptions>): EnumOptions {
    const message = createBaseEnumOptions();
    message.allowAlias = object.allowAlias ?? false;
    message.deprecated = object.deprecated ?? false;
    message.uninterpretedOption =
      object.uninterpretedOption?.map(e =>
        UninterpretedOption.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(message: EnumOptionsProtoMsg): EnumOptions {
    return EnumOptions.decode(message.value);
  },
  toProto(message: EnumOptions): Uint8Array {
    return EnumOptions.encode(message).finish();
  },
  toProtoMsg(message: EnumOptions): EnumOptionsProtoMsg {
    return {
      typeUrl: '/google.protobuf.EnumOptions',
      value: EnumOptions.encode(message).finish(),
    };
  },
};
function createBaseEnumValueOptions(): EnumValueOptions {
  return {
    deprecated: false,
    uninterpretedOption: [],
  };
}
export const EnumValueOptions = {
  typeUrl: '/google.protobuf.EnumValueOptions',
  encode(
    message: EnumValueOptions,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.deprecated === true) {
      writer.uint32(8).bool(message.deprecated);
    }
    for (const v of message.uninterpretedOption) {
      UninterpretedOption.encode(v!, writer.uint32(7994).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): EnumValueOptions {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEnumValueOptions();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.deprecated = reader.bool();
          break;
        case 999:
          message.uninterpretedOption.push(
            UninterpretedOption.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): EnumValueOptions {
    return {
      deprecated: isSet(object.deprecated) ? Boolean(object.deprecated) : false,
      uninterpretedOption: Array.isArray(object?.uninterpretedOption)
        ? object.uninterpretedOption.map((e: any) =>
            UninterpretedOption.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: EnumValueOptions): JsonSafe<EnumValueOptions> {
    const obj: any = {};
    message.deprecated !== undefined && (obj.deprecated = message.deprecated);
    if (message.uninterpretedOption) {
      obj.uninterpretedOption = message.uninterpretedOption.map(e =>
        e ? UninterpretedOption.toJSON(e) : undefined,
      );
    } else {
      obj.uninterpretedOption = [];
    }
    return obj;
  },
  fromPartial(object: Partial<EnumValueOptions>): EnumValueOptions {
    const message = createBaseEnumValueOptions();
    message.deprecated = object.deprecated ?? false;
    message.uninterpretedOption =
      object.uninterpretedOption?.map(e =>
        UninterpretedOption.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(message: EnumValueOptionsProtoMsg): EnumValueOptions {
    return EnumValueOptions.decode(message.value);
  },
  toProto(message: EnumValueOptions): Uint8Array {
    return EnumValueOptions.encode(message).finish();
  },
  toProtoMsg(message: EnumValueOptions): EnumValueOptionsProtoMsg {
    return {
      typeUrl: '/google.protobuf.EnumValueOptions',
      value: EnumValueOptions.encode(message).finish(),
    };
  },
};
function createBaseServiceOptions(): ServiceOptions {
  return {
    deprecated: false,
    uninterpretedOption: [],
  };
}
export const ServiceOptions = {
  typeUrl: '/google.protobuf.ServiceOptions',
  encode(
    message: ServiceOptions,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.deprecated === true) {
      writer.uint32(264).bool(message.deprecated);
    }
    for (const v of message.uninterpretedOption) {
      UninterpretedOption.encode(v!, writer.uint32(7994).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ServiceOptions {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseServiceOptions();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 33:
          message.deprecated = reader.bool();
          break;
        case 999:
          message.uninterpretedOption.push(
            UninterpretedOption.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ServiceOptions {
    return {
      deprecated: isSet(object.deprecated) ? Boolean(object.deprecated) : false,
      uninterpretedOption: Array.isArray(object?.uninterpretedOption)
        ? object.uninterpretedOption.map((e: any) =>
            UninterpretedOption.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: ServiceOptions): JsonSafe<ServiceOptions> {
    const obj: any = {};
    message.deprecated !== undefined && (obj.deprecated = message.deprecated);
    if (message.uninterpretedOption) {
      obj.uninterpretedOption = message.uninterpretedOption.map(e =>
        e ? UninterpretedOption.toJSON(e) : undefined,
      );
    } else {
      obj.uninterpretedOption = [];
    }
    return obj;
  },
  fromPartial(object: Partial<ServiceOptions>): ServiceOptions {
    const message = createBaseServiceOptions();
    message.deprecated = object.deprecated ?? false;
    message.uninterpretedOption =
      object.uninterpretedOption?.map(e =>
        UninterpretedOption.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(message: ServiceOptionsProtoMsg): ServiceOptions {
    return ServiceOptions.decode(message.value);
  },
  toProto(message: ServiceOptions): Uint8Array {
    return ServiceOptions.encode(message).finish();
  },
  toProtoMsg(message: ServiceOptions): ServiceOptionsProtoMsg {
    return {
      typeUrl: '/google.protobuf.ServiceOptions',
      value: ServiceOptions.encode(message).finish(),
    };
  },
};
function createBaseMethodOptions(): MethodOptions {
  return {
    deprecated: false,
    idempotencyLevel: 1,
    uninterpretedOption: [],
  };
}
export const MethodOptions = {
  typeUrl: '/google.protobuf.MethodOptions',
  encode(
    message: MethodOptions,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.deprecated === true) {
      writer.uint32(264).bool(message.deprecated);
    }
    if (message.idempotencyLevel !== 1) {
      writer.uint32(272).int32(message.idempotencyLevel);
    }
    for (const v of message.uninterpretedOption) {
      UninterpretedOption.encode(v!, writer.uint32(7994).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MethodOptions {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMethodOptions();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 33:
          message.deprecated = reader.bool();
          break;
        case 34:
          message.idempotencyLevel = reader.int32() as any;
          break;
        case 999:
          message.uninterpretedOption.push(
            UninterpretedOption.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MethodOptions {
    return {
      deprecated: isSet(object.deprecated) ? Boolean(object.deprecated) : false,
      idempotencyLevel: isSet(object.idempotencyLevel)
        ? methodOptions_IdempotencyLevelFromJSON(object.idempotencyLevel)
        : -1,
      uninterpretedOption: Array.isArray(object?.uninterpretedOption)
        ? object.uninterpretedOption.map((e: any) =>
            UninterpretedOption.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: MethodOptions): JsonSafe<MethodOptions> {
    const obj: any = {};
    message.deprecated !== undefined && (obj.deprecated = message.deprecated);
    message.idempotencyLevel !== undefined &&
      (obj.idempotencyLevel = methodOptions_IdempotencyLevelToJSON(
        message.idempotencyLevel,
      ));
    if (message.uninterpretedOption) {
      obj.uninterpretedOption = message.uninterpretedOption.map(e =>
        e ? UninterpretedOption.toJSON(e) : undefined,
      );
    } else {
      obj.uninterpretedOption = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MethodOptions>): MethodOptions {
    const message = createBaseMethodOptions();
    message.deprecated = object.deprecated ?? false;
    message.idempotencyLevel = object.idempotencyLevel ?? 1;
    message.uninterpretedOption =
      object.uninterpretedOption?.map(e =>
        UninterpretedOption.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(message: MethodOptionsProtoMsg): MethodOptions {
    return MethodOptions.decode(message.value);
  },
  toProto(message: MethodOptions): Uint8Array {
    return MethodOptions.encode(message).finish();
  },
  toProtoMsg(message: MethodOptions): MethodOptionsProtoMsg {
    return {
      typeUrl: '/google.protobuf.MethodOptions',
      value: MethodOptions.encode(message).finish(),
    };
  },
};
function createBaseUninterpretedOption(): UninterpretedOption {
  return {
    name: [],
    identifierValue: '',
    positiveIntValue: BigInt(0),
    negativeIntValue: BigInt(0),
    doubleValue: 0,
    stringValue: new Uint8Array(),
    aggregateValue: '',
  };
}
export const UninterpretedOption = {
  typeUrl: '/google.protobuf.UninterpretedOption',
  encode(
    message: UninterpretedOption,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.name) {
      UninterpretedOption_NamePart.encode(
        v!,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    if (message.identifierValue !== '') {
      writer.uint32(26).string(message.identifierValue);
    }
    if (message.positiveIntValue !== BigInt(0)) {
      writer.uint32(32).uint64(message.positiveIntValue);
    }
    if (message.negativeIntValue !== BigInt(0)) {
      writer.uint32(40).int64(message.negativeIntValue);
    }
    if (message.doubleValue !== 0) {
      writer.uint32(49).double(message.doubleValue);
    }
    if (message.stringValue.length !== 0) {
      writer.uint32(58).bytes(message.stringValue);
    }
    if (message.aggregateValue !== '') {
      writer.uint32(66).string(message.aggregateValue);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): UninterpretedOption {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUninterpretedOption();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          message.name.push(
            UninterpretedOption_NamePart.decode(reader, reader.uint32()),
          );
          break;
        case 3:
          message.identifierValue = reader.string();
          break;
        case 4:
          message.positiveIntValue = reader.uint64();
          break;
        case 5:
          message.negativeIntValue = reader.int64();
          break;
        case 6:
          message.doubleValue = reader.double();
          break;
        case 7:
          message.stringValue = reader.bytes();
          break;
        case 8:
          message.aggregateValue = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): UninterpretedOption {
    return {
      name: Array.isArray(object?.name)
        ? object.name.map((e: any) => UninterpretedOption_NamePart.fromJSON(e))
        : [],
      identifierValue: isSet(object.identifierValue)
        ? String(object.identifierValue)
        : '',
      positiveIntValue: isSet(object.positiveIntValue)
        ? BigInt(object.positiveIntValue.toString())
        : BigInt(0),
      negativeIntValue: isSet(object.negativeIntValue)
        ? BigInt(object.negativeIntValue.toString())
        : BigInt(0),
      doubleValue: isSet(object.doubleValue) ? Number(object.doubleValue) : 0,
      stringValue: isSet(object.stringValue)
        ? bytesFromBase64(object.stringValue)
        : new Uint8Array(),
      aggregateValue: isSet(object.aggregateValue)
        ? String(object.aggregateValue)
        : '',
    };
  },
  toJSON(message: UninterpretedOption): JsonSafe<UninterpretedOption> {
    const obj: any = {};
    if (message.name) {
      obj.name = message.name.map(e =>
        e ? UninterpretedOption_NamePart.toJSON(e) : undefined,
      );
    } else {
      obj.name = [];
    }
    message.identifierValue !== undefined &&
      (obj.identifierValue = message.identifierValue);
    message.positiveIntValue !== undefined &&
      (obj.positiveIntValue = (
        message.positiveIntValue || BigInt(0)
      ).toString());
    message.negativeIntValue !== undefined &&
      (obj.negativeIntValue = (
        message.negativeIntValue || BigInt(0)
      ).toString());
    message.doubleValue !== undefined &&
      (obj.doubleValue = message.doubleValue);
    message.stringValue !== undefined &&
      (obj.stringValue = base64FromBytes(
        message.stringValue !== undefined
          ? message.stringValue
          : new Uint8Array(),
      ));
    message.aggregateValue !== undefined &&
      (obj.aggregateValue = message.aggregateValue);
    return obj;
  },
  fromPartial(object: Partial<UninterpretedOption>): UninterpretedOption {
    const message = createBaseUninterpretedOption();
    message.name =
      object.name?.map(e => UninterpretedOption_NamePart.fromPartial(e)) || [];
    message.identifierValue = object.identifierValue ?? '';
    message.positiveIntValue =
      object.positiveIntValue !== undefined && object.positiveIntValue !== null
        ? BigInt(object.positiveIntValue.toString())
        : BigInt(0);
    message.negativeIntValue =
      object.negativeIntValue !== undefined && object.negativeIntValue !== null
        ? BigInt(object.negativeIntValue.toString())
        : BigInt(0);
    message.doubleValue = object.doubleValue ?? 0;
    message.stringValue = object.stringValue ?? new Uint8Array();
    message.aggregateValue = object.aggregateValue ?? '';
    return message;
  },
  fromProtoMsg(message: UninterpretedOptionProtoMsg): UninterpretedOption {
    return UninterpretedOption.decode(message.value);
  },
  toProto(message: UninterpretedOption): Uint8Array {
    return UninterpretedOption.encode(message).finish();
  },
  toProtoMsg(message: UninterpretedOption): UninterpretedOptionProtoMsg {
    return {
      typeUrl: '/google.protobuf.UninterpretedOption',
      value: UninterpretedOption.encode(message).finish(),
    };
  },
};
function createBaseUninterpretedOption_NamePart(): UninterpretedOption_NamePart {
  return {
    namePart: '',
    isExtension: false,
  };
}
export const UninterpretedOption_NamePart = {
  typeUrl: '/google.protobuf.NamePart',
  encode(
    message: UninterpretedOption_NamePart,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.namePart !== '') {
      writer.uint32(10).string(message.namePart);
    }
    if (message.isExtension === true) {
      writer.uint32(16).bool(message.isExtension);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): UninterpretedOption_NamePart {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseUninterpretedOption_NamePart();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.namePart = reader.string();
          break;
        case 2:
          message.isExtension = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): UninterpretedOption_NamePart {
    return {
      namePart: isSet(object.namePart) ? String(object.namePart) : '',
      isExtension: isSet(object.isExtension)
        ? Boolean(object.isExtension)
        : false,
    };
  },
  toJSON(
    message: UninterpretedOption_NamePart,
  ): JsonSafe<UninterpretedOption_NamePart> {
    const obj: any = {};
    message.namePart !== undefined && (obj.namePart = message.namePart);
    message.isExtension !== undefined &&
      (obj.isExtension = message.isExtension);
    return obj;
  },
  fromPartial(
    object: Partial<UninterpretedOption_NamePart>,
  ): UninterpretedOption_NamePart {
    const message = createBaseUninterpretedOption_NamePart();
    message.namePart = object.namePart ?? '';
    message.isExtension = object.isExtension ?? false;
    return message;
  },
  fromProtoMsg(
    message: UninterpretedOption_NamePartProtoMsg,
  ): UninterpretedOption_NamePart {
    return UninterpretedOption_NamePart.decode(message.value);
  },
  toProto(message: UninterpretedOption_NamePart): Uint8Array {
    return UninterpretedOption_NamePart.encode(message).finish();
  },
  toProtoMsg(
    message: UninterpretedOption_NamePart,
  ): UninterpretedOption_NamePartProtoMsg {
    return {
      typeUrl: '/google.protobuf.NamePart',
      value: UninterpretedOption_NamePart.encode(message).finish(),
    };
  },
};
function createBaseSourceCodeInfo(): SourceCodeInfo {
  return {
    location: [],
  };
}
export const SourceCodeInfo = {
  typeUrl: '/google.protobuf.SourceCodeInfo',
  encode(
    message: SourceCodeInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.location) {
      SourceCodeInfo_Location.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): SourceCodeInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSourceCodeInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.location.push(
            SourceCodeInfo_Location.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SourceCodeInfo {
    return {
      location: Array.isArray(object?.location)
        ? object.location.map((e: any) => SourceCodeInfo_Location.fromJSON(e))
        : [],
    };
  },
  toJSON(message: SourceCodeInfo): JsonSafe<SourceCodeInfo> {
    const obj: any = {};
    if (message.location) {
      obj.location = message.location.map(e =>
        e ? SourceCodeInfo_Location.toJSON(e) : undefined,
      );
    } else {
      obj.location = [];
    }
    return obj;
  },
  fromPartial(object: Partial<SourceCodeInfo>): SourceCodeInfo {
    const message = createBaseSourceCodeInfo();
    message.location =
      object.location?.map(e => SourceCodeInfo_Location.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: SourceCodeInfoProtoMsg): SourceCodeInfo {
    return SourceCodeInfo.decode(message.value);
  },
  toProto(message: SourceCodeInfo): Uint8Array {
    return SourceCodeInfo.encode(message).finish();
  },
  toProtoMsg(message: SourceCodeInfo): SourceCodeInfoProtoMsg {
    return {
      typeUrl: '/google.protobuf.SourceCodeInfo',
      value: SourceCodeInfo.encode(message).finish(),
    };
  },
};
function createBaseSourceCodeInfo_Location(): SourceCodeInfo_Location {
  return {
    path: [],
    span: [],
    leadingComments: '',
    trailingComments: '',
    leadingDetachedComments: [],
  };
}
export const SourceCodeInfo_Location = {
  typeUrl: '/google.protobuf.Location',
  encode(
    message: SourceCodeInfo_Location,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    writer.uint32(10).fork();
    for (const v of message.path) {
      writer.int32(v);
    }
    writer.ldelim();
    writer.uint32(18).fork();
    for (const v of message.span) {
      writer.int32(v);
    }
    writer.ldelim();
    if (message.leadingComments !== '') {
      writer.uint32(26).string(message.leadingComments);
    }
    if (message.trailingComments !== '') {
      writer.uint32(34).string(message.trailingComments);
    }
    for (const v of message.leadingDetachedComments) {
      writer.uint32(50).string(v!);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SourceCodeInfo_Location {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSourceCodeInfo_Location();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.path.push(reader.int32());
            }
          } else {
            message.path.push(reader.int32());
          }
          break;
        case 2:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.span.push(reader.int32());
            }
          } else {
            message.span.push(reader.int32());
          }
          break;
        case 3:
          message.leadingComments = reader.string();
          break;
        case 4:
          message.trailingComments = reader.string();
          break;
        case 6:
          message.leadingDetachedComments.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SourceCodeInfo_Location {
    return {
      path: Array.isArray(object?.path)
        ? object.path.map((e: any) => Number(e))
        : [],
      span: Array.isArray(object?.span)
        ? object.span.map((e: any) => Number(e))
        : [],
      leadingComments: isSet(object.leadingComments)
        ? String(object.leadingComments)
        : '',
      trailingComments: isSet(object.trailingComments)
        ? String(object.trailingComments)
        : '',
      leadingDetachedComments: Array.isArray(object?.leadingDetachedComments)
        ? object.leadingDetachedComments.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: SourceCodeInfo_Location): JsonSafe<SourceCodeInfo_Location> {
    const obj: any = {};
    if (message.path) {
      obj.path = message.path.map(e => Math.round(e));
    } else {
      obj.path = [];
    }
    if (message.span) {
      obj.span = message.span.map(e => Math.round(e));
    } else {
      obj.span = [];
    }
    message.leadingComments !== undefined &&
      (obj.leadingComments = message.leadingComments);
    message.trailingComments !== undefined &&
      (obj.trailingComments = message.trailingComments);
    if (message.leadingDetachedComments) {
      obj.leadingDetachedComments = message.leadingDetachedComments.map(e => e);
    } else {
      obj.leadingDetachedComments = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<SourceCodeInfo_Location>,
  ): SourceCodeInfo_Location {
    const message = createBaseSourceCodeInfo_Location();
    message.path = object.path?.map(e => e) || [];
    message.span = object.span?.map(e => e) || [];
    message.leadingComments = object.leadingComments ?? '';
    message.trailingComments = object.trailingComments ?? '';
    message.leadingDetachedComments =
      object.leadingDetachedComments?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(
    message: SourceCodeInfo_LocationProtoMsg,
  ): SourceCodeInfo_Location {
    return SourceCodeInfo_Location.decode(message.value);
  },
  toProto(message: SourceCodeInfo_Location): Uint8Array {
    return SourceCodeInfo_Location.encode(message).finish();
  },
  toProtoMsg(
    message: SourceCodeInfo_Location,
  ): SourceCodeInfo_LocationProtoMsg {
    return {
      typeUrl: '/google.protobuf.Location',
      value: SourceCodeInfo_Location.encode(message).finish(),
    };
  },
};
function createBaseGeneratedCodeInfo(): GeneratedCodeInfo {
  return {
    annotation: [],
  };
}
export const GeneratedCodeInfo = {
  typeUrl: '/google.protobuf.GeneratedCodeInfo',
  encode(
    message: GeneratedCodeInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.annotation) {
      GeneratedCodeInfo_Annotation.encode(
        v!,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): GeneratedCodeInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGeneratedCodeInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.annotation.push(
            GeneratedCodeInfo_Annotation.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GeneratedCodeInfo {
    return {
      annotation: Array.isArray(object?.annotation)
        ? object.annotation.map((e: any) =>
            GeneratedCodeInfo_Annotation.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: GeneratedCodeInfo): JsonSafe<GeneratedCodeInfo> {
    const obj: any = {};
    if (message.annotation) {
      obj.annotation = message.annotation.map(e =>
        e ? GeneratedCodeInfo_Annotation.toJSON(e) : undefined,
      );
    } else {
      obj.annotation = [];
    }
    return obj;
  },
  fromPartial(object: Partial<GeneratedCodeInfo>): GeneratedCodeInfo {
    const message = createBaseGeneratedCodeInfo();
    message.annotation =
      object.annotation?.map(e =>
        GeneratedCodeInfo_Annotation.fromPartial(e),
      ) || [];
    return message;
  },
  fromProtoMsg(message: GeneratedCodeInfoProtoMsg): GeneratedCodeInfo {
    return GeneratedCodeInfo.decode(message.value);
  },
  toProto(message: GeneratedCodeInfo): Uint8Array {
    return GeneratedCodeInfo.encode(message).finish();
  },
  toProtoMsg(message: GeneratedCodeInfo): GeneratedCodeInfoProtoMsg {
    return {
      typeUrl: '/google.protobuf.GeneratedCodeInfo',
      value: GeneratedCodeInfo.encode(message).finish(),
    };
  },
};
function createBaseGeneratedCodeInfo_Annotation(): GeneratedCodeInfo_Annotation {
  return {
    path: [],
    sourceFile: '',
    begin: 0,
    end: 0,
  };
}
export const GeneratedCodeInfo_Annotation = {
  typeUrl: '/google.protobuf.Annotation',
  encode(
    message: GeneratedCodeInfo_Annotation,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    writer.uint32(10).fork();
    for (const v of message.path) {
      writer.int32(v);
    }
    writer.ldelim();
    if (message.sourceFile !== '') {
      writer.uint32(18).string(message.sourceFile);
    }
    if (message.begin !== 0) {
      writer.uint32(24).int32(message.begin);
    }
    if (message.end !== 0) {
      writer.uint32(32).int32(message.end);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): GeneratedCodeInfo_Annotation {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGeneratedCodeInfo_Annotation();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if ((tag & 7) === 2) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.path.push(reader.int32());
            }
          } else {
            message.path.push(reader.int32());
          }
          break;
        case 2:
          message.sourceFile = reader.string();
          break;
        case 3:
          message.begin = reader.int32();
          break;
        case 4:
          message.end = reader.int32();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GeneratedCodeInfo_Annotation {
    return {
      path: Array.isArray(object?.path)
        ? object.path.map((e: any) => Number(e))
        : [],
      sourceFile: isSet(object.sourceFile) ? String(object.sourceFile) : '',
      begin: isSet(object.begin) ? Number(object.begin) : 0,
      end: isSet(object.end) ? Number(object.end) : 0,
    };
  },
  toJSON(
    message: GeneratedCodeInfo_Annotation,
  ): JsonSafe<GeneratedCodeInfo_Annotation> {
    const obj: any = {};
    if (message.path) {
      obj.path = message.path.map(e => Math.round(e));
    } else {
      obj.path = [];
    }
    message.sourceFile !== undefined && (obj.sourceFile = message.sourceFile);
    message.begin !== undefined && (obj.begin = Math.round(message.begin));
    message.end !== undefined && (obj.end = Math.round(message.end));
    return obj;
  },
  fromPartial(
    object: Partial<GeneratedCodeInfo_Annotation>,
  ): GeneratedCodeInfo_Annotation {
    const message = createBaseGeneratedCodeInfo_Annotation();
    message.path = object.path?.map(e => e) || [];
    message.sourceFile = object.sourceFile ?? '';
    message.begin = object.begin ?? 0;
    message.end = object.end ?? 0;
    return message;
  },
  fromProtoMsg(
    message: GeneratedCodeInfo_AnnotationProtoMsg,
  ): GeneratedCodeInfo_Annotation {
    return GeneratedCodeInfo_Annotation.decode(message.value);
  },
  toProto(message: GeneratedCodeInfo_Annotation): Uint8Array {
    return GeneratedCodeInfo_Annotation.encode(message).finish();
  },
  toProtoMsg(
    message: GeneratedCodeInfo_Annotation,
  ): GeneratedCodeInfo_AnnotationProtoMsg {
    return {
      typeUrl: '/google.protobuf.Annotation',
      value: GeneratedCodeInfo_Annotation.encode(message).finish(),
    };
  },
};
