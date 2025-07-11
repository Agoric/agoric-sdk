import { makeWalletFactoryDriver } from '@aglocal/boot/tools/drivers.js';
import { fetchCoreEvalRelease } from '@aglocal/boot/tools/supports.js';
import { makeMockBridgeKit } from '@agoric/cosmic-swingset/tools/test-bridge-utils.ts';
import { makeCosmicSwingsetTestKit } from '@agoric/cosmic-swingset/tools/test-kit.js';
import {
  type FakeStorageKit,
  makeFakeStorageKit,
} from '@agoric/internal/src/storage-test-utils.js';
import {
  type AgoricNamesRemotes,
  makeAgoricNamesRemotesFromFakeStorage,
} from '@agoric/vats/tools/board-utils.js';
import { Fail } from '@endo/errors';

export const makeWalletFactoryContext = async (
  parameters: Parameters<typeof makeCosmicSwingsetTestKit>[0] &
    Partial<{ storage: FakeStorageKit }>,
) => {
  let storage = parameters.storage;
  let handleBridgeSend = parameters.handleBridgeSend;

  if (!storage) storage = makeFakeStorageKit('bootstrapTests');

  if (!handleBridgeSend)
    ({ handleBridgeSend } = makeMockBridgeKit({ storageKit: storage }));

  const swingsetTestKit = await makeCosmicSwingsetTestKit({
    ...parameters,
    handleBridgeSend,
  });

  const { EV, evaluateCoreProposal, queueAndRun } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');

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
      await evaluateCoreProposal(materials);
    } finally {
      refreshAgoricNamesRemotes();
    }
  };

  const walletFactoryDriver = await makeWalletFactoryDriver(
    { EV, queueAndRun },
    storage,
    agoricNamesRemotes,
  );

  return {
    agoricNamesRemotes,
    evalReleasedProposal,
    refreshAgoricNamesRemotes,
    storage,
    swingsetTestKit,
    walletFactoryDriver,
  };
};

export type WalletFactoryTestContext = Awaited<
  ReturnType<typeof makeWalletFactoryContext>
>;
