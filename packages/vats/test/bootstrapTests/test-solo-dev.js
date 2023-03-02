// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { PowerFlags } from '../../src/core/basic-behaviors.js';

import { makeSwingsetTestKit } from './supports.js';

const { keys } = Object;
/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeDefaultTestContext>>>}
 */
const test = anyTest;

const makeDefaultTestContext = async t => {
  const swingsetTestKit = await makeSwingsetTestKit(
    t,
    '@agoric/vats/decentral-demo-config.json',
  );
  return swingsetTestKit;
};

test.before(async t => (t.context = await makeDefaultTestContext(t)));

// Goal: test that prod config does not expose mailbox access.
// But on the JS side, aside from vattp, prod config exposes mailbox access
// just as much as dev, so we can't test that here.

test('sim/demo config provides home with .myAddressNameAdmin', async t => {
  const devToolKeys = ['behaviors', 'chainTimerService', 'faucet'];

  // TODO: cross-check these with docs and/or deploy-script-support
  const homeKeys = [
    'agoricNames',
    'bank',
    'board',
    'ibcport',
    'myAddressNameAdmin',
    'namesByAddress',
    'priceAuthority',
    'zoe',
    ...devToolKeys,
  ].sort();

  const { EV } = t.context.runUtils;
  await t.notThrowsAsync(EV.vat('bootstrap').consumeItem('provisioning'));
  t.log('bootstrap produced provisioning vat');
  const clientCreator = await EV.vat('bootstrap').consumeItem('clientCreator');
  const addr = 'agoric123';
  const clientFacet = await EV(clientCreator).createClientFacet(
    'user1',
    addr,
    PowerFlags.REMOTE_WALLET,
  );
  const home = await EV(clientFacet).getChainBundle();
  const actual = await EV(home.myAddressNameAdmin).getMyAddress();
  t.is(actual, addr, 'my address');
  t.deepEqual(keys(home).sort(), homeKeys);
});
