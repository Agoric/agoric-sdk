import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Config is the config object of the x/auth/tx package.
 * @name Config
 * @package cosmos.tx.config.v1
 * @see proto type: cosmos.tx.config.v1.Config
 */
export interface Config {
    /**
     * skip_ante_handler defines whether the ante handler registration should be skipped in case an app wants to override
     * this functionality.
     */
    skipAnteHandler: boolean;
    /**
     * skip_post_handler defines whether the post handler registration should be skipped in case an app wants to override
     * this functionality.
     */
    skipPostHandler: boolean;
}
export interface ConfigProtoMsg {
    typeUrl: '/cosmos.tx.config.v1.Config';
    value: Uint8Array;
}
/**
 * Config is the config object of the x/auth/tx package.
 * @name ConfigSDKType
 * @package cosmos.tx.config.v1
 * @see proto type: cosmos.tx.config.v1.Config
 */
export interface ConfigSDKType {
    skip_ante_handler: boolean;
    skip_post_handler: boolean;
}
/**
 * Config is the config object of the x/auth/tx package.
 * @name Config
 * @package cosmos.tx.config.v1
 * @see proto type: cosmos.tx.config.v1.Config
 */
export declare const Config: {
    typeUrl: "/cosmos.tx.config.v1.Config";
    aminoType: "cosmos-sdk/Config";
    is(o: any): o is Config;
    isSDK(o: any): o is ConfigSDKType;
    encode(message: Config, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Config;
    fromJSON(object: any): Config;
    toJSON(message: Config): JsonSafe<Config>;
    fromPartial(object: Partial<Config>): Config;
    fromProtoMsg(message: ConfigProtoMsg): Config;
    toProto(message: Config): Uint8Array;
    toProtoMsg(message: Config): ConfigProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=config.d.ts.map