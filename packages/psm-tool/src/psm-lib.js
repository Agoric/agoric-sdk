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
  url: (path = 'published', { kind = 'children', height = 0 } = {}) =>
    `/abci_query?path=%22/custom/vstorage/${kind}/${path}%22&height=${height}`,
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
  /**
   * @param {string} path
   * @param {*} getJSON
   * @param {number} [height]
   * @returns {Promise<{blockHeight: number, values: string[]}>}
   */
  readAt: async (path, getJSON, height = undefined) => {
    const raw = await getJSON(vstorage.url(path, { kind: 'data', height }));
    const txt = vstorage.decode(raw);
    /** @type {{ value: string }} */
    const { value } = JSON.parse(txt);
    return JSON.parse(value);
  },
  readAll: async (path, getJSON) => {
    const parts = [];
    let blockHeight;
    do {
      let values;
      try {
        ({ blockHeight, values } = await vstorage.readAt(
          path,
          getJSON,
          blockHeight && blockHeight - 1,
        ));
      } catch (err) {
        if ('log' in err && err.log.match(/unknown request/)) {
          break;
        }
        throw err;
      }
      // console.debug(blockHeight, values.length);
      parts.push(values);
    } while (blockHeight > 0);
    return parts.flat();
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
    const { blockHeight } = specimen;
    const capDatas = storageNode.parseMany(specimen.values);
    return { blockHeight, capDatas };
  },
  unserialize: (txt, ctx) => {
    const { capDatas } = storageNode.parseCapData(txt);
    return capDatas.map(capData =>
      miniMarshal(ctx.convertSlotToVal).unserialze(capData),
    );
  },
  parseMany: values => {
    /** @type {{ body: string, slots: string[] }[]} */
    const capDatas = values.map(s => JSON.parse(s));
    for (const capData of capDatas) {
      assert(typeof capData === 'object' && capData !== null, capData);
      assert('body' in capData && 'slots' in capData, capData);
      assert(typeof capData.body === 'string', capData);
      assert(Array.isArray(capData.slots), capData);
    }
    return capDatas;
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
const exampleAsset = {
  brand: { boardId: 'board0425', iface: 'Alleged: BLD brand' },
  displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
  issuer: { boardId: null, iface: undefined },
  petname: 'Agoric staking token',
};
/** @typedef {typeof exampleAsset} AssetDescriptor */

/** @param {AssetDescriptor[]} assets */
const makeAmountFormatter = assets => amt => {
  const {
    brand: { boardId },
    value,
  } = amt;
  const asset = assets.find(a => a.brand.boardId === boardId);
  if (!asset) return [NaN, boardId];
  const {
    petname,
    displayInfo: { assetKind, decimalPlaces },
  } = asset;
  if (assetKind !== 'nat') return [['?'], petname];
  /** @type {[qty: number, petname: string]} */
  const scaled = [Number(value) / 10 ** decimalPlaces, petname];
  return scaled;
};

const asPercent = ratio => {
  const { numerator, denominator } = ratio;
  assert(numerator.brand === denominator.brand);
  return (100 * Number(numerator.value)) / Number(denominator.value);
};

/**
 * @param {Amount[]} balances
 * @param {AssetDescriptor[]} assets
 */
const simplePurseBalances = (balances, assets) => {
  const fmt = makeAmountFormatter(assets);
  return balances.map(b => fmt(b));
};

/**
 * @param {{ assets: AssetDescriptor[], offers: Map<number,OfferSpec>}} state
 * @param {Awaited<ReturnType<typeof makeAgoricNames>>} agoricNames
 */
const simpleOffers = (state, agoricNames) => {
  const { assets, offers } = state;
  const fmt = makeAmountFormatter(assets);
  const fmtRecord = r =>
    Object.fromEntries(
      Object.entries(r).map(([kw, amount]) => [kw, fmt(amount)]),
    );
  return [...offers.keys()].sort().map(id => {
    const o = offers.get(id);
    assert(o);
    assert(o.invitationSpec.source === 'contract');
    const {
      invitationSpec: { instance, publicInvitationMaker },
      proposal: { give, want },
      payouts,
    } = o;
    const entry = Object.entries(agoricNames.instance).find(
      ([_name, candidate]) => candidate === instance,
    );
    const instanceName = entry ? entry[0] : '???';
    // console.log({ give: JSON.stringify(give), want: JSON.stringify(want) });
    return [
      instanceName,
      new Date(id).toISOString(),
      id,
      publicInvitationMaker,
      o.numWantsSatisfied,
      {
        give: fmtRecord(give),
        want: fmtRecord(want),
        ...(payouts ? { payouts: fmtRecord(payouts) } : {}),
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
  const values = await vstorage.readAll(`published.wallet.${addr}`, getJSON);
  const capDatas = storageNode.parseMany(values);

  /** @type {Map<number, OfferSpec>} */
  const offers = new Map();
  /** @type {Map<Brand, Amount>} */
  const balances = new Map();
  /** @type {AssetDescriptor[]} */
  const assets = [];
  const mm = miniMarshal(ctx.convertSlotToVal);
  capDatas.forEach(capData => {
    const update = mm.unserialze(capData);
    switch (update.updated) {
      case 'offerStatus': {
        const { status } = update;
        if (!offers.has(status.id)) {
          offers.set(status.id, status);
        }
        break;
      }
      case 'balance': {
        const { currentAmount } = update;
        if (!balances.has(currentAmount.brand)) {
          balances.set(currentAmount.brand, currentAmount);
        }
        break;
      }
      case 'brand': {
        assets.push(update.descriptor);
        break;
      }
      default:
        throw Error(update.updated);
    }
  });
  return { balances, assets, offers };
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

// const log = label => x => {
//   console.error(label, x);
//   return x;
// };
const log = _label => x => x;

const fmtRecordOfLines = record => {
  const { stringify } = JSON;
  const groups = Object.entries(record).map(([key, items]) => [
    key,
    items.map(item => `    ${stringify(item)}`),
  ]);
  const lineEntries = groups.map(
    ([key, lines]) => `  ${stringify(key)}: [\n${lines.join(',\n')}\n  ]`,
  );
  return `{\n${lineEntries.join(',\n')}\n}`;
};

/**
 * @param {{net?: string}} opts
 * @param {object} io
 * @param {typeof fetch} io.fetch
 */
const makeTool = async (opts, { fetch }) => {
  const net = networks[opts.net || 'local'];
  assert(net, opts.net);
  const getJSON = async url => (await fetch(log('url')(net.rpc + url))).json();

  const showPublishedChildren = async () => {
    // const status = await getJSON(`${RPC_BASE}/status?`);
    // console.log({ status });
    const raw = await getJSON(vstorage.url());
    const top = vstorage.decode(raw);
    console.error(
      JSON.stringify(['vstorage published.*', JSON.parse(top).children]),
    );
  };

  const fromBoard = makeFromBoard();
  const agoricNames = await makeAgoricNames(fromBoard, getJSON);

  const showContractId = async showFees => {
    const { instance, governance } = await getContractState(
      fromBoard,
      agoricNames,
      {
        getJSON,
      },
    );
    showFees && console.error('psm', instance, Object.keys(governance));
    showFees &&
      console.error(
        'WantMintedFee',
        asPercent(governance.WantMintedFee.value),
        '%',
        'GiveMintedFee',
        asPercent(governance.GiveMintedFee.value),
        '%',
      );
    console.info(instance.boardId);
  };

  const showWallet = async addr => {
    const state = await getWalletState(addr, fromBoard, {
      getJSON,
    });
    const { assets, balances } = state;
    // console.log(JSON.stringify(offers, null, 2));
    // console.log(JSON.stringify({ offers, purses }, bigIntReplacer, 2));
    const summary = {
      balances: simplePurseBalances([...balances.values()], assets),
      offers: simpleOffers(state, agoricNames),
    };
    console.log(fmtRecordOfLines(summary));
    return 0;
  };

  const findOffer = async (addr, id) => {
    const { assets, offers } = await getWalletState(addr, fromBoard, {
      getJSON,
    });
    const offer = offers.get(id);
    if (!offer) {
      return 1;
    }
    const { numWantsSatisfied, payouts } = offer;
    const fmt = makeAmountFormatter(assets);
    const fmtRecord = r =>
      Object.fromEntries(
        Object.entries(r).map(([kw, amount]) => [kw, fmt(amount)]),
      );
    console.error({
      numWantsSatisfied,
      ...(payouts ? { payouts: fmtRecord(payouts) } : {}),
    });
    return typeof numWantsSatisfied === 'number' ? 0 : 1;
  };

  const showOffer = id => {
    assert(net, opts.net);
    const instance = agoricNames.instance['psm-IST-AUSD'];
    const spendAction = makePSMSpendAction(
      instance,
      agoricNames.brand,
      // @ts-expect-error
      opts,
      id,
    );
    console.log(JSON.stringify(miniMarshal().serialize(spendAction)));
  };

  return {
    publishedChildren: showPublishedChildren,
    showContractId,
    showOffer,
    showWallet,
    findOffer,
  };
};

// lines starting with 'export ' are stripped for use in Google Apps Scripts
export { assert };
export { networks, makeTool };
