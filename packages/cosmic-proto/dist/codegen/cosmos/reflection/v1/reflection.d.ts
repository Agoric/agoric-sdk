import { FileDescriptorProto, type FileDescriptorProtoSDKType } from '../../../google/protobuf/descriptor.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * FileDescriptorsRequest is the Query/FileDescriptors request type.
 * @name FileDescriptorsRequest
 * @package cosmos.reflection.v1
 * @see proto type: cosmos.reflection.v1.FileDescriptorsRequest
 */
export interface FileDescriptorsRequest {
}
export interface FileDescriptorsRequestProtoMsg {
    typeUrl: '/cosmos.reflection.v1.FileDescriptorsRequest';
    value: Uint8Array;
}
/**
 * FileDescriptorsRequest is the Query/FileDescriptors request type.
 * @name FileDescriptorsRequestSDKType
 * @package cosmos.reflection.v1
 * @see proto type: cosmos.reflection.v1.FileDescriptorsRequest
 */
export interface FileDescriptorsRequestSDKType {
}
/**
 * FileDescriptorsResponse is the Query/FileDescriptors response type.
 * @name FileDescriptorsResponse
 * @package cosmos.reflection.v1
 * @see proto type: cosmos.reflection.v1.FileDescriptorsResponse
 */
export interface FileDescriptorsResponse {
    /**
     * files is the file descriptors.
     */
    files: FileDescriptorProto[];
}
export interface FileDescriptorsResponseProtoMsg {
    typeUrl: '/cosmos.reflection.v1.FileDescriptorsResponse';
    value: Uint8Array;
}
/**
 * FileDescriptorsResponse is the Query/FileDescriptors response type.
 * @name FileDescriptorsResponseSDKType
 * @package cosmos.reflection.v1
 * @see proto type: cosmos.reflection.v1.FileDescriptorsResponse
 */
export interface FileDescriptorsResponseSDKType {
    files: FileDescriptorProtoSDKType[];
}
/**
 * FileDescriptorsRequest is the Query/FileDescriptors request type.
 * @name FileDescriptorsRequest
 * @package cosmos.reflection.v1
 * @see proto type: cosmos.reflection.v1.FileDescriptorsRequest
 */
export declare const FileDescriptorsRequest: {
    typeUrl: "/cosmos.reflection.v1.FileDescriptorsRequest";
    aminoType: "cosmos-sdk/FileDescriptorsRequest";
    is(o: any): o is FileDescriptorsRequest;
    isSDK(o: any): o is FileDescriptorsRequestSDKType;
    encode(_: FileDescriptorsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): FileDescriptorsRequest;
    fromJSON(_: any): FileDescriptorsRequest;
    toJSON(_: FileDescriptorsRequest): JsonSafe<FileDescriptorsRequest>;
    fromPartial(_: Partial<FileDescriptorsRequest>): FileDescriptorsRequest;
    fromProtoMsg(message: FileDescriptorsRequestProtoMsg): FileDescriptorsRequest;
    toProto(message: FileDescriptorsRequest): Uint8Array;
    toProtoMsg(message: FileDescriptorsRequest): FileDescriptorsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * FileDescriptorsResponse is the Query/FileDescriptors response type.
 * @name FileDescriptorsResponse
 * @package cosmos.reflection.v1
 * @see proto type: cosmos.reflection.v1.FileDescriptorsResponse
 */
export declare const FileDescriptorsResponse: {
    typeUrl: "/cosmos.reflection.v1.FileDescriptorsResponse";
    aminoType: "cosmos-sdk/FileDescriptorsResponse";
    is(o: any): o is FileDescriptorsResponse;
    isSDK(o: any): o is FileDescriptorsResponseSDKType;
    encode(message: FileDescriptorsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): FileDescriptorsResponse;
    fromJSON(object: any): FileDescriptorsResponse;
    toJSON(message: FileDescriptorsResponse): JsonSafe<FileDescriptorsResponse>;
    fromPartial(object: Partial<FileDescriptorsResponse>): FileDescriptorsResponse;
    fromProtoMsg(message: FileDescriptorsResponseProtoMsg): FileDescriptorsResponse;
    toProto(message: FileDescriptorsResponse): Uint8Array;
    toProtoMsg(message: FileDescriptorsResponse): FileDescriptorsResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=reflection.d.ts.map