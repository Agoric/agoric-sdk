import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * Message format for SendingAndReceivingMessagesPaused
 * @param paused true if paused, false if not paused
 * @name SendingAndReceivingMessagesPaused
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SendingAndReceivingMessagesPaused
 */
export interface SendingAndReceivingMessagesPaused {
    paused: boolean;
}
export interface SendingAndReceivingMessagesPausedProtoMsg {
    typeUrl: '/circle.cctp.v1.SendingAndReceivingMessagesPaused';
    value: Uint8Array;
}
/**
 * Message format for SendingAndReceivingMessagesPaused
 * @param paused true if paused, false if not paused
 * @name SendingAndReceivingMessagesPausedSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SendingAndReceivingMessagesPaused
 */
export interface SendingAndReceivingMessagesPausedSDKType {
    paused: boolean;
}
/**
 * Message format for SendingAndReceivingMessagesPaused
 * @param paused true if paused, false if not paused
 * @name SendingAndReceivingMessagesPaused
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.SendingAndReceivingMessagesPaused
 */
export declare const SendingAndReceivingMessagesPaused: {
    typeUrl: "/circle.cctp.v1.SendingAndReceivingMessagesPaused";
    is(o: any): o is SendingAndReceivingMessagesPaused;
    isSDK(o: any): o is SendingAndReceivingMessagesPausedSDKType;
    encode(message: SendingAndReceivingMessagesPaused, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SendingAndReceivingMessagesPaused;
    fromJSON(object: any): SendingAndReceivingMessagesPaused;
    toJSON(message: SendingAndReceivingMessagesPaused): JsonSafe<SendingAndReceivingMessagesPaused>;
    fromPartial(object: Partial<SendingAndReceivingMessagesPaused>): SendingAndReceivingMessagesPaused;
    fromProtoMsg(message: SendingAndReceivingMessagesPausedProtoMsg): SendingAndReceivingMessagesPaused;
    toProto(message: SendingAndReceivingMessagesPaused): Uint8Array;
    toProtoMsg(message: SendingAndReceivingMessagesPaused): SendingAndReceivingMessagesPausedProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=sending_and_receiving_messages_paused.d.ts.map