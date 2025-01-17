// @ts-nocheck
/* eslint-disable */
import '@endo/init';

import fs from 'fs';
import url from 'url';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import process from 'process';
import sqlite3 from 'better-sqlite3';

import bundleSource from '@endo/bundle-source';
import { decodeBase64 } from '@endo/base64';
import { ZipReader } from '@endo/zip';

import { makeReadPowers } from '@endo/compartment-mapper/node-powers.js';
const readPowers0 = makeReadPowers({ fs, url, crypto });
const loggingRead = async location => {
  try {
    const result = await readPowers0.read(location);
    console.log(`read: ${location}`);
    return result;
  } catch (e) {
    console.log(`err : ${location}`);
    throw e;
  }
};
const readPowers = {
  ...readPowers0,
  // read: loggingRead
};

import { makeArchive } from '@endo/compartment-mapper';

async function offrun() {
  const startFilename =
    '/home/node/trees/agoric-sdk/packages/SwingSet/src/vats/timer/vat-timer.js';
  const entry = url.pathToFileURL(path.resolve(startFilename));
  const options = {};
  const compartmentMap = await digestLocation(readPowers, entry, options);
  console.log(compartmentMap);
}

async function showCompartmentMap(archive) {
  //const compartmentMapBytes = archive.read('compartment-map.json');
  //const textDecoder = new TextDecoder();
  //const compartmentMapText = textDecoder.decode(compartmentMapBytes);
  //const compartmentMap = JSON.parse(compartmentMapText);

  // compartmentMap has an entry for every package involved in the
  // import graph, since each package will be loaded into its own
  // Compartment. The keys are compartment names, which are also
  // fully-qualified version-bearing package names, and the values are
  // a description of the compartment, e.g.:
  // '@agoric/store-v0.9.0' -> {
  //   name: '@agoric/store',
  //   label: '@agoric/store-v0.9.0',
  //   location: '@agoric/store-v0.9.0',
  //   modules
  // }
  //
  // 'modules' contains an entry for every external package cited in
  // the 'package.json' (for inter-package imports),
  // e.g. '@agoric/assert' to:
  //    { compartment: '@agoric/assert-v.0.6.0', module: './src/index.js' }
  // as well as an entry for every module defined within the same
  // package, e.g. './src/stores/scalarMapStore.js' to:
  //    { location: 'src/stores/scalarMapStore.js', parser, sha512 }
  //
  // and then the zipfile will have members for
  // e.g. '@agoric/store-v0.9.0/src/stores/scalarMapStore.js'
  // but only the subset that are actually used. Note that 'modules'
  // can contain unused packages and unused modules.

  //console.log(compartmentMap);

  return;
  //return;
  for (let [k, v] of Object.entries(compartmentMap.compartments)) {
    const { name, modules } = v;
    // name: @agoric/assert
    // label: @agoric/assert-v0.6.0
    // location: @agoric/assert-v0.6.0
    console.log(`--`, name);
    for (let [mk, mv] of Object.entries(modules)) {
      // when $name says "import $mk", they get $mv
      let path;
      if (mv.compartment) {
        // from different compartment
        console.log(`##`, mk, mv);
        console.log(compartmentMap.compartments[mv.compartment]);
        path = `${compartmentMap.compartments[mv.compartment].name} / ${mv.module}`;
      } else {
        // from same compartment
        path = `(me) / ${mv.location}`;
      }
      console.log(`  ${mk} -> ${path}`);
    }
  }
}

const pkgExceptions = new Map([['@swingset-vat', 'SwingSet']]);

function pkgToSDKPath(pkg, path) {
  if (!pkg.startsWith('@agoric/')) return;
  if (pkg === '@agoric/babel-generator') return;
  let prefix = `packages/${pkg.slice('@agoric/'.length)}`;
  if (pkg === '@agoric/swingset-vat') {
    prefix = 'packages/SwingSet';
  }
  return `${prefix}/${path}`;
}

function createDB(dbfn) {
  const db = sqlite3(dbfn);
  db.prepare('BEGIN IMMEDIATE TRANSACTION').run();
  db.exec(`PRAGMA journal_mode=WAL`);
  // these tables hold the snapshot contents more-or-less verbatim
  db.exec(`CREATE TABLE uses (deployment STRING, imported STRING)`);
  db.exec(
    `CREATE UNIQUE INDEX uses_deployment_imported ON uses (deployment, imported)`,
  );
  db.exec(
    `CREATE UNIQUE INDEX uses_imported_deployment ON uses (imported, deployment)`,
  );
  db.prepare('COMMIT').run();
  return db;
}

function makeDB(dbfn) {
  let db;
  if (!fs.existsSync(dbfn)) {
    db = createDB(dbfn);
  } else {
    db = sqlite3(dbfn);
  }

  const sql = { db };
  sql.addUses = db.prepare(
    'INSERT INTO uses (deployment, imported) VALUES (?,?) ON CONFLICT DO NOTHING',
  );

  sql.getImports = db
    .prepare('SELECT imported FROM uses WHERE deployment=? ORDER BY imported')
    .pluck();

  sql.getUsers = db
    .prepare('SELECT deployment FROM uses WHERE imported=? ORDER BY deployment')
    .pluck();

  return { db, sql };
}

function extractMemberNames(archiveBytes) {
  // fs.writeFileSync('bundle.zip', archiveBytes);
  const archive = new ZipReader(archiveBytes);

  const memberNames = [];
  for (let fn of archive.files.keys()) {
    //console.log(fn);
    if (fn !== 'compartment-map.json') {
      const [_, pkg, version, path] = /^(.+)-v([^/]+)\/(.+)$/.exec(fn);
      const sdkPath = pkgToSDKPath(pkg, path);
      //console.log(pkg, version, path, sdkPath);
      if (sdkPath) {
        //console.log(sdkPath);
        const absPath = `/home/node/trees/agoric-sdk/${sdkPath}`;
        if (!fs.existsSync(absPath)) {
          throw Error(`cannot find ${pkg} at ${absPath}`);
        }
        memberNames.push(sdkPath);
      }
    }
    // value is { name, type, mode, date, content: Uint8Array, comment }
  }
  return memberNames.sort();
}

const builtinsToIgnore = [
  'buffer',
  'child_process',
  'crypto',
  'fs',
  'fs/promises',
  'module',
  'node:assert',
  'node:child_process',
  'node:fs',
  'node:fs/promises',
  'node:module',
  'node:path',
  'node:process',
  'node:stream',
  'node:url',
  'node:util',
  'node:v8',
  'os',
  'path',
  'perf_hooks',
  'process',
  'stream',
  'stream/promises',
  'url',
  'util',
  'v8',
  'vm',
  'zlib',
];

async function findContents(entryfn) {
  const moduleLocation = url.pathToFileURL(path.resolve(entryfn));
  const modules = {};
  builtinsToIgnore.forEach(name => (modules[name] = null)); // value is unused
  const options = { modules, dev: true };
  const archiveBytes = await makeArchive(readPowers, moduleLocation, options);
  return extractMemberNames(archiveBytes);
}

async function OFFfindContents(entryfn) {
  const bundle = await bundleSource(entryfn);
  const archiveBytes = decodeBase64(bundle.endoZipBase64);
  return extractMemberNames(archiveBytes);
}

async function addEntryPoint(dbfn, name, entryfn) {
  const { db, sql } = makeDB(dbfn);
  const uses = await findContents(entryfn);
  db.prepare('BEGIN IMMEDIATE TRANSACTION').run();
  for (let used of uses) {
    sql.addUses.run(name, used);
  }
  db.prepare('COMMIT').run();
  console.log(`${name}: uses ${uses.length} files`);
  //console.log(uses);
}

const usualSuspects = [
  // chain upgrade requires a staker governance action and chain halt/upgrade/restart

  // the real entrypoint is packages/cosmic-swingset/src/entrypoint.js
  // but https://github.com/endojs/endo/issues/1596 stumbles on
  // anylogger-agoric.js and SwingSet/src/index.js . Workaround:
  // comment out the 'export *' lines from index.js and start from
  // chain-main.js
  ['chain', 'packages/cosmic-swingset/src/chain-main.js'],

  // upgrading the kernel happens upon chain upgrade
  ['kernel', 'packages/SwingSet/src/kernel.js'],

  // supervisor/lockdown are delivered with chain upgrades, sampled
  // upon vat creation/upgrade, and retained for the remainder of that
  // incarnation
  ['xsnap-supervisor', 'packages/swingset-xsnap-supervisor/lib/entry.js'],
  ['xsnap-lockdown', 'packages/xsnap-lockdown/lib/ses-boot.js'],

  // swingset built-in bundles: upgrade by installing new bundle and
  // arranging to call controller.upgradeStaticVat()
  ['vat-comms', 'packages/SwingSet/src/vats/comms/index.js'],
  // vat-network is not automatically included by swingset, see packages/vats/src/vat-network.js
  ['vat-timer', 'packages/SwingSet/src/vats/timer/vat-timer.js'],
  ['vat-vat-admin', 'packages/SwingSet/src/vats/vat-admin/vat-vat-admin.js'],
  ['vat-vattp', 'packages/SwingSet/src/vats/vattp/vat-vattp.js'],

  // decentral-main-vaults-config.json
  ['vat-bootstrap', 'packages/vats/src/core/boot-chain.js'],

  // from decentral-core-config.json
  ['vat-agoricNames', 'packages/vats/src/vat-agoricNames.js'],
  ['centralSupply', 'packages/vats/src/centralSupply.js'],
  ['mintHolder', 'packages/vats/src/mintHolder.js'],
  ['zcf', 'packages/zoe/contractFacet.js'],
  ['vat-bank', 'packages/vats/src/vat-bank.js'],
  ['vat-board', 'packages/vats/src/vat-board.js'],
  ['vat-bridge', 'packages/vats/src/vat-bridge.js'],
  ['vat-mints', 'packages/vats/src/vat-mints.js'],
  ['vat-priceAuthority', 'packages/vats/src/vat-priceAuthority.js'],
  ['provisionPool', 'packages/vats/src/provisionPool.js'],
  ['vat-provisioning', 'packages/vats/src/vat-provisioning.js'],
  ['vat-sharing', 'packages/vats/src/vat-sharing.js'],
  ['walletFactory', 'packages/smart-wallet/src/walletFactory.js'],
  ['vat-zoe', 'packages/vats/src/vat-zoe.js'],

  // proposals from decentral-main-vaults-config.json
  //
  // @agoric/vats/scripts/init-core.js
  // @agoric/inter-protocol/scripts/init-core.js
  // ??? these are a few manually-located bundles used by this bit
  ['bundle-contractGovernor', 'packages/governance/src/contractGovernor.js'],
  ['bundle-committee', 'packages/governance/src/committee.js'],
  ['bundle-binaryVoteCounter', 'packages/governance/src/binaryVoteCounter.js'],
  ['bundle-auctioneer', 'packages/inter-protocol/src/auction/auctioneer.js'],
  [
    'bundle-vaultFactory',
    'packages/inter-protocol/src/vaultFactory/vaultFactory.js',
  ],
  ['bundle-feeDistributor', 'packages/inter-protocol/src/feeDistributor.js'],
  ['bundle-reserve', 'packages/inter-protocol/src/reserve/assetReserve.js'],

  // add-collateral-core.js
  [
    'bundle-scaledPriceAuthority',
    'packages/zoe/src/contracts/scaledPriceAuthority.js',
  ],
  ['bundle-psm', 'packages/inter-protocol/src/psm/psm.js'],
  // ['bundle-mintHolder', 'packages/vats/src/mintHolder.js'], // see above

  // price-feed-core.js
  [
    'bundle-fluxAggregator',
    'packages/inter-protocol/src/price/fluxAggregatorContract.js',
  ],

  // invite-committee-core.js
  [
    'bundle-econCommitteeCharter.js',
    'packages/inter-protocol/src/econCommitteeCharter.js',
  ],
];

async function addUsual(dbfn) {
  // run from top of agoric-sdk
  for (let [name, entryfn] of usualSuspects) {
    await addEntryPoint(dbfn, name, entryfn);
  }
}

async function findDeployments(dbfn, sdkfn) {
  const { db, sql } = makeDB(dbfn);
  for (let deployment of sql.getUsers.iterate(sdkfn)) {
    console.log(deployment);
  }
}

async function findImports(dbfn, deployment) {
  const { db, sql } = makeDB(dbfn);
  for (let sdkfn of sql.getImports.iterate(deployment)) {
    console.log(sdkfn);
  }
}

// source-file-used-by.js add vat-timer packages/SwingSet/src/vats/timer/vat-timer.js
// source-file-used-by.js add vat-board packages/vats/src/vat-board.js
// source-file-used-by.js add-usual
// source-file-used-by.js uses vat-board
// source-file-used-by.js used-by packages/store/src/stores/scalarMapStore.js

async function run() {
  const dbfn = 'uses.sqlite';
  //const name = 'vat-timer';
  //const entryfn = '/home/node/trees/agoric-sdk/packages/SwingSet/src/vats/timer/vat-timer.js';
  const [cmd] = process.argv.slice(2);
  if (cmd === 'add') {
    const [_cmd, name, entryfn] = process.argv.slice(2);
    if (!entryfn || !fs.existsSync(entryfn) || !entryfn.endsWith('.js')) {
      throw Error(`<entryfn> must exist and be .js`);
    }
    await addEntryPoint('uses.sqlite', name, entryfn);
  } else if (cmd === 'add-usual') {
    await addUsual(dbfn);
  } else if (cmd === 'uses') {
    const [_cmd, deployment] = process.argv.slice(2);
    await findImports(dbfn, deployment);
  } else if (cmd === 'used-by') {
    const [_cmd, sdkfn] = process.argv.slice(2);
    await findDeployments(dbfn, sdkfn);
  } else {
    throw Error(`<command> must be 'add'`);
  }
}

run().catch(err => console.log('err', err));
