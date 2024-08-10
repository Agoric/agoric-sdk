import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { heapVowE as E } from '@agoric/vow/vat.js';
import { commonSetup } from '../supports.js';
import type { AmountArg, ChainAddress } from '../../src/orchestration-api.js';
import { prepareMakeTestCOAKit } from './make-test-coa-kit.js';

type TestContext = Awaited<ReturnType<typeof commonSetup>>;

const test = anyTest as TestFn<TestContext>;

test.beforeEach(async t => {
  t.context = await commonSetup(t);
});

test('CosmosOrchestrationAccount - send (to addr on same chain)', async t => {
  const {
    bootstrap,
    brands: { ist },
    utils: { inspectDibcBridge },
  } = t.context;
  const makeTestCOAKit = prepareMakeTestCOAKit(t, bootstrap);
  const account = await makeTestCOAKit();
  t.assert(account, 'account is returned');

  const toAddress: ChainAddress = {
    value: 'cosmos99test',
    chainId: 'cosmoshub-4',
    encoding: 'bech32',
  };

  // single send
  t.is(
    await E(account).send(toAddress, {
      value: 10n,
      denom: 'uatom',
    } as AmountArg),
    undefined,
  );

  // simulate timeout error
  await t.throwsAsync(
    E(account).send(toAddress, { value: 504n, denom: 'uatom' } as AmountArg),
    // TODO #9629 decode error messages
    { message: 'ABCI code: 5: error handling packet: see events for details' },
  );

  // ertp amounts not supported
  await t.throwsAsync(
    E(account).send(toAddress, ist.make(10n) as AmountArg),
    // TODO #9211 lookup denom from brand
    { message: 'Brands not currently supported.' },
  );

  // multi-send (sendAll)
  t.is(
    await E(account).sendAll(toAddress, [
      { value: 10n, denom: 'uatom' } as AmountArg,
      { value: 10n, denom: 'ibc/1234' } as AmountArg,
    ]),
    undefined,
  );

  const { bridgeDowncalls } = await inspectDibcBridge();

  t.is(
    bridgeDowncalls.filter(d => d.method === 'sendPacket').length,
    3,
    'sent 2 successful txs and 1 failed. 1 rejected before sending',
  );
});

test('CosmosOrchestrationAccount - not yet implemented', async t => {
  const { bootstrap } = await commonSetup(t);
  const makeTestCOAKit = prepareMakeTestCOAKit(t, bootstrap);
  const account = await makeTestCOAKit();
  const mockChainAddress: ChainAddress = {
    value: 'cosmos1test',
    chainId: 'cosmoshub-4',
    encoding: 'bech32',
  };
  const mockAmountArg: AmountArg = { value: 10n, denom: 'uatom' };

  await t.throwsAsync(E(account).getBalances(), {
    message: 'not yet implemented',
  });
  // XXX consider, positioning amount + address args the same for .send and .transfer
  await t.throwsAsync(E(account).transfer(mockAmountArg, mockChainAddress), {
    message: 'not yet implemented',
  });
  await t.throwsAsync(E(account).transferSteps(mockAmountArg, null as any), {
    message: 'not yet implemented',
  });
  await t.throwsAsync(E(account).withdrawRewards(), {
    message: 'Not Implemented. Try using withdrawReward.',
  });
});
