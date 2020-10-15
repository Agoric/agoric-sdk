// @ts-check
import '@agoric/install-ses';
import test from 'ava';
import { makeRendezvousNamespace } from '../../lib/ag-solo/vats/rendezvous';

const rendezvousFailed = {
  instanceOf: Error,
  message: /^Rendezvous with .* not completed/,
};

test('rendezvous with self', async t => {
  const makeRendezvous = makeRendezvousNamespace();
  const self = makeRendezvous('self');
  const rendezvous = self.startRendezvous(self.getLocalAddress(), 'initiator');
  const resultP = rendezvous.getResult();
  t.throws(() => self.completeRendezvous('other', 'foo'), rendezvousFailed);
  t.is(self.completeRendezvous(['self'], 'first'), 'initiator');
  t.throws(() => self.completeRendezvous('self', 'second'), rendezvousFailed);
  t.is(await resultP, 'first');
});

test('rendezvous three way', async t => {
  const makeRendezvous = makeRendezvousNamespace();

  const solo = makeRendezvous('solo');
  const testnet = makeRendezvous('testnet');
  const mainnet = makeRendezvous('mainnet');

  const rendezvous = solo.startRendezvous(
    ['testnet', 'mainnet'],
    'fromSoloToTestnetOrMainnet',
  );
  const result = rendezvous.getResult();

  t.is(
    testnet.completeRendezvous('solo', 'toSoloFromTestnet'),
    'fromSoloToTestnetOrMainnet',
  );
  t.is(await result, 'toSoloFromTestnet');

  t.is(
    mainnet.completeRendezvous('solo', 'toSoloFromMainnet'),
    'fromSoloToTestnetOrMainnet',
  );
});

test('rendezvous cancel', async t => {
  const makeRendezvous = makeRendezvousNamespace();

  const solo = makeRendezvous('solo');
  const testnet = makeRendezvous('testnet');
  const mainnet = makeRendezvous('mainnet');

  const rendezvous = solo.startRendezvous(['testnet', 'mainnet'], 'fromSolo');

  rendezvous.cancel();
  await t.throwsAsync(() => rendezvous.getResult(), rendezvousFailed);

  t.throws(
    () => testnet.completeRendezvous('solo', 'toSoloFromTestnet'),
    rendezvousFailed,
  );
  t.throws(
    () => mainnet.completeRendezvous('solo', 'toSoloFromMainnet'),
    rendezvousFailed,
  );
});

test('rendezvous race three way', async t => {
  const makeRendezvous = makeRendezvousNamespace();

  const solo = makeRendezvous('solo');
  const testnet = makeRendezvous('testnet');
  const mainnet = makeRendezvous('mainnet');

  const rendezvous = solo.startRendezvous('testnet', 'fromSolo');

  t.is(testnet.completeRendezvous('solo', 'toSoloFromTestnet'), 'fromSolo');
  t.is(await rendezvous.getResult(), 'toSoloFromTestnet');

  t.throws(
    () => mainnet.completeRendezvous('solo', 'toSoloFromMainnet'),
    rendezvousFailed,
  );
});
