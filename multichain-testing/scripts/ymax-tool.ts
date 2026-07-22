#!/usr/bin/env -S node --import ts-blank-space/register
/* global globalThis */
/**
 * @file tools for integration testing for ymax proof of concept.
 *
 * Not fully supported. It has zero test coverage and some parts are already known to have bit-rotted.
 *
 * Scope: CLI ergonomics and IO/ambient authority (console, env, stdin/stdout).
 * This entrypoint maps shell arguments to intent and delegates execution to
 * reusable lib functions.
 */
import '@endo/init';

import type { MovementDesc } from '@aglocal/portfolio-contract/src/type-guards-steps.ts';
import {
  TargetAllocationShape,
  type OfferArgsFor,
  type PortfolioPublishedPathTypes,
  type ProposalType,
  type TargetAllocation,
} from '@aglocal/portfolio-contract/src/type-guards.ts';
import { makePortfolioSteps } from '@aglocal/portfolio-contract/tools/plan-transfers.ts';
import { makePortfolioQuery } from '@aglocal/portfolio-contract/tools/portfolio-actors.ts';
import {
  axelarConfig as axelarConfigMainnet,
  axelarConfigTestnet,
  gmpAddresses as gmpConfigs,
  type AxelarChainConfig,
} from '@aglocal/portfolio-deploy/src/axelar-configs.js';
import { findOutdated } from '@aglocal/portfolio-deploy/src/vstorage-outdated.js';
import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
  makeVStorage,
  type SigningSmartWalletKit,
  type SmartWalletKit,
  type TypedPublishedFor,
} from '@agoric/client-utils';
import { AmountMath, type Brand } from '@agoric/ertp';
import {
  multiplyBy,
  parseRatio,
  type ParsableNumber,
} from '@agoric/ertp/src/ratio.js';
import {
  makeTracer,
  mustMatch,
  objectMap,
  type TypedPattern,
} from '@agoric/internal';
import {
  getPermitWitnessTransferFromData,
  type TokenPermissions,
} from '@agoric/orchestration/src/utils/permit2.ts';
import {
  AxelarChain,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import {
  getYmaxWitness,
  type TargetAllocation as Allocation,
} from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import type { OfferStatus } from '@agoric/smart-wallet/src/offers.js';
import { M } from '@agoric/store';
import { SigningStargateClient } from '@cosmjs/stargate';
import type { CopyRecord } from '@endo/pass-style';
import { parseArgs } from 'node:util';
import type { HDAccount } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { walletUpdates } from '../tools/wallet-store-reflect.ts';

const getUsage = (programName: string): string =>
  `USAGE: ${programName} [options...] [operation]
Options:
  --skip-poll             Skip polling for offer result
  --exit-success          Exit with success code even if errors occur
  --positions             JSON of opening positions (e.g. '{"USDN":6000,"Aave":4000}')
  --target-allocation     JSON of target allocation (e.g. '{"USDN":6000,"Aave_Arbitrum":4000}')
  --evm <chainId>         Use an EVM wallet and deposit from the given chain (e.g. 'Ethereum')
  --evm-router <chainId>  Use an EVM router wallet and deposit from the given chain (e.g. 'Ethereum')
  --evm-verified-signer   Send the signer address as verified for EVM messages
  --contract=[ymax0]      Contract key in agoricNames.instance ('ymax0' or 'ymax1'), used for
                          portfolios

Operations:
  -h, --help                Show this help message
  --checkStorage            Report outdated ymax0 vstorage nodes (older than agoricNames.instance)
  --open                    [default operation] Open a new portfolio per --positions and
                            --target-allocation. Uses an EVM wallet if --evm or --evm-router

Environment variables:
  AGORIC_NET: Network specifier per https://github.com/Agoric/agoric-sdk/blob/master/docs/env.md ,
              either "$subdomain" for using https://$subdomain.agoric.net/network-config or
              "$subdomain,$chainId" or "$fqdn,$chainId" for submitting to $subdomain.rpc.agoric.net
              or $fqdn
  MNEMONIC:   The private key used to sign transactions (needed for all operations except
              --checkStorage). For --evm / --evm-router, this is
              the EVM wallet mnemonic.
  MNEMONIC_EVM_MESSAGE_HANDLER:
              The private key used to sign transactions from the EVM wallet handler
              (needed for --evm / --evm-router).
`.trim();

const parseToolArgs = (argv: string[]) =>
  parseArgs({
    args: argv.slice(2),
    options: {
      positions: { type: 'string', default: '{}' },
      'skip-poll': { type: 'boolean', default: false },
      'exit-success': { type: 'boolean', default: false },
      'target-allocation': { type: 'string' },
      evm: { type: 'string', default: '' },
      'evm-router': { type: 'string', default: '' },
      'evm-verified-signer': { type: 'boolean', default: false },
      contract: { type: 'string', default: 'ymax0' },
      checkStorage: { type: 'boolean' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: false,
  });

type GoalData = Partial<Record<YieldProtocol, ParsableNumber>>;
const YieldProtocolShape = M.or(...Object.keys(YieldProtocol));
const ParseableNumberShape = M.or(M.number(), M.string());
const GoalDataShape: TypedPattern<GoalData> = M.recordOf(
  YieldProtocolShape,
  ParseableNumberShape,
);

const trace = makeTracer('YMXTool');
const { fromEntries } = Object;
const { make } = AmountMath;

const parseTypedJSON = <T>(
  json: string,
  shape: TypedPattern<T>,
  reviver?: (k, v) => unknown,
  makeError: (err) => unknown = err => err,
): T => {
  let result: unknown;
  try {
    result = harden(JSON.parse(json, reviver));
    mustMatch(result, shape);
  } catch (err) {
    throw makeError(err);
  }
  // `mustMatch` narrows `result`, but inside this generic body TS keeps an
  // `unknown extends T` conditional that doesn't collapse to `T`, so re-assert.
  return result as T;
};

type PortfolioReadPublished = <P extends string>(
  subpath: P,
) => Promise<TypedPublishedFor<P, PortfolioPublishedPathTypes>>;
type SigningKitOptions = Parameters<typeof makeSigningSmartWalletKit>[0];

const noPoll = (wk: SmartWalletKit): SmartWalletKit => ({
  ...wk,
  pollOffer: async () => {
    trace('polling skippped');
    return harden({ status: 'polling skipped' } as unknown as OfferStatus);
  },
});

const openPositions = async (
  goalData: GoalData,
  {
    sig,
    when,
    targetAllocation,
    contract = 'ymax0',
    id = `open-${new Date(when).toISOString()}`,
  }: {
    sig: SigningSmartWalletKit;
    when: number;
    targetAllocation?: TargetAllocation;
    contract?: string;
    id?: string;
  },
) => {
  const { readPublished } = sig.query;
  const brands = await readPublished('agoricNames.brand');
  const { USDC, BLD } = fromEntries(brands) as Record<string, Brand<'nat'>>;
  // XXX PoC26 in devnet published.agoricNames.brand doesn't match vbank
  const { upoc26 } = fromEntries(await readPublished('agoricNames.vbankAsset'));

  const toAmt = (num: ParsableNumber) =>
    multiplyBy(make(USDC, 1_000_000n), parseRatio(num, USDC));
  const goal = objectMap(goalData, toAmt);
  console.debug('TODO: address Ethereum-only limitation');
  const evm = 'Ethereum';
  const { give: giveWFees } = await makePortfolioSteps(goal, {
    evm,
    feeBrand: BLD,
  });
  // XXX WIP: contract is to pay BLD fee
  const { GmpFee: _gf, ...give } = giveWFees;
  const proposal: ProposalType['openPortfolio'] = {
    give: {
      ...give,
      ...(upoc26 && { Access: make(upoc26.brand, 1n) }),
    },
  };

  // planner will supply remaining steps
  const steps: MovementDesc[] = [
    { src: '<Deposit>', dest: '+agoric', amount: give.Deposit },
  ];
  const offerArgs: OfferArgsFor['openPortfolio'] = {
    flow: steps,
    ...(targetAllocation && { targetAllocation }),
  };

  trace(id, 'opening portfolio', proposal.give, steps);
  const tx = await sig.sendBridgeAction(
    harden({
      method: 'executeOffer',
      offer: {
        id,
        invitationSpec: {
          source: 'agoricContract',
          instancePath: [contract],
          callPipe: [['makeOpenPortfolioInvitation']],
        },
        proposal,
        offerArgs,
      },
    }),
  );
  if (tx.code !== 0) throw Error(tx.rawLog);

  // result is UNPUBLISHED
  await walletUpdates(sig.query.getLastUpdate, {
    log: trace,
    setTimeout,
  }).offerResult(id);

  const { offerToPublicSubscriberPaths } =
    await sig.query.getCurrentWalletRecord();
  const path = fromEntries(offerToPublicSubscriberPaths)[id]
    .portfolio as `${string}.portfolios.portfolio${number}`;
  return {
    id,
    path,
    tx: { hash: tx.transactionHash, height: tx.height },
  };
};

const openPositionsEVM = async ({
  targetAllocation,
  sig,
  evmAccount,
  when,
  axelarChainConfig,
  axelarChain,
  useRouter = false,
  id = `open-${new Date(when).toISOString()}`,
  verifiedSigner = false,
}: {
  sig: SigningSmartWalletKit;
  evmAccount: HDAccount;
  axelarChainConfig: AxelarChainConfig;
  axelarChain: AxelarChain;
  useRouter?: boolean;
  when: number;
  contract?: string;
  id?: string;
  targetAllocation: TargetAllocation;
  verifiedSigner?: boolean;
}) => {
  // TODO: support router

  const spender = useRouter
    ? axelarChainConfig.contracts.remoteAccountRouter
    : axelarChainConfig.contracts.depositFactory;

  if (!spender || spender.length <= 2) {
    throw Error(
      `missing ${useRouter ? 'router' : 'depositFactory'} contract for ${axelarChain}`,
    );
  }

  const deadline = BigInt(when) / 1000n + 3600n;
  // not a secure nonce, but sufficient for command line purposes
  const nonce = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

  const allocations: Allocation[] = Object.entries(targetAllocation).map(
    ([instrument, amount]) => ({
      instrument,
      portion: amount,
    }),
  );

  const amount = allocations.reduce(
    (acc, { portion }) => acc + portion,
    0n,
  ) as bigint;

  const deposit: TokenPermissions = {
    token: axelarChainConfig.contracts.usdc,
    amount,
  };

  const witness = getYmaxWitness('OpenPortfolio', { allocations });

  const openPortfolioMessage = getPermitWitnessTransferFromData(
    {
      permitted: deposit,
      spender,
      nonce,
      deadline,
    },
    '0x000000000022D473030F116dDEE9F6B43aC78BA3', // permit2 address on pretty much all chains
    BigInt(axelarChainConfig.chainInfo.reference),
    witness,
  );

  const signature = await evmAccount.signTypedData(openPortfolioMessage);

  trace(id, 'opening evm portfolio');

  const tx = await sig.sendBridgeAction(
    harden({
      method: 'invokeEntry',
      message: {
        id,
        targetName: 'evmWalletHandler',
        method: 'handleMessage',
        args: [
          {
            ...openPortfolioMessage,
            signature,
            ...(verifiedSigner ? { verifiedSigner: evmAccount.address } : {}),
          } as CopyRecord,
        ],
      },
    }),
  );
  if (tx.code !== 0) throw Error(tx.rawLog);

  await walletUpdates(sig.query.getLastUpdate, {
    log: trace,
    setTimeout,
  }).invocation(id);

  // TODO: figure out the portfolio path from vstorage

  return {
    id,
    tx: { hash: tx.transactionHash, height: tx.height },
  };
};

/**
 * Get network-specific configurations based on AGORIC_NET environment variable
 *
 * @param network - The network name from AGORIC_NET env var
 */
const getNetworkConfig = (network: 'main' | 'devnet') => {
  switch (network) {
    case 'main':
      return {
        axelarConfig: axelarConfigMainnet,
        gmpAddresses: gmpConfigs.mainnet,
      };
    case 'devnet':
      return {
        axelarConfig: axelarConfigTestnet,
        gmpAddresses: gmpConfigs.testnet,
      };
    default:
      throw new Error(
        `Unsupported network: ${network}. Supported networks are: mainnet, testnet, devnet`,
      );
  }
};

const main = async (
  argv = process.argv,
  env = process.env,
  { fetch = globalThis.fetch, now = Date.now, stdout = process.stdout } = {},
) => {
  const { values } = parseToolArgs(argv);

  if (values.help) {
    console.error(getUsage(argv[1]));
    return;
  }

  const networkConfig = await fetchEnvNetworkConfig({ env, fetch });
  if (values.checkStorage) {
    console.error('finding outdated vstorage...');
    const vs = makeVStorage({ fetch }, networkConfig);
    const toPrune = await findOutdated(vs);
    stdout.write(JSON.stringify(toPrune, null, 2));
    stdout.write('\n');
    return;
  }

  // MNEMONIC below is meant to contain the "agoric wallet" mnemonic.
  // For some operations this may be a user wallet, others an operator wallet.
  let { MNEMONIC } = env;
  if (!MNEMONIC) throw Error(`MNEMONIC not set`);

  const evmChain = values['evm-router'] || values.evm;
  let evmAccount: HDAccount | null = null;
  if (evmChain) {
    evmAccount = mnemonicToAccount(MNEMONIC);

    MNEMONIC = env.MNEMONIC_EVM_MESSAGE_HANDLER;
    if (!MNEMONIC)
      throw Error(`MNEMONIC_EVM_MESSAGE_HANDLER not set for EVM wallet`);
  }

  const delay = (ms: number) =>
    new Promise<void>(resolve => setTimeout(resolve, ms));
  const walletKitBase = await makeSmartWalletKit(
    { fetch, delay },
    networkConfig,
  );
  const walletKit = values['skip-poll'] ? noPoll(walletKitBase) : walletKitBase;
  // XXX TypeScript sees duplicate @cosmjs package identities between the
  // workspace root and multichain-testing, so this identical runtime API needs
  // an unknown cast to satisfy makeSigningSmartWalletKit's parameter type.
  const connectWithSigner =
    SigningStargateClient.connectWithSigner as unknown as SigningKitOptions['connectWithSigner'];
  const sig = await makeSigningSmartWalletKit(
    { walletUtils: walletKit, connectWithSigner },
    MNEMONIC,
  );
  trace('address', sig.address);

  // if (values['open'])
  const positionData = parseTypedJSON(values.positions, GoalDataShape);
  const targetAllocation = values['target-allocation']
    ? parseTypedJSON(
        values['target-allocation'],
        TargetAllocationShape,
        (_k, v) => (typeof v === 'number' ? BigInt(v) : v),
        err => Error(`Invalid target allocation JSON: ${err.message}`),
      )
    : undefined;
  console.debug({ positionData, targetAllocation });
  try {
    if (evmChain) {
      const { AGORIC_NET: net } = env;
      if (net !== 'main' && net !== 'devnet') {
        throw Error(`unsupported/unknown net: ${net}`);
      }
      const { axelarConfig } = getNetworkConfig(net);

      if (!(evmChain in axelarConfig)) {
        throw Error(`unknown/unsupported evm chain: ${evmChain}`);
      }

      const axelarChain = evmChain as AxelarChain;
      const axelarChainConfig = axelarConfig[evmChain as AxelarChain];

      if (!targetAllocation) {
        throw Error(
          `--target-allocation is required with --evm / --evm-router`,
        );
      }

      if (Object.keys(positionData).length !== 0) {
        throw Error(
          `--positions not supported with --evm / --evm-router, use --target-allocation`,
        );
      }

      const opened = await openPositionsEVM({
        targetAllocation,
        sig,
        evmAccount: evmAccount!,
        when: now(),
        axelarChainConfig,
        axelarChain,
        useRouter: !!values['evm-router'],
        verifiedSigner: values['evm-verified-signer'] || false,
      });
      trace('opened', opened);
    } else {
      const opened = await openPositions(positionData, {
        sig,
        when: now(),
        targetAllocation,
        contract: values.contract,
      });

      trace('opened', opened);
      const { path } = opened;
      // XXX would be nice if readPublished allowed ^published.
      const subPath = path.replace(/^published./, '') as typeof path;
      const pq = makePortfolioQuery(
        sig.readPublished as PortfolioReadPublished,
        subPath,
      );
      const status = await pq.getPortfolioStatus();
      trace('status', status);
      if (status.depositAddress && env.AGORIC_NET === 'devnet') {
        // XXX devnet explorer seems to support this query
        const apiAddr = 'https://devnet.explorer.agoric.net';
        const url = `${apiAddr}/api/cosmos/bank/v1beta1/balances/${status.depositAddress}`;
        const result = await fetch(url).then(r => r.json());
        if (result.balances) {
          console.log(status.depositAddress, result.balances);
        } else {
          console.error(url, 'failed', result);
        }
      }
    }
  } catch (err) {
    // If we should exit with success code, throw a special non-error object
    if (values['exit-success']) {
      // eslint-disable-next-line no-throw-literal
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
