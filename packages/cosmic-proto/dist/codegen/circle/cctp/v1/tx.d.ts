import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * @name MsgDepositForBurn
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MsgDepositForBurn
 */
export interface MsgDepositForBurn {
    from: string;
    amount: string;
    destinationDomain: number;
    mintRecipient: Uint8Array;
    burnToken: string;
}
export interface MsgDepositForBurnProtoMsg {
    typeUrl: '/circle.cctp.v1.MsgDepositForBurn';
    value: Uint8Array;
}
/**
 * @name MsgDepositForBurnSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MsgDepositForBurn
 */
export interface MsgDepositForBurnSDKType {
    from: string;
    amount: string;
    destination_domain: number;
    mint_recipient: Uint8Array;
    burn_token: string;
}
/**
 * @name MsgDepositForBurnResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MsgDepositForBurnResponse
 */
export interface MsgDepositForBurnResponse {
    nonce: bigint;
}
export interface MsgDepositForBurnResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.MsgDepositForBurnResponse';
    value: Uint8Array;
}
/**
 * @name MsgDepositForBurnResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MsgDepositForBurnResponse
 */
export interface MsgDepositForBurnResponseSDKType {
    nonce: bigint;
}
/**
 * @name MsgDepositForBurnWithCaller
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MsgDepositForBurnWithCaller
 */
export interface MsgDepositForBurnWithCaller {
    from: string;
    amount: string;
    destinationDomain: number;
    mintRecipient: Uint8Array;
    burnToken: string;
    destinationCaller: Uint8Array;
}
export interface MsgDepositForBurnWithCallerProtoMsg {
    typeUrl: '/circle.cctp.v1.MsgDepositForBurnWithCaller';
    value: Uint8Array;
}
/**
 * @name MsgDepositForBurnWithCallerSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MsgDepositForBurnWithCaller
 */
export interface MsgDepositForBurnWithCallerSDKType {
    from: string;
    amount: string;
    destination_domain: number;
    mint_recipient: Uint8Array;
    burn_token: string;
    destination_caller: Uint8Array;
}
/**
 * @name MsgDepositForBurnWithCallerResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MsgDepositForBurnWithCallerResponse
 */
export interface MsgDepositForBurnWithCallerResponse {
    nonce: bigint;
}
export interface MsgDepositForBurnWithCallerResponseProtoMsg {
    typeUrl: '/circle.cctp.v1.MsgDepositForBurnWithCallerResponse';
    value: Uint8Array;
}
/**
 * @name MsgDepositForBurnWithCallerResponseSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MsgDepositForBurnWithCallerResponse
 */
export interface MsgDepositForBurnWithCallerResponseSDKType {
    nonce: bigint;
}
/**
 * @name MsgDepositForBurn
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MsgDepositForBurn
 */
export declare const MsgDepositForBurn: {
    typeUrl: "/circle.cctp.v1.MsgDepositForBurn";
    aminoType: "cctp/DepositForBurn";
    is(o: any): o is MsgDepositForBurn;
    isSDK(o: any): o is MsgDepositForBurnSDKType;
    encode(message: MsgDepositForBurn, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDepositForBurn;
    fromJSON(object: any): MsgDepositForBurn;
    toJSON(message: MsgDepositForBurn): JsonSafe<MsgDepositForBurn>;
    fromPartial(object: Partial<MsgDepositForBurn>): MsgDepositForBurn;
    fromProtoMsg(message: MsgDepositForBurnProtoMsg): MsgDepositForBurn;
    toProto(message: MsgDepositForBurn): Uint8Array;
    toProtoMsg(message: MsgDepositForBurn): MsgDepositForBurnProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgDepositForBurnResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MsgDepositForBurnResponse
 */
export declare const MsgDepositForBurnResponse: {
    typeUrl: "/circle.cctp.v1.MsgDepositForBurnResponse";
    is(o: any): o is MsgDepositForBurnResponse;
    isSDK(o: any): o is MsgDepositForBurnResponseSDKType;
    encode(message: MsgDepositForBurnResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDepositForBurnResponse;
    fromJSON(object: any): MsgDepositForBurnResponse;
    toJSON(message: MsgDepositForBurnResponse): JsonSafe<MsgDepositForBurnResponse>;
    fromPartial(object: Partial<MsgDepositForBurnResponse>): MsgDepositForBurnResponse;
    fromProtoMsg(message: MsgDepositForBurnResponseProtoMsg): MsgDepositForBurnResponse;
    toProto(message: MsgDepositForBurnResponse): Uint8Array;
    toProtoMsg(message: MsgDepositForBurnResponse): MsgDepositForBurnResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgDepositForBurnWithCaller
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MsgDepositForBurnWithCaller
 */
export declare const MsgDepositForBurnWithCaller: {
    typeUrl: "/circle.cctp.v1.MsgDepositForBurnWithCaller";
    aminoType: "cctp/DepositForBurnWithCaller";
    is(o: any): o is MsgDepositForBurnWithCaller;
    isSDK(o: any): o is MsgDepositForBurnWithCallerSDKType;
    encode(message: MsgDepositForBurnWithCaller, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDepositForBurnWithCaller;
    fromJSON(object: any): MsgDepositForBurnWithCaller;
    toJSON(message: MsgDepositForBurnWithCaller): JsonSafe<MsgDepositForBurnWithCaller>;
    fromPartial(object: Partial<MsgDepositForBurnWithCaller>): MsgDepositForBurnWithCaller;
    fromProtoMsg(message: MsgDepositForBurnWithCallerProtoMsg): MsgDepositForBurnWithCaller;
    toProto(message: MsgDepositForBurnWithCaller): Uint8Array;
    toProtoMsg(message: MsgDepositForBurnWithCaller): MsgDepositForBurnWithCallerProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgDepositForBurnWithCallerResponse
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.MsgDepositForBurnWithCallerResponse
 */
export declare const MsgDepositForBurnWithCallerResponse: {
    typeUrl: "/circle.cctp.v1.MsgDepositForBurnWithCallerResponse";
    is(o: any): o is MsgDepositForBurnWithCallerResponse;
    isSDK(o: any): o is MsgDepositForBurnWithCallerResponseSDKType;
    encode(message: MsgDepositForBurnWithCallerResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDepositForBurnWithCallerResponse;
    fromJSON(object: any): MsgDepositForBurnWithCallerResponse;
    toJSON(message: MsgDepositForBurnWithCallerResponse): JsonSafe<MsgDepositForBurnWithCallerResponse>;
    fromPartial(object: Partial<MsgDepositForBurnWithCallerResponse>): MsgDepositForBurnWithCallerResponse;
    fromProtoMsg(message: MsgDepositForBurnWithCallerResponseProtoMsg): MsgDepositForBurnWithCallerResponse;
    toProto(message: MsgDepositForBurnWithCallerResponse): Uint8Array;
    toProtoMsg(message: MsgDepositForBurnWithCallerResponse): MsgDepositForBurnWithCallerResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map