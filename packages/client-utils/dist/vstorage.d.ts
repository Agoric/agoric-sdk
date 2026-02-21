export function makeAbciQuery<T extends "data" | "children">(path?: string, { kind, height }?: {
    kind?: T | undefined;
    height?: number | bigint | undefined;
}): `/abci_query?${string}`;
export function makeVStorage({ fetch }: {
    fetch: typeof window.fetch;
}, config: MinimalNetworkConfig): {
    readStorageMeta: <T extends "children" | "data">(path?: string, { kind, height }?: {
        kind?: T | undefined;
        height?: number | bigint | undefined;
    }) => Promise<T extends "children" ? QueryChildrenMetaResponse : QueryDataMetaResponse>;
    readStorage: <T extends "children" | "data">(path?: string, opts?: {
        kind?: T | undefined;
        height?: number | bigint | undefined;
    }) => Promise<T extends "children" ? QueryChildrenResponse : QueryDataResponse>;
    /**
     *
     * @param {string} path
     * @returns {Promise<QueryDataResponse>} latest vstorage value at path
     */
    readLatest(path?: string): Promise<QueryDataResponse>;
    /**
     * Keys of children at the path
     *
     * @param {string} path
     * @returns {Promise<string[]>}
     */
    keys(path?: string): Promise<string[]>;
    /**
     * @param {string} path
     * @param {number} [height] default is highest
     * @returns {Promise<StreamCell<unknown>>}
     */
    readAt(path: string, height?: number): Promise<StreamCell<unknown>>;
    /**
     * Read values going back as far as available
     *
     * @param {string} path
     * @param {number | string} [minHeight]
     * @returns {Promise<string[]>}
     */
    readFully(path: string, minHeight?: number | string): Promise<string[]>;
};
export type QueryMetaResponseBase = {
    blockHeight?: bigint;
    log?: string;
};
export type QueryChildrenMetaResponse = QueryMetaResponseBase & {
    result: QueryChildrenResponse;
};
export type QueryDataMetaResponse = QueryMetaResponseBase & {
    result: QueryDataResponse;
};
export type VStorage = ReturnType<typeof makeVStorage>;
import type { MinimalNetworkConfig } from './network-config.js';
import { QueryChildrenResponse } from '@agoric/cosmic-proto/agoric/vstorage/query.js';
import { QueryDataResponse } from '@agoric/cosmic-proto/agoric/vstorage/query.js';
import type { StreamCell } from '@agoric/internal/src/lib-chainStorage.js';
//# sourceMappingURL=vstorage.d.ts.map