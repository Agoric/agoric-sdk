import * as _95 from './cosmos.js';
export declare const cosmos_proto: {
    scalarTypeFromJSON(object: any): _95.ScalarType;
    scalarTypeToJSON(object: _95.ScalarType): string;
    ScalarType: typeof _95.ScalarType;
    ScalarTypeSDKType: typeof _95.ScalarType;
    InterfaceDescriptor: {
        typeUrl: "/cosmos_proto.InterfaceDescriptor";
        is(o: any): o is _95.InterfaceDescriptor;
        isSDK(o: any): o is _95.InterfaceDescriptorSDKType;
        encode(message: _95.InterfaceDescriptor, writer?: import("../binary.ts").BinaryWriter): import("../binary.ts").BinaryWriter;
        decode(input: import("../binary.ts").BinaryReader | Uint8Array, length?: number): _95.InterfaceDescriptor;
        fromJSON(object: any): _95.InterfaceDescriptor;
        toJSON(message: _95.InterfaceDescriptor): import("../json-safe.ts").JsonSafe<_95.InterfaceDescriptor>;
        fromPartial(object: Partial<_95.InterfaceDescriptor>): _95.InterfaceDescriptor;
        fromProtoMsg(message: _95.InterfaceDescriptorProtoMsg): _95.InterfaceDescriptor;
        toProto(message: _95.InterfaceDescriptor): Uint8Array;
        toProtoMsg(message: _95.InterfaceDescriptor): _95.InterfaceDescriptorProtoMsg;
        registerTypeUrl(): void;
    };
    ScalarDescriptor: {
        typeUrl: "/cosmos_proto.ScalarDescriptor";
        is(o: any): o is _95.ScalarDescriptor;
        isSDK(o: any): o is _95.ScalarDescriptorSDKType;
        encode(message: _95.ScalarDescriptor, writer?: import("../binary.ts").BinaryWriter): import("../binary.ts").BinaryWriter;
        decode(input: import("../binary.ts").BinaryReader | Uint8Array, length?: number): _95.ScalarDescriptor;
        fromJSON(object: any): _95.ScalarDescriptor;
        toJSON(message: _95.ScalarDescriptor): import("../json-safe.ts").JsonSafe<_95.ScalarDescriptor>;
        fromPartial(object: Partial<_95.ScalarDescriptor>): _95.ScalarDescriptor;
        fromProtoMsg(message: _95.ScalarDescriptorProtoMsg): _95.ScalarDescriptor;
        toProto(message: _95.ScalarDescriptor): Uint8Array;
        toProtoMsg(message: _95.ScalarDescriptor): _95.ScalarDescriptorProtoMsg;
        registerTypeUrl(): void;
    };
};
//# sourceMappingURL=bundle.d.ts.map