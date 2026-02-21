/** @import {SmartWalletKit} from './smart-wallet-kit.js';  */
/** @deprecated use `makeSmartWalletKit` */
export const makeWalletUtils: ({ fetch, delay, names, }: {
    fetch: typeof globalThis.fetch;
    delay: (ms: number) => Promise<void>;
    names?: boolean | undefined;
}, networkConfig: import("./network-config.js").MinimalNetworkConfig) => Promise<{
    agoricNames: import("@agoric/vats/tools/board-utils.js").AgoricNamesRemotes;
    getLastUpdate: (addr: string) => Promise<import("@agoric/smart-wallet/src/smartWallet.js").UpdateRecord>;
    getCurrentWalletRecord: (addr: string) => Promise<import("@agoric/smart-wallet/src/smartWallet.js").CurrentWalletRecord>;
    storedWalletState: (from: string, minHeight?: number | string) => Promise<{
        invitationsReceived: Map<string, {
            acceptedIn?: import("@agoric/smart-wallet/src/offers.js").OfferId;
            description: string;
            instance: import("@agoric/zoe").Instance;
        }>;
        offerStatuses: Map<import("@agoric/smart-wallet/src/offers.js").OfferId, import("@agoric/smart-wallet/src/offers.js").OfferStatus>;
        balances: Map<import("@agoric/ertp").Brand, import("@agoric/ertp").Amount>;
    }>;
    pollOffer: (from: string, id: string | number, minHeight?: number | string, untilNumWantsSatisfied?: boolean) => Promise<import("@agoric/smart-wallet/src/offers.js").OfferStatus>;
    fromBoard: {
        convertSlotToVal: (boardId: any, iface: any) => any;
    };
    marshaller: Pick<import("@endo/marshal").Marshal<string>, "toCapData" | "fromCapData">;
    networkConfig: import("./network-config.js").MinimalNetworkConfig;
    readLatestHead: <T extends unknown = any>(path: string) => Promise<T>;
    readPublished: <T extends string>(subpath: T) => Promise<import("./types.js").TypedPublished<T>>;
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
}>;
//# sourceMappingURL=wallet-utils.d.ts.map