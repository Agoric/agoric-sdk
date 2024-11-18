// @ts-check
/* eslint-env node */
import '@endo/init/legacy.js';
import test from 'ava';
import {
  addUser,
  makeAgd,
  agd as agdAmbient,
  openVault,
  ATOM_DENOM,
  VALIDATORADDR,
  CHAINID,
  GOV1ADDR,
} from '@agoric/synthetic-chain';
import {
  retryUntilCondition,
  makeVstorageKit,
  waitUntilAccountFunded,
} from '@agoric/client-utils';
import { execFileSync } from 'child_process';

const agd = makeAgd({ execFileSync }).withOpts({ keyringBackend: 'test' });

/**
 *
 * @param {string} addr
 * @param {string} wanted
 * @param {string} [from]
 */
export const bankSend = (addr, wanted, from = VALIDATORADDR) => {
  return agd.tx(['bank', 'send', from, addr, wanted], {
    chainId: CHAINID,
    from,
    yes: true,
  });
};

const provision = (name, address) =>
  agd.tx(['swingset', 'provision-one', name, address, 'SMART_WALLET'], {
    chainId: 'agoriclocal',
    from: 'validator',
    yes: true,
  });

const introduceAndProvision = async name => {
  const address = await addUser(name);
  console.log('ADDR', name, address);

  const provisionP = provision(name, address);

  return { provisionP, address };
};

/**
 * @param {import('@agoric/client-utils').VstorageKit} vstorageKit
 */
const getProvisionedAddresses = async vstorageKit => {
  const children = await vstorageKit.vstorage.keys('published.wallet');
  return children;
};

const checkUserProvisioned = (addr, vstorageKit) =>
  retryUntilCondition(
    () => getProvisionedAddresses(vstorageKit),
    children => children.includes(addr),
    'Account not provisioned',
    { maxRetries: 5, retryIntervalMs: 1000, log: console.log, setTimeout },
  );

test.before(async t => {
  const vstorageKit = await makeVstorageKit(
    { fetch },
    { rpcAddrs: ['http://localhost:26657'], chainName: 'agoriclocal' },
  );

  t.context = {
    vstorageKit,
  };
});

test.serial('provision manually', async t => {
  // @ts-expect-error casting
  const { vstorageKit } = t.context;

  const { address } = await introduceAndProvision('manuallyProvisioned');
  await checkUserProvisioned(address, vstorageKit);
  t.log('manuallyProvisioned address:', address);
  t.pass();
});

test.serial('provisioned automatically', async t => {
  // @ts-expect-error casting
  const { vstorageKit } = t.context;

  const address = await addUser('automaticallyProvisioned');
  console.log('ADDR', 'automaticallyProvisioned', address);

  await bankSend(address, `50000000${ATOM_DENOM}`);
  // some ist is needed for opening a new vault
  await bankSend(address, `10000000uist`, GOV1ADDR);
  await waitUntilAccountFunded(
    address,
    // TODO: drop agd.query and switch to vstorgeKit
    { log: console.log, setTimeout, query: agdAmbient.query },
    { denom: ATOM_DENOM, value: 50_000_000 },
    { errorMessage: `not able to fund ${address}` },
  );

  await openVault(address, '10.0', '20.0');
  await checkUserProvisioned(address, vstorageKit);
  t.pass();
});
