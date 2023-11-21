// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

/**
 * @type {import('ava').TestFn<
 *   Awaited<ReturnType<typeof makeTestContext>>
 * >}
 */
const test = anyTest;

const makeTestContext = async t => ({});

test.before(async t => (t.context = await makeTestContext(t)));

test('update purse balance across upgrade', async t => {
  t.log('provision a smartWallet for an oracle operator');
  t.log('upgrade zoe');
  t.log(
    'start a new fluxAggregator for something like stATOM, using the address from 1 as one of the oracleAddresses',
  );
  t.log('oracle operator is not notified of new invitation');
  t.pass();
});
