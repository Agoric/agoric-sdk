import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * Generic message header for all messages passing through CCTP
 * The message body is dynamically-sized to support custom message body
 * formats. Other fields must be fixed-size to avoid hash collisions.
 *
 * Padding: uintNN fields are left-padded, and bytesNN fields are right-padded.
 *
 * @param version the version of the message format
 * @param source_domain domain of home chain
 * @param destination_domain domain of destination chain
 * @param nonce destination-specific nonce
 * @param sender address of sender on source chain as bytes32
 * @param recipient address of recipient on destination chain as bytes32
 * @param destination_caller address of caller on destination chain as bytes32
 * @param message_body raw bytes of message body
 * @name Message
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.Message
 */
export interface Message {
    version: number;
    sourceDomain: number;
    destinationDomain: number;
    nonce: bigint;
    sender: Uint8Array;
    recipient: Uint8Array;
    destinationCaller: Uint8Array;
    messageBody: Uint8Array;
}
export interface MessageProtoMsg {
    typeUrl: '/circle.cctp.v1.Message';
    value: Uint8Array;
}
/**
 * Generic message header for all messages passing through CCTP
 * The message body is dynamically-sized to support custom message body
 * formats. Other fields must be fixed-size to avoid hash collisions.
 *
 * Padding: uintNN fields are left-padded, and bytesNN fields are right-padded.
 *
 * @param version the version of the message format
 * @param source_domain domain of home chain
 * @param destination_domain domain of destination chain
 * @param nonce destination-specific nonce
 * @param sender address of sender on source chain as bytes32
 * @param recipient address of recipient on destination chain as bytes32
 * @param destination_caller address of caller on destination chain as bytes32
 * @param message_body raw bytes of message body
 * @name MessageSDKType
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.Message
 */
export interface MessageSDKType {
    version: number;
    source_domain: number;
    destination_domain: number;
    nonce: bigint;
    sender: Uint8Array;
    recipient: Uint8Array;
    destination_caller: Uint8Array;
    message_body: Uint8Array;
}
/**
 * Generic message header for all messages passing through CCTP
 * The message body is dynamically-sized to support custom message body
 * formats. Other fields must be fixed-size to avoid hash collisions.
 *
 * Padding: uintNN fields are left-padded, and bytesNN fields are right-padded.
 *
 * @param version the version of the message format
 * @param source_domain domain of home chain
 * @param destination_domain domain of destination chain
 * @param nonce destination-specific nonce
 * @param sender address of sender on source chain as bytes32
 * @param recipient address of recipient on destination chain as bytes32
 * @param destination_caller address of caller on destination chain as bytes32
 * @param message_body raw bytes of message body
 * @name Message
 * @package circle.cctp.v1
 * @see proto type: circle.cctp.v1.Message
 */
export declare const Message: {
    typeUrl: "/circle.cctp.v1.Message";
    is(o: any): o is Message;
    isSDK(o: any): o is MessageSDKType;
    encode(message: Message, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Message;
    fromJSON(object: any): Message;
    toJSON(message: Message): JsonSafe<Message>;
    fromPartial(object: Partial<Message>): Message;
    fromProtoMsg(message: MessageProtoMsg): Message;
    toProto(message: Message): Uint8Array;
    toProtoMsg(message: Message): MessageProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=message.d.ts.map