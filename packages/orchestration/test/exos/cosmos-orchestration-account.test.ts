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
  await t.throwsAsync(E(account).send(mockChainAddress, mockAmountArg), {
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
