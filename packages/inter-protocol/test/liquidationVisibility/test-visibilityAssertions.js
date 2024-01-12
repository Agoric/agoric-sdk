import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E, Far } from '@endo/far';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { defaultMarshaller } from '@agoric/internal/src/storage-test-utils.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeMockChainStorageRoot } from '../supports.js';
import { assertNodeInStorage, assertStorageData } from './assertions.js';

const writeToStorage = async (storageNode, data) => {
  await E(storageNode).setValue(
    JSON.stringify(defaultMarshaller.toCapData(harden(data))),
  );
};

test('storage-node-created', async t => {
  const storageRoot = makeMockChainStorageRoot();

  await assertNodeInStorage({
    t,
    rootNode: storageRoot,
    desiredNode: 'test',
    expected: false,
  });

  const testNode = await E(storageRoot).makeChildNode('test');
  await writeToStorage(testNode, { dummy: 'foo' });

  await assertNodeInStorage({
    t,
    rootNode: storageRoot,
    desiredNode: 'test',
    expected: true,
  });
});

test('storage-assert-data', async t => {
  const storageRoot = makeMockChainStorageRoot();
  const moolaKit = makeIssuerKit('Moola');

  const testNode = await E(storageRoot).makeChildNode('dummyNode');
  await writeToStorage(testNode, {
    moolaForReserve: AmountMath.make(moolaKit.brand, 100n),
  });

  await assertStorageData({
    t,
    path: 'dummyNode',
    storageRoot,
    expected: { moolaForReserve: AmountMath.make(moolaKit.brand, 100n) },
  });
});

test('map-test-auction', async t => {
  const vaultData = makeScalarBigMapStore('Vaults');

  vaultData.init(
    Far('key', { getId: () => 1, getPhase: () => 'liquidated' }),
    harden({
      collateral: 19n,
      debt: 18n,
    }),
  );
  vaultData.init(
    Far('key1', { getId: () => 2, getPhase: () => 'liquidated' }),
    harden({
      collateral: 19n,
      debt: 18n,
    }),
  );
  vaultData.init(
    Far('key2', { getId: () => 3, getPhase: () => 'liquidated' }),
    harden({
      collateral: 19n,
      debt: 18n,
    }),
  );
  vaultData.init(
    Far('key3', { getId: () => 4, getPhase: () => 'liquidated' }),
    harden({
      collateral: 19n,
      debt: 18n,
    }),
  );

  const preAuction = [...vaultData.entries()].map(([vault, data]) => [
    vault.getId(),
    { ...data, phase: vault.getPhase() },
  ]);
  t.log(preAuction);

  t.pass();
});
