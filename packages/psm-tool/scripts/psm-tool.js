#!/usr/bin/env node
/* global process, fetch */
// @ts-check
import { assert, makeTool, networks } from '../src/psm-lib.js';

const USAGE = `
Usage:
to get contract instance boardId and, optionally, fees
  psm-tool --contract [--verbose]
to write an offer to stdout
  psm-tool --wantMinted ANCHOR_TOKENS --boardId BOARD_ID [--feePct PCT]
  psm-tool --giveMinted IST_TOKENS --boardId BOARD_ID [--feePct PCT]
to get succinct offer status and purse balances
  psm-tool --wallet AGORIC_ADDRESS

NOTE: --contract and --wallet may need --experimental-fetch node option.

For example:

psmInstance=$(psm-tool --contract)
psm-tool --contract --verbose # to get fees
psm-tool --wantMinted 100 --boardId $psmInstance --feePct 0.01 >,psm-offer-action.json

# sign and send
agd --node=${networks.xnet.rpc} --chain-id=agoricxnet-13 \
  --from=LEDGER_KEY_NAME --sign-mode=amino-json \
  tx swingset wallet-action --allow-spend "$(cat ,psm-offer-action.json)"    

# check results
psm-tool --wallet agoric1....
`;

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
  assert(fetch, 'missing fetch API; try --experimental-fetch?');
  const { opts, flags } = parseArgs(argv, ['--contract', '--verbose']);

  const tool = await makeTool(opts, { fetch });

  if (flags.contract) {
    await tool.showContractId(flags.verbose);
    return 0;
  }

  if (opts.wallet) {
    if (opts.offer) {
      return tool.findOffer(opts.wallet, Number(opts.offer));
    } else {
      return tool.showWallet(opts.wallet);
    }
  }

  if (!(opts.wantMinted || opts.giveMinted)) {
    console.error(USAGE);
    return 1;
  }

  const id = 'id' in opts ? Number(opts.id) : clock().getTime();
  await tool.showOffer(id);
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
