import assert from 'assert';
import {
  agoric,
  executeOffer,
  getContractInfo,
  makeAgd,
} from '@agoric/synthetic-chain';
import { execFileSync } from 'child_process';

const ISTunit = 1_000_000n;

const showAndExec = (file, args, opts) => {
  console.log('$', file, ...args);
  return execFileSync(file, args, opts);
};

// @ts-expect-error string is not assignable to Buffer
const agd = makeAgd({ execFileSync: showAndExec }).withOpts({
  keyringBackend: 'test',
});

const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);
const fromSmallCapsEntries = txt => {
  const { body, slots } = JSON.parse(txt);
  const theEntries = zip(JSON.parse(body.slice(1)), slots).map(
    ([[name, ref], boardID]) => {
      const iface = ref.replace(/^\$\d+\./, '');
      return [name, { iface, boardID }];
    },
  );
  return Object.fromEntries(theEntries);
};

const smallCaps = slots => {
  return {
    slots,
    Nat: n => `+${n}`,
    ref: obj => {
      const ix = slots.length;
      slots.push(obj.boardID);
      obj.ix = `$${ix}.Alleged: ${obj.iface}`;
      return obj.ix;
    },
  };
};

const brand = fromSmallCapsEntries(
  await agoric.follow('-lF', ':published.agoricNames.brand', '-o', 'text'),
);
assert(brand.IST, 'Brand IST not found');
assert(brand.timer, 'Brand timer not found');
assert(brand.KREAdCHARACTER, 'Brand KREAdCHARACTER not found');
assert(brand.KREAdITEM, 'Brand KREAdITEM not found');

const mintCharacterOffer = async () => {
  const slots = [];
  const { Nat, ref } = smallCaps(slots);

  const id = `KREAd-mint-character-acceptance-test`;

  const body = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['kread'],
        callPipe: [['makeMintCharacterInvitation', []]],
      },
      offerArgs: { name: 'ephemeral_Ace' },
      proposal: {
        give: {
          Price: {
            brand: ref(brand.IST),
            value: Nat(5n * ISTunit),
          },
        },
      },
    },
  };

  const capData = { body: `#${JSON.stringify(body)}`, slots };
  return JSON.stringify(capData);
};

const unequipAllItemsOffer = async address => {
  const slots = [];
  const { ref } = smallCaps(slots);

  const kreadCharacter = await getBalanceFromPurse(address, 'character');
  if (!kreadCharacter) {
    throw new Error('Character not found on user purse');
  }

  kreadCharacter.date.timerBrand = ref(brand.timer);
  const inventoryKeyId = kreadCharacter.keyId === 1 ? 2 : 1;

  const id = `KREAd-unequip-all-items-acceptance-test`;

  const body = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['kread'],
        callPipe: [['makeUnequipAllInvitation', []]],
      },
      proposal: {
        give: {
          CharacterKey1: {
            brand: ref(brand.KREAdCHARACTER),
            value: { '#tag': 'copyBag', payload: [[kreadCharacter, '+1']] },
          },
        },
        want: {
          CharacterKey2: {
            brand: ref(brand.KREAdCHARACTER),
            value: {
              '#tag': 'copyBag',
              payload: [[{ ...kreadCharacter, keyId: inventoryKeyId }, '+1']],
            },
          },
        },
      },
    },
  };

  const capData = { body: `#${JSON.stringify(body)}`, slots };
  return JSON.stringify(capData);
};

const buyItemOffer = async () => {
  const slots = [];
  const { Nat, ref } = smallCaps(slots);

  const children = await getMarketItemsChildren();
  const marketItem = await getMarketItem(children[0]);

  const itemPrice =
    BigInt(marketItem.askingPrice.value) +
    BigInt(marketItem.platformFee.value) +
    BigInt(marketItem.royalty.value);

  const id = `KREAd-buy-item-acceptance-test`;

  const body = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['kread'],
        callPipe: [['makeBuyItemInvitation', []]],
      },
      offerArgs: { entryId: marketItem.id },
      proposal: {
        give: {
          Price: {
            brand: ref(brand.IST),
            value: Nat(itemPrice),
          },
        },
        want: {
          Item: {
            brand: ref(brand.KREAdITEM),
            value: { '#tag': 'copyBag', payload: [[marketItem.asset, '+1']] },
          },
        },
      },
    },
  };

  const capData = { body: `#${JSON.stringify(body)}`, slots };
  return JSON.stringify(capData);
};

const sellItemOffer = async address => {
  const slots = [];
  const { Nat, ref } = smallCaps(slots);

  const kreadItem = await getBalanceFromPurse(address, 'item');
  if (!kreadItem) {
    throw new Error('Item not found on user purse');
  }

  const id = `KREAd-sell-item-acceptance-test`;

  const body = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['kread'],
        callPipe: [['makeSellItemInvitation', []]],
      },
      proposal: {
        give: {
          Item: {
            brand: ref(brand.KREAdITEM),
            value: { '#tag': 'copyBag', payload: [[kreadItem, '+1']] },
          },
        },
        want: {
          Price: {
            brand: ref(brand.IST),
            value: Nat(5n * ISTunit),
          },
        },
      },
    },
  };

  const capData = { body: `#${JSON.stringify(body)}`, slots };
  return JSON.stringify(capData);
};

const buyCharacterOffer = async () => {
  const slots = [];
  const { Nat, ref } = smallCaps(slots);

  const charactersMarket = await getMarketCharactersChildren();
  const path = `:published.kread.market-characters.${charactersMarket[0]}`;
  const rawCharacterData = await agoric.follow('-lF', path, '-o', 'text');

  const characterData = JSON.parse(rawCharacterData);
  const marketCharacter = JSON.parse(characterData.body.slice(1));
  marketCharacter.asset.date.timerBrand = ref(brand.timer);

  const characterPrice =
    BigInt(marketCharacter.askingPrice.value) +
    BigInt(marketCharacter.platformFee.value) +
    BigInt(marketCharacter.royalty.value);

  const id = `KREAd-buy-character-acceptance-test`;

  const body = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['kread'],
        callPipe: [['makeBuyCharacterInvitation', []]],
      },
      proposal: {
        give: {
          Price: {
            brand: ref(brand.IST),
            value: Nat(characterPrice),
          },
        },
        want: {
          Character: {
            brand: ref(brand.KREAdCHARACTER),
            value: {
              '#tag': 'copyBag',
              payload: [[marketCharacter.asset, '+1']],
            },
          },
        },
      },
    },
  };

  const capData = { body: `#${JSON.stringify(body)}`, slots };
  return JSON.stringify(capData);
};

const sellCharacterOffer = async address => {
  const slots = [];
  const { Nat, ref } = smallCaps(slots);

  const kreadCharacter = await getBalanceFromPurse(address, 'character');
  if (!kreadCharacter) {
    throw new Error('Character not found on user purse');
  }

  kreadCharacter.date.timerBrand = ref(brand.timer);

  const id = `KREAd-sell-character-acceptance-test`;

  const body = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['kread'],
        callPipe: [['makeSellCharacterInvitation', []]],
      },
      proposal: {
        give: {
          Character: {
            brand: ref(brand.KREAdCHARACTER),
            value: { '#tag': 'copyBag', payload: [[kreadCharacter, '+1']] },
          },
        },
        want: {
          Price: {
            brand: ref(brand.IST),
            value: Nat(5n * ISTunit),
          },
        },
      },
    },
  };

  const capData = { body: `#${JSON.stringify(body)}`, slots };
  return JSON.stringify(capData);
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

  const itemData = JSON.parse(rawItemData);
  const marketItem = JSON.parse(itemData.body.slice(1));

  return marketItem;
};

export const getCharacterInventory = async characterName => {
  const inventoryPath = `kread.character.inventory-${characterName}`;
  const characterInventory = await getContractInfo(inventoryPath, {
    agoric,
    prefix: 'published.',
  });

  return characterInventory;
};

export const getBalanceFromPurse = async (address, type) => {
  const wallet = await agoric.follow(
    '-lF',
    `:published.wallet.${address}.current`,
    '-o',
    'text',
  );

  const walletData = JSON.parse(wallet);
  const walletBody = JSON.parse(walletData.body.slice(1));

  let iface;
  if (type === 'character') {
    iface = brand.KREAdCHARACTER.iface;
  } else if (type === 'item') {
    iface = brand.KREAdITEM.iface;
  } else {
    throw new Error('Invalid type provided. Must be "character" or "item".');
  }

  const purse = walletBody.purses.find(({ balance }) =>
    balance.brand.includes(iface),
  );

  if (purse) {
    return purse.balance.value.payload[0][0];
  } else {
    return null;
  }
};