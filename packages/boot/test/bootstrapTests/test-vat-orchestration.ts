import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { ExecutionContext, TestFn } from 'ava';
import { createRequire } from 'module';
import { BridgeId } from '@agoric/internal';
import type { start as stakeAtomStart } from '@agoric/orchestration/src/contracts/stakeAtom.contract.js';
import { makeWalletFactoryContext } from './walletFactory.ts';
import { makeBridge } from './ibcBridgeMock.js';

const { assign, entries } = Object;

const nodeRequire = createRequire(import.meta.url);
const assets = {
  ibcServerMock: nodeRequire.resolve('./ibcServerMock.js'),
  ibcClientMock: nodeRequire.resolve('./ibcClientMock.js'),
};

const makeTestContext = async (t: ExecutionContext) => {
  const { bridgeHandler } = makeBridge(t);
  return makeWalletFactoryContext(t, {
    [BridgeId.DIBC]: obj => bridgeHandler.toBridge(obj),
  });
};

type DefaultTestContext = Awaited<ReturnType<typeof makeTestContext>>;
type StakeAtomPublicFacet = Awaited<
  ReturnType<typeof stakeAtomStart>
>['publicFacet'];

const test: TestFn<DefaultTestContext> = anyTest;

test.before(async t => (t.context = await makeTestContext(t)));
test.after.always(t => t.context.shutdown?.());

test('provideAccount returns an ICA connection', async t => {
  const {
    buildProposal,
    bundleCache,
    evalProposal,
    runUtils: { EV },
    installations,
  } = t.context;
  /** ensure network, ibc, and orchestration are available */
  await evalProposal(
    buildProposal('@agoric/builders/scripts/vats/init-network.js'),
  );
  await evalProposal(
    buildProposal('@agoric/builders/scripts/vats/init-orchestration.js'),
  );
  const vatStore = await EV.vat('bootstrap').consumeItem('vatStore');
  t.true(await EV(vatStore).has('ibc'), 'ibc');
  t.true(await EV(vatStore).has('network'), 'network');
  t.true(await EV(vatStore).has('orchestration'), 'orchestration');

  /** ensure mock ibc services are available */
  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');
  for (const [name, path] of entries(assets)) {
    const bundle = await bundleCache.load(path, name);
    const installationRef = await EV(zoe).install(bundle);
    t.truthy(installationRef);
    assign(t.context.installations, { [name]: installationRef });
  }
  const networkVat = await EV.vat('bootstrap').consumeItem('networkVat');
  const ibcServerMock = await EV(zoe).startInstance(
    installations.ibcServerMock,
    {},
    {},
    { address: '/ibc-port/', networkVat },
  );
  t.truthy(ibcServerMock.creatorFacet, 'ibcServerMock started');
  await EV.sendOnly(ibcServerMock.creatorFacet).listen(); // request listening
  await EV.sendOnly(ibcServerMock.creatorFacet).dequeue('onListen'); // start listening

  const ibcClientMock = await EV(zoe).startInstance(
    installations.ibcClientMock,
    {},
    {},
    { address: '/ibc-port/', networkVat },
  );
  t.truthy(ibcClientMock.creatorFacet, 'ibcClientMock started');
  // get local addresses for testing
  const serverLocalAddr = await EV(
    ibcServerMock.creatorFacet,
  ).getLocalAddress();
  t.truthy(serverLocalAddr, 'serverLocalAddr');
  const clientLocalAddr = await EV(
    ibcClientMock.creatorFacet,
  ).getLocalAddress();
  t.truthy(clientLocalAddr, 'clientLocalAddr');

  const orchestration = await EV.vat('bootstrap').consumeItem('orchestration');
  // XXX this should not throw
  await t.notThrowsAsync(async () => {
    EV(orchestration).provideAccount(serverLocalAddr, clientLocalAddr);
  });

  await t.notThrowsAsync(async () => {
    await EV.sendOnly(ibcServerMock.creatorFacet).dequeue('onAccept');
  });
  await t.notThrowsAsync(async () => {
    await EV.sendOnly(ibcServerMock.creatorFacet).dequeue('onOpen');
  });
});
