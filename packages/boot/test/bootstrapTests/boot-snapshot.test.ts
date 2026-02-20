import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { BridgeId } from '@agoric/internal';
import { AckBehavior, makeSwingsetTestKit } from '../../tools/supports.js';

const test = anyTest as TestFn;

const sortedEntries = (entries: [string, string][]) =>
  [...entries].sort(([a], [b]) => a.localeCompare(b));

test.serial('boot snapshot restore is equivalent and isolated', async t => {
  const base = await makeSwingsetTestKit(t.log, undefined, {
    configSpecifier: '@agoric/vm-config/decentral-itest-vaults-config.json',
  });
  let forkA: Awaited<ReturnType<typeof makeSwingsetTestKit>> | undefined;
  let forkB: Awaited<ReturnType<typeof makeSwingsetTestKit>> | undefined;
  try {
    const snapshot = base.makeSnapshot();
    forkA = await base.forkFromSnapshot(snapshot);
    forkB = await base.forkFromSnapshot(snapshot);

    t.is(forkA.getCrankNumber(), base.getCrankNumber());
    t.is(forkB.getCrankNumber(), base.getCrankNumber());
    t.deepEqual(
      sortedEntries([...forkA.storage.data.entries()]),
      sortedEntries([...base.storage.data.entries()]),
    );
    t.deepEqual(
      sortedEntries([...forkB.storage.data.entries()]),
      sortedEntries([...base.storage.data.entries()]),
    );

    const crankA0 = forkA.getCrankNumber();
    const crankB0 = forkB.getCrankNumber();
    await forkA.runUtils.EV.vat('bootstrap').consumeItem('zoe');
    t.true(forkA.getCrankNumber() > crankA0);
    t.is(forkB.getCrankNumber(), crankB0);

    forkA.bridgeUtils.setAckBehavior(
      BridgeId.DIBC,
      'startChannelOpenInit',
      AckBehavior.Never,
    );
    t.is(
      forkA.bridgeUtils.lookupAckBehavior(
        BridgeId.DIBC,
        'startChannelOpenInit',
      ),
      AckBehavior.Never,
    );
    t.is(
      forkB.bridgeUtils.lookupAckBehavior(
        BridgeId.DIBC,
        'startChannelOpenInit',
      ),
      AckBehavior.Queued,
    );
  } finally {
    await Promise.all([base.shutdown(), forkA?.shutdown(), forkB?.shutdown()]);
  }
});
