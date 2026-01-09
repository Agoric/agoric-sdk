import { test as rawTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { makeScalarBigMapStore, type Baggage } from '@agoric/vat-data';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { makeNonceManager } from '../src/evm-wallet-handler.ts';

const makeContext = () => {
  const baggage: Baggage = makeScalarBigMapStore('baggage', { durable: true });
  const zone = makeDurableZone(baggage);
  return { zone };
};
type Context = ReturnType<typeof makeContext>;
const test = rawTest as TestFn<Context>;

test.beforeEach(t => {
  t.context = makeContext();
});

test('Nonce Manager - add and remove nonces', t => {
  const { insertNonce, removeExpiredNonces } = makeNonceManager(t.context.zone);

  const now = 1_600_000_000n;
  const walletA = '0xAAAA';

  insertNonce({ walletOwner: walletA, nonce: 2n, deadline: now + 102n });
  t.notThrows(() =>
    insertNonce({ walletOwner: walletA, nonce: 1n, deadline: now + 100n }),
  );
  t.throws(
    () =>
      insertNonce({ walletOwner: walletA, nonce: 1n, deadline: now + 102n }),
    { message: /already used/ },
  );
  removeExpiredNonces(now + 101n);
  t.notThrows(() =>
    insertNonce({ walletOwner: walletA, nonce: 1n, deadline: now + 102n }),
  );
  t.throws(
    () =>
      insertNonce({ walletOwner: walletA, nonce: 1n, deadline: now + 102n }),
    { message: /already used/ },
  );
});
