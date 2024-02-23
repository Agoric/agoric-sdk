// @ts-check
/**
 * @file Bootstrap test of restarting (almost) all vats
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import {
  checkVMChildNodes,
  makeTestContext,
} from './liquidation-test-utils.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>}
 */
const test = anyTest;

test.before(async t => {
  t.context = await makeTestContext(t);
});
test.after.always(t => t.context.shutdown?.());

test.serial('visibility-before-upgrade', async t => {
  await checkVMChildNodes({
    t,
    managerIndex: 0,
    collateralBrandKey: 'ATOM',
    liquidation: false,
  });
});

test.serial('upgrade vaultFactory', async t => {
  const {
    controller,
    buildProposal,
    runUtils: { EV },
  } = t.context;

  t.log('building vaultFactory proposal');
  const proposal = await buildProposal({
    package: 'inter-protocol',
    packageScriptName: 'build:upgrade-vaults-proposal',
  });

  for await (const bundle of proposal.bundles) {
    await controller.validateAndInstallBundle(bundle);
  }
  t.log(
    'bundles installed',
    proposal.bundles[0].endoZipBase64Sha512,
    proposal.bundles[1].endoZipBase64Sha512,
  );

  /** @type {Awaited<import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapSpace['consume']['vaultFactoryKit']>} */
  const vaultFactoryKit = await EV.vat('bootstrap').consumeItem(
    'vaultFactoryKit',
  );

  // @ts-expect-error cast XXX missing from type
  const { privateArgs } = vaultFactoryKit;
  console.log('reused privateArgs', privateArgs, vaultFactoryKit);

  const vfAdminFacet = await EV(
    vaultFactoryKit.governorCreatorFacet,
  ).getAdminFacet();

  t.log('awaiting VaultFactory upgradeContract');

  const bundleId = `b1-${proposal.bundles[0].endoZipBase64Sha512}`;
  const upgradeResult = await EV(vfAdminFacet).upgradeContract(
    bundleId,
    privateArgs,
  );
  t.deepEqual(upgradeResult, { incarnationNumber: 1 });
  t.log('VaultFactory upgraded');
});

test.serial('restart contractGovernor', async t => {
  const { EV } = t.context.runUtils;
  /** @type {Awaited<import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapSpace['consume']['vaultFactoryKit']>} */
  const vaultFactoryKit = await EV.vat('bootstrap').consumeItem(
    'vaultFactoryKit',
  );

  const { governorAdminFacet } = vaultFactoryKit;
  // has no privateArgs of its own. the privateArgs.governed is only for the
  // contract startInstance. any changes to those privateArgs have to happen
  // through a restart or upgrade using the governed contract's adminFacet
  const privateArgs = undefined;

  t.log('awaiting CG restartContract');
  const upgradeResult = await EV(governorAdminFacet).restartContract(
    privateArgs,
  );
  t.deepEqual(upgradeResult, { incarnationNumber: 1 });
});

test.serial('visibility-after-upgrade', async t => {
  const { storage } = t.context;
  await checkVMChildNodes({
    t,
    managerIndex: 0,
    collateralBrandKey: 'ATOM',
    liquidation: true,
    base: 3,
  });

  t.log('Data', storage.data.keys());
  t.pass();
});
