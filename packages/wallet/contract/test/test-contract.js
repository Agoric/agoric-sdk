// @ts-check

import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/vats/src/core/types.js';
import '@agoric/zoe/exported.js';

import { makeIssuerKit } from '@agoric/ertp';
import { connectFaucet } from '@agoric/run-protocol/src/proposals/demoIssuers.js';
import {
  installBootContracts,
  makeClientBanks,
} from '@agoric/vats/src/core/basic-behaviors.js';
import { makeClientManager } from '@agoric/vats/src/core/chain-behaviors.js';
import {
  makeAgoricNamesAccess,
  makePromiseSpace,
} from '@agoric/vats/src/core/utils.js';
import { buildRootObject as bldMintRoot } from '@agoric/vats/src/vat-mints.js';
import { makeZoeKit } from '@agoric/zoe';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeLoopback } from '@endo/captp';
import { E, Far } from '@endo/far';

import { devices } from './devices.js';

/** @type {import('ava').TestInterface<Awaited<ReturnType<makeTestContext>>>} */
// @ts-expect-error cast
const test = anyTest;

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

const makeTestContext = async t => {
  const space = /** @type {any} */ (makePromiseSpace(t.log));
  const { consume, produce } =
    /** @type { BootstrapPowers & { consume: { loadVat: (n: 'mints') => MintsVat }} } */ (
      space
    );
  const { agoricNames, spaces } = makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);

  const { zoe, feeMintAccess } = await setUpZoeForTest();
  produce.zoe.resolve(zoe);
  produce.feeMintAccess.resolve(feeMintAccess);

  produce.loadVat.resolve(name => {
    assert.equal(name, 'mints');
    return bldMintRoot();
  });

  const bldKit = makeIssuerKit('BLD');
  produce.bldIssuerKit.resolve(bldKit);
  const runIssuer = E(zoe).getFeeIssuer();
  produce.bankManager.resolve(
    Far('mockBankManager', {
      getBankForAddress: _a =>
        Far('mockBank', {
          getPurse: brand => ({
            deposit: async (pmt, _x) => {
              const isBLD = brand === bldKit.brand;
              const issuer = isBLD ? bldKit.issuer : runIssuer;
              const amt = await E(issuer).getAmountOf(pmt);
              console.log('deposit', { amt });
              return amt;
            },
          }),
        }),
    }),
  );

  /** @param { BootstrapSpace } powers */
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
    installBootContracts({ vatPowers, devices, consume, produce, ...spaces }),
    makeClientManager({ consume, produce, ...spaces }),
    connectFaucet({ consume, produce, ...spaces }),
    makeClientBanks({ consume, produce, ...spaces }),
    stubProps({ consume, produce, ...spaces }),
  ]);

  return {
    zoe,
  };
};

test.before(async t => {
  t.context = await makeTestContext(t);
});

test('context', async t => {
  t.pass();
});

// test('basic', async t => {
//   const {
//     zoe,
//     privateArgs,
//     terms,
//     installs: { psmInstall },
//   } = t.context;
//   const { creatorFacet, publicFacet } = await E(zoe).startInstance(
//     psmInstall,
//     harden({}),
//     terms,
//     privateArgs,
//   );
//   t.truthy(creatorFacet);
//   t.truthy(publicFacet);
// });
