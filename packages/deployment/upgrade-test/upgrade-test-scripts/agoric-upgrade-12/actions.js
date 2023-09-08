import { promises as fs } from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { voteLatestProposalAndWait } from '../commonUpgradeHelpers.js';
import { CHAINID, GOV1ADDR, SDK_ROOT, VALIDATORADDR } from '../constants.js';
import { agd, agops, agoric, bundleSource } from '../cliHelper.js';
import { adjustVault, closeVault, mintIST, openVault } from '../econHelpers.js';

const directoryName = dirname(fileURLToPath(import.meta.url));

export const installBundles = async bundlesData => {
  const bundleIds = {};

  for (const bundleData of bundlesData) {
    const bundleFilePath = await bundleSource(
      bundleData.filePath,
      bundleData.name,
    );

    const bundleJSONData = await fs.readFile(bundleFilePath, 'binary');

    const bundle = JSON.parse(bundleJSONData);
    bundleIds[bundleData.name] = bundle.endoZipBase64Sha512;

    await agd.tx(
      'swingset',
      'install-bundle',
      `@${bundleFilePath}`,
      '--from',
      GOV1ADDR,
      '--keyring-backend=test',
      '--gas=auto',
      '--chain-id',
      CHAINID,
      '-bblock',
      '--yes',
    );
  }

  return bundleIds;
};

export const prepForCoreEval = async (filePath, constants) => {
  let sourceFileData = await fs.readFile(filePath, 'binary');

  for (const constant in constants) {
    if (Object.prototype.hasOwnProperty.call(constants, constant)) {
      sourceFileData = sourceFileData.replace(
        `##${constant}##`,
        constants[constant],
      );
    }
  }

  const newFilePath = `/tmp/${path.basename(filePath)}`;
  await fs.writeFile(newFilePath, sourceFileData);
  return newFilePath;
};

export const runProber = async bundleId => {
  const proberScriptPath = path.join(
    directoryName,
    'zoe-full-upgrade',
    'run-prober-script.js',
  );
  const proberUpgradePermitPath = path.join(
    directoryName,
    'zoe-full-upgrade',
    'zcf-upgrade-permit.json',
  );
  const filePath = await prepForCoreEval(proberScriptPath, {
    PROBER_BUNDLE_ID: `b1-${bundleId}`,
  });
  await agd.tx(
    'gov',
    'submit-proposal',
    'swingset-core-eval',
    proberUpgradePermitPath,
    filePath,
    `--title="Run Prober"`,
    `--description="run prober"`,
    '--deposit=10000000ubld',
    '--from',
    VALIDATORADDR,
    '--keyring-backend=test',
    '--gas=auto',
    '--gas-adjustment=1.2',
    '--chain-id',
    CHAINID,
    '-bblock',
    '--yes',
  );

  await voteLatestProposalAndWait();
};

export const runZcfUpgrade = async (zcfBundleId, zoeBundleId) => {
  const zcfScriptPath = path.join(
    directoryName,
    'zoe-full-upgrade',
    'zcf-upgrade-script.js',
  );
  const zcfUpgradePermitPath = path.join(
    directoryName,
    'zoe-full-upgrade',
    'zcf-upgrade-permit.json',
  );
  const filePath = await prepForCoreEval(zcfScriptPath, {
    ZCF_BUNDLE_ID: `b1-${zcfBundleId}`,
    ZOE_BUNDLE_ID: `b1-${zoeBundleId}`,
  });
  await agd.tx(
    'gov',
    'submit-proposal',
    'swingset-core-eval',
    zcfUpgradePermitPath,
    filePath,
    `--title="Run Prober"`,
    `--description="run prober"`,
    '--deposit=10000000ubld',
    '--from',
    VALIDATORADDR,
    '--keyring-backend=test',
    '--gas=auto',
    '--gas-adjustment=1.2',
    '--chain-id',
    CHAINID,
    '-bblock',
    '--yes',
  );

  return voteLatestProposalAndWait();
};

console.log('START');
await mintIST(GOV1ADDR, 12340000000, 10000, 2000);

const bundlesData = [
  {
    name: 'Zcf-upgrade',
    filePath: `${SDK_ROOT}/packages/zoe/src/contractFacet/vatRoot.js`,
  },
  {
    name: 'Zoe-upgrade',
    filePath: `${SDK_ROOT}/packages/vats/src/vat-zoe.js`,
  },
  {
    name: 'prober-contract',
    filePath: `${SDK_ROOT}/packages/boot/test/bootstrapTests/zcfProbe.js`,
  },
];

const bundleIds = await installBundles(bundlesData);

console.log('STEP: open vaults');
const currentVaults = await agops.vaults('list', '--from', GOV1ADDR);
assert.equal(currentVaults.length, 4);

await openVault(GOV1ADDR, 7, 11);
await adjustVault(GOV1ADDR, 'vault5', { giveMinted: 1.5 });
await adjustVault(GOV1ADDR, 'vault5', { giveCollateral: 2.0 });
await closeVault(GOV1ADDR, 'vault5', 5.75);

const vault5 = await agoric.follow(
  '-lF',
  ':published.vaultFactory.managers.manager0.vaults.vault5',
);
assert.equal(vault5.vaultState, 'closed');
assert.equal(vault5.locked.value, '0');
assert.equal(vault5.debtSnapshot.debt.value, '0');

console.log('STEP: run prober (first time)');
// @ts-expect-error
await runProber(t.context.bundleIds['prober-contract']);
{
  const data = await agd.query('vstorage', 'data', 'published.prober-asid9a');
  const value = JSON.parse(data.value);
  assert.equal(value.values[0], 'false');
}

console.log('STEP: upgrade Zoe and ZCF');
await runZcfUpgrade(bundleIds['Zcf-upgrade'], bundleIds['Zoe-upgrade']);

console.log('STEP: run prober (second time)');
await runProber(bundleIds['prober-contract']);
{
  const data = await agd.query('vstorage', 'data', 'published.prober-asid9a');
  const value = JSON.parse(data.value);
  assert.equal(value.values[0], 'true');
}
