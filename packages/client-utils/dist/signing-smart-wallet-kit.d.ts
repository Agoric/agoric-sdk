import type { OfferSpec, OfferStatus } from '@agoric/smart-wallet/src/offers.js';
import type { BridgeAction } from '@agoric/smart-wallet/src/smartWallet.js';
import type { DeliverTxResponse, SignerData, SigningStargateClient, StdFee } from '@cosmjs/stargate';
import type { EReturn } from '@endo/far';
import type { SmartWalletKit } from './smart-wallet-kit.js';
/**
 * Augment a read-only SmartWalletKit with signing ability
 * @alpha
 */
export declare const makeSigningSmartWalletKitFromClient: ({ smartWalletKit: walletUtils, address, client, }: {
    smartWalletKit: SmartWalletKit;
    address: string;
    client: SigningStargateClient;
}) => Promise<{
    query: {
        readPublished: <T extends string>(subpath: T) => Promise<import("./types.js").TypedPublished<T>>;
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
        getLastUpdate: () => Promise<import("@agoric/smart-wallet/src/smartWallet.js").UpdateRecord>;
        getCurrentWalletRecord: () => Promise<import("@agoric/smart-wallet/src/smartWallet.js").CurrentWalletRecord>;
        pollOffer: (id: string | number, minHeight?: string | number | undefined, untilNumWantsSatisfied?: boolean | undefined) => Promise<OfferStatus>;
    };
    address: string;
    /**
     * Send an `executeOffer` bridge action and promise the resulting offer
     * record once the offer has settled. If you don't need the offer record,
     * consider using `sendBridgeAction` instead.
     */
    executeOffer: (offer: OfferSpec, fee?: StdFee, memo?: string, signerData?: SignerData) => Promise<OfferStatus>;
    sendBridgeAction: (action: BridgeAction, fee?: StdFee, memo?: string, signerData?: SignerData) => Promise<DeliverTxResponse>;
    agoricNames: import("@agoric/vats/tools/board-utils.js").AgoricNamesRemotes;
    getLastUpdate: (addr: string) => Promise<import("@agoric/smart-wallet/src/smartWallet.js").UpdateRecord>;
    getCurrentWalletRecord: (addr: string) => Promise<import("@agoric/smart-wallet/src/smartWallet.js").CurrentWalletRecord>;
    pollOffer: (from: string, id: string | number, minHeight?: number | string, untilNumWantsSatisfied?: boolean) => Promise<OfferStatus>;
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
/**
 * Augment a read-only SmartWalletKit with signing ability
 */
export declare const makeSigningSmartWalletKit: ({ connectWithSigner, walletUtils, }: {
    connectWithSigner: typeof SigningStargateClient.connectWithSigner;
    walletUtils: SmartWalletKit;
}, MNEMONIC: string) => Promise<{
    query: {
        readPublished: <T extends string>(subpath: T) => Promise<import("./types.js").TypedPublished<T>>;
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
        getLastUpdate: () => Promise<import("@agoric/smart-wallet/src/smartWallet.js").UpdateRecord>;
        getCurrentWalletRecord: () => Promise<import("@agoric/smart-wallet/src/smartWallet.js").CurrentWalletRecord>;
        pollOffer: (id: string | number, minHeight?: string | number | undefined, untilNumWantsSatisfied?: boolean | undefined) => Promise<OfferStatus>;
    };
    address: string;
    /**
     * Send an `executeOffer` bridge action and promise the resulting offer
     * record once the offer has settled. If you don't need the offer record,
     * consider using `sendBridgeAction` instead.
     */
    executeOffer: (offer: OfferSpec, fee?: StdFee, memo?: string, signerData?: SignerData) => Promise<OfferStatus>;
    sendBridgeAction: (action: BridgeAction, fee?: StdFee, memo?: string, signerData?: SignerData) => Promise<DeliverTxResponse>;
    agoricNames: import("@agoric/vats/tools/board-utils.js").AgoricNamesRemotes;
    getLastUpdate: (addr: string) => Promise<import("@agoric/smart-wallet/src/smartWallet.js").UpdateRecord>;
    getCurrentWalletRecord: (addr: string) => Promise<import("@agoric/smart-wallet/src/smartWallet.js").CurrentWalletRecord>;
    pollOffer: (from: string, id: string | number, minHeight?: number | string, untilNumWantsSatisfied?: boolean) => Promise<OfferStatus>;
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
export type SigningSmartWalletKit = EReturn<typeof makeSigningSmartWalletKit>;
export type { SmartWalletKit };
//# sourceMappingURL=signing-smart-wallet-kit.d.ts.map