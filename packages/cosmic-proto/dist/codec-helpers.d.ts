import type { BinaryReader, BinaryWriter, JsonSafe } from './codegen/index.js';
import type { MessageBody, TypedJson } from './helpers.js';
export type ProtoMsg<TU = string> = {
    readonly typeUrl: TU;
    readonly value: Uint8Array;
};
export interface EncodeObject<TU = string> {
    readonly typeUrl: TU;
    readonly value: MessageBody<TU>;
}
export interface TypedAmino<TU = string, MT = MessageBody<TU>> {
    readonly type: TU;
    readonly value: MT;
}
export interface Proto3Codec<TU = string, MT = MessageBody<TU>, IM = MT> {
    readonly typeUrl: TU;
    encode(message: IM, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MT;
    fromJSON(object: any): MT;
    toJSON(message: IM): JsonSafe<MT>;
    fromPartial(object: Partial<MT>): MT;
    fromProtoMsg(message: ProtoMsg<TU>): MT;
    toProto(message: IM): Uint8Array;
    toProtoMsg(message: IM): ProtoMsg<TU>;
}
/**
 * Wraps a codec, adding built-in partial message support.
 *
 * @template [TU=string]
 * @template [MT=MessageBody<TU>]
 * @param {Proto3Codec<TU, MT>} codec The original codec.
 * @param {string[]} [nonNullishFields] The properties that should be replaced with `{}` if nullish.
 * @returns {Proto3Codec<TU, MT, Partial<MT>>} A new codec that can handle partial input messages.
 */
export declare const Codec: <TU = string, MT = MessageBody<TU>>(codec: Proto3Codec<TU, MT>, nonNullishFields?: string[]) => Proto3Codec<TU, MT, Partial<MT>>;
export interface Proto3CodecHelper<TU = string, MT = MessageBody<TU>> extends Proto3Codec<TU, MT, Partial<MT>> {
    typedJson(message: Partial<MT>): TypedJson<TU>;
    typedAmino(message: Partial<MT>): TypedAmino<TU, MT>;
    typedEncode(message: Partial<MT>): EncodeObject<TU>;
    fromTyped(object: unknown, embeddedFields?: {
        [valueProp: string]: string;
    }): MT;
}
/**
 * Wraps a codec, adding built-in partial message support and helpers for common
 * manipulations.
 *
 * @template [TU=string]
 * @template [MT=MessageBody<TU>]
 * @param {Proto3Codec<TU, MT>} codec The original codec.
 * @param {string[]} [nonNullishFields] The fields that should be replaced with `{}` if nullish.
 * @returns {Proto3CodecHelper<TU, MT>} Codec and helpers that can handle partial input messages.
 */
export declare const CodecHelper: <TU = string, MT = MessageBody<TU>>(codec: Proto3Codec<TU, MT>, nonNullishFields?: string[]) => Proto3CodecHelper<TU, MT>;
//# sourceMappingURL=codec-helpers.d.ts.map