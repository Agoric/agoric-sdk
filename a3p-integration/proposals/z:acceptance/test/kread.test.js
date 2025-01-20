import test from 'ava';
import {
  provisionSmartWallet,
  USER1ADDR as Alice,
  GOV1ADDR as Bob,
} from '@agoric/synthetic-chain';
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
} from './test-lib/kread.js';

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
    /** @param {unknown} itemNode */
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
    /** @param {unknown} itemNode */
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
