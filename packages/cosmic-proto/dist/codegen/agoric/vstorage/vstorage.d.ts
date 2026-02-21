import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * Data is the vstorage node data.
 * @name Data
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.Data
 */
export interface Data {
    value: string;
}
export interface DataProtoMsg {
    typeUrl: '/agoric.vstorage.Data';
    value: Uint8Array;
}
/**
 * Data is the vstorage node data.
 * @name DataSDKType
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.Data
 */
export interface DataSDKType {
    value: string;
}
/**
 * Children are the immediate names (just one level deep) of subnodes leading to
 * more data from a given vstorage node.
 * @name Children
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.Children
 */
export interface Children {
    children: string[];
}
export interface ChildrenProtoMsg {
    typeUrl: '/agoric.vstorage.Children';
    value: Uint8Array;
}
/**
 * Children are the immediate names (just one level deep) of subnodes leading to
 * more data from a given vstorage node.
 * @name ChildrenSDKType
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.Children
 */
export interface ChildrenSDKType {
    children: string[];
}
/**
 * Data is the vstorage node data.
 * @name Data
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.Data
 */
export declare const Data: {
    typeUrl: "/agoric.vstorage.Data";
    is(o: any): o is Data;
    isSDK(o: any): o is DataSDKType;
    encode(message: Data, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Data;
    fromJSON(object: any): Data;
    toJSON(message: Data): JsonSafe<Data>;
    fromPartial(object: Partial<Data>): Data;
    fromProtoMsg(message: DataProtoMsg): Data;
    toProto(message: Data): Uint8Array;
    toProtoMsg(message: Data): DataProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Children are the immediate names (just one level deep) of subnodes leading to
 * more data from a given vstorage node.
 * @name Children
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.Children
 */
export declare const Children: {
    typeUrl: "/agoric.vstorage.Children";
    is(o: any): o is Children;
    isSDK(o: any): o is ChildrenSDKType;
    encode(message: Children, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Children;
    fromJSON(object: any): Children;
    toJSON(message: Children): JsonSafe<Children>;
    fromPartial(object: Partial<Children>): Children;
    fromProtoMsg(message: ChildrenProtoMsg): Children;
    toProto(message: Children): Uint8Array;
    toProtoMsg(message: Children): ChildrenProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=vstorage.d.ts.map