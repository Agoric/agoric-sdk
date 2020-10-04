import '@agoric/install-ses';
import test from 'ava';
import { makeRendezvousMaker } from '../../lib/ag-solo/vats/rendezvous';

test('rendezvous with self', async t => {
  const makeRendezvous = makeRendezvousMaker();
  const self = makeRendezvous('self');
  const { notifier } = self.initiateRendezvous({
    [self.getLocalAddress()]: 'initiator',
  });
  t.deepEqual(self.rendezvousWith({ other: 'foo' }), {});
  t.deepEqual(self.rendezvousWith({ self: 'first' }), {
    self: 'initiator',
  });
  t.deepEqual(self.rendezvousWith({ self: 'second' }), {});
  const update0 = await notifier.getUpdateSince();
  t.deepEqual(update0, { updateCount: undefined, value: { self: 'first' } });
});

test('rendezvous three way', async t => {
  const makeRendezvous = makeRendezvousMaker();

  const solo = makeRendezvous('solo');
  const testnet = makeRendezvous('testnet');
  const mainnet = makeRendezvous('mainnet');

  const { notifier, completer } = solo.initiateRendezvous({
    testnet: 'toTestnetFromSolo',
    mainnet: 'toMainnetFromSolo',
  });

  t.deepEqual(testnet.rendezvousWith({ solo: 'toSoloFromTestnet' }), {
    solo: 'toTestnetFromSolo',
  });
  const update0 = await notifier.getUpdateSince();
  t.deepEqual(update0.value, { testnet: 'toSoloFromTestnet' });

  t.deepEqual(mainnet.rendezvousWith({ solo: 'toSoloFromMainnet' }), {
    solo: 'toMainnetFromSolo',
  });
  const update1 = await notifier.getUpdateSince(update0.updateCount);
  t.deepEqual(update1.value, {
    testnet: 'toSoloFromTestnet',
    mainnet: 'toSoloFromMainnet',
  });

  t.throws(() => completer.complete(), {
    message: 'Cannot finish after termination.',
    instanceOf: Error,
  });
  const update2 = await notifier.getUpdateSince(update1.updateCount);
  t.deepEqual(update2.value, {
    testnet: 'toSoloFromTestnet',
    mainnet: 'toSoloFromMainnet',
  });
});
