/* global fetch setTimeout */

import test from 'ava';
import {
  provisionSmartWallet,
  USER1ADDR as Alice,
  GOV1ADDR as Bob,
  getIncarnation,
  evalBundles,
} from '@agoric/synthetic-chain';
import { makeWalletUtils, retryUntilCondition } from '@agoric/client-utils';
import {
  buyCharacter,
  buyItem,
  getCharacterInventory,
  getMarketCharactersChildren,
  getBalanceFromPurse,
  getMarketItem,
  getMarketItemsChildren,
  mintCharacter,
  sellCharacter,
  sellItem,
  unequipAllItems,
  installBundle,
} from './test-lib/kread.js';
import { networkConfig, agdWalletUtils } from './test-lib/index.js';

test.serial('Alice mints a new Character', async t => {
  await provisionSmartWallet(Alice, '200000000ubld');
  const characterBalanceBefore = await getBalanceFromPurse(Alice, 'character');
  t.is(characterBalanceBefore, null, 'A Character should not exist in purse');

  await mintCharacter(Alice);

  const characterBalanceAfter = await getBalanceFromPurse(Alice, 'character');
  t.is(
    characterBalanceAfter.name,
    'ephemeral_Ace',
    'Minted Character name should be ephemeral_Ace',
  );
});

test.serial('Alice unequips all defaults Items', async t => {
  const itemBalanceBefore = await getBalanceFromPurse(Alice, 'item');
  t.is(itemBalanceBefore, null, 'An Item should not exist in purse');

  const characterId = 'ephemeral_Ace';
  const characterInventoryBefore = await getCharacterInventory(characterId);
  t.is(
    characterInventoryBefore.length,
    3,
    'Character should have 3 items in inventory',
  );

  await unequipAllItems(Alice);

  const characterInventoryAfter = await getCharacterInventory(characterId);
  t.is(
    characterInventoryAfter.length,
    0,
    'Character should have 0 items in inventory',
  );

  const itemBalanceAfter = await getBalanceFromPurse(Alice, 'item');
  t.is(
    itemBalanceAfter.description,
    characterInventoryBefore[0][0].description,
    'The unequipped Item should exist in purse',
  );
});

test.serial('Alice sells one unequipped Item', async t => {
  const itemListBefore = await getMarketItemsChildren();
  const itemBefore = await getBalanceFromPurse(Alice, 'item');

  await sellItem(Alice);

  const itemListAfter = await getMarketItemsChildren();
  t.is(
    itemListAfter.length,
    itemListBefore.length + 1,
    'Items market should have 1 more item',
  );

  const soldItemNode = itemListAfter.filter(
    itemNode => !itemListBefore.includes(itemNode),
  );
  const soldItem = await getMarketItem(soldItemNode);

  t.is(
    itemBefore.description,
    soldItem.asset.description,
    'Item on purse should have the same description as the one sold to market',
  );
});

test.serial('Bob buys an Item on marketplace', async t => {
  const itemListBefore = await getMarketItemsChildren();
  const marketItemNode = itemListBefore[0];
  const marketItem = await getMarketItem(marketItemNode);

  await buyItem(Bob);

  const itemListAfter = await getMarketItemsChildren();
  t.is(
    itemListAfter.length,
    itemListBefore.length - 1,
    'Items market should have 1 less item',
  );

  const boughtItemNode = itemListBefore.filter(
    itemNode => !itemListAfter.includes(itemNode),
  );
  t.is(
    marketItemNode,
    boughtItemNode[0],
    'Item bought should have been removed from market',
  );

  const item = await getBalanceFromPurse(Bob, 'item');
  t.is(
    item.description,
    marketItem.asset.description,
    'Item on purse should have the same description as the one bought from market',
  );
});

test.serial('Alice sells a Character', async t => {
  const characterListBefore = await getMarketCharactersChildren();
  t.false(
    characterListBefore.includes('character-ephemeral_Ace'),
    'Character should not be on market before selling',
  );

  const characterBalanceBefore = await getBalanceFromPurse(Alice, 'character');
  t.is(
    characterBalanceBefore.name,
    'ephemeral_Ace',
    'Character name should be ephemeral_Ace',
  );

  await sellCharacter(Alice);

  const characterListAfter = await getMarketCharactersChildren();
  t.true(
    characterListAfter.includes('character-ephemeral_Ace'),
    'Character should be on market after selling',
  );

  const characterBalanceAfter = await getBalanceFromPurse(Alice, 'character');
  t.is(
    characterBalanceAfter,
    null,
    'Character should not be in purse after selling',
  );
});

test.serial('Bob buys a Character on marketplace', async t => {
  await buyCharacter(Bob);

  const characterListBefore = await getMarketCharactersChildren();
  t.false(
    characterListBefore.includes('character-ephemeral_Ace'),
    'Character should not be on market after buying',
  );

  const characterBalance = await getBalanceFromPurse(Bob, 'character');
  t.is(
    characterBalance.name,
    'ephemeral_Ace',
    'Character name should be ephemeral_Ace',
  );
});

test.serial('User assets survive KREAd contract upgrade', async t => {
  // XXX install updated KREAd contract and manifest bundles (this step should be removed)
  const installContractBundleTX = await installBundle(
    'kreadBundles/b1-a2b6c9a070034f9881d0d28c1532bf455ff80611d213564ac8135dd5ef84ad0f053c65c7f43863eb4fdf6e2bfc46872d563307c7ab6f22889287f7de7b686de3.json',
  );
  t.is(
    installContractBundleTX.code,
    0,
    'Contract bundle failed to be installed',
  );

  const installManifestBundleTX = await installBundle(
    'kreadBundles/b1-de0eab9300715acb6ef75bafde5c00afb9110b60d2c36736989e08fe12e590ed7b8d2db1174e540e7e02f56026336a76f0837d6daa4ae0ad28e3e336dbe3c559.json',
  );
  t.is(
    installManifestBundleTX.code,
    0,
    'Contract bundle failed to be installed',
  );

  const characterId = 'ephemeral_Joker';
  await mintCharacter(Alice, characterId);

  const characterBalanceBefore = await getBalanceFromPurse(Alice, 'character');
  t.is(
    characterBalanceBefore.name,
    characterId,
    'Character name should be ephemeral_Joker',
  );

  const characterInventoryBefore = await getCharacterInventory(characterId);
  t.is(
    characterInventoryBefore.length,
    3,
    'Character should have 3 items in inventory',
  );

  const incarnationBefore = await getIncarnation('zcf-b1-853ac-KREAd');

  await evalBundles('upgrade-kread');

  const incarnationAfter = await retryUntilCondition(
    async () => getIncarnation('zcf-b1-853ac-KREAd'),
    value => value === incarnationBefore + 1,
    'KREAd upgrade not processed yet',
    { setTimeout, retryIntervalMs: 5000, maxRetries: 15 },
  );

  t.is(
    incarnationAfter,
    incarnationBefore + 1,
    'KREAd vat incarnation should have increased',
  );

  const characterBalanceAfter = await getBalanceFromPurse(Alice, 'character');
  t.is(
    characterBalanceAfter.name,
    characterId,
    'Character name should be ephemeral_Joker',
  );

  const characterInventoryAfter = await getCharacterInventory(characterId);
  t.is(
    characterInventoryAfter.length,
    3,
    'Character should have 3 items in inventory',
  );
});

test.serial('market survives zoe upgrade', async t => {
  /** @param {number} ms */
  const delay = ms =>
    new Promise(resolve => setTimeout(() => resolve(undefined), ms));
  const { getCurrentWalletRecord } = await makeWalletUtils(
    { delay, fetch },
    networkConfig,
  );

  /**
   * @param {string} address
   * @returns
   */
  const getWalletLiveOffers = async address =>
    (await getCurrentWalletRecord(address)).liveOffers;

  /**
   * @param {string} offerId
   * @param {import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord['liveOffers']} liveOffers
   * @returns {boolean}
   */
  const isOfferPresentInLiveOffers = (offerId, liveOffers) =>
    liveOffers.some(element => element.includes(offerId));

  // XXX the functions above should be moved to an appropriated library

  const sellOfferId = 'sell-before-zoe-upgrade';
  await sellCharacter(Alice, sellOfferId);

  const characterId = 'ephemeral_Joker';
  const marketCharacterId = 'character-ephemeral_Joker';
  const characterListBefore = await getMarketCharactersChildren();
  t.true(
    characterListBefore.includes(marketCharacterId),
    'Character should be on market after selling',
  );

  const characterBalanceBefore = await getBalanceFromPurse(Alice, 'character');
  t.is(
    characterBalanceBefore,
    null,
    'Character should not be in purse after selling',
  );

  t.is(
    isOfferPresentInLiveOffers(sellOfferId, await getWalletLiveOffers(Alice)),
    true,
    'Sell offerId should be found on user wallet',
  );

  const incarnationBefore = await getIncarnation('zoe');

  await evalBundles('upgrade-zoe');

  const incarnationAfter = await retryUntilCondition(
    async () => getIncarnation('zoe'),
    value => value === incarnationBefore + 1,
    'KREAd upgrade not processed yet',
    { setTimeout, retryIntervalMs: 5000, maxRetries: 15 },
  );

  t.is(
    incarnationAfter,
    incarnationBefore + 1,
    'Zoe vat incarnation should have increased',
  );

  await agdWalletUtils.broadcastBridgeAction(Alice, {
    method: 'tryExitOffer',
    offerId: sellOfferId,
  });

  const liveOfferAfter = await retryUntilCondition(
    async () => getWalletLiveOffers(Alice),
    value => !isOfferPresentInLiveOffers(sellOfferId, value),
    'sell offer still present in user liveOffers',
    { setTimeout, retryIntervalMs: 5000, maxRetries: 15 },
  );

  t.is(
    isOfferPresentInLiveOffers(sellOfferId, liveOfferAfter),
    false,
    'Sell offerId should NOT be found on user wallet',
  );

  const characterListAfter = await getMarketCharactersChildren();
  t.false(
    characterListAfter.includes(marketCharacterId),
    'Character should not be on market after offer exit',
  );

  const characterBalanceAfter = await getBalanceFromPurse(Alice, 'character');
  t.is(
    characterBalanceAfter.name,
    characterId,
    'Character name should be ephemeral_Joker',
  );
});
