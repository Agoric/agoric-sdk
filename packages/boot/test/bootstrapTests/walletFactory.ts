import { createRequire } from 'node:module';

import { fetchCoreEvalRelease } from '@aglocal/boot/tools/supports.js';
import { makeWalletFactoryDriver } from '@aglocal/boot/tools/drivers.js';
import type { TypedPublished } from '@agoric/client-utils';
import {
  AckBehavior,
  makeMockBridgeKit,
} from '@agoric/cosmic-swingset/tools/test-bridge-utils.ts';
import { makeCosmicSwingsetTestKit } from '@agoric/cosmic-swingset/tools/test-kit.js';
import { BridgeId, NonNullish } from '@agoric/internal';
import { unmarshalFromVstorage } from '@agoric/internal/src/marshal.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { loadSwingsetConfigFile } from '@agoric/swingset-vat';
import {
  boardSlottingMarshaller,
  slotToBoardRemote,
} from '@agoric/vats/tools/board-utils.js';
import {
  type AgoricNamesRemotes,
  makeAgoricNamesRemotesFromFakeStorage,
} from '@agoric/vats/tools/board-utils.js';
import { Fail } from '@endo/errors';

const { resolve: resolvePath } = createRequire(import.meta.url);
const { fromCapData } = boardSlottingMarshaller(slotToBoardRemote);

export const makeWalletFactoryContext = async ({
  configSpecifier = '@agoric/vm-config/decentral-main-vaults-config.json',
  ...testkitOpts
}: Partial<
  Parameters<typeof makeCosmicSwingsetTestKit>[0] & {
    configSpecifier: string;
  }
>) => {
  const inboundQueue: Array<[bridgeId: BridgeId, arg1: unknown]> = [];
  const storage = makeFakeStorageKit('bootstrapTests');

  const bridgeReceiverOpts: Parameters<typeof makeMockBridgeKit>[0] = {
    ackBehaviors: {
      [BridgeId.DIBC]: {
        startChannelOpenInit: AckBehavior.Queued,
      },
    },
    bech32Prefix: 'cosmos',
    inbound: undefined,
    pushInbound: (bridgeId, arg) => inboundQueue.push([bridgeId, arg]),
    storageKit: storage,
  };

  const swingsetTestKit = await makeCosmicSwingsetTestKit({
    configOverrides: NonNullish(
      await loadSwingsetConfigFile(resolvePath(configSpecifier)),
    ),
    mockBridgeReceiver: makeMockBridgeKit(bridgeReceiverOpts),
    ...testkitOpts,
  });

  const { bridgeInbound, evaluateProposal, runNextBlock, runUtils } =
    swingsetTestKit;
  bridgeReceiverOpts.inbound = bridgeInbound;
  await runNextBlock();

  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes: AgoricNamesRemotes =
    makeAgoricNamesRemotesFromFakeStorage(storage);
  const refreshAgoricNamesRemotes = () => {
    Object.assign(
      agoricNamesRemotes,
      makeAgoricNamesRemotesFromFakeStorage(storage),
    );
  };
  agoricNamesRemotes.brand.ATOM || Fail`ATOM missing from agoricNames`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  const evalReleasedProposal = async (release: string, name: string) => {
    const materials = await fetchCoreEvalRelease({
      repo: 'Agoric/agoric-sdk',
      release,
      name,
    });
    try {
      await evaluateProposal(materials);
    } finally {
      refreshAgoricNamesRemotes();
    }
  };

  const readLatestEntryFromStorage = (path: string) => {
    let data;
    try {
      data = unmarshalFromVstorage(storage.data, path, fromCapData, -1);
    } catch {
      // fall back to regular JSON
      const raw = storage.getValues(path).at(-1);
      assert(raw, `No data found for ${path}`);
      data = JSON.parse(raw);
    }
    return data;
  };

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );

  return {
    ...swingsetTestKit,
    agoricNamesRemotes,
    bridgeUtils: {
      getInboundQueueLength: () => inboundQueue.length,
      flushInboundQueue: async (max: number = Number.POSITIVE_INFINITY) => {
        await Promise.resolve();

        let i = 0;
        for (i = 0; i < max; i += 1) {
          const args = inboundQueue.shift();
          if (!args) break;

          await runUtils.queueAndRun(() => bridgeInbound(...args), true);
        }

        return i;
      },
    },
    evalReleasedProposal,
    readPublished: <T extends string>(subpath: T) =>
      readLatestEntryFromStorage(`published.${subpath}`) as TypedPublished<T>,
    refreshAgoricNamesRemotes,
    storage,
    walletFactoryDriver,
  };
};

export type WalletFactoryTestContext = Awaited<
  ReturnType<typeof makeWalletFactoryContext>
>;
