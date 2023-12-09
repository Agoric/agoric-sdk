// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E } from '@endo/far';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { createRequire } from 'module';
import { makeZoeKitForTest } from '../../../../tools/setup-zoe';
import { makeTestBootPowers } from './boot-tools.js';
import { makeFakeVatAdmin } from '../../../../tools/fakeVatAdmin.js';

const myRequire = createRequire(import.meta.url);

const { Fail } = assert;

const idOf = b => `b1-${b.endoZipBase64Sha512}`;

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const makeTestContext = async t => {
  const bundleCache = await makeNodeBundleCache('bundles/', {}, s => import(s));
  const { admin, vatAdminState } = makeFakeVatAdmin();
  const { zoeService } = makeZoeKitForTest(admin);
  const { bundles, powers } = await makeTestBootPowers(
    t,
    zoeService,
    bundleCache,
  );

  for (const [n, b] of Object.entries(bundles)) {
    vatAdminState.installBundle(idOf(b), b);
  }
  return { bundles, powers };
};

test.before(async t => (t.context = await makeTestContext(t)));

test('use contractStarter to start postalSvc', async t => {
  const { powers, bundles } = t.context;

  /**
   * @param {BootstrapPowers} powers
   * @param {{options?: { contractStarter?: { bundleID?: string }}}} [config]
   */
  const installContractStarter = async (
    {
      consume: { zoe },
      installation: {
        produce: { contractStarter: produceInstallation },
      },
    },
    { options } = {},
  ) => {
    const {
      // rendering this template requires not re-flowing the next line
      bundleID = Fail(`bundleID required`),
    } = options?.contractStarter || {};

    const installation = await E(zoe).installBundleID(bundleID);
    produceInstallation.reset();
    produceInstallation.resolve(installation);
    t.log('contractStarter installed', installation);
  };

  /**
   * @param {BootstrapPowers} powers
   * @param {{options?: { bundleID?: string }}} [_config]
   */
  const startContractStarter = async (
    {
      consume: { zoe },
      produce: { contractStarterStartResult },
      installation: {
        consume: { contractStarter: consumeInstallation },
      },
      instance: {
        produce: { contractStarter: produceInstance },
      },
    },
    _config,
  ) => {
    const installation = await consumeInstallation;

    const invitationIssuer = await E(zoe).getInvitationIssuer();
    const startResult = await E(zoe).startInstance(installation, {
      Invitation: invitationIssuer,
    });
    contractStarterStartResult.resolve(startResult);
    const { instance } = startResult;
    produceInstance.resolve(instance);

    t.log('contractStarter started', instance);
  };

  await installContractStarter(powers, {
    options: { contractStarter: { bundleID: idOf(bundles.contractStarter) } },
  });
  await startContractStarter(powers, {});

  /** @typedef { typeof import('../../../../src/contracts/gimix/contractStarter.js').start } ContractStarterFn */
  /** @type { StartedInstanceKit<ContractStarterFn>['instance'] } */
  const instance = await powers.instance.consume.contractStarter;
  t.truthy(instance);
  const { zoe } = powers.consume;
  const pf = E(zoe).getPublicFacet(instance);

  const toStart = await E(pf).makeStartInvitation({
    bundleID: idOf(bundles.postalSvc),
  });
  t.log('invitation toStart', toStart);

  const seat = E(zoe).offer(toStart);
  const result = await E(seat).getOfferResult();
  t.deepEqual(Object.keys(result), ['invitationMakers']);
  const payouts = await E(seat).getPayouts();
  t.deepEqual(Object.keys(payouts), ['Started']);
  const pmt = await payouts.Started;
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const amt = await E(invitationIssuer).getAmountOf(pmt);
  const invitationBrand = await E(invitationIssuer).getBrand();
  t.is(amt.brand, invitationBrand);
  t.true(Array.isArray(amt.value));
  t.is(amt.value.length, 1);
  const [info] = amt.value;
  t.deepEqual(Object.keys(info), [
    'customDetails',
    'description',
    'handle',
    'installation',
    'instance',
  ]);
  t.is(info.instance, instance);
  t.log(info.customDetails);
});
