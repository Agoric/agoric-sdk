// @ts-check
import '@endo/init/debug.js';

import { LOCAL_CONFIG, makeVstorageKit } from '@agoric/client-utils';
import {
  makeWalletStoreFromSigner,
  makeYmaxControlKitForSynthetic,
} from '@aglocal/portfolio-deploy/src/ymax-control.js';
import {
  getDetailsMatchingVats,
  getVatInfoFromID,
} from '@agoric/synthetic-chain';
import anyTest from 'ava';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { makeSyntheticWalletKit } from '../synthetic-wallet-kit.js';

/**
 * @import {InstrumentOracle} from '@aglocal/portfolio-contract/src/instrument-oracle.exo.ts';
 * @import {WalletStoreEntryProxy} from '@agoric/client-utils/src/wallet-store.ts';
 * @import {TestFn} from 'ava';
 */

const ymax1ControlAddress = 'agoric1c0eq3m8sze9cj8lxr7h66fu3jgqtevqxv8svcm';
const bundleIdPath =
  '/usr/src/agoric-sdk/packages/portfolio-deploy/dist/ymax0.bundleId';
const privateArgsPath =
  '/usr/src/agoric-sdk/packages/portfolio-deploy/test/privateArgs-ymax1.json';
const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);
const fromPublishedEntries = async path =>
  Object.fromEntries(await vsc.readPublished(path));

let nonce = 0;
const makeNonce = () => `instrument-oracle-a3p-${Date.now()}-${(nonce += 1)}`;

const makeStore = address => {
  const signer = makeSyntheticWalletKit({ address, vstorageKit: vsc });
  return makeWalletStoreFromSigner(signer, {
    setTimeout,
    makeNonce,
    log: () => {},
  });
};

const eventuallyRead = async (path, expected) => {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const value = await vsc.readPublished(path);
      if (isDeepStrictEqual(value, expected)) {
        return value;
      }
      lastError = Error(`published value at ${path} has not caught up`);
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  throw lastError;
};

const makeContext = async () => {
  const bundleId = (await readFile(bundleIdPath, 'utf8')).trim();
  assert(bundleId.startsWith('b1-'));
  const { contracts } = JSON.parse(await readFile(privateArgsPath, 'utf8'));

  const controlSigner = makeSyntheticWalletKit({
    address: ymax1ControlAddress,
    vstorageKit: vsc,
  });
  const control = makeYmaxControlKitForSynthetic(
    { setTimeout },
    { signer: controlSigner, makeNonce, log: () => {} },
  );
  const { ymax1: instance } = await fromPublishedEntries(
    'agoricNames.instance',
  );
  const vats = (await getDetailsMatchingVats('ymax1')).filter(
    vat => !vat.terminated,
  );
  assert(vats.length > 0);

  return {
    bundleId,
    contracts: harden(contracts),
    control,
    instance,
    vatDetails: vats.at(-1),
  };
};

const test = /** @type {TestFn<Awaited<ReturnType<typeof makeContext>>>} */ (
  anyTest
);

test.before(async t => {
  t.context = await makeContext();
});

test.serial('upgrade ymax1 and exercise the instrument oracle', async t => {
  const { bundleId, contracts, control, instance, vatDetails } = t.context;
  assert(vatDetails);

  const { postalService: postalServiceInstance } = await fromPublishedEntries(
    'agoricNames.instance',
  );
  await control.ymaxControl.upgrade({
    bundleId,
    privateArgsOverrides: harden({
      contracts,
      postalServiceInstance,
    }),
  });

  const { ymax1: upgradedInstance } = await fromPublishedEntries(
    'agoricNames.instance',
  );
  t.is(upgradedInstance.getBoardId(), instance.getBoardId());

  const vatInfo = await getVatInfoFromID(vatDetails.vatID);
  t.is(
    /** @type {{incarnation: number}} */ (vatInfo.currentSpan()).incarnation,
    vatDetails.incarnation + 1,
  );

  const { result: creatorFacet } =
    await control.ymaxControl.getCreatorFacet.once({
      saveAs: 'creatorFacet',
      overwrite: true,
    })();
  assert(creatorFacet);

  const oracleAddress = execFileSync(
    'agd',
    ['keys', 'show', '-a', 'instrumentOracle', '--keyring-backend=test'],
    { encoding: 'utf8' },
  ).trim();
  const { ymax1, postalService } = await fromPublishedEntries(
    'agoricNames.instance',
  );

  await creatorFacet.deliverInstrumentOracleInvitation(
    oracleAddress,
    postalService,
  );

  const oracleStore = makeStore(oracleAddress);
  await oracleStore.saveOfferResult(
    { instance: ymax1, description: 'instrumentOracle' },
    'instrumentOracle',
  );
  /** @type {WalletStoreEntryProxy<InstrumentOracle>} */
  const oracle = oracleStore.get('instrumentOracle');

  await oracle.submitTvlUpdate('Aave_Base', 12_345_679n, 1_786_123_456);
  await oracle.submitTvlUpdate('Aave_Base', 12_600_000n, 1_786_123_516);

  const expected = {
    tvlUsd: 12_600_000n,
    asOf: 1_786_123_516,
  };
  t.deepEqual(
    await eventuallyRead('ymax1.instruments.Aave_Base', expected),
    expected,
  );

  await creatorFacet.revokeInstrumentOracle();
  await t.throwsAsync(
    oracle.submitTvlUpdate('Aave_Base', 12_700_000n, 1_786_123_576),
    { message: /revoked/ },
  );
});
