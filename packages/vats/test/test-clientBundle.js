// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { makeLoopback } from '@endo/captp';
import { E, Far } from '@endo/far';
import { makeZoeKit } from '@agoric/zoe';

import { makeIssuerKit } from '@agoric/ertp';
import {
  connectFaucet,
  showAmount,
} from '@agoric/inter-protocol/src/proposals/demoIssuers.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { setupClientManager } from '../src/core/chain-behaviors.js';
import { makeAgoricNamesAccess } from '../src/core/utils.js';
import { makePromiseSpace } from '../src/core/promise-space.js';
import { buildRootObject as mintsRoot } from '../src/vat-mints.js';
import { buildRootObject as boardRoot } from '../src/vat-board.js';
import {
  installBootContracts,
  makeAddressNameHubs,
  makeBoard,
  makeClientBanks,
} from '../src/core/basic-behaviors.js';
import { Stable, Stake } from '../src/tokens.js';

import { makePopulatedFakeVatAdmin } from '../tools/boot-test-utils.js';

const setUpZoeForTest = async () => {
  const { makeFar } = makeLoopback('zoeTest');
  const { vatAdminService } = makePopulatedFakeVatAdmin();
  const { zoeService, feeMintAccess } = await makeFar(
    makeZoeKit(vatAdminService, undefined, {
      name: Stable.symbol,
      assetKind: Stable.assetKind,
      displayInfo: Stable.displayInfo,
    }),
  );
  return {
    zoe: zoeService,
    feeMintAccessP: feeMintAccess,
    vatAdminService,
  };
};
harden(setUpZoeForTest);

/**
 * @typedef {{
 *   (n: 'board'): import('../src/core/basic-behaviors.js').BoardVat
 *   (n: 'mint'): MintsVat
 * }} LoadVat
 */
test('connectFaucet produces payments', async t => {
  const space = /** @type {any} */ (makePromiseSpace(t.log));
  const { consume, produce } =
    /** @type { BootstrapPowers & { consume: { loadVat: LoadVat, loadCriticalVat: LoadVat }} } */ (
      space
    );
  const { agoricNames, spaces } = makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);

  const { zoe, feeMintAccessP, vatAdminService } = await setUpZoeForTest();
  produce.zoe.resolve(zoe);
  const fma = await feeMintAccessP;
  produce.feeMintAccess.resolve(fma);
  produce.bridgeManager.resolve(undefined);

  produce.vatAdminSvc.resolve(vatAdminService);

  const vatLoader = name => {
    switch (name) {
      case 'mints':
        return mintsRoot();
      case 'board': {
        const baggage = makeScalarBigMapStore('baggage');
        return boardRoot({}, {}, baggage);
      }
      default:
        throw Error('unknown loadVat name');
    }
  };
  produce.loadVat.resolve(vatLoader);
  produce.loadCriticalVat.resolve(vatLoader);

  t.plan(4); // be sure bank.deposit() gets called

  const bldKit = makeIssuerKit(Stake.symbol);
  produce.bldIssuerKit.resolve(bldKit);
  produce.chainStorage.resolve(null);

  const runIssuer = E(zoe).getFeeIssuer();
  produce.bankManager.resolve(
    Promise.resolve(
      // @ts-expect-error never mind other methods
      Far('mockBankManager', {
        getBankForAddress: _a =>
          Far('mockBank', {
            // @ts-expect-error never mind other methods
            getPurse: brand => ({
              deposit: async (pmt, _x) => {
                const isBLD = brand === bldKit.brand;
                const issuer = isBLD ? bldKit.issuer : runIssuer;
                const amt = await E(issuer).getAmountOf(pmt);
                t.is(showAmount(amt), isBLD ? '5_000 BLD' : '53 IST');
                return amt;
              },
            }),
            // @ts-expect-error mock
            getAssetSubscription: () => null,
          }),
      }),
    ),
  );

  /** @param {BootstrapSpace} powers */
  const stubProps = async ({ consume: { client } }) => {
    const stub = {
      agoricNames: true,
      namesByAddress: true,
      myAddressNameAdmin: true,
      board: true,
      zoe: true,
    };
    void E(client).assignBundle([_a => stub]);
  };

  await Promise.all([
    // @ts-expect-error missing keys: devices, vats, vatPowers, vatParameters, and 2 more.
    makeBoard({ consume, produce, ...spaces }),
    makeAddressNameHubs({ consume, produce, ...spaces }),
    installBootContracts({ consume, produce, ...spaces }),
    setupClientManager({ consume, produce, ...spaces }),
    connectFaucet({ consume, produce, ...spaces }),
    makeClientBanks({ consume, produce, ...spaces }),
    stubProps({ consume, produce, ...spaces }),
  ]);
  const m = await produce.mints;
  t.truthy(m);

  const userBundle = await E(consume.clientCreator).createUserBundle(
    'nick',
    'address1',
    [],
  );

  // t.deepEqual(Object.keys(userBundle), '@@todo');

  /** @type { import('@agoric/inter-protocol/src/proposals/demoIssuers.js').UserPaymentRecord[] } */
  const pmts = await E(userBundle.faucet).tapFaucet();

  const detail = await Promise.all(
    pmts.map(({ issuer, payment, pursePetname }) =>
      E(issuer)
        .getAmountOf(payment)
        .then(a => [pursePetname, showAmount(a)]),
    ),
  );
  t.deepEqual(detail, [
    ['Oracle fee', '51 LINK'],
    ['USD Coin', '1_323 USDC'],
  ]);
});
