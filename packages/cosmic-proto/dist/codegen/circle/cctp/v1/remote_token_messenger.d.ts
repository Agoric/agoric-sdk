import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * @param domain_id
 * @param address
 * @name RemoteTokenMessenger
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.RemoteTokenMessenger
 */
export interface RemoteTokenMessenger {
    domainId: number;
    address: Uint8Array;
}
export interface RemoteTokenMessengerProtoMsg {
    typeUrl: '/circle.cctp.v1.RemoteTokenMessenger';
    value: Uint8Array;
}
/**
 * @param domain_id
 * @param address
 * @name RemoteTokenMessengerSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.RemoteTokenMessenger
 */
export interface RemoteTokenMessengerSDKType {
    domain_id: number;
    address: Uint8Array;
}
/**
 * @param domain_id
 * @param address
 * @name RemoteTokenMessenger
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.RemoteTokenMessenger
 */
export declare const RemoteTokenMessenger: {
    typeUrl: "/circle.cctp.v1.RemoteTokenMessenger";
    is(o: any): o is RemoteTokenMessenger;
    isSDK(o: any): o is RemoteTokenMessengerSDKType;
    encode(message: RemoteTokenMessenger, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RemoteTokenMessenger;
    fromJSON(object: any): RemoteTokenMessenger;
    toJSON(message: RemoteTokenMessenger): JsonSafe<RemoteTokenMessenger>;
    fromPartial(object: Partial<RemoteTokenMessenger>): RemoteTokenMessenger;
    fromProtoMsg(message: RemoteTokenMessengerProtoMsg): RemoteTokenMessenger;
    toProto(message: RemoteTokenMessenger): Uint8Array;
    toProtoMsg(message: RemoteTokenMessenger): RemoteTokenMessengerProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=remote_token_messenger.d.ts.map