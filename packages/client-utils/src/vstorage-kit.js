import {
  boardSlottingMarshaller,
  makeBoardRemote,
} from '@agoric/vats/tools/board-utils.js';
import { assertAllDefined, tryNow } from '@agoric/internal';
import { makeVStorage } from './vstorage.js';

export { boardSlottingMarshaller };

/**
 * @import {Marshal} from '@endo/marshal';
 * @import {MinimalNetworkConfig} from './network-config.js';
 * @import {TypedPublished} from './types.js';
 * @import {VStorage} from './vstorage.js';
 * @import {AgoricNamesRemotes} from '@agoric/vats/tools/board-utils.js';
 * @import {BoardRemote} from '@agoric/vats/tools/board-utils.js';
 */

/** @deprecated */
export const makeFromBoard = () => {
  const cache = new Map();
  const convertSlotToVal = (boardId, iface) => {
    if (cache.has(boardId)) {
      return cache.get(boardId);
    }
    const val = makeBoardRemote({ boardId, iface });
    cache.set(boardId, val);
    return val;
  };
  return harden({ convertSlotToVal });
};
/** @typedef {ReturnType<typeof makeFromBoard>} IdMap */

/** @deprecated */
export const storageHelper = {
  /** @param { {value: string} | string } txt */
  parseCapData: txt => {
    /** @type {{ value: string }} */
    const { value } = typeof txt === 'string' ? JSON.parse(txt) : txt;
    const specimen = JSON.parse(value);
    const { blockHeight, values } = specimen;
    assert(values, `empty values in specimen ${value}`);
    const capDatas = storageHelper.parseMany(values);
    return { blockHeight, capDatas };
  },
  /**
   * @param { {value: string} | string } txt
   * @param {IdMap} ctx
   */
  unserializeTxt: (txt, ctx) => {
    const { capDatas } = storageHelper.parseCapData(txt);
    return capDatas.map(capData =>
      boardSlottingMarshaller(ctx.convertSlotToVal).fromCapData(capData),
    );
  },
  /** @param {string[]} capDataStrings array of stringified capData */
  parseMany: capDataStrings => {
    assert(capDataStrings && capDataStrings.length);
    /** @type {{ body: string, slots: string[] }[]} */
    const capDatas = capDataStrings.map(s => JSON.parse(s));
    for (const capData of capDatas) {
      assert(typeof capData === 'object' && capData !== null);
      assert('body' in capData && 'slots' in capData);
      assert(typeof capData.body === 'string');
      assert(Array.isArray(capData.slots));
    }
    return capDatas;
  },
};
harden(storageHelper);

/**
 * @deprecated
 * @param {IdMap} ctx
 * @param {VStorage} vstorage
 * @returns {Promise<AgoricNamesRemotes>}
 */
export const makeAgoricNames = async (ctx, vstorage) => {
  assertAllDefined({ ctx, vstorage });
  const reverse = {};
  const entries = await Promise.all(
    ['brand', 'instance', 'vbankAsset'].map(async kind => {
      const content = await vstorage.readLatest(
        `published.agoricNames.${kind}`,
      );
      /** @type {Array<[string, BoardRemote]>} */
      const parts = storageHelper.unserializeTxt(content, ctx).at(-1);
      for (const [name, remote] of parts) {
        if ('getBoardId' in remote) {
          reverse[remote.getBoardId()] = name;
        }
      }
      return [kind, Object.fromEntries(parts)];
    }),
  );
  return { ...Object.fromEntries(entries), reverse };
};

/**
 * @param {object} config
 * @param {VStorage} config.vstorage
 * @param {MinimalNetworkConfig} config.networkConfig
 * @param {Pick<Marshal<string>, 'fromCapData' | 'toCapData'>} [config.marshaller]
 * @alpha
 */
export const makeVstorageKitFromVstorage = ({
  vstorage,
  networkConfig,
  marshaller,
}) => {
  /** @type {IdMap} */
  const fromBoard = marshaller
    ? {
        // XXX Route conversions through a provided marshaller.
        // Note that the fromBoard pattern is deprecated.
        convertSlotToVal: (boardId, iface) => {
          const boardRemote = makeBoardRemote({ boardId, iface });
          // @ts-expect-error TS18048 marshaller won't be undefined here.
          return marshaller.fromCapData(marshaller.toCapData(boardRemote));
        },
      }
    : makeFromBoard();
  marshaller ??= boardSlottingMarshaller(fromBoard.convertSlotToVal);

  /** @type {(txt: string | {value: string}) => unknown} */
  const unserializeHead = txt => {
    const { capDatas } = storageHelper.parseCapData(txt);
    // XXX For backwards compatibility with the old implementation
    // (`storageHelper.unserializeTxt(txt, fromBoard).at(-1)`), parse every
    // capDatas item even though we only care about the last one.
    // This is almost certainly safe to improve in a dedicated PR.
    const values = capDatas.map(capData => marshaller.fromCapData(capData));
    return values.at(-1);
  };

  /**
   * Read latest at path and unmarshal it
   * @template T
   * @type {(path: string) => Promise<T>}
   */
  const readLatestHead = path =>
    // @ts-expect-error cast
    vstorage.readLatest(path).then(unserializeHead);

  /**
   * Read latest at published path and unmarshal it.
   *
   * Note this does not perform a runtime check to verify the shape. The
   * static types come from the spec of what is supposed to be written to
   * vstorage, which is validated in testing of the chain code that is run
   * in consensus.
   *
   * @type {<T extends string>(subpath: T) => Promise<TypedPublished<T>>}
   */
  const readPublished = subpath =>
    // @ts-expect-error cast
    readLatestHead(`published.${subpath}`);

  return {
    fromBoard,
    marshaller,
    networkConfig,
    readLatestHead,
    readPublished,
    unserializeHead,
    vstorage,
  };
};
harden(makeVstorageKitFromVstorage);

/**
 * @param {{ fetch: typeof window.fetch }} io
 * @param {MinimalNetworkConfig} networkConfig
 */
export const makeVstorageKit = ({ fetch }, networkConfig) => {
  const vstorage = tryNow(
    () => makeVStorage({ fetch }, networkConfig),
    err => {
      throw Error(`RPC failure (${networkConfig.rpcAddrs}): ${err.message}`);
    },
  );
  return makeVstorageKitFromVstorage({ vstorage, networkConfig });
};
harden(makeVstorageKit);

/** @typedef {ReturnType<typeof makeVstorageKit>} VstorageKit */
