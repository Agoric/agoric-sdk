// @file types for the client-utils package
// NB: this doesn't follow best practices for TS in JS because this package will likely soon be written in TS

import type { SmartWalletPublishedPathValue } from '@agoric/smart-wallet/src/types.js';
import type { AgoricNamesPublishedPathTypes } from '@agoric/vats/src/types.js';
import type { Marshal } from '@endo/marshal';
import type { MinimalNetworkConfig } from './network-config.js';
import type { VStorage } from './vstorage.js';

/**
 * Additional published path mappings supplied by VstorageKit consumers.
 *
 * Keys can be either exact path strings or template literal path types.
 */
export type PublishedPathTypes = Record<string, unknown>;

/**
 * Built-in published path mappings for exact `agoricNames.*` paths.
 */
export type CorePublishedPathTypes = AgoricNamesPublishedPathTypes;

/**
 * Built-in typing for values under the `agoricNames.` and `wallet.`
 * hierarchies.
 */
export type CoreTypedPublished<P extends string> =
  P extends keyof CorePublishedPathTypes
    ? CorePublishedPathTypes[P]
    : SmartWalletPublishedPathValue<P> extends never
      ? unknown
      : SmartWalletPublishedPathValue<P>;

/**
 * Utility type for the value that results from unmarshalling the latest value
 * at a vstorage `published` path.
 */
export type TypedPublishedFor<
  P extends string,
  Ext extends PublishedPathTypes = Record<never, never>,
> = P extends keyof Ext ? Ext[P] : CoreTypedPublished<P>;

type IdMapLike = {
  convertSlotToVal: (boardId: string, iface?: string) => unknown;
};

export type VstorageKit<Ext extends PublishedPathTypes = Record<never, never>> =
  {
    fromBoard: IdMapLike;
    marshaller: Pick<Marshal<string>, 'fromCapData' | 'toCapData'>;
    networkConfig: MinimalNetworkConfig;
    readLatestHead: <T = any>(path: string) => Promise<T>;
    readPublished: <P extends string>(
      subpath: P,
    ) => Promise<TypedPublishedFor<P, Ext>>;
    unserializeHead: (txt: string | { value: string }) => unknown;
    vstorage: VStorage;
  };

/**
 * @deprecated Use `TypedPublishedFor<P, Ext>` with `VstorageKit<Ext>` instead.
 */
export type TypedPublished<P extends string> = CoreTypedPublished<P>;
