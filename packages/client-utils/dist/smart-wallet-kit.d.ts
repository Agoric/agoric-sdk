export function makeSmartWalletKitFromVstorageKit(vsk: VstorageKit, { names }?: {
    names?: boolean | undefined;
}): Promise<{
    agoricNames: AgoricNamesRemotes;
    getLastUpdate: (addr: string) => Promise<UpdateRecord>;
    getCurrentWalletRecord: (addr: string) => Promise<CurrentWalletRecord>;
    storedWalletState: (from: string, minHeight?: number | string) => Promise<{
        invitationsReceived: Map<string, {
            acceptedIn?: OfferId;
            description: string;
            instance: Instance;
        }>;
        offerStatuses: Map<OfferId, OfferStatus>;
        balances: Map<Brand, Amount>;
    }>;
    pollOffer: (from: string, id: string | number, minHeight?: number | string, untilNumWantsSatisfied?: boolean) => Promise<OfferStatus>;
    fromBoard: {
        convertSlotToVal: (boardId: any, iface: any) => any;
    };
    marshaller: Pick<import("@endo/marshal").Marshal<string>, "toCapData" | "fromCapData">;
    networkConfig: MinimalNetworkConfig;
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
export function makeSmartWalletKit({ fetch, delay, names, }: {
    fetch: typeof globalThis.fetch;
    delay: (ms: number) => Promise<void>;
    names?: boolean | undefined;
}, networkConfig: MinimalNetworkConfig): Promise<{
    agoricNames: AgoricNamesRemotes;
    getLastUpdate: (addr: string) => Promise<UpdateRecord>;
    getCurrentWalletRecord: (addr: string) => Promise<CurrentWalletRecord>;
    storedWalletState: (from: string, minHeight?: number | string) => Promise<{
        invitationsReceived: Map<string, {
            acceptedIn?: OfferId;
            description: string;
            instance: Instance;
        }>;
        offerStatuses: Map<OfferId, OfferStatus>;
        balances: Map<Brand, Amount>;
    }>;
    pollOffer: (from: string, id: string | number, minHeight?: number | string, untilNumWantsSatisfied?: boolean) => Promise<OfferStatus>;
    fromBoard: {
        convertSlotToVal: (boardId: any, iface: any) => any;
    };
    marshaller: Pick<import("@endo/marshal").Marshal<string>, "toCapData" | "fromCapData">;
    networkConfig: MinimalNetworkConfig;
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
export type SmartWalletKit = EReturn<typeof makeSmartWalletKit>;
import type { VstorageKit } from './vstorage-kit.js';
import type { AgoricNamesRemotes } from '@agoric/vats/tools/board-utils.js';
import type { UpdateRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import type { CurrentWalletRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import type { OfferId } from '@agoric/smart-wallet/src/offers.js';
import type { Instance } from '@agoric/zoe';
import type { OfferStatus } from '@agoric/smart-wallet/src/offers.js';
import type { Brand } from '@agoric/ertp/src/types.js';
import type { Amount } from '@agoric/ertp/src/types.js';
import type { MinimalNetworkConfig } from './network-config.js';
import type { EReturn } from '@endo/far';
//# sourceMappingURL=smart-wallet-kit.d.ts.map