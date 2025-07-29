import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { makeFakeBankManagerKit } from '@agoric/vats/tools/bank-utils.js';
import { objectMap, VBankAccount } from '@agoric/internal';
import { makeNameHubKit } from '@agoric/vats';
import * as contractExports from '../src/walletFactory.js';

/**
 * @import {TestFn, ExecutionContext} from 'ava'
 * @import {start as StartFn} from '../src/walletFactory.js';
 */

/**
 * @typedef {Awaited<ReturnType<makeTestContext>>} WTestCtx
 */

const contractName = 'walletFactory';
const ROOT_STORAGE_PATH = 'ROOT';

/** @type {TestFn<WTestCtx>} */
const test = anyTest;

const makeTestContext = async t => {};

const makeBootstrap = async () => {
  const storage = makeFakeStorageKit(ROOT_STORAGE_PATH);
  const board = makeFakeBoard();
  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();
  const { nameHub: namesByAddress, nameAdmin: namesByAddressAdmin } =
    makeNameHubKit();

  const bankBridgeMessages = [];
  const { bankManager, pourPayment } = await makeFakeBankManagerKit({
    onToBridge: obj => bankBridgeMessages.push(obj),
  });

  return {
    agoricNames,
    agoricNamesAdmin,
    board,
    bankManager,
    namesByAddress,
    namesByAddressAdmin,
    storage,
    utils: { pourPayment },
  };
};

/** @param {ExecutionContext<WTestCtx>} t */
const deploy = async t => {
  const bootstrap = await makeBootstrap();

  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  t.log('contract deployment', contractName);

  /** @type {Installation<StartFn>} */
  const installation = await bundleAndInstall(contractExports);
  t.is(passStyleOf(installation), 'remotable');

  const { agoricNames, board, bankManager, storage } = bootstrap;
  const storageNode = storage.rootNode.makeChildNode('walletFactory');

  const assetPublisher = await bankManager.getBankForAddress(
    VBankAccount.provision.address,
  );
  const started = await E(zoe).startInstance(
    installation,
    {},
    {
      agoricNames,
      board,
      assetPublisher,
    },
    { storageNode },
  );

  const { creatorFacet } = started;
  const { namesByAddressAdmin } = bootstrap;

  /** @param {string} addr */
  const provisionSmartWallet = async addr => {
    const bank = bankManager.getBankForAddress(addr);
    return E(creatorFacet).provideSmartWallet(addr, bank, namesByAddressAdmin);
  };

  return { started, bootstrap, provisionSmartWallet };
};

test(`deploy ${contractName}`, async t => {
  const { started } = await deploy(t);

  t.deepEqual(objectMap(started, passStyleOf), {
    adminFacet: 'remotable',
    creatorFacet: 'remotable',
    creatorInvitation: 'undefined',
    instance: 'remotable',
    publicFacet: 'remotable',
  });
});

test(`provision smartWallet`, async t => {
  const { provisionSmartWallet } = await deploy(t);
  const addr = 'agoric1admin';
  const [wallet, isNew] = await provisionSmartWallet(addr);
  t.is(passStyleOf(wallet), 'remotable');
  t.true(isNew);
});
