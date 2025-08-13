import { VBankAccount } from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeNameHubKit } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import { makeFakeBankManagerKit } from '@agoric/vats/tools/bank-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/eventual-send';
import { passStyleOf } from '@endo/far';
import * as wfExports from '../src/walletFactory.js';

/**
 * @import {start as StartFn} from '../src/walletFactory.js';
 * @import {SmartWallet} from '../src/smartWallet.js'
 * @import {StartedInstanceKit} from '@agoric/zoe/src/zoeService/utils';
 */

const ROOT_STORAGE_PATH = 'ROOT';

const getCapDataStructure = cell => {
  const { body, slots } = JSON.parse(cell);
  const structure = JSON.parse(body.replace(/^#/, ''));
  return { structure, slots };
};

export const makeBootstrap = async ({ root = ROOT_STORAGE_PATH } = {}) => {
  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  const storage = makeFakeStorageKit(root);
  const board = makeFakeBoard();

  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();
  await makeWellKnownSpaces(agoricNamesAdmin);
  const { nameHub: namesByAddress, nameAdmin: namesByAddressAdmin } =
    makeNameHubKit();

  const bankBridgeMessages = [];
  const { bankManager, pourPayment } = await makeFakeBankManagerKit({
    onToBridge: obj => bankBridgeMessages.push(obj),
  });

  const feeIssuer = await E(zoe).getFeeIssuer();
  const feeBrand = await E(feeIssuer).getBrand();
  await E(bankManager).addAsset('uist', 'IST', 'IST', {
    issuer: feeIssuer,
    brand: feeBrand,
  });
  await E(E(agoricNamesAdmin).lookupAdmin('issuer')).update('IST', feeIssuer);
  await E(E(agoricNamesAdmin).lookupAdmin('brand')).update('IST', feeBrand);
  board.getId(feeBrand);

  /** @param {string} path */
  const readLegible = async path => {
    await eventLoopIteration();
    return getCapDataStructure(storage.getValues(path).at(-1));
  };

  return {
    agoricNames,
    agoricNamesAdmin,
    board,
    bankManager,
    namesByAddress,
    namesByAddressAdmin,
    storage,
    zoe,
    utils: { pourPayment, bundleAndInstall, readLegible },
  };
};

/**
 * @param {{ boot?: typeof makeBootstrap }} param0
 * @returns {Promise<{
 *   walletFactoryFacets: StartedInstanceKit<StartFn>;
 *   bootstrap: Awaited<ReturnType<typeof makeBootstrap>>;
 *   provisionSmartWallet: (addr: string) => Promise<[SmartWallet, boolean]>;
 * }>}
 */
export const deploy = async ({ boot = makeBootstrap } = {}) => {
  const bootstrap = await boot();
  const { zoe, utils } = bootstrap;

  /** @type {Installation<StartFn>} */
  const installation = await utils.bundleAndInstall(wfExports);
  assert.equal(passStyleOf(installation), 'remotable');

  const { agoricNames, board, bankManager, storage } = bootstrap;
  const storageNode = storage.rootNode.makeChildNode('wallet');

  const assetPublisher = await bankManager.getBankForAddress(
    VBankAccount.provision.address,
  );
  const walletFactoryFacets = await E(zoe).startInstance(
    installation,
    {},
    {
      agoricNames,
      board,
      assetPublisher,
    },
    { storageNode },
  );

  const { creatorFacet } = walletFactoryFacets;
  const { namesByAddressAdmin } = bootstrap;

  /** @param {string} addr */
  const provisionSmartWallet = async addr => {
    const bank = bankManager.getBankForAddress(addr);
    return E(creatorFacet).provideSmartWallet(addr, bank, namesByAddressAdmin);
  };

  return { walletFactoryFacets, bootstrap, provisionSmartWallet };
};
