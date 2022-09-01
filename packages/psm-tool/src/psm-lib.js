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
 */
const assert = (cond, msg = undefined) => {
  if (!cond) {
    throw typeof msg === 'string' ? Error(msg || 'check failed') : msg;
  }
};

const { freeze } = Object; // IOU harden

/**
 * Petnames depend on names issued by VBANK.
 */
const vBankPetName = {
  purse: {
    anchor: 'AUSD',
    ist: 'Agoric stable local currency',
  },
};

const COSMOS_UNIT = BigInt(1000000);

const bigIntReplacer = (_key, val) =>
  typeof val === 'bigint' ? Number(val) : val;

// eslint-disable-next-line no-unused-vars
const observedSpendAction = {
  type: 'acceptOffer',
  data: {
    id: '1661031322225',
    instancePetname: 'instance@board03040',
    requestContext: {
      dappOrigin: 'https://amm.agoric.app',
      origin: 'https://amm.agoric.app',
    },
    meta: { id: '1661031322225', creationStamp: 1661031322225 },
    status: 'proposed',
    instanceHandleBoardId: 'board03040',
    invitationMaker: { method: 'makeSwapInInvitation' },
    proposalTemplate: {
      give: {
        In: { pursePetname: 'Agoric stable local currency', value: 5000000 },
      },
      want: { Out: { pursePetname: 'ATOM', value: 2478 } },
    },
  },
};

/**
 * @param {({ wantStable: string } | { giveStable: string })} opts
 * @param {number} [fee=0]
 * @param {typeof vBankPetName} [pet]
 * @returns {typeof observedSpendAction.data.proposalTemplate}
 */
const makePSMProposalTemplate = (opts, fee = 1, pet = vBankPetName) => {
  const brand =
    'wantStable' in opts
      ? { in: pet.purse.anchor, out: pet.purse.ist }
      : { in: pet.purse.ist, out: pet.purse.anchor };
  // NOTE: proposalTemplate uses Number rather than bigint
  // presumably to avoid JSON problems
  const value =
    Number('wantStable' in opts ? opts.wantStable : opts.giveStable) *
    Number(COSMOS_UNIT);
  const adjusted = {
    in: Math.ceil('wantStable' in opts ? value / (1 - fee) : value),
    out: Math.ceil('giveStable' in opts ? value * (1 - fee) : value),
  };
  return {
    give: {
      In: { pursePetname: brand.in, value: adjusted.in },
    },
    want: {
      Out: { pursePetname: brand.out, value: adjusted.out },
    },
  };
};

/**
 * @param {{ boardId: string, feePct?: string } &
 *         ({ wantStable: string } | { giveStable: string })} opts
 * @param {number} timeStamp
 * @returns {typeof observedSpendAction}
 */
const makePSMSpendAction = (opts, timeStamp) => {
  const origin = 'unknown'; // we're not in a web origin
  const method =
    'wantStable' in opts
      ? 'makeWantStableInvitation'
      : 'makeGiveStableInvitation'; // ref psm.js
  const proposalTemplate = makePSMProposalTemplate(
    opts,
    opts.feePct ? Number(opts.feePct) / 100 : undefined,
  );

  // cribbed from ScopedBridge.js#L49-L61
  // https://github.com/Agoric/agoric-sdk/blob/master/packages/wallet/ui/src/service/ScopedBridge.js#L49-L61
  const id = `${timeStamp}`;
  const offer = {
    id,
    instancePetname: `instance@${opts.boardId}`,
    requestContext: { dappOrigin: origin, origin },
    meta: { id, creationStamp: timeStamp },
    status: 'proposed',
    invitationMaker: { method },
    instanceHandleBoardId: opts.boardId,
    proposalTemplate,
  };

  const spendAction = {
    type: 'acceptOffer',
    data: offer,
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

const miniMarshal = (slotToVal = (s, i) => s) => ({
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

// eslint-disable-next-line no-unused-vars
const exampleOffer = {
  id: 'unknown#1661035705180',
  installationPetname: 'unnamed-2',
  instanceHandleBoardId: 'board00530',
  instancePetname: 'unnamed-1',
  invitationDetails: {
    description: 'swap',
    handle: {
      kind: 'unnamed',
      petname: 'unnamed-5',
    },
    installation: {
      kind: 'unnamed',
      petname: 'unnamed-2',
    },
    instance: {
      kind: 'unnamed',
      petname: 'unnamed-1',
    },
  },
  invitationMaker: {
    method: 'makeSwapInvitation',
  },
  meta: {
    creationStamp: 1661035705180,
    id: '1661035705180',
  },
  proposalForDisplay: {
    exit: {
      onDemand: null,
    },
    give: {
      In: {
        amount: {
          brand: {
            kind: 'brand',
            petname: 'AUSD',
          },
          displayInfo: {
            assetKind: 'nat',
            decimalPlaces: 6,
          },
          value: 101000000,
        },
        purse: {
          boardId: 'unknown:10',
          iface: 'Alleged: Virtual Purse',
        },
        pursePetname: 'AUSD',
      },
    },
    want: {
      Out: {
        amount: {
          brand: {
            kind: 'brand',
            petname: 'IST',
          },
          displayInfo: {
            assetKind: 'nat',
            decimalPlaces: 6,
          },
          value: 100000000,
        },
        purse: {
          boardId: 'unknown:8',
          iface: 'Alleged: Virtual Purse',
        },
        pursePetname: 'Agoric stable local currency',
      },
    },
  },
  proposalTemplate: {
    give: {
      In: {
        pursePetname: 'AUSD',
        value: 101000000,
      },
    },
    want: {
      Out: {
        pursePetname: 'Agoric stable local currency',
        value: 100000000,
      },
    },
  },
  rawId: '1661035705180',
  requestContext: {
    dappOrigin: 'unknown',
    origin: 'unknown',
  },
  status: 'accept',
};
/** @typedef {typeof exampleOffer} OfferDetail */

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

// lines starting with 'export ' are stripped for use in Google Apps Scripts
export { assert, asPercent, getWalletState };
export { makeAgoricNames, makeFromBoard, makePSMSpendAction };
export { networks, storageNode, vstorage };
