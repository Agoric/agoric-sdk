// @ts-check
/* global atob */

const networks = {
  local: { rpc: 'http://0.0.0.0:26657', chainId: 'agoric' },
  xnet: { rpc: 'https://xnet.rpc.agoric.net:443', chainId: 'agoricxnet-13' },
  ollinet: {
    rpc: 'https://ollinet.rpc.agoric.net:443',
    chainId: 'agoricollinet-21',
  },
};

/**
 * @param {unknown} cond
 * @param {unknown} [msg]
 * @returns {asserts cond}
 */
const assert = (cond, msg = undefined) => {
  if (!cond) {
    throw typeof msg === 'string' ? Error(msg || 'check failed') : msg;
  }
  return undefined;
};

const { freeze } = Object; // IOU harden

const COSMOS_UNIT = BigInt(1000000);

// eslint-disable-next-line no-unused-vars
const bigIntReplacer = (_key, val) =>
  typeof val === 'bigint' ? Number(val) : val;

/**
 * zoe/ERTP types
 *
 * @typedef {Record<Keyword,Amount>} AmountKeywordRecord
 * @typedef {string} Keyword
 * @typedef {Partial<ProposalRecord>} Proposal
 *
 * @typedef {{give: AmountKeywordRecord,
 *            want: AmountKeywordRecord,
 *            exit?: ExitRule
 *           }} ProposalRecord
 *
 * @typedef {unknown} ExitRule
 */

/** @typedef {import('@agoric/smart-wallet/src/offers.js').OfferSpec} OfferSpec */
/** @typedef {import('@agoric/smart-wallet/src/smartWallet.js').BridgeAction} BridgeAction */
/** @template T @typedef {import('@agoric/smart-wallet/src/types.js').WalletCapData<T>} WalletCapData<T> */

/**
 * @param {Record<string, Brand>} brands
 * @param {({ wantMinted: string } | { giveMinted: string })} opts
 * @param {number} [fee=0]
 * @param {string} [anchor]
 * @returns {ProposalRecord}
 */
const makePSMProposal = (brands, opts, fee = 0, anchor = 'AUSD') => {
  const brand =
    'wantMinted' in opts
      ? { in: brands[anchor], out: brands.IST }
      : { in: brands.IST, out: brands[anchor] };
  const value =
    Number('wantMinted' in opts ? opts.wantMinted : opts.giveMinted) *
    Number(COSMOS_UNIT);
  const adjusted = {
    in: BigInt(Math.ceil('wantMinted' in opts ? value / (1 - fee) : value)),
    out: BigInt(Math.ceil('giveMinted' in opts ? value * (1 - fee) : value)),
  };
  return {
    give: {
      In: { brand: brand.in, value: adjusted.in },
    },
    want: {
      Out: { brand: brand.out, value: adjusted.out },
    },
  };
};

/**
 * @param {Record<string, Brand>} brands
 * @param {unknown} instance
 * @param {{ feePct?: string } &
 *         ({ wantMinted: string } | { giveMinted: string })} opts
 * @param {number} timeStamp
 * @returns {BridgeAction}
 */
const makePSMSpendAction = (instance, brands, opts, timeStamp) => {
  const method =
    'wantMinted' in opts
      ? 'makeWantMintedInvitation'
      : 'makeGiveMintedInvitation'; // ref psm.js
  const proposal = makePSMProposal(
    brands,
    opts,
    opts.feePct ? Number(opts.feePct) / 100 : undefined,
  );

  /** @type {OfferSpec} */
  const offer = {
    id: timeStamp,
    invitationSpec: {
      source: 'contract',
      instance,
      publicInvitationMaker: method,
    },
    proposal,
  };

  /** @type {BridgeAction} */
  const spendAction = {
    method: 'executeOffer',
    offer,
  };
  return spendAction;
};

const vstorage = {
  url: (path = 'published', { kind = 'children' } = {}) =>
    `/abci_query?path=%22/custom/vstorage/${kind}/${path}%22&height=0`,
  decode: ({ result: { response } }) => {
    const { code } = response;
    if (code !== 0) {
      throw response;
    }
    const { value } = response;
    return atob(value);
  },
  /**
   * @param {string} path
   * @param {(url: string) => Promise<any>} getJSON
   */
  read: async (path = 'published', getJSON) => {
    const raw = await getJSON(vstorage.url(path, { kind: 'data' }));
    return vstorage.decode(raw);
  },
};

export const miniMarshal = (slotToVal = (s, _i) => s) => ({
  unserialze: ({ body, slots }) => {
    const reviver = (_key, obj) => {
      const qclass = obj !== null && typeof obj === 'object' && obj['@qclass'];
      // NOTE: hilbert hotel not impl
      switch (qclass) {
        case 'slot': {
          const { index, iface } = obj;
          return slotToVal(slots[index], iface);
        }
        case 'bigint':
          return BigInt(obj.digits);
        case 'undefined':
          return undefined;
        default:
          return obj;
      }
    };
    return JSON.parse(body, reviver);
  },
  serialize: whole => {
    const seen = new Map();
    const slotIndex = v => {
      if (seen.has(v)) {
        return seen.get(v);
      }
      const index = seen.size;
      seen.set(v, index);
      return { index, iface: v.iface };
    };
    const recur = part => {
      if (part === null) return null;
      if (typeof part === 'bigint') {
        return { '@qclass': 'bigint', digits: `${part}` };
      }
      if (Array.isArray(part)) {
        return part.map(recur);
      }
      if (typeof part === 'object') {
        if ('boardId' in part) {
          return { '@qclass': 'slot', ...slotIndex(part.boardId) };
        }
        return Object.fromEntries(
          Object.entries(part).map(([k, v]) => [k, recur(v)]),
        );
      }
      return part;
    };
    const after = recur(whole);
    return { body: JSON.stringify(after), slots: [...seen.keys()] };
  },
});

const makeFromBoard = (slotKey = 'boardId') => {
  const cache = new Map();
  const convertSlotToVal = (slot, iface) => {
    if (cache.has(slot)) {
      return cache.get(slot);
    }
    const val = freeze({ [slotKey]: slot, iface });
    cache.set(slot, val);
    return val;
  };
  return freeze({ convertSlotToVal });
};
/** @typedef {ReturnType<typeof makeFromBoard>} IdMap */

const storageNode = {
  /** @param { string } txt */
  parseCapData: txt => {
    assert(typeof txt === 'string', typeof txt);
    /** @type {{ value: string }} */
    const { value } = JSON.parse(txt);
    const specimen = JSON.parse(value);
    // without blockHeight, it's the pre-vstreams style
    /** @type {{ body: string, slots: string[] }[]} */
    const capDatas =
      'blockHeight' in specimen
        ? specimen.values.map(s => JSON.parse(s))
        : [JSON.parse(specimen.value)];
    for (const capData of capDatas) {
      assert(typeof capData === 'object' && capData !== null, capData);
      assert('body' in capData && 'slots' in capData, capData);
      assert(typeof capData.body === 'string', capData);
      assert(Array.isArray(capData.slots), capData);
    }
    return capDatas;
  },
  unserialize: (txt, ctx) => {
    const capDatas = storageNode.parseCapData(txt);
    return capDatas.map(capData =>
      miniMarshal(ctx.convertSlotToVal).unserialze(capData),
    );
  },
};

/**
 * @template K, V
 * @typedef {[key: K, val: V]} Entry<K,V>
 */

const last = xs => xs[xs.length - 1];

/**
 * @param {IdMap} ctx
 * @param {(url: string) => Promise<any>} getJSON
 * @param {string[]} [kinds]
 */
const makeAgoricNames = async (ctx, getJSON, kinds = ['brand', 'instance']) => {
  const entries = await Promise.all(
    kinds.map(async kind => {
      const content = await vstorage.read(
        `published.agoricNames.${kind}`,
        getJSON,
      );
      const parts = last(storageNode.unserialize(content, ctx));

      /** @type {Entry<string, Record<string, any>>} */
      const entry = [kind, Object.fromEntries(parts)];
      return entry;
    }),
  );
  return Object.fromEntries(entries);
};

// eslint-disable-next-line no-unused-vars
const examplePurseState = {
  brand: {
    boardId: 'board0074',
    iface: 'Alleged: IST brand',
  },
  brandPetname: 'IST',
  currentAmount: {
    brand: {
      kind: 'brand',
      petname: 'IST',
    },
    value: 125989900,
  },
  displayInfo: {
    assetKind: 'nat',
    decimalPlaces: 6,
  },
  pursePetname: 'Agoric stable local currency',
};
/** @typedef {typeof examplePurseState} PurseState */

/** @param {PurseState[]} purses */
const makeAmountFormatter = purses => amt => {
  const {
    brand: { petname },
    value,
  } = amt;
  const purse = purses.find(p => p.brandPetname === petname);
  if (!purse) return [NaN, petname];
  const {
    brandPetname,
    displayInfo: { decimalPlaces },
  } = purse;
  /** @type {[qty: number, petname: string]} */
  const scaled = [Number(value) / 10 ** decimalPlaces, brandPetname];
  return scaled;
};

const asPercent = ratio => {
  const { numerator, denominator } = ratio;
  assert(numerator.brand === denominator.brand);
  return (100 * Number(numerator.value)) / Number(denominator.value);
};

/** @param {PurseState[]} purses */
const simplePurseBalances = purses => {
  const fmt = makeAmountFormatter(purses);
  return purses.map(p => fmt(p.currentAmount));
};

/**
 * @param {{ purses: PurseState[], offers: OfferDetail[]}} state
 * @param {Awaited<ReturnType<typeof makeAgoricNames>>} agoricNames
 */
const simpleOffers = (state, agoricNames) => {
  const { purses, offers } = state;
  const fmt = makeAmountFormatter(purses);
  const fmtRecord = r =>
    Object.fromEntries(
      Object.entries(r).map(([kw, { amount }]) => [kw, fmt(amount)]),
    );
  return offers.map(o => {
    const {
      //   id,
      meta,
      instanceHandleBoardId,
      invitationDetails: { description: invitationDescription },
      proposalForDisplay: { give, want },
      status,
    } = o;
    // console.log({ give: JSON.stringify(give), want: JSON.stringify(want) });
    const instanceEntry = Object.entries(agoricNames.instance).find(
      ([_name, { boardId }]) => boardId === instanceHandleBoardId,
    );
    const instanceName = instanceEntry
      ? instanceEntry[0]
      : instanceHandleBoardId;
    return [
      //   id,
      meta?.creationStamp ? new Date(meta.creationStamp).toISOString() : null,
      status,
      instanceName,
      invitationDescription,
      {
        give: fmtRecord(give),
        want: fmtRecord(want),
      },
    ];
  });
};

const dieTrying = msg => {
  throw Error(msg);
};
/**
 * @param {string} addr
 * @param {IdMap} ctx
 * @param {object} io
 * @param {(url: string) => Promise<any>} io.getJSON
 */
const getWalletState = async (addr, ctx, { getJSON }) => {
  const txt = await vstorage.read(`published.wallet.${addr}`, getJSON);
  /** @type {{ purses: PurseState[], offers: OfferDetail[] }[]} */
  const states = storageNode.unserialize(txt, ctx);
  const offerById = new Map();
  states.forEach(state => {
    const { offers } = state;
    offers.forEach(offer => {
      const { id } = offer;
      offerById.set(id, offer);
    });
  });
  const { purses } = last(states) || dieTrying();
  return { purses, offers: [...offerById.values()] };
};

const getContractState = async (fromBoard, agoricNames, { getJSON }) => {
  const govContent = await vstorage.read(
    'published.psm.IST.AUSD.governance',
    getJSON,
  );
  const { current: governance } = last(
    storageNode.unserialize(govContent, fromBoard),
  );
  const { 'psm.IST.AUSD': instance } = agoricNames.instance;

  return { instance, governance };
};

// lines starting with 'export ' are stripped for use in Google Apps Scripts
export { assert, asPercent };
export { getContractState, getWalletState, simpleOffers, simplePurseBalances };
export { makeAgoricNames, makeFromBoard, makePSMSpendAction };
export { networks, vstorage };
