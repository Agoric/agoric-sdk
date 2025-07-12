// Keep this import first to avoid: VatData unavailable
// see also https://github.com/endojs/endo/issues/1467
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import * as contractExports from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import { makeUSDNIBCTraffic } from '@aglocal/portfolio-contract/test/mocks.js';
import { makeTrader } from '@aglocal/portfolio-contract/test/portfolio-actors.ts';
import { setupPortfolioTest } from '@aglocal/portfolio-contract/test/supports.ts';
import { makeWallet } from '@aglocal/portfolio-contract/test/wallet-offer-tools.ts';
import {
  defaultSerializer,
  documentStorageSchema,
} from '@agoric/internal/src/storage-test-utils.js';
import { makePromiseSpace } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import type { Instance, ZoeService } from '@agoric/zoe';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { axelarConfig } from '../src/axelar-configs.js';
import { toExternalConfig } from '../src/config-marshal.js';
import { startPortfolio } from '../src/portfolio-start.core.js';
import type {
  PortfolioBootPowers,
  StartFn,
} from '../src/portfolio-start.type.ts';
import { name as contractName } from '../src/portfolio.contract.permit.js';

const { entries, keys } = Object;

const docOpts = {
  note: 'YMax VStorage Schema',
  // XXX?
  // node: 'orchtest.ymax0',
  // owner: 'ymax',
  // pattern: 'orchtest.',
  // replacement: 'published.',
  showValue: defaultSerializer.parse,
};

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
  const { usdc, poc26 } = common.brands;

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

    for (const [name, { brand, issuer }] of entries({
      USDC: usdc,
      PoC26: poc26,
    })) {
      t.log('produce brand, issuer for', name);
      wk.brand.produce[name].resolve(brand);
      wk.issuer.produce[name].resolve(issuer);
    }

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
    produce.zoe.resolve(zoe);
  }

  // script from agoric run does this step
  t.log('produce installation using test bundle');
  powers.installation.produce[contractName].resolve(
    await bundleAndInstall(contractExports),
  );

  const options = toExternalConfig(
    harden({ axelarConfig, assetInfo: [], chainInfo: {}, net: 'local' }),
    {},
    // currently no config. PortfolioConfigShape,
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
    'ymax0',
  )) as Instance<StartFn>;
  t.log('found instance', instance);
  t.is(passStyleOf(instance), 'remotable');

  const { vowTools, pourPayment } = utils;
  const { mint: _, ...poc26sansMint } = poc26;
  const wallet = makeWallet(
    { USDC: usdc, Access: poc26sansMint },
    zoe,
    vowTools.when,
  );
  await wallet.deposit(await pourPayment(usdc.units(10_000)));
  await wallet.deposit(poc26.mint.mintPayment(poc26.make(100n)));
  const silvia = makeTrader(wallet, instance);
  const actualP = silvia.openPortfolio(t, {
    USDN: usdc.units(3_333),
    Access: poc26.make(1n),
  });
  // ack IBC transfer for forward
  await common.utils.transmitVTransferEvent('acknowledgementPacket', -1);
  const actual = await actualP;
  t.like(actual, {
    payouts: { USDN: { value: 0n } },
    result: {
      publicSubscribers: {
        portfolio: {
          description: 'Portfolio',
          storagePath: `orchtest.ymax0.portfolios.portfolio0`,
        },
      },
    },
  });

  const { storage } = common.bootstrap;
  await documentStorageSchema(t, storage, docOpts);
});
