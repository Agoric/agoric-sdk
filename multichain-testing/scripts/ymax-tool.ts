#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file tools for integration testing for ymax proof of concept.
 */
import '@endo/init';

import type {
  OfferArgsFor,
  ProposalType,
} from '@aglocal/portfolio-contract/src/type-guards.ts';
import { makePortfolioSteps } from '@aglocal/portfolio-contract/tools/portfolio-actors.ts';
import {
  fetchEnvNetworkConfig,
  makeSmartWalletKit,
} from '@agoric/client-utils';
import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import { AmountMath } from '@agoric/ertp';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import { makeTracer } from '@agoric/internal';
import type { BridgeAction } from '@agoric/smart-wallet/src/smartWallet.js';
import { stringToPath } from '@cosmjs/crypto';
import { fromBech32 } from '@cosmjs/encoding';
import {
  DirectSecp256k1HdWallet,
  Registry,
  type GeneratedType,
} from '@cosmjs/proto-signing';
import { SigningStargateClient, type StdFee } from '@cosmjs/stargate';
import { parseArgs } from 'node:util';

const getUsage = (
  programName: string,
): string => `USAGE: ${programName} <volume> [options]
Options:
  --skip-poll       Skip polling for offer result
  --exit-success    Exit with success code even if errors occur
  -h, --help        Show this help message`;

const toAccAddress = (address: string): Uint8Array => {
  return fromBech32(address).data;
};

const trace = makeTracer('YMXTool');
const { fromEntries } = Object;
const { make } = AmountMath;

const AgoricMsgs = {
  MsgWalletSpendAction: {
    typeUrl: '/agoric.swingset.MsgWalletSpendAction',
    aminoType: 'swingset/WalletSpendAction',
  },
};
const agoricRegistryTypes: [string, GeneratedType][] = [
  [
    AgoricMsgs.MsgWalletSpendAction.typeUrl,
    MsgWalletSpendAction as GeneratedType,
  ],
];

const openPosition = async (
  volume: number | string,
  {
    address,
    client,
    walletKit,
    now,
    skipPoll = false,
  }: {
    address: string;
    client: SigningStargateClient;
    walletKit: Awaited<ReturnType<typeof makeSmartWalletKit>>;
    now: () => number;
    skipPoll?: boolean;
  },
) => {
  const brand = fromEntries(await walletKit.readPublished('agoricNames.brand'));
  const { USDC, PoC26 } = brand as Record<string, Brand<'nat'>>;

  const amount = multiplyBy(make(USDC, 1_000_000n), parseRatio(volume, USDC));
  const { give, steps } = makePortfolioSteps({ USDN: amount });
  const proposal: ProposalType['openPortfolio'] = {
    give: {
      ...give,
      ...(PoC26 ? { Access: make(PoC26, 1n) } : {}),
    },
  };
  const offerArgs: OfferArgsFor['openPortfolio'] = {
    flow: steps,
  };
  trace('opening portfolio', proposal.give);
  const action: BridgeAction = harden({
    method: 'executeOffer',
    offer: {
      id: `open-${new Date(now()).toISOString()}`,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['ymax0'],
        callPipe: [['makeOpenPortfolioInvitation']],
      },
      proposal,
      offerArgs,
    },
  });

  const msgSpend = MsgWalletSpendAction.fromPartial({
    owner: toAccAddress(address),
    spendAction: JSON.stringify(walletKit.marshaller.toCapData(action)),
  });

  const fee: StdFee = {
    amount: [{ denom: 'ubld', amount: '30000' }], // XXX enough?
    gas: '197000',
  };
  const before = await client.getBlock();
  console.log('signAndBroadcast', address, msgSpend, fee);
  const actual = await client.signAndBroadcast(
    address,
    [{ typeUrl: MsgWalletSpendAction.typeUrl, value: msgSpend }],
    fee,
  );
  trace('tx', actual);

  if (skipPoll) {
    trace('skipping poll as per skipPoll flag');
    const status = { result: { transaction: actual } };
    return status;
  }

  trace(
    'starting to poll for offer result from block height',
    before.header.height,
  );
  const status = await walletKit.pollOffer(
    address,
    action.offer.id,
    before.header.height,
  );

  trace('final offer status', status);
  if ('error' in status) {
    trace('offer failed with error', status.error);
    throw Error(status.error);
  }
  trace('offer completed successfully', {
    statusType: 'success',
    result: status.result,
  });

  return status;
};

const main = async (
  argv = process.argv,
  env = process.env,
  {
    fetch = globalThis.fetch,
    setTimeout = globalThis.setTimeout,
    connectWithSigner = SigningStargateClient.connectWithSigner,
  } = {},
) => {
  // Parse command line arguments using node:util's parseArgs
  const { values, positionals } = parseArgs({
    args: argv.slice(2),
    options: {
      'skip-poll': { type: 'boolean', default: false },
      'exit-success': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  // Extract options
  const skipPoll = values['skip-poll'];
  const exitSuccess = values['exit-success'];
  const [volume] = positionals;

  // Show help if requested or if volume is not provided
  if (values.help || !volume) {
    console.log(getUsage(argv[1]));
    process.exit(values.help ? 0 : 1);
  }

  const { MNEMONIC } = env;
  if (!MNEMONIC) throw Error(`MNEMONIC not set`);

  const delay = ms =>
    new Promise(resolve => setTimeout(resolve, ms)).then(_ => {});
  const networkConfig = await fetchEnvNetworkConfig({ env, fetch });
  const walletKit = await makeSmartWalletKit({ fetch, delay }, networkConfig);
  const signer = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, {
    prefix: 'agoric',
    hdPaths: [stringToPath(`m/44'/564'/0'/0/0`)],
  });
  const [{ address }] = await signer.getAccounts();
  const client = await connectWithSigner(networkConfig.rpcAddrs[0], signer, {
    registry: new Registry(agoricRegistryTypes),
  });

  try {
    // Pass the parsed skipPoll option to openPosition
    await openPosition(volume, {
      address,
      client,
      walletKit,
      now: Date.now,
      skipPoll,
    });
  } catch (err) {
    // If we should exit with success code, throw a special non-error object
    if (exitSuccess) {
      throw { exitSuccess: true, originalError: err };
    }
    throw err;
  }
};

// TODO: use endo-exec so we can unit test the above
main().catch(err => {
  // Check if this is our special non-error signal for exitSuccess
  if (err && typeof err === 'object' && 'exitSuccess' in err) {
    console.error(
      'Error occurred but exiting with success code as requested:',
      err.originalError,
    );
    process.exit(0);
  }

  console.error(err);
  process.exit(1);
});
