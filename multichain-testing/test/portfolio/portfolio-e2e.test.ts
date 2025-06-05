import anyTest from '@endo/ses-ava/prepare-endo.js';

import { makeTracer } from '@agoric/internal';
import type { ExecutionContext } from 'ava';
import { commonSetup } from '../support.ts';

import { meta } from '../../../packages/portfolio-contract/src/portfolio.contract.meta.ts';
import type { TestFn } from 'ava';

const trace = makeTracer('MCYMX');

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

const makeTestContext = async (t: ExecutionContext) => {
  const common = await commonSetup(t, {
    // TODO: config with just agoric, noble
    config: `../config.fusdc.yaml`,
  });
  const { startContract } = common;
  const { chainInfo, assetInfo } = common.commonBuilderOpts;
  await startContract(
    meta.name,
    '../packages/portfolio-contract/scripts/portfolio.build.js',
    { chainInfo, assetInfo },
  );

  return common;
};

test.before(async t => (t.context = await makeTestContext(t)));
test.after(async t => {
  trace('TODO: delete test keys?');
});

test.serial('contract instance is in vstorage', async t => {
  const { vstorageClient } = t.context;

  // XXX this is already checked by startContract
  const instance = Object.fromEntries(
    await vstorageClient.queryData('published.agoricNames.instance'),
  );
  t.log('instances', Object.keys(instance));
  t.true('ymax0' in instance);
});
