#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file tools for integration testing for ymax proof of concept.
 *
 * Not fully supported. It has zero test coverage and some parts are already known to have bit-rotted.
 *
 * Scope: CLI ergonomics and IO/ambient authority (console, env, repl, stdin/stdout).
 * This entrypoint maps shell arguments to intent and delegates execution to
 * reusable lib functions.
 */
import '@endo/init';

import type { PortfolioPlanner } from '@aglocal/portfolio-contract/src/planner.exo.ts';
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { MovementDesc } from '@aglocal/portfolio-contract/src/type-guards-steps.ts';
import {
  TargetAllocationShape,
  type OfferArgsFor,
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
import { lookupInterchainInfo } from '@aglocal/portfolio-deploy/src/orch.start.js';
import { findOutdated } from '@aglocal/portfolio-deploy/src/vstorage-outdated.js';
import { makeYmaxControlKitForChain } from '@aglocal/portfolio-deploy/src/ymax-control.js';
import {
  fetchEnvNetworkConfig,
  makeVStorage,
  makeVstorageKit,
  type makeSmartWalletKit,
  type SigningSmartWalletKit,
  type VstorageKit,
} from '@agoric/client-utils';
import type { ContractControl } from '@agoric/deploy-script-support/src/control/contract-control.contract.js';
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
} from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.ts';
import { YMAX_CONTROL_WALLET_KEY } from '@agoric/portfolio-api/src/portfolio-constants.js';
import type { OfferStatus } from '@agoric/smart-wallet/src/offers.js';
import { M } from '@agoric/store';
import type { NameHub } from '@agoric/vats';
import type { EMethods } from '@agoric/vow/src/E.js';
import type { Instance } from '@agoric/zoe/src/zoeService/types.js';
import type { StartedInstanceKit as ZStarted } from '@agoric/zoe/src/zoeService/utils.js';
import type { StdFee } from '@cosmjs/stargate';
import { E } from '@endo/far';
import type { CopyRecord } from '@endo/pass-style';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import repl from 'node:repl';
import { parseArgs } from 'node:util';
import type { HDAccount } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { walletUpdates } from '../tools/wallet-store-reflect.ts';

const nodeRequire = createRequire(import.meta.url);
const asset = (spec: string) => readFile(nodeRequire.resolve(spec), 'utf8');

type YMaxStartFn = typeof YMaxStart;

const getUsage = (programName: string): string =>
  `USAGE: ${programName} [options...] [operation]
Options:
  --skip-poll             Skip polling for offer result
  --exit-success          Exit with success code even if errors occur
  --positions             JSON of opening positions (e.g. '{"USDN":6000,"Aave":4000}')
  --target-allocation     JSON of target allocation (e.g. '{"USDN":6000,"Aave_Arbitrum":4000}')
  --evm <chainId>         Use an EVM wallet and deposit from the given chain (e.g. 'Ethereum')
  --contract=[ymax0]      Contract key in agoricNames.instance ('ymax0' or 'ymax1'), used for
                          portfolios and invitations
  --description=[planner] For use with --redeem ('planner', 'resolver', or 'evmWalletHandler',
                          optionally preceded by 'deliver ')

Operations:
  -h, --help                Show this help message
  --repl                    Start a repl with walletStore and ${YMAX_CONTROL_WALLET_KEY} bound
  --checkStorage            Report outdated ymax0 vstorage nodes (older than agoricNames.instance)
  --pruneStorage            Prune vstorage nodes read from Record<ParentPath, ChildPathSegment[]>
                            stdin
  --buildEthOverrides       Build privateArgsOverrides sufficient to add new EVM chains
  --getCreatorFacet         Read the creator facet read from wallet store entry '${YMAX_CONTROL_WALLET_KEY}' and
                            save the result in a new entry ('creatorFacet' for contract 'ymax0',
                            otherwise \`creatorFacet-\${contract}\`)
  --installAndStart <id>    Start a contract with bundleId <id> and privateArgsOverrides from stdin
  --upgrade <id>            Upgrade to bundleId <id> and privateArgsOverrides from stdin
  --terminate <message>     Terminate the contract instance
  --inviteOwnerProxy <addr> Send EVM portfolio owner proxy invitation per --contract to <addr>
  --invitePlanner <addr>    Send planner invitation per --contract to <addr>
  --inviteResolver <addr>   Send resolver invitation per --contract to <addr>
  --redeem                  Redeem invitation per --description
  --submit-for <id>         Submit (empty) plan for portfolio <id>
  --open                    [default operation] Open a new portfolio per --positions and
                            --target-allocation. Uses an EVM wallet if --evm

Environment variables:
  AGORIC_NET: Network specifier per https://github.com/Agoric/agoric-sdk/blob/master/docs/env.md ,
              either "$subdomain" for using https://$subdomain.agoric.net/network-config or
              "$subdomain,$chainId" or "$fqdn,$chainId" for submitting to $subdomain.rpc.agoric.net
              or $fqdn
  MNEMONIC:   The private key used to sign transactions (needed for all operations except
              --checkStorage and --buildEthOverrides). For --evm, this is the EVM wallet mnemonic.
  MNEMONIC_EVM_MESSAGE_HANDLER:
              The private key used to sign transactions from the EVM wallet handler
              (needed for --evm, act as override for --redeem of evmWalletHandler).
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
      redeem: { type: 'boolean', default: false },
      contract: { type: 'string', default: 'ymax0' },
      description: { type: 'string', default: 'planner' },
      repl: { type: 'boolean', default: false },
      getCreatorFacet: { type: 'boolean', default: false },
      terminate: { type: 'string' },
      buildEthOverrides: { type: 'boolean' },
      installAndStart: { type: 'string' },
      upgrade: { type: 'string' },
      inviteOwnerProxy: { type: 'string' },
      invitePlanner: { type: 'string' },
      inviteResolver: { type: 'string' },
      checkStorage: { type: 'boolean' },
      pruneStorage: { type: 'boolean', default: false },
      'submit-for': { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: false,
  });

const makeFee = ({
  gas = 20_000, // cosmjs default
  adjustment = 1.0,
  denom = 'ubld',
  price = 0.01, // ubld. per 2025-11 community discussion
} = {}): StdFee => ({
  gas: `${Math.round(gas * adjustment)}`,
  amount: [{ denom, amount: `${Math.round(gas * adjustment * price)}` }],
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

const { bytecode: walletBytecode } = JSON.parse(
  await asset('@aglocal/portfolio-deploy/tools/evm-orch/Wallet.json'),
);

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
  return result;
};

type SmartWalletKit = Awaited<ReturnType<typeof makeSmartWalletKit>>;

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
  const { USDC, BLD } = fromEntries(
    await readPublished('agoricNames.brand'),
  ) as Record<string, Brand<'nat'>>;
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
  id = `open-${new Date(when).toISOString()}`,
}: {
  sig: SigningSmartWalletKit;
  evmAccount: HDAccount;
  axelarChainConfig: AxelarChainConfig;
  axelarChain: AxelarChain;
  when: number;
  contract?: string;
  id?: string;
  targetAllocation: TargetAllocation;
}) => {
  const spender = axelarChainConfig.contracts.depositFactory;

  if (!spender || spender.length <= 2) {
    throw Error(`missing depositFactory contract for ${axelarChain}`);
  }

  const deadline = BigInt(when) / 1000n + 3600n;
  // not a secure nonce, but sufficient for command line purposes
  const nonce = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

  const allocations: Allocation[] = Object.entries(targetAllocation).map(
    ([instrument, amount]) => ({
      instrument: instrument,
      portion: amount,
    }),
  );

  const amount = allocations.reduce(
    (acc, { portion }) => acc + portion,
    0n,
  ) as bigint;

  const deposit: TokenPermissions = {
    token: axelarChainConfig.contracts.usdc,
    amount: amount,
  };

  const witness = getYmaxWitness('OpenPortfolio', { allocations });

  const openPortfolioMessage = getPermitWitnessTransferFromData(
    {
      permitted: deposit,
      spender: axelarChainConfig.contracts.depositFactory,
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
        args: [{ ...openPortfolioMessage, signature } as CopyRecord],
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
 * Get the creator facet key for a contract instance.
 * @param contract - The contract name (e.g., 'ymax0', 'ymax1')
 * @returns The key for accessing the creator facet in wallet store
 */
const getCreatorFacetKey = (contract: string): string =>
  contract === 'ymax0' ? 'creatorFacet' : `creatorFacet-${contract}`;

/**
 * Build a NameHub suitable for use by lookupInterchainInfo,
 * filtering odd stuff found in devnet.
 *
 * @param vsk
 */
const agoricNamesForChainInfo = (vsk: VstorageKit) => {
  const { vstorage } = vsk;
  const { readPublished } = vsk;

  const byChainId = {};

  const chainEntries = async (kind: string) => {
    const out: [string, unknown][] = [];
    const children = await vstorage.keys(`published.agoricNames.${kind}`);
    for (const child of children) {
      // console.error('readPublished', kind, child);
      const value = await readPublished(`agoricNames.${kind}.${child}`);
      // console.debug(kind, child, value);
      if (kind === 'chain') {
        const { chainId, namespace } = value as Record<string, string>;
        if (namespace !== 'cosmos') {
          console.warn('namespace?? skipping', kind, child, value);
          continue;
        }
        if (typeof chainId === 'string') {
          if (chainId in byChainId) throw Error(`oops! ${child} ${chainId}`);
          byChainId[chainId] = value;
        }
      }
      out.push([child, value]);
    }
    if (kind === 'chainConnection') {
      const relevantConnections = out.filter(([key, _val]) => {
        const [c1, c2] = key.split('_'); // XXX incomplete
        return c1 in byChainId && c2 in byChainId;
      });
      return harden(relevantConnections);
    }
    return harden(out);
  };

  const lookup = async (kind: string) => {
    switch (kind) {
      case 'chain':
      case 'chainConnection':
        return harden({
          entries: () => chainEntries(kind),
        });
      default:
        return harden({
          entries: async () => {
            // console.debug(kind, 'entries');
            return readPublished(`agoricNames.${kind}`) as Promise<
              [[string, unknown]]
            >;
          },
        });
    }
  };

  const refuse = () => {
    throw Error('access denied');
  };

  const agoricNames: NameHub = harden({
    lookup,
    entries: refuse,
    has: refuse,
    keys: refuse,
    values: refuse,
  });

  return agoricNames;
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

/**
 * Build privateArgsOverrides sufficient to add new EVM chains.
 *
 * @param vsk
 * @param axelarConfig
 * @param gmpAddresses
 */
const overridesForEthChainInfo = async (
  vsk: VstorageKit,
  axelarConfig:
    | typeof axelarConfigTestnet
    | typeof axelarConfigMainnet = axelarConfigTestnet,
  gmpAddresses:
    | typeof gmpConfigs.testnet
    | typeof gmpConfigs.mainnet = gmpConfigs.testnet,
) => {
  const { chainInfo: cosmosChainInfo } = await lookupInterchainInfo(
    agoricNamesForChainInfo(vsk),
    { agoric: ['ubld'], noble: ['uusdc'], axelar: ['uaxl'] },
  );
  const chainInfo = {
    ...cosmosChainInfo,
    ...objectMap(axelarConfig, info => info.chainInfo),
  };

  const privateArgsOverrides: Pick<
    Parameters<YMaxStartFn>[1],
    'axelarIds' | 'chainInfo' | 'contracts' | 'gmpAddresses'
  > = harden({
    axelarIds: objectMap(axelarConfig, c => c.axelarId),
    contracts: objectMap(axelarConfig, c => c.contracts),
    chainInfo,
    gmpAddresses,
    walletBytecode,
  });
  return privateArgsOverrides;
};

async function readText(stream: typeof process.stdin) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const main = async (
  argv = process.argv,
  env = process.env,
  {
    fetch = globalThis.fetch,
    now = Date.now,
    stdin = process.stdin,
    stdout = process.stdout,
  } = {},
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

  if (values.buildEthOverrides) {
    const vsk = makeVstorageKit({ fetch }, networkConfig);
    const { AGORIC_NET: net } = env;
    if (net !== 'main' && net !== 'devnet') {
      throw Error(`unsupported/unknown net: ${net}`);
    }
    const { axelarConfig, gmpAddresses } = getNetworkConfig(net);
    const privateArgsOverrides = await overridesForEthChainInfo(
      vsk,
      axelarConfig,
      gmpAddresses,
    );
    stdout.write(JSON.stringify(privateArgsOverrides, null, 2));
    stdout.write('\n');
    return;
  }

  // MNEMONIC below is meant to contain the "agoric wallet" mnemonic.
  // For some operations this may be a user wallet, others an operator wallet.
  let { MNEMONIC } = env;
  if (!MNEMONIC) throw Error(`MNEMONIC not set`);

  let evmAccount: HDAccount | null = null;
  if (values.evm) {
    evmAccount = mnemonicToAccount(MNEMONIC);

    MNEMONIC = env.MNEMONIC_EVM_MESSAGE_HANDLER;
    if (!MNEMONIC)
      throw Error(`MNEMONIC_EVM_MESSAGE_HANDLER not set for EVM wallet`);
  }

  if (values.redeem && values.description.includes('evmWalletHandler')) {
    if (env.MNEMONIC_EVM_MESSAGE_HANDLER) {
      console.warn(
        `Using MNEMONIC_EVM_MESSAGE_HANDLER for evmWalletHandler redemption`,
      );
      MNEMONIC = env.MNEMONIC_EVM_MESSAGE_HANDLER;
    }
  }

  const fresh = () => new Date(now()).toISOString();
  const {
    walletKit,
    signer: sig,
    walletStore,
    ymaxControl,
    ymaxControlForSaving,
  } = await makeYmaxControlKitForChain(
    { env, fetch, setTimeout, now },
    {
      mnemonic: MNEMONIC,
      networkConfig,
      walletKitTransform: values['skip-poll'] ? wk => noPoll(wk) : undefined,
      log: trace,
      makeNonce: fresh,
      fee: makeFee({ gas: 809068, adjustment: 1.4 }),
    },
  );
  trace('address', sig.address);

  if (values.redeem) {
    const { contract, description } = values;
    trace('getting instance', contract);
    const { [contract]: instance } = fromEntries(
      await walletKit.readPublished('agoricNames.instance'),
    );

    // XXX generalize to --no-save or some such?
    // For wallets without myStore support, redeem without saving
    const noSaveDescriptions = ['resolver', 'evmWalletHandler'];
    const descWithoutDeliver = description.replace(/^deliver /, '');
    if (noSaveDescriptions.includes(descWithoutDeliver)) {
      const id = `redeem-${fresh()}`;
      await sig.sendBridgeAction({
        method: 'executeOffer',
        offer: {
          id,
          invitationSpec: { source: 'purse', description, instance },
          proposal: {},
        },
      });
      await sig.pollOffer(sig.address, id, undefined, true);
      return;
    }

    const saveTo = description.replace(/^deliver /, '');
    const result = await walletStore.saveOfferResult(
      { instance, description },
      saveTo,
    );
    trace('redeem result', result);
    return;
  }

  const yc = walletStore.get<ContractControl<YMaxStartFn>>(
    YMAX_CONTROL_WALLET_KEY,
  );

  if (values.repl) {
    const tools = {
      E,
      harden,
      networkConfig,
      walletKit,
      signing: sig,
      walletStore,
      [YMAX_CONTROL_WALLET_KEY]: yc,
    };
    console.error('bindings:', Object.keys(tools).join(', '));
    const session = repl.start({ prompt: 'ymax> ', useGlobal: true });
    Object.assign(session.context, tools);
    await once(session, 'exit');
    return;
  }

  if (values.getCreatorFacet) {
    const { contract } = values;
    const creatorFacetKey = getCreatorFacetKey(contract);
    await ymaxControlForSaving.getCreatorFacet({ name: creatorFacetKey });
    return;
  }

  if (values.terminate) {
    const { terminate: message } = values;
    await yc.terminate({ message });
    return;
  }

  if (values.installAndStart) {
    const { installAndStart: bundleId } = values;

    const privateArgsOverrides = JSON.parse(await readText(stdin));

    const { BLD, USDC } = fromEntries(
      await walletKit.readPublished('agoricNames.issuer'),
    );

    // work around goofy devnet PoC token
    const { upoc26 } = fromEntries(
      await walletKit.readPublished('agoricNames.vbankAsset'),
    );

    await yc.installAndStart({
      bundleId,
      issuers: { USDC, BLD, Fee: BLD, Access: upoc26.issuer },
      privateArgsOverrides,
    });
    return;
  }

  if (values.upgrade) {
    const { upgrade: bundleId } = values;

    const privateArgsOverrides = JSON.parse(await readText(stdin));

    await yc.upgrade({ bundleId, privateArgsOverrides });
    return;
  }

  if (values.pruneStorage) {
    const txt = await readText(stdin);
    const toPrune: Record<string, string[]> = JSON.parse(txt);
    // avoid: Must not have more than 80 properties: (an object)
    const batchSize = 50;

    const es = Object.entries(toPrune);
    for (let i = 0; i < es.length; i += batchSize) {
      const batch = es.slice(i, i + batchSize);
      await yc.pruneChainStorage(fromEntries(batch));
    }
    return;
  }

  // Deliver planner/resolver/EVM Wallet Handler invitations as specified.
  type CFMethods = ZStarted<YMaxStartFn>['creatorFacet'];
  const inviters: Partial<
    Record<
      keyof typeof values,
      (cf: EMethods<CFMethods>, ps: Instance, addr: string) => Promise<void>
    >
  > = {
    invitePlanner: (cf, ps, addr) => cf.deliverPlannerInvitation(addr, ps),
    inviteResolver: (cf, ps, addr) => cf.deliverResolverInvitation(addr, ps),
    inviteOwnerProxy: (cf, ps, addr) =>
      cf.deliverEVMWalletHandlerInvitation(addr, ps),
  };
  for (const [optName, inviter] of Object.entries(inviters)) {
    const { contract, [optName as keyof typeof values]: addr } = values;
    if (typeof addr !== 'string') continue;
    const creatorFacetKey = getCreatorFacetKey(contract);
    const creatorFacet = walletStore.get<CFMethods>(creatorFacetKey);
    const instances = await walletKit.readPublished('agoricNames.instance');
    const { postalService } = fromEntries(instances);
    // @ts-expect-error xxx PASS_STYLE
    await inviter(creatorFacet, postalService, addr);
    return;
  }

  if (values['submit-for']) {
    const portfolioId = Number(values['submit-for']);
    const planner = walletStore.get<PortfolioPlanner>('planner');
    const policyVersion = 0; // XXX should get from vstorage
    const rebalanceCount = 0;
    await planner.submit(portfolioId, [], policyVersion, rebalanceCount);
    return;
  }

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
    if (values.evm) {
      const { AGORIC_NET: net } = env;
      if (net !== 'main' && net !== 'devnet') {
        throw Error(`unsupported/unknown net: ${net}`);
      }
      const { axelarConfig } = getNetworkConfig(net);

      if (!(values.evm in axelarConfig)) {
        throw Error(`unknown/unsupported evm chain: ${values.evm}`);
      }

      const axelarChain = values.evm as AxelarChain;
      const axelarChainConfig = axelarConfig[axelarChain];

      if (!targetAllocation) {
        throw Error(`--target-allocation is required with --evm`);
      }

      if (Object.keys(positionData).length !== 0) {
        throw Error(
          `--positions not supported with --evm, use --target-allocation`,
        );
      }

      const opened = await openPositionsEVM({
        targetAllocation,
        sig,
        evmAccount: evmAccount!,
        when: now(),
        axelarChainConfig,
        axelarChain,
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
      const pq = makePortfolioQuery(walletKit.readPublished, subPath);
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
