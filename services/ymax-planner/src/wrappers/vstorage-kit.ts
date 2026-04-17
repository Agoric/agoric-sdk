import {
  makeVStorage,
  makeVstorageKitFromVstorage,
  type MinimalNetworkConfig,
} from '@agoric/client-utils';
import { mustMatch, tryNow } from '@agoric/internal';
import { StreamCellShape } from '@agoric/internal/src/lib-chainStorage.js';
import {
  QueryChildrenResponse,
  QueryDataResponse,
} from '@agoric/cosmic-proto/agoric/vstorage/query.js';
import { verifyStatus } from './utils.ts';

type QueryChildrenMetaResponse = QueryMetaResponseBase & {
  result: QueryChildrenResponse;
};

type QueryMetaResponseBase = { blockHeight?: bigint; log?: string };

type QueryDataMetaResponse = QueryMetaResponseBase & {
  result: QueryDataResponse;
};

const makeVstorageKitWrapper = (
  { fetch }: { fetch: typeof globalThis.fetch },
  networkConfig: MinimalNetworkConfig,
) => {
  const vstorage = tryNow(
    () => makeVstoragetWrapper({ fetch }, networkConfig),
    err => {
      throw Error(`RPC failure (${networkConfig.rpcAddrs}): ${err.message}`);
    },
  );
  return makeVstorageKitFromVstorage({ vstorage, networkConfig });
};

const makeVstoragetWrapper = (
  {
    fetch,
    now = Date.now,
  }: {
    fetch: typeof globalThis.fetch;
    now?: () => number;
  },
  networkConfig: MinimalNetworkConfig,
) => {
  const [priorityRpcAddress, fallbackRpcAddress] = networkConfig.rpcAddrs;

  let fallbackVstorage: ReturnType<typeof makeVStorage>;

  const vstorage = makeVStorage(
    { fetch },
    {
      chainName: networkConfig.chainName,
      rpcAddrs: [priorityRpcAddress],
    },
  );

  if (fallbackRpcAddress)
    fallbackVstorage = makeVStorage(
      { fetch },
      {
        chainName: networkConfig.chainName,
        rpcAddrs: [fallbackRpcAddress],
      },
    );

  const readStorage = async <T extends 'children' | 'data'>(
    path?: string,
    config?: { height?: bigint | number; kind?: T },
  ) => {
    let curr: T extends 'children' ? QueryChildrenResponse : QueryDataResponse;

    await null;

    try {
      if (fallbackVstorage) await verifyStatus({ now }, priorityRpcAddress);

      curr = await vstorage.readStorage(path, {
        height: config?.height,
        kind: config?.kind,
      });
    } catch (err) {
      if (fallbackVstorage) {
        console.error(
          `Error while fetching ${path} from storage, possibly falling back`,
          err,
        );

        curr = await fallbackVstorage.readStorage(path, {
          height: config?.height,
          kind: config?.kind,
        });
      } else throw err;
    }

    return curr;
  };

  const readStorageMeta = async <T extends 'children' | 'data'>(
    path?: string,
    config?: { height?: bigint | number; kind?: T },
  ) => {
    let curr: T extends 'children'
      ? QueryChildrenMetaResponse
      : QueryDataMetaResponse;

    await null;

    try {
      if (fallbackVstorage) await verifyStatus({ now }, priorityRpcAddress);

      curr = await vstorage.readStorageMeta(path, {
        height: config?.height,
        kind: config?.kind,
      });
    } catch (err) {
      if (fallbackVstorage) {
        console.error(
          `Error while fetching ${path} metadata from storage, possibly falling back`,
          err,
        );

        curr = await fallbackVstorage.readStorageMeta(path, {
          height: config?.height,
          kind: config?.kind,
        });
      } else throw err;
    }

    return curr;
  };

  const vstorageWrapper = {
    keys: async (path = 'published') =>
      readStorage(path, { kind: 'children' }).then(({ children }) => children),
    readAt: async (path: string, height?: number) => {
      const response = await readStorage(path, { kind: 'data', height });
      const cell = harden(JSON.parse(response.value));
      mustMatch(cell, StreamCellShape);
      return cell;
    },
    readFully: async (path: string, minHeight?: number) => {
      // undefined the first iteration, to query at the highest
      let blockHeight: string | undefined;
      const parts: Array<unknown> = [];

      await null;

      do {
        let values: Array<unknown>;
        try {
          ({ blockHeight, values } = await vstorageWrapper.readAt(
            path,
            blockHeight === undefined ? undefined : Number(blockHeight) - 1,
          ));
        } catch (err) {
          if (
            err.codespace === 'sdk' &&
            err.code === 18 &&
            err.message.match(/pruned/)
          )
            break;

          throw err;
        }

        parts.push(values.reverse());

        if (minHeight && Number(blockHeight) <= Number(minHeight)) break;
      } while (Number(blockHeight));

      return parts.flat() as Array<string>;
    },
    readLatest: (path = 'published') => readStorage(path, { kind: 'data' }),
    readStorage,
    readStorageMeta,
  };

  return vstorageWrapper;
};

harden(makeVstorageKitWrapper);

export default makeVstorageKitWrapper;
