import test from 'ava';
import {
  executeCommand,
  makeFileRW,
  makeWebCache,
  makeWebRd,
  bundleDetail,
  proposalBuilder,
  readBundles,
  passCoreEvalProposal,
} from '@agoric/synthetic-chain';
import * as fsp from 'fs/promises';
import { existsSync } from 'fs';
import { tmpName } from 'tmp';
import * as path from 'path';
import {
  copyAll,
  extractNameFromPath,
} from "./core-eval-support.js";

const config = {
  installer: 'user1',
  proposer: 'validator',
  featuresSrc: 'visibilityFeaturesProof.tar',
  release:
    'https://github.com/Jorge-Lopes/agoric-sdk/releases/tag/liq-visibility-a3p-v0.2',
  originalBundle: 'b1-0daeb28abf2bb95cd27bebe80cdcd53ecd670244cb4ca6fe07784697fa8b40bcbc8f3ab1fd92a6d7ce8197efa0d2a28716737f77c68ab2eba88b3c72179f15e0.json'
};

test.before(async t => {
  const src = makeWebRd(config.release.replace('/tag/', '/download/') + '/', {
    fetch,
  });
  const tmpNameP = prefix =>
    new Promise((resolve, reject) =>
      tmpName({ prefix }, (err, x) => (err ? reject(err) : resolve(x))),
    );
  const td = await tmpNameP('assets');
  const dest = makeFileRW(td, { fsp, path });
  const assets = makeWebCache(src, dest);
  t.context = {
    assets,
    tmpNameP,
  };
})

/**
 * TODO: Make sure to use SHA512 instead of cksum
 */
test.serial('checksum from repo matches local one', async t => {
  const { assets } = t.context;
  const proofPath = await assets.storedPath('visibilityFeaturesProof.tar');

  const [cksumWeb, cksumLocal] = (
    await Promise.all([
      executeCommand('cksum', [proofPath]),
      executeCommand('cksum', ['./visibilityFeaturesProof.tar']),
    ])
  ).map(cksum => cksum.split(' ')[0]);

  t.log({ cksumWeb, cksumLocal });
  t.is(cksumWeb, cksumLocal);
  t.context = {
    assets,
  };
});

test.serial('unarchive .tar and copy content under agoric-sdk', async t => {
  const unarchiveFolder = new URL('./artifacts', import.meta.url);

  try {
    await fsp.rmdir(unarchiveFolder, { recursive: true });
  } catch (e) {
    t.log('Artifacts do not exist');
  } finally {
    await fsp.mkdir(unarchiveFolder);
  }


  await executeCommand('tar', [
    '-xf',
    'visibilityFeaturesProof.tar',
    '-C',
    'artifacts',
  ]);

  await executeCommand('./helper.sh', []);

  const interProtocolPath = '/usr/src/agoric-sdk/packages/inter-protocol';
  if (
    existsSync(
      `${interProtocolPath}/src/proposals/vaultsUpgrade.js`,
    ) &&
    existsSync(`${interProtocolPath}/scripts/upgrade-vaults.js`)
  ) {
    t.pass();
    return;
  }
  t.fail();
});
/**
 * Bundle hash of the vaultFactory copied from .tar must match with the one
 * used for incarnation 1.
 */
test.serial('make sure bundle hashes match', async t => {
  // Rebuild bundles after copy
  console.log('Building bundles...');
  await executeCommand('yarn', ['build:bundles'], {
    cwd: '/usr/src/agoric-sdk/packages/inter-protocol',
  });

  console.log('Importing vaultFactory bundle...');
  const {
    default: { endoZipBase64Sha512: copiedVFaHash },
  } = await import(
    '/usr/src/agoric-sdk/packages/inter-protocol/bundles/bundle-vaultFactory.js'
    );

  const { endoZipBase64Sha512: originalHash } = bundleDetail(`./assets/${config.originalBundle}`)

  t.is(originalHash, copiedVFaHash);
});

/**
 * - Prerequisites
 *    - manualTimer contract +
 *    - mutated auctioneer
 *    - mutated vault factory +
 *    - proposal
 *    - script
 *    - built artifacts
 * - copy mutated vaultFactory.js and auctioneer.js to relevant addresses
 * - agoric run on both of them
 */
test.serial('prepare vault factory', async t => {
  // Prepare mutated vaultFactory
  const rootRW = makeFileRW('.', { fsp, path });
  const termsW = rootRW.join('./termsWrapper.js');
  const termsR = termsW.readOnly();
  const content = await termsR.readText();
  console.log('TERM WRAPPER');
  console.log(content);

  const replaceText = 'termsWrapper(zcf.getTerms(), privateArgs);'

  // Make vaultManager use the custom timer
  const vmRW = rootRW.join('./artifacts/src/vaultFactory/vaultManager.js');
  const vmVersion2 = rootRW.join('./artifacts/src/vaultFactory/vaultManagerV2.js');
  const vmRead = vmRW.readOnly();
  const vmText = await vmRead.readText();
  const vmMutated = vmText.replace('{ zcf, marshaller, makeRecorderKit,' +
    ' factoryPowers }', '{ zcf, marshaller, makeRecorderKit, factoryPowers,' +
    ' timerService }').replace('{ priceAuthority, timerService,' +
    ' reservePublicFacet' +
    ' }', '{ priceAuthority, reservePublicFacet }');
  await vmVersion2.writeText(vmMutated);

  // Make vaultDirector forward the custom timer
  const vdRW = rootRW.join('./artifacts/src/vaultFactory/vaultDirector.js');
  const vdVersion2 = rootRW.join('./artifacts/src/vaultFactory/vaultDirectorV2.js');
  const vdRead = vdRW.readOnly();
  const vdText = await vdRead.readText();
  const vdMutated = vdText.replace('./vaultManager', './vaultManagerV2').replace('\n' +
    '    makeERecorderKit,\n' +
    '    makeRecorderKit,\n' +
    '    marshaller,\n' +
    '    factoryPowers,\n' +
    '    zcf,\n' +
    '  }', '\n' +
    '    makeERecorderKit,\n' +
    '    makeRecorderKit,\n' +
    '    marshaller,\n' +
    '    factoryPowers,\n' +
    '    zcf,\n' +
    '    timerService: timer,\n' +
    '  }').replace('fn(vm)', 'Promise.resolve(vm).then(vm => fn(vm)).catch(e => trace(\'ERROR: allManagersDo\', e))');
  await vdVersion2.writeText(vdMutated);

  // Override vaultFactory zcf.getTerms();
  const vfRW = rootRW.join('./artifacts/src/vaultFactory/vaultFactory.js');
  const vfVersion2 = rootRW.join('./artifacts/src/vaultFactory/vaultFactoryV2.js');
  const vfRead = vfRW.readOnly();
  const vfText = await vfRead.readText();
  const vfMutatedTermsOnly = vfText.replace('zcf.getTerms();', replaceText);
  const vfMutatedFinal = vfMutatedTermsOnly.replace('./vaultDirector', './vaultDirectorV2');
  await vfVersion2.writeText(content + '\n' + vfMutatedFinal);

  t.pass();
});

test.serial('build proposal', async t => {
  await copyAll([
    {
      src: './artifacts/src/vaultFactory/vaultFactoryV2.js',
      dest: '/usr/src/agoric-sdk/packages/inter-protocol/src/vaultFactory/vaultFactoryV2.js'
    },
    {
      src: './artifacts/src/vaultFactory/vaultManagerV2.js',
      dest: '/usr/src/agoric-sdk/packages/inter-protocol/src/vaultFactory/vaultManagerV2.js'
    },
    {
      src: './artifacts/src/vaultFactory/vaultDirectorV2.js',
      dest: '/usr/src/agoric-sdk/packages/inter-protocol/src/vaultFactory/vaultDirectorV2.js'
    },
    {
      src: './testAssets/manipulateAuction/manualTimerFaucet.js',
      dest: '/usr/src/agoric-sdk/packages/inter-protocol/src/manualTimerFaucet.js'
    },
    {
      src: './testAssets/manipulateAuction/liq-prep-proposal.js',
      dest: '/usr/src/agoric-sdk/packages/inter-protocol/src/proposals/liq-prep-proposal.js'
    },
    {
      src: './testAssets/manipulateAuction/liq-prep-script.js',
      dest: '/usr/src/agoric-sdk/packages/inter-protocol/scripts/liq-prep-script.js'
    },
  ], { fsp })
  const {
    evals,
    bundles
  } = await proposalBuilder('/usr/src/agoric-sdk/packages/inter-protocol/scripts/liq-prep-script.js')

  const evalsFixed = evals.map(({ script, permit }) => ({
    permit,
    script: script.replace('-permit.json', '.js')
  }));
  t.log(evalsFixed);
  config.proposal = { evals: evalsFixed, bundles };
  t.pass();
});

/**
 * - ensure enough IST
 * - install bundles
 * - submit proposal
 * - vote
 * - check incarnation numbers
 *    - 1 for auctioneer, 2 for vaultFactory
 */
test.serial('deploy incarnation 2', async t => {
  t.log(config.proposal);
  const { tmpNameP } = t.context;
  const { proposal: { evals, bundles } } = config;
  const tmpName = await tmpNameP('liq-prep');
  await fsp.mkdir(tmpName);

  const evalsCopyP = evals.flatMap(
    ({
       permit,
       script
     }) => [
      fsp.cp(permit, `${tmpName}/${extractNameFromPath(permit)}`),
      fsp.cp(script, `${tmpName}/${extractNameFromPath(script)}`)
    ]);

  const bundlesCopyP = bundles.map(
    bundlePath => fsp.cp(bundlePath, `${tmpName}/${extractNameFromPath(bundlePath)}`)
  );

  await Promise.all([
    ...evalsCopyP,
    ...bundlesCopyP,
  ])

  t.log({ tmpName });
  const bundleInfos = await readBundles(tmpName);

  await passCoreEvalProposal(
    bundleInfos,
    { title: `Core eval of ${tmpName}`, ...config }
  );
  t.pass();
});
