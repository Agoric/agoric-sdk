// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { makeLoopback } from '@endo/captp';
import { E, Far } from '@endo/far';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';

import { makeIssuerKit } from '@agoric/ertp';
import {
  connectFaucet,
  showAmount,
} from '@agoric/inter-protocol/src/proposals/demoIssuers.js';
import { setupClientManager } from '../src/core/chain-behaviors.js';
import { makeAgoricNamesAccess, makePromiseSpace } from '../src/core/utils.js';
import { buildRootObject as mintsRoot } from '../src/vat-mints.js';
import { buildRootObject as boardRoot } from '../src/vat-board.js';
import {
  installBootContracts,
  makeAddressNameHubs,
  makeBoard,
  makeClientBanks,
} from '../src/core/basic-behaviors.js';

import { devices } from './devices.js';

const setUpZoeForTest = async () => {
  const { makeFar } = makeLoopback('zoeTest');
  const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
    makeFakeVatAdmin(() => {}).admin,
  );
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  const feeMintAccess = await makeFar(nonFarFeeMintAccess);
  return {
    zoe,
    feeMintAccess,
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
    /** @type { BootstrapPowers & { consume: { loadVat: LoadVat }} } */ (space);
  const { agoricNames, spaces } = makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);

  const { zoe, feeMintAccess } = await setUpZoeForTest();
  produce.zoe.resolve(zoe);
  produce.feeMintAccess.resolve(feeMintAccess);

  produce.loadVat.resolve(name => {
    switch (name) {
      case 'mints':
        return mintsRoot();
      case 'board':
        return boardRoot();
      default:
        throw Error('unknown loadVat name');
    }
  });

  t.plan(4); // be sure bank.deposit() gets called

  const bldKit = makeIssuerKit('BLD');
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
                t.is(showAmount(amt), isBLD ? '5_000 BLD' : '53 RUN');
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
    E(client).assignBundle([_a => stub]);
  };

  const vatPowers = {
    D: x => x,
  };

  await Promise.all([
    // @ts-expect-error missing keys: devices, vats, vatPowers, vatParameters, and 2 more.
    makeBoard({ consume, produce, ...spaces }),
    makeAddressNameHubs({ consume, produce, ...spaces }),
    installBootContracts({ vatPowers, devices, consume, produce, ...spaces }),
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
