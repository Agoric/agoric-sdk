/**
 * Decodes a protobuf message from the given buffer.
 *
 * @param {Buffer} buffer
 */
export function decodeProtobuf(buffer: Buffer): {
    value: {};
    bytesRead: number;
};
/**
 * Decodes a protobuf message from the given base64-encoded data.
 *
 * @param {string} base64String
 */
export function decodeProtobufBase64(base64String: string): {
    value: {};
    bytesRead: number;
};
//# sourceMappingURL=protobuf-decoder.d.ts.map