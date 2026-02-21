import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * Message format for BurnMessages
 * @param version the message body version
 * @param burn_token the burn token address on source domain as bytes32
 * @param mint_recipient the mint recipient address as bytes32
 * @param amount the burn amount
 * @param message_sender the message sender
 * @name BurnMessage
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurnMessage
 */
export interface BurnMessage {
    version: number;
    burnToken: Uint8Array;
    mintRecipient: Uint8Array;
    amount: string;
    messageSender: Uint8Array;
}
export interface BurnMessageProtoMsg {
    typeUrl: '/circle.cctp.v1.BurnMessage';
    value: Uint8Array;
}
/**
 * Message format for BurnMessages
 * @param version the message body version
 * @param burn_token the burn token address on source domain as bytes32
 * @param mint_recipient the mint recipient address as bytes32
 * @param amount the burn amount
 * @param message_sender the message sender
 * @name BurnMessageSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurnMessage
 */
export interface BurnMessageSDKType {
    version: number;
    burn_token: Uint8Array;
    mint_recipient: Uint8Array;
    amount: string;
    message_sender: Uint8Array;
}
/**
 * Message format for BurnMessages
 * @param version the message body version
 * @param burn_token the burn token address on source domain as bytes32
 * @param mint_recipient the mint recipient address as bytes32
 * @param amount the burn amount
 * @param message_sender the message sender
 * @name BurnMessage
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.BurnMessage
 */
export declare const BurnMessage: {
    typeUrl: "/circle.cctp.v1.BurnMessage";
    is(o: any): o is BurnMessage;
    isSDK(o: any): o is BurnMessageSDKType;
    encode(message: BurnMessage, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): BurnMessage;
    fromJSON(object: any): BurnMessage;
    toJSON(message: BurnMessage): JsonSafe<BurnMessage>;
    fromPartial(object: Partial<BurnMessage>): BurnMessage;
    fromProtoMsg(message: BurnMessageProtoMsg): BurnMessage;
    toProto(message: BurnMessage): Uint8Array;
    toProtoMsg(message: BurnMessage): BurnMessageProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=burn_message.d.ts.map