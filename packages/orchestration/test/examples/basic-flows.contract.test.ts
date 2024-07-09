import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import { E, getInterfaceOf } from '@endo/far';
import path from 'path';
import { commonSetup } from '../supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractName = 'basic-flows';
const contractFile = `${dirname}/../../src/examples/${contractName}.contract.js`;
type StartFn =
  typeof import('../../src/examples/basic-flows.contract.js').start;

type TestContext = Awaited<ReturnType<typeof commonSetup>> & {
  zoe: ZoeService;
  instance: Instance<StartFn>;
};

const test = anyTest as TestFn<TestContext>;

test.before(async t => {
  const setupContext = await commonSetup(t);
  const {
    bootstrap: { storage },
    commonPrivateArgs,
  } = setupContext;

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  t.log('contract coreEval', contractName);
  const installation = await bundleAndInstall(contractFile);

  const storageNode = await E(storage.rootNode).makeChildNode(contractName);
  const { instance } = await E(zoe).startInstance(
    installation,
    undefined,
    {},
    { ...commonPrivateArgs, storageNode },
  );

  t.context = {
    ...setupContext,
    zoe,
    instance,
  };
});

const chainConfigs = {
  agoric: { addressPrefix: 'agoric1fakeLCAAddress' },
  cosmoshub: { addressPrefix: 'cosmos1test' },
};

const orchestrationAccountScenario = test.macro({
  title: (_, chainName: string) =>
    `orchestrate - ${chainName} makeOrchAccount returns a ContinuingOfferResult`,
  exec: async (t, chainName: string) => {
    const config = chainConfigs[chainName as keyof typeof chainConfigs];
    if (!config) {
      return t.fail(`Unknown chain: ${chainName}`);
    }

    const { zoe, instance } = t.context;
    const publicFacet = await E(zoe).getPublicFacet(instance);
    const inv = E(publicFacet).makeOrchAccountInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, { chainName });
    // @ts-expect-error TODO: type expected offer result
    const { holder, invitationMakers, publicSubscribers } =
      await E(userSeat).getOfferResult();

    t.regex(getInterfaceOf(holder)!, /Orchestration (.*) holder/);
    t.regex(getInterfaceOf(invitationMakers)!, /invitationMakers/);

    const { description, storagePath, subscriber } = publicSubscribers.account;
    t.regex(description, /Account holder/);

    const expectedStoragePath = `mockChainStorageRoot.basic-flows.${config.addressPrefix}`;
    t.is(storagePath, expectedStoragePath);

    t.regex(getInterfaceOf(subscriber)!, /Durable Publish Kit subscriber/);
  },
});

test(orchestrationAccountScenario, 'agoric');
test(orchestrationAccountScenario, 'cosmoshub');
