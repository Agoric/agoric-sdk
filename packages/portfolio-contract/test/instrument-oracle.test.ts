// prepare-test-env has to go first
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  defaultSerializer,
  documentStorageSchema,
} from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { ROOT_STORAGE_PATH } from '@agoric/orchestration/tools/contract-tests.js';
import { makeHeapZone } from '@agoric/zone';
import { E } from '@endo/far';
import { prepareInstrumentOracle } from '../src/instrument-oracle.exo.ts';
import { setupTrader } from './contract-setup.ts';

test('instrument oracle publishes a valid TVL update', t => {
  const published: Array<{
    poolKey: string;
    status: { tvlUsd: bigint; asOf: number };
  }> = [];
  const makeOracle = prepareInstrumentOracle(
    makeHeapZone(),
    (poolKey, status) => published.push({ poolKey, status }),
  );
  const oracle = makeOracle();

  oracle.submitTvlUpdate('Aave_Base', 12_345_679n, 1_754_521_200);

  t.deepEqual(published, [
    {
      poolKey: 'Aave_Base',
      status: { tvlUsd: 12_345_679n, asOf: 1_754_521_200 },
    },
  ]);
});

test('instrument oracle rejects unregistered instruments', t => {
  const makeOracle = prepareInstrumentOracle(makeHeapZone(), () => {});
  const oracle = makeOracle();

  const error = t.throws(() =>
    oracle.submitTvlUpdate('Unknown_Base' as 'Aave_Base', 1n, 1),
  );
  t.regex(error.message, /unregistered instrument/);
});

test('instrument oracle requires monotonically increasing timestamps per pool', t => {
  const makeOracle = prepareInstrumentOracle(makeHeapZone(), () => {});
  const oracle = makeOracle();
  oracle.submitTvlUpdate('Aave_Base', 1n, 10);

  for (const asOf of [9, 10]) {
    const error = t.throws(() => oracle.submitTvlUpdate('Aave_Base', 2n, asOf));
    t.regex(error.message, /is not newer than/);
  }

  t.notThrows(() => oracle.submitTvlUpdate('Aave_Ethereum', 2n, 10));
});

test('instrument oracle validates Nat TVL and Unix-second timestamp', t => {
  const makeOracle = prepareInstrumentOracle(makeHeapZone(), () => {});
  const oracle = makeOracle();

  t.throws(() => oracle.submitTvlUpdate('Aave_Base', -1n, 1));
  t.throws(() => oracle.submitTvlUpdate('Aave_Base', 1n, 1.5));
});

test('instrument oracle invitation publishes repeatedly and is revocable', async t => {
  const { started, common, zoe } = await setupTrader(t);
  const { creatorFacet } = started;
  const invitation = await E(creatorFacet).makeInstrumentOracleInvitation();
  const seat = await E(zoe).offer(invitation, {});
  const oracle = await E(seat).getOfferResult();

  await E(oracle).submitTvlUpdate('Aave_Base', 12_345_679n, 1_754_521_200);
  await E(oracle).submitTvlUpdate('Aave_Base', 12_600_000n, 1_754_521_260);
  await eventLoopIteration();

  await documentStorageSchema(t, common.bootstrap.storage, {
    pattern: `${ROOT_STORAGE_PATH}.`,
    replacement: 'published.',
    node: 'instruments',
    owner: 'ymax',
    showValue: defaultSerializer.parse,
  });
  t.deepEqual(
    common.bootstrap.storage.getDeserialized(
      `${ROOT_STORAGE_PATH}.instruments.Aave_Base`,
    ),
    [
      { tvlUsd: 12_345_679n, asOf: 1_754_521_200 },
      { tvlUsd: 12_600_000n, asOf: 1_754_521_260 },
    ],
  );

  t.true(await E(creatorFacet).revokeInstrumentOracle());
  await t.throwsAsync(
    E(oracle).submitTvlUpdate('Aave_Base', 12_700_000n, 1_754_521_320),
    { message: /revoked/ },
  );
});

test('revocation invalidates an unredeemed oracle invitation', async t => {
  const { started, zoe } = await setupTrader(t);
  const { creatorFacet } = started;
  const invitation = await E(creatorFacet).makeInstrumentOracleInvitation();

  t.false(await E(creatorFacet).revokeInstrumentOracle());
  const seat = await E(zoe).offer(invitation, {});
  await t.throwsAsync(E(seat).getOfferResult(), { message: /revoked/ });
});

test('replacement invalidates an older unredeemed oracle invitation', async t => {
  const { started, zoe } = await setupTrader(t);
  const { creatorFacet } = started;
  const staleInvitation =
    await E(creatorFacet).makeInstrumentOracleInvitation();
  const replacementInvitation =
    await E(creatorFacet).makeInstrumentOracleInvitation();

  const staleSeat = await E(zoe).offer(staleInvitation, {});
  await t.throwsAsync(E(staleSeat).getOfferResult(), { message: /revoked/ });

  const replacementSeat = await E(zoe).offer(replacementInvitation, {});
  const oracle = await E(replacementSeat).getOfferResult();
  await t.notThrowsAsync(
    E(oracle).submitTvlUpdate('Aave_Base', 1n, 1_754_521_200),
  );
});
