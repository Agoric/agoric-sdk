// @ts-check
import '@agoric/install-ses';
import test from 'ava';
import { makeRendezvousNamespace } from '../../lib/ag-solo/vats/rendezvous';

test('rendezvous with self', async t => {
  const makeRendezvous = makeRendezvousNamespace();
  const self = makeRendezvous('self');
  const rendezvous = self.startRendezvous(self.getLocalAddress(), 'initiator');
  const resultP = rendezvous.getResult();
  const rendezvousFailed = {
    instanceOf: Error,
    message: /^Rendezvous with .* not completed/,
  };
  t.throws(() => self.rendezvousWith('other', 'foo'), rendezvousFailed);
  t.deepEqual(self.rendezvousWithMany(['self'], ['first']), {
    self: 'initiator',
  });
  t.throws(() => self.rendezvousWith('self', 'second'), rendezvousFailed);
  t.deepEqual(await resultP, 'first');
});

test('rendezvous three way', async t => {
  const makeRendezvous = makeRendezvousNamespace();

  const solo = makeRendezvous('solo');
  const testnet = makeRendezvous('testnet');
  const mainnet = makeRendezvous('mainnet');

  const rendezvousMany = solo.startRendezvousMany(
    ['testnet', 'mainnet'],
    ['toTestnetFromSolo', 'toMainnetFromSolo'],
  );
  const notifier = rendezvousMany.getNotifier();

  t.deepEqual(
    testnet.rendezvousWith('solo', 'toSoloFromTestnet'),
    'toTestnetFromSolo',
  );
  const update0 = await notifier.getUpdateSince();
  t.deepEqual(update0.value, { testnet: 'toSoloFromTestnet' });

  t.deepEqual(
    mainnet.rendezvousWith('solo', 'toSoloFromMainnet'),
    'toMainnetFromSolo',
  );
  const update1 = await notifier.getUpdateSince(update0.updateCount);
  t.deepEqual(update1.value, {
    testnet: 'toSoloFromTestnet',
    mainnet: 'toSoloFromMainnet',
  });

  t.throws(() => rendezvousMany.cancel(), {
    message: 'Cannot finish after termination.',
    instanceOf: Error,
  });
  const update2 = await notifier.getUpdateSince(update1.updateCount);
  t.deepEqual(update2.value, {
    testnet: 'toSoloFromTestnet',
    mainnet: 'toSoloFromMainnet',
  });
});
