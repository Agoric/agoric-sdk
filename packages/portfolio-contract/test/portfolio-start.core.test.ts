// Keep this import first to avoid: VatData unavailable
// see also https://github.com/endojs/endo/issues/1467
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makePromiseSpace } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import type { ZoeService, Instance } from '@agoric/zoe';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { toExternalConfig } from '../src/config-marshal.js';
import type { CorePowersG } from '../src/orch.start.ts';
import { startPortfolio } from '../src/portfolio-start.core.ts';
import type { permit } from '../src/portfolio.contract.permit.ts';
import * as contractExports from '../src/portfolio.contract.ts';
import { PortfolioConfigShape } from '../src/type-guards.ts';
import { makeUSDNIBCTraffic } from './mocks.ts';
import { makeTrader } from './portfolio-actors.ts';
import { setupPortfolioTest } from './supports.ts';
import { makeWallet } from './wallet-offer-tools.ts';

const { meta } = contractExports;

type StartFn = typeof contractExports.start;
type PortfolioBootPowers = CorePowersG<
  (typeof meta)['name'],
  StartFn,
  typeof permit
>;

const { entries, keys } = Object;

test('coreEval code without swingset', async t => {
  const common = await setupPortfolioTest(t);
  const { bootstrap, utils } = common;
  const { agoricNamesAdmin } = bootstrap;
  const wk = await makeWellKnownSpaces(agoricNamesAdmin);
  const log = () => {}; // console.log
  const { produce, consume } = makePromiseSpace({ log });
  const powers = { produce, consume, ...wk } as unknown as BootstrapPowers &
    PortfolioBootPowers;
  // XXX type of zoe from setUpZoeForTest is any???
  const { zoe: zoeAny, bundleAndInstall } = await setUpZoeForTest();
  const zoe: ZoeService = zoeAny;
  const { usdc } = common.brands;

  {
    t.log('produce bootstrap entries from commonSetup()', keys(bootstrap));
    for (const [n, v] of entries(bootstrap)) {
      switch (n) {
        case 'timer':
          produce.chainTimerService.resolve(v);
          break;
        case 'storage':
          // @ts-expect-error one of these things is not like the others :)
          produce.chainStorage.resolve(v.rootNode);
          break;
        default:
          produce[n].resolve(v);
      }
    }

    for (const [name, { brand, issuer }] of entries({ USDC: usdc })) {
      t.log('produce brand, issuer for', name);
      wk.brand.produce[name].resolve(brand);
      wk.issuer.produce[name].resolve(issuer);
    }

    t.log('produce installation using test bundle');
    powers.installation.produce.ymax0.resolve(
      bundleAndInstall(contractExports),
    );

    t.log('produce startUpgradable');
    produce.startUpgradable.resolve(
      ({ label, installation, issuerKeywordRecord, privateArgs, terms }) =>
        E(zoe).startInstance(
          installation,
          issuerKeywordRecord,
          terms,
          privateArgs,
          label,
        ),
    );
  }

  const options = toExternalConfig(
    harden({ assetInfo: [], chainInfo: {} }),
    {},
    PortfolioConfigShape,
  );
  t.log('invoke coreEval');
  await t.notThrowsAsync(startPortfolio(powers, { options }));

  // TODO:  common.mocks.ibcBridge.setAddressPrefix('noble');
  for (const { msg, ack } of Object.values(makeUSDNIBCTraffic())) {
    common.mocks.ibcBridge.addMockAck(msg, ack);
  }

  const { agoricNames } = bootstrap;
  const instance = (await E(agoricNames).lookup(
    'instance',
    meta.name,
  )) as Instance<StartFn>;
  t.log('found instance', instance);
  t.is(passStyleOf(instance), 'remotable');

  const { vowTools, pourPayment } = utils;
  const wallet = makeWallet({ USDC: usdc }, zoe, vowTools.when);
  await wallet.deposit(await pourPayment(usdc.units(10_000)));
  const silvia = makeTrader(wallet, instance);
  const actual = await silvia.openPortfolio(t, { USDN: usdc.units(3_333) });
  t.like(actual, {
    payouts: { USDN: { value: 0n } },
    result: {
      publicTopics: [
        { description: 'USDN ICA', storagePath: 'cosmos:noble-1:cosmos1test' },
      ],
    },
  });
});
