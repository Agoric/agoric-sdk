#!/usr/bin/env node
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import '@endo/init';
import process from 'process';
import { E } from '@endo/far';
import { AssetKind } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { Stable } from '@agoric/vats/src/tokens.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  defangAndTrim,
  stringify,
  mergePermits,
} from '@agoric/deploy-script-support/src/code-gen.js';

import { startPSM, makeAnchorAsset } from './startPSM.js';
import { PSM_MANIFEST } from '../core-proposal.js';

/** @file render `startPSM` and `makeAnchorAsset` as evaluatable script.
 *
 * Names such as instance.psm, issuer.AUSD were not reserved in
 * the agoricdev-10 bootstrap.
 *
 * So buildScript() stringifies `startPSM` and `makeAnchorAsset`
 * along with the the things they require such as `AssetKind`,
 * as well as `startPSMWorkAround()`.
 *
 * WARNING: buildScript() does not automatically adapt to changes
 * in `startPSM`, but eslint can be used to aid maintenance.
 */

const { entries } = Object;

// WARNING: no input validation. Use with care.
const makeAmount = (brand, value) => harden({ brand, value });

const PERCENT = 100n;
const BASIS_POINTS = 10000n;

const contractRoots = [
  `../../bundles/bundle-psm.js`,
  `../../../vats/bundles/bundle-mintHolder.js`,
];

let config = {
  installCache: {
    boardId: 'this binding is unused',
  },
  psm: {
    endoZipBase64Sha512: 'ditto',
  },
  mintHolder: {
    endoZipBase64Sha512: 'ditto',
  },
  anchor: {
    denom: 'ditto',
  },
};

/**
 * Adapt bootstrap powers to what `startPSM` and `makeAnchorAsset` expect,
 * and then call those two functions.
 *
 * @type {typeof import('./startPSM.js').startPSM}
 */
const startPSMWorkAround = async agoricdev10Powers => {
  const {
    consume: { agoricNamesAdmin, board },
    installation,
    instance,
    brand,
  } = agoricdev10Powers;
  const names = {
    instance: E(agoricNamesAdmin).lookupAdmin('instance'),
    brand: E(agoricNamesAdmin).lookupAdmin('brand'),
    issuer: E(agoricNamesAdmin).lookupAdmin('issuer'),
  };

  /**
   * @param {ERef<NameAdmin>} admin
   * @param {string} key
   */
  const produceIt = (admin, key) => {
    return harden({ resolve: it => E(admin).update(key, it) });
  };
  /**
   * @param {ERef<NameAdmin>} admin
   * @param {string} key
   */
  const syncIt = (admin, key) => {
    /** @type {(v: unknown) => void } */
    let resolve;
    const promise = new Promise(pResolve => {
      resolve = pResolve;
    });
    promise.then(it => E(admin).update(key, it));
    // @ts-expect-error Promise executor always fires
    const produce = { resolve };
    return harden({ consume: promise, produce });
  };

  const syncBrand = syncIt(names.brand, 'AUSD');
  const syncIssuer = syncIt(names.issuer, 'AUSD');

  const installCacheJSON = await E(board).getValue(config.installCache.boardId);
  /** @type {{sha512: string, boardId: string}[]} */
  const installInfo = JSON.parse(installCacheJSON);
  console.info('startPSMWorkAround', { installInfo });
  const toBoardId = new Map(
    installInfo.map(({ sha512, boardId }) => [sha512, boardId]),
  );

  const getInstall = ({ endoZipBase64Sha512: key }) =>
    E(board).getValue(toBoardId.get(key) || assert.fail(key));

  const psmPowers = {
    ...agoricdev10Powers,
    installation: {
      consume: {
        contractGovernor: installation.consume.contractGovernor,
        psm: getInstall(config.psm),
        mintHolder: getInstall(config.mintHolder),
      },
    },
    instance: {
      consume: instance.consume,
      produce: {
        psm: produceIt(names.instance, 'psm'),
        psmGovernor: produceIt(names.instance, 'psmGovernor'),
      },
    },
    brand: {
      consume: {
        AUSD: syncBrand.consume,
        [Stable.symbol]: brand.consume[Stable.symbol],
      },
      produce: { AUSD: syncBrand.produce },
    },
    issuer: {
      consume: { AUSD: syncIssuer.consume },
      produce: { AUSD: syncIssuer.produce },
    },
  };

  await Promise.all([
    // @ts-ignore bootstrap types are out of sync
    makeAnchorAsset(psmPowers, { options: config.anchor }),
    // @ts-ignore bootstrap types are out of sync
    startPSM(psmPowers),
  ]);
};

const WORKAROUND_MANIFEST = {
  startPSMWorkAround: { consume: { agoricNamesAdmin: true, board: true } },
};

/** @param {Record<string, unknown>} items */
const declareData = items =>
  entries(items).map(
    ([name, value]) => `const ${name} = ${stringify(value, true)};`,
  );
/** @param {Record<string, Function>} items */
const declareBehavior = items =>
  entries(items).map(
    ([name, fn]) => `const ${name} = ${fn};\nharden(${name});`,
  );

/**
 * @returns {string} a script including `startPSM` and `makeAnchorAsset`
 * (stringified) along with the the things they
 * require such, as `AssetKind`.
 */
const buildScript = () =>
  defangAndTrim(
    [
      // @ts-check is a little bit helpful in some cases,
      // but getting it exactly right doesn't seem cost-effective,
      // so we leave it out. Feel free to turn it on for maintenance.
      // `// @ts-check`,
      // `/** @type {import('@endo/eventual-send').EProxy} */`,
      `/* eslint-disable prettier/prettier */`, // don't worry much about formatting
      `/* eslint-disable quotes */`,
      `/* global globalThis */`,
      `const E = globalThis.E;`,
      ...declareData({ config }),
      `const { details: X, quote: q } = assert;`,
      ...declareData({
        AssetKind,
        CONTRACT_ELECTORATE,
        ParamTypes,
        PERCENT,
        BASIS_POINTS,
      }),
      ...declareBehavior({ makeAmount }),
      `const AmountMath = harden({ make: makeAmount });`,
      ...declareBehavior({ makeRatio }),
      ...declareBehavior({ makeAnchorAsset, startPSM, startPSMWorkAround }),
      `startPSMWorkAround; // "exported" completion value`,
    ].join('\n\n'),
  );

/**
 * @param {string[]} args
 * @param {Record<string, string | undefined>} env
 * @param {{
 *   loadBundle: (specifier: string) => Promise<{ default: EndoZipBase64Bundle }>,
 *   stdout: typeof process.stdout,
 * }} io
 */
const main = async (args, env, { loadBundle, stdout }) => {
  if (args.includes('--permit')) {
    const permit = mergePermits({
      ...PSM_MANIFEST,
      ...WORKAROUND_MANIFEST,
    });
    console.log(JSON.stringify(permit, null, 2));
    return;
  }

  const { INSTALL_CACHE, ANCHOR_DENOM } = env;
  assert(INSTALL_CACHE, 'no $INSTALL_CACHE');
  assert(ANCHOR_DENOM, 'no $ANCHOR_DENOM');

  const modules = await Promise.all(contractRoots.map(loadBundle));
  const [psm, mintHolder] = modules.map(m => m.default.endoZipBase64Sha512);
  config = {
    installCache: { boardId: INSTALL_CACHE },
    psm: { endoZipBase64Sha512: psm },
    mintHolder: { endoZipBase64Sha512: mintHolder },
    anchor: { denom: ANCHOR_DENOM },
  };
  const script = buildScript();
  stdout.write(script);
  stdout.write('\n');
};

main(
  process.argv.slice(2),
  { ...process.env },
  {
    stdout: process.stdout,
    loadBundle: specifier => import(specifier),
  },
).catch(console.error);
