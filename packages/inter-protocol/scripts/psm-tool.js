#!/usr/bin/env node
// @ts-check
/* global atob */
/* global process, fetch */
import assert from 'assert';

const RPC_BASE = 'https://xnet.rpc.agoric.net/';

const USAGE = `
Usage:
  psm-tool --lookup [--verbose]
  psm-tool --give ANCHOR_TOKENS --want IST_TOKENS --boardId BOARD_ID

NOTE: --lookup may need --experimental-fetch node option.

For example:

psmInstance=$(psm-tool --lookup)
psm-tool --give 101 --want 100 --boardId $psmInstance >,psm-offer-action.json
agd --node=${RPC_BASE} --chain-id=agoricxnet-13 \
  --from=LEDGER_KEY_NAME --sign-mode=amino-json \
  tx swingset wallet-action --allow-spend "$(cat ,psm-offer-action.json)"    
`;

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
 * @param {{
 *   give: bigint,
 *   want: bigint,
 *   giveUnit?: bigint,
 *   wantUnit?: bigint,
 * }} cliOffer offer expressed in whole anchor/ist tokens
 * @param {typeof vBankPetName} [pet]
 * @returns {typeof observedSpendAction.data.proposalTemplate}
 */
const makeBuyISTProposalTemplate = (cliOffer, pet = vBankPetName) => {
  const {
    give,
    want,
    giveUnit = COSMOS_UNIT,
    wantUnit = COSMOS_UNIT,
  } = cliOffer;
  return {
    // NOTE: proposalTemplate uses Number rather than bigint
    // presumably to avoid JSON problems
    give: {
      In: { pursePetname: pet.purse.anchor, value: Number(give * giveUnit) },
    },
    want: {
      Out: { pursePetname: pet.purse.ist, value: Number(want * wantUnit) },
    },
  };
};

/**
 * @param {{ give: bigint, want: bigint }} cliProposal
 * @param {string} boardId of PSM instance
 * @param {number} timeStamp
 * @returns {typeof observedSpendAction}
 */
const makeBuyISTSpendAction = ({ give, want }, boardId, timeStamp) => {
  const origin = 'unknown'; // we're not in a web origin
  const method = 'makeSwapInvitation'; // ref psm.js
  const proposalTemplate = makeBuyISTProposalTemplate({ give, want });

  // cribbed from ScopedBridge.js#L49-L61
  // https://github.com/Agoric/agoric-sdk/blob/master/packages/wallet/ui/src/service/ScopedBridge.js#L49-L61
  const id = `${timeStamp}`;
  const offer = {
    id,
    instancePetname: `instance@${boardId}`,
    requestContext: { dappOrigin: origin, origin },
    meta: { id, creationStamp: timeStamp },
    status: 'proposed',
    invitationMaker: { method },
    instanceHandleBoardId: boardId,
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
    `${RPC_BASE}/abci_query?path=%22/custom/vstorage/${kind}/${path}%22&height=0`,
  decode: ({
    result: {
      response: { value },
    },
  }) => atob(value),
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

const storageNode = {
  /** @param { string } txt */
  parseCapData: txt => {
    /** @type {{ value: string }} */
    const { value } = JSON.parse(txt);
    /** @type {{ body: string, slots: string[] }} */
    return JSON.parse(value);
  },
  /** @param { string } txt */
  parseEntries: txt => {
    const { body, slots } = storageNode.parseCapData(txt);
    const entries = JSON.parse(body);
    return Object.fromEntries(
      entries.map(([name, { index }]) => [name, slots[index]]),
    );
  },
};

/**
 * @param {object} io
 * @param {typeof fetch} io.fetch
 * @param {boolean} [io.verbose]
 */
const lookupPSMInstance = async ({ fetch, verbose }) => {
  // console.log({ fetch });
  /** @param {string} url */
  const getJSON = async url => (await fetch(url)).json();

  if (verbose) {
    const status = await getJSON(`${RPC_BASE}/status?`);
    console.log({ status });
    const top = await getJSON(vstorage.url());
    console.error('vstorage published.*', vstorage.decode(top));
  }

  const instanceRaw = await getJSON(
    vstorage.url('published.agoricNames.instance', { kind: 'data' }),
  );
  const instance = storageNode.parseEntries(vstorage.decode(instanceRaw));
  return instance.psm;
};

/**
 * @param {string} addr
 * @param {object} io
 * @param {typeof fetch} io.fetch
 */
const getOfferState = async (addr, { fetch }) => {
  /** @param {string} url */
  const getJSON = async url => (await fetch(url)).json();

  const instanceRaw = await getJSON(
    vstorage.url(`published.wallet.${addr}`, { kind: 'data' }),
  );
  const txt = vstorage.decode(instanceRaw);
  const capData = storageNode.parseCapData(txt);
  const state = miniMarshal().unserialze(capData);
  const { offers } = state;

  console.log('wallet state', JSON.stringify(offers, null, 2));
  console.log(Object.keys(state));
  // throw?
  console.error('@@@NOT IMPL');
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

/**
 * @param {string[]} argv
 * @param {object} io
 * @param {typeof fetch} [io.fetch]
 * @param {() => Date} io.clock
 */
const main = async (argv, { fetch, clock }) => {
  const { opts, flags } = parseArgs(argv, ['--lookup', '--verbose']);

  if (flags.lookup) {
    assert(fetch);
    const boardId = await lookupPSMInstance({ fetch, verbose: flags.verbose });
    flags.verbose && console.error('psm instance board id', boardId);
    console.info(boardId);
    return 0;
  } else if (opts.addr) {
    assert(fetch);
    await getOfferState(opts.addr, { fetch });
    return 0;
  }

  if (!(opts.give && opts.want && opts.boardId)) {
    console.error(USAGE);
    return 1;
  }
  const [give, want] = [BigInt(opts.give), BigInt(opts.want)];

  const spendAction = makeBuyISTSpendAction(
    { give, want },
    opts.boardId,
    clock().valueOf(),
  );
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
