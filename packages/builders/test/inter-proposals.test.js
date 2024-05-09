// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import * as ambientFs from 'fs';
import { resolve as importMetaResolve } from 'import-meta-resolve';

const configSpecifier = '@agoric/vm-config/decentral-itest-vaults-config.json';
const noop = harden(() => {});

/** @type {import('ava').TestFn<ReturnType<typeof makeTestContext>>} */
const test = anyTest;

//#region test setup, isolating ambient authority
const makeTestContext = t => {
  /** @param {string} specifier */
  const loadConfig = async specifier => {
    const fullPath = await importMetaResolve(specifier, import.meta.url).then(
      u => new URL(u).pathname,
    );
    t.is(typeof fullPath, 'string');
    const txt = await ambientFs.promises.readFile(fullPath, 'utf-8');
    t.is(typeof txt, 'string');
    return JSON.parse(txt);
  };

  /** @param {{ module: string; entrypoint: string }} proposal */
  const loadEntryPoint = async proposal => {
    const { module, entrypoint } = proposal;
    t.is(typeof module, 'string');
    t.is(typeof entrypoint, 'string');
    const modNS = await import(module);
    t.is(typeof modNS, 'object');
    const fn = modNS[entrypoint];
    t.is(typeof fn, 'function');
    return fn;
  };

  return { loadConfig, loadEntryPoint };
};

test.before(async t => {
  t.context = makeTestContext(t);
});
//#endregion

test('inter-protocol vaults proposal handles referencedUi option', async t => {
  const proposalModule = '@agoric/builders/scripts/inter-protocol/init-core.js';
  const referencedUi =
    'bafybeidvpbtlgefi3ptuqzr2fwfyfjqfj6onmye63ij7qkrb4yjxekdh3e';

  t.log('loading', configSpecifier);
  const { coreProposals } = await t.context.loadConfig(configSpecifier);

  const vaultsProposal = coreProposals.find(p => p.module === proposalModule);

  t.log('loading', vaultsProposal.module);
  const builder = await t.context.loadEntryPoint(vaultsProposal);
  const actual = await builder(
    { publishRef: noop, install: noop },
    ...vaultsProposal.args,
  );

  t.like(actual, {
    getManifestCall: {
      0: 'getManifestForInterProtocol',
      1: {
        referencedUi,
        minInitialPoolLiquidity: 0n,
      },
    },
  });
});

test('inter-protocol ATOM proposal handles initialPrice option', async t => {
  const proposalModule =
    '@agoric/builders/scripts/inter-protocol/add-collateral-core.js';
  const interchainAssetOptions = {
    decimalPlaces: 6,
    denom: 'ibc/toyatom',
    initialPrice: 12.34,
    keyword: 'ATOM',
    oracleBrand: 'ATOM',
    proposedName: 'ATOM',
  };

  t.log('loading', configSpecifier);
  const { coreProposals } = await t.context.loadConfig(configSpecifier);

  const collateralProposal = coreProposals.find(
    ({ module, entrypoint }) =>
      module === proposalModule && entrypoint === 'defaultProposalBuilder',
  );

  t.log('loading', collateralProposal.module);
  const builder = await t.context.loadEntryPoint(collateralProposal);
  const actual = await builder(
    { publishRef: noop, install: noop, wrapInstall: undefined },
    ...collateralProposal.args,
  );

  t.like(actual, {
    getManifestCall: {
      0: 'getManifestForAddAssetToVault',
      1: {
        interchainAssetOptions,
      },
    },
  });
});
