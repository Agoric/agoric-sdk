// @ts-nocheck FIXME
// XXX uses agoric.follow to read data through spawned processes; replace with VstorageKit
import assert from 'node:assert';

import {
  agoric,
  executeOffer,
  getContractInfo,
  makeAgd,
} from '@agoric/synthetic-chain';
import { execFileSync } from 'child_process';
import { makeCopyBag } from '@agoric/store';
import { AmountMath } from '@agoric/ertp';
import { boardSlottingMarshaller, makeFromBoard } from '@agoric/client-utils';

const ISTunit = 1_000_000n;

/** @type {(file: string, args: string[], opts: any) => string} */
const showAndExec = (file, args, opts) => {
  console.log('$', file, ...args);
  return execFileSync(file, args, opts);
};

// @ts-expect-error string is not assignable to Buffer
const agd = makeAgd({ execFileSync: showAndExec }).withOpts({
  keyringBackend: 'test',
});

const fromBoard = makeFromBoard();
const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);

const brandsRaw = await agoric.follow(
  '-lF',
  ':published.agoricNames.brand',
  '-o',
  'text',
);
const brands = Object.fromEntries(
  marshaller.fromCapData(JSON.parse(brandsRaw)),
);

assert(brands.IST, 'Brand IST not found');
assert(brands.timer, 'Brand timer not found');
assert(brands.KREAdCHARACTER, 'Brand KREAdCHARACTER not found');
assert(brands.KREAdITEM, 'Brand KREAdITEM not found');

export const getMarketCharactersChildren = async () => {
  const { children } = await agd.query([
    'vstorage',
    'children',
    `published.kread.market-characters`,
  ]);

  return children;
};

export const getMarketItemsChildren = async () => {
  const { children } = await agd.query([
    'vstorage',
    'children',
    `published.kread.market-items`,
  ]);

  return children;
};

export const getMarketItem = async itemNode => {
  const itemMarketPath = `:published.kread.market-items.${itemNode}`;
  const rawItemData = await agoric.follow('-lF', itemMarketPath, '-o', 'text');
  const item = marshaller.fromCapData(JSON.parse(rawItemData));

  return item;
};

export const getCharacterInventory = async characterName => {
  const inventoryPath = `kread.character.inventory-${characterName}`;
  const characterInventory = await getContractInfo(inventoryPath, {
    agoric,
    prefix: 'published.',
  });

  return characterInventory;
};

export const getMarketCharacterFromVstorage = async () => {
  const charactersMarket = await getMarketCharactersChildren();
  const path = `:published.kread.market-characters.${charactersMarket[0]}`;
  const rawCharacterData = await agoric.follow('-lF', path, '-o', 'text');
  const marketCharacter = marshaller.fromCapData(JSON.parse(rawCharacterData));

  return marketCharacter;
};

export const getBalanceFromPurse = async (address, type) => {
  const walletRaw = await agoric.follow(
    '-lF',
    `:published.wallet.${address}.current`,
    '-o',
    'text',
  );
  const purses = marshaller.fromCapData(JSON.parse(walletRaw)).purses;

  const assetBrands = {
    character: brands.KREAdCHARACTER,
    item: brands.KREAdITEM,
  };
  const assetBrand = assetBrands[type];
  if (!assetBrand) {
    throw new Error('Invalid type provided. Must be "character" or "item".');
  }

  const assetPurse = purses.find(
    ({ brand }) => brand.getBoardId() === assetBrand.getBoardId(),
  );

  return assetPurse?.balance.value.payload[0]?.[0] || null;
};

/** @import {Brand, CopyBagAmount} from '@agoric/ertp/src/types.js'; */

/**
 * @param {Brand} brand
 * @param {any} asset
 * @returns {CopyBagAmount<'item'>}
 */
export const assetAsAmount = (brand, asset) => {
  const assetValue = makeCopyBag([[asset, 1n]]);
  const assetAmount = AmountMath.make(brand, assetValue);
  return assetAmount;
};

export const totalAssetPriceAmount = asset => {
  const fees = AmountMath.add(asset.platformFee, asset.royalty);
  const price = AmountMath.add(asset.askingPrice, fees);
  return price;
};
const mintCharacterOffer = async () => {
  const body = {
    method: 'executeOffer',
    offer: {
      id: 'KREAd-mint-character-acceptance-test',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['kread'],
        callPipe: [['makeMintCharacterInvitation', []]],
      },
      offerArgs: { name: 'ephemeral_Ace' },
      proposal: {
        give: {
          Price: {
            brand: brands.IST,
            value: 5n * ISTunit,
          },
        },
      },
    },
  };

  return JSON.stringify(marshaller.toCapData(harden(body)));
};

const unequipAllItemsOffer = async address => {
  const kreadCharacter = await getBalanceFromPurse(address, 'character');
  if (!kreadCharacter) {
    throw new Error('Character not found on user purse');
  }

  // deal with KREAd's funky parallel character representation swap
  const inventoryKeyId = kreadCharacter.keyId === 1 ? 2 : 1;
  const kreadCharacter2 = { ...kreadCharacter, keyId: inventoryKeyId };

  const kreadCharacterAmount = assetAsAmount(
    brands.KREAdCHARACTER,
    kreadCharacter,
  );

  const kreadCharacter2Amount = assetAsAmount(
    brands.KREAdCHARACTER,
    kreadCharacter2,
  );

  const body = {
    method: 'executeOffer',
    offer: {
      id: 'KREAd-unequip-all-items-acceptance-test',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['kread'],
        callPipe: [['makeUnequipAllInvitation', []]],
      },
      proposal: {
        give: {
          CharacterKey1: kreadCharacterAmount,
        },
        want: {
          CharacterKey2: kreadCharacter2Amount,
        },
      },
    },
  };

  return JSON.stringify(marshaller.toCapData(harden(body)));
};

const buyItemOffer = async () => {
  const children = await getMarketItemsChildren();
  const marketItem = await getMarketItem(children[0]);

  const itemAmount = assetAsAmount(brands.KREAdITEM, marketItem.asset);
  const priceAmount = totalAssetPriceAmount(marketItem);

  const body = {
    method: 'executeOffer',
    offer: {
      id: 'KREAd-buy-item-acceptance-test',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['kread'],
        callPipe: [['makeBuyItemInvitation', []]],
      },
      offerArgs: { entryId: marketItem.id },
      proposal: {
        give: {
          Price: priceAmount,
        },
        want: {
          Item: itemAmount,
        },
      },
    },
  };

  return JSON.stringify(marshaller.toCapData(harden(body)));
};

const sellItemOffer = async address => {
  const kreadItem = await getBalanceFromPurse(address, 'item');
  if (!kreadItem) {
    throw new Error('Item not found on user purse');
  }

  const itemAmount = assetAsAmount(brands.KREAdITEM, kreadItem);

  const body = {
    method: 'executeOffer',
    offer: {
      id: 'KREAd-sell-item-acceptance-test',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['kread'],
        callPipe: [['makeSellItemInvitation', []]],
      },
      proposal: {
        give: {
          Item: itemAmount,
        },
        want: {
          Price: {
            brand: brands.IST,
            value: 5n * ISTunit,
          },
        },
      },
    },
  };

  return JSON.stringify(marshaller.toCapData(harden(body)));
};

const buyCharacterOffer = async () => {
  const marketCharacter = await getMarketCharacterFromVstorage();

  const kreadCharacterAmount = assetAsAmount(
    brands.KREAdCHARACTER,
    marketCharacter.asset,
  );
  const priceAmount = totalAssetPriceAmount(marketCharacter);

  const body = {
    method: 'executeOffer',
    offer: {
      id: 'KREAd-buy-character-acceptance-test',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['kread'],
        callPipe: [['makeBuyCharacterInvitation', []]],
      },
      proposal: {
        give: {
          Price: priceAmount,
        },
        want: {
          Character: kreadCharacterAmount,
        },
      },
    },
  };

  return JSON.stringify(marshaller.toCapData(harden(body)));
};

const sellCharacterOffer = async address => {
  const kreadCharacter = await getBalanceFromPurse(address, 'character');
  if (!kreadCharacter) {
    throw new Error('Character not found on user purse');
  }

  const kreadCharacterAmount = assetAsAmount(
    brands.KREAdCHARACTER,
    kreadCharacter,
  );

  const body = {
    method: 'executeOffer',
    offer: {
      id: 'KREAd-sell-character-acceptance-test',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['kread'],
        callPipe: [['makeSellCharacterInvitation', []]],
      },
      proposal: {
        give: {
          Character: kreadCharacterAmount,
        },
        want: {
          Price: {
            brand: brands.IST,
            value: 5n * ISTunit,
          },
        },
      },
    },
  };

  return JSON.stringify(marshaller.toCapData(harden(body)));
};

export const mintCharacter = async address => {
  return executeOffer(address, mintCharacterOffer());
};

export const unequipAllItems = async address => {
  return executeOffer(address, unequipAllItemsOffer(address));
};

export const buyItem = async address => {
  return executeOffer(address, buyItemOffer());
};

export const sellItem = async address => {
  return executeOffer(address, sellItemOffer(address));
};

export const sellCharacter = async address => {
  return executeOffer(address, sellCharacterOffer(address));
};

export const buyCharacter = async address => {
  return executeOffer(address, buyCharacterOffer());
};
