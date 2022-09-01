#!/usr/bin/env node
// @ts-check
/* global atob */
/* global process, fetch */

const networks = {
  local: { rpc: 'http://0.0.0.0:26657', chainId: 'agoric' },
  xnet: { rpc: 'https://xnet.rpc.agoric.net:443', chainId: 'agoricxnet-13' },
  ollinet: {
    rpc: 'https://ollinet.rpc.agoric.net:443',
    chainId: 'agoricollinet-21',
  },
};

const USAGE = `
Usage:
to get contract instance boardId and, optionally, fees
  psm-tool --contract [--verbose]
to write an offer to stdout
  psm-tool --wantStable ANCHOR_TOKENS --boardId BOARD_ID [--feePct PCT]
  psm-tool --giveStable IST_TOKENS --boardId BOARD_ID [--feePct PCT]
to get succinct offer status and purse balances
  psm-tool --wallet AGORIC_ADDRESS

NOTE: --contract and --wallet may need --experimental-fetch node option.

For example:

psmInstance=$(psm-tool --contract)
psm-tool --contract --verbose # to get fees
psm-tool --wantStable 100 --boardId $psmInstance --feePct 0.01 >,psm-offer-action.json

# sign and send
agd --node=${networks.xnet.rpc} --chain-id=agoricxnet-13 \
  --from=LEDGER_KEY_NAME --sign-mode=amino-json \
  tx swingset wallet-action --allow-spend "$(cat ,psm-offer-action.json)"    

# check results
psm-tool --wallet agoric1....
`;

/**
 * @param {unknown} cond
 * @param {unknown} [msg]
 */
// @ts-expect-error agoric-sdk code presumes assert from ses
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

const COSMOS_UNIT = 1_000_000n;

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
      const parts = storageNode.unserialize(content, ctx).at(-1);

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
  const { purses } = states.at(-1) || dieTrying();
  return { purses, offers: [...offerById.values()] };
};

/**
 * @param {string[]} argv
 * @param {string[]} [flagNames] options that don't take values
 */
const parseArgs = (argv, flagNames = []) => {
  /** @type {string[]} */
  const args = [];
  /** @type {Record<string, string>} */
  const opts = {};
  /** @type {Record<string, boolean>} */
  const flags = {};

  let ix = 0;
  while (ix < argv.length) {
    const arg = argv[ix];
    if (arg.startsWith('--')) {
      const opt = arg.slice('--'.length);
      if (flagNames.includes(arg)) {
        flags[opt] = true;
      } else {
        ix += 1;
        const val = argv[ix];
        opts[opt] = val;
      }
    } else {
      args.push(arg);
    }
    ix += 1;
  }
  return { args, opts, flags };
};

// const log = label => x => {
//   console.error(label, x);
//   return x;
// };
const log = label => x => x;

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
 * @param {{wallet?: string, net?: string}} opts
 * @param {{contract?: boolean, verbose?: boolean}} flags
 * @param {object} io
 * @param {typeof fetch} io.fetch
 */
const online = async (opts, flags, { fetch }) => {
  const net = networks[opts.net || 'local'];
  assert(net, opts.net);
  const getJSON = async url => (await fetch(log('url')(net.rpc + url))).json();

  if (flags.verbose) {
    // const status = await getJSON(`${RPC_BASE}/status?`);
    // console.log({ status });
    const raw = await getJSON(vstorage.url());
    const top = vstorage.decode(raw);
    console.error(
      JSON.stringify(['vstorage published.*', JSON.parse(top).children]),
    );
  }

  const fromBoard = makeFromBoard();
  const agoricNames = await makeAgoricNames(fromBoard, getJSON);

  if (flags.contract) {
    const govContent = await vstorage.read(
      'published.psm.IST.AUSD.governance',
      getJSON,
    );
    const { current: governance } = storageNode
      .unserialize(govContent, fromBoard)
      .at(-1);
    const {
      instance: { psm: instance },
    } = agoricNames;
    flags.verbose && console.error('psm', instance, Object.keys(governance));
    flags.verbose &&
      console.error(
        'WantStableFee',
        asPercent(governance.WantStableFee.value),
        '%',
        'GiveStableFee',
        asPercent(governance.GiveStableFee.value),
        '%',
      );
    console.info(instance.boardId);
    return 0;
  } else if (opts.wallet) {
    const state = await getWalletState(opts.wallet, fromBoard, {
      getJSON,
    });
    const { purses } = state;
    // console.log(JSON.stringify(offers, null, 2));
    // console.log(JSON.stringify({ offers, purses }, bigIntReplacer, 2));
    const summary = {
      balances: simplePurseBalances(purses),
      offers: simpleOffers(state, agoricNames),
    };
    console.log(fmtRecordOfLines(summary));
    return 0;
  }

  return 1;
};

/**
 * @param {string[]} argv
 * @param {object} io
 * @param {typeof fetch} [io.fetch]
 * @param {() => Date} io.clock
 */
const main = async (argv, { fetch, clock }) => {
  const { opts, flags } = parseArgs(argv, ['--contract', '--verbose']);

  if (flags.contract || opts.wallet) {
    assert(fetch, 'missing fetch API; try --experimental-fetch?');
    return online(opts, flags, { fetch });
  }

  if (!((opts.wantStable || opts.giveStable) && opts.boardId)) {
    console.error(USAGE);
    return 1;
  }
  // @ts-expect-error opts.boardId was tested above
  const spendAction = makePSMSpendAction(opts, clock().valueOf());
  console.log(JSON.stringify(spendAction, null, 2));
  return 0;
};

main([...process.argv], {
  // support pre-fetch node for some modes
  fetch: typeof fetch === 'function' ? fetch : undefined,
  clock: () => new Date(),
}).then(
  code => process.exit(code),
  err => console.error(err),
);
