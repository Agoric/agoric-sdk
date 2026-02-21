export { boardSlottingMarshaller };
export function makeFromBoard(): {
    convertSlotToVal: (boardId: any, iface: any) => any;
};
export namespace storageHelper {
    function parseCapData(txt: {
        value: string;
    } | string): {
        blockHeight: any;
        capDatas: {
            body: string;
            slots: string[];
        }[];
    };
    function unserializeTxt(txt: {
        value: string;
    } | string, ctx: IdMap): any[];
    function parseMany(capDataStrings: string[]): {
        body: string;
        slots: string[];
    }[];
}
export function makeAgoricNames(ctx: IdMap, vstorage: VStorage): Promise<AgoricNamesRemotes>;
export function makeVstorageKitFromVstorage({ vstorage, networkConfig, marshaller, }: {
    vstorage: VStorage;
    networkConfig: MinimalNetworkConfig;
    marshaller?: Pick<Marshal<string>, "toCapData" | "fromCapData"> | undefined;
}): {
    fromBoard: {
        convertSlotToVal: (boardId: any, iface: any) => any;
    };
    marshaller: Pick<Marshal<string>, "toCapData" | "fromCapData">;
    networkConfig: MinimalNetworkConfig;
    readLatestHead: <T extends unknown = any>(path: string) => Promise<T>;
    readPublished: <T extends string>(subpath: T) => Promise<TypedPublished<T>>;
    unserializeHead: (txt: string | {
        value: string;
    }) => unknown;
    vstorage: {
        readStorageMeta: <T extends "children" | "data">(path?: string, { kind, height }?: {
            kind?: T | undefined;
            height?: number | bigint | undefined;
        }) => Promise<T extends "children" ? QueryChildrenMetaResponse : QueryDataMetaResponse>;
        readStorage: <T extends "children" | "data">(path?: string, opts?: {
            kind?: T | undefined;
            height?: number | bigint | undefined;
        }) => Promise<T extends "children" ? import("@agoric/cosmic-proto/agoric/vstorage/query.js").QueryChildrenResponse : import("@agoric/cosmic-proto/agoric/vstorage/query.js").QueryDataResponse>;
        readLatest(path?: string): Promise<import("@agoric/cosmic-proto/agoric/vstorage/query.js").QueryDataResponse>;
        keys(path?: string): Promise<string[]>;
        readAt(path: string, height?: number): Promise<import("@agoric/internal/src/lib-chainStorage.js").StreamCell<unknown>>;
        readFully(path: string, minHeight?: number | string): Promise<string[]>;
    };
};
export function makeVstorageKit({ fetch }: {
    fetch: typeof window.fetch;
}, networkConfig: MinimalNetworkConfig): {
    fromBoard: {
        convertSlotToVal: (boardId: any, iface: any) => any;
    };
    marshaller: Pick<Marshal<string>, "toCapData" | "fromCapData">;
    networkConfig: MinimalNetworkConfig;
    readLatestHead: <T extends unknown = any>(path: string) => Promise<T>;
    readPublished: <T extends string>(subpath: T) => Promise<TypedPublished<T>>;
    unserializeHead: (txt: string | {
        value: string;
    }) => unknown;
    vstorage: {
        readStorageMeta: <T extends "children" | "data">(path?: string, { kind, height }?: {
            kind?: T | undefined;
            height?: number | bigint | undefined;
        }) => Promise<T extends "children" ? QueryChildrenMetaResponse : QueryDataMetaResponse>;
        readStorage: <T extends "children" | "data">(path?: string, opts?: {
            kind?: T | undefined;
            height?: number | bigint | undefined;
        }) => Promise<T extends "children" ? import("@agoric/cosmic-proto/agoric/vstorage/query.js").QueryChildrenResponse : import("@agoric/cosmic-proto/agoric/vstorage/query.js").QueryDataResponse>;
        readLatest(path?: string): Promise<import("@agoric/cosmic-proto/agoric/vstorage/query.js").QueryDataResponse>;
        keys(path?: string): Promise<string[]>;
        readAt(path: string, height?: number): Promise<import("@agoric/internal/src/lib-chainStorage.js").StreamCell<unknown>>;
        readFully(path: string, minHeight?: number | string): Promise<string[]>;
    };
};
export type IdMap = ReturnType<typeof makeFromBoard>;
export type VstorageKit = ReturnType<typeof makeVstorageKit>;
import { boardSlottingMarshaller } from '@agoric/internal/src/marshal/board-client-utils.js';
import type { VStorage } from './vstorage.js';
import type { AgoricNamesRemotes } from '@agoric/vats/tools/board-utils.js';
import type { MinimalNetworkConfig } from './network-config.js';
import type { Marshal } from '@endo/marshal';
import type { TypedPublished } from './types.js';
//# sourceMappingURL=vstorage-kit.d.ts.map