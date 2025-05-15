/* eslint-env node */
import { retryUntilCondition } from '@agoric/client-utils';
import {
  addUser,
  CHAINID,
  makeAgd,
  VALIDATORADDR,
} from '@agoric/synthetic-chain';
import { execFileSync } from 'node:child_process';

const agd = makeAgd({ execFileSync }).withOpts({ keyringBackend: 'test' });

/**
 * @param {string} addr
 * @param {string} wanted
 * @param {string} [from]
 */
export const bankSend = async (addr, wanted, from = VALIDATORADDR) => {
  const result = await agd.tx(['bank', 'send', from, addr, wanted], {
    chainId: CHAINID,
    from,
    yes: true,
  });
  console.log(`fund ${addr} with ${wanted}`, result.code === 0 || result);
  return result;
};

export const provision = (name, address) =>
  agd.tx(['swingset', 'provision-one', name, address, 'SMART_WALLET'], {
    chainId: 'agoriclocal',
    from: 'validator',
    yes: true,
  });

export const introduceAndProvision = async name => {
  const address = await addUser(name);
  console.log('ADDR', name, address);

  const provisionP = provision(name, address);

  return { provisionP, address };
};

/**
 * @param {import('@agoric/client-utils').VstorageKit} vstorageKit
 */
export const getProvisionedAddresses = async vstorageKit => {
  const children = await vstorageKit.vstorage.keys('published.wallet');
  return children;
};

export const checkUserProvisioned = (addr, vstorageKit) =>
  retryUntilCondition(
    () => getProvisionedAddresses(vstorageKit),
    children => children.includes(addr),
    'Account not provisioned',
    { maxRetries: 5, retryIntervalMs: 1000, log: console.log, setTimeout },
  );
