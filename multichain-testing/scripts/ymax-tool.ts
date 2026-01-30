#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file tools for integration testing for ymax proof of concept.
 *
 * Scope: CLI ergonomics and IO/ambient authority (console, env, repl, stdin/stdout).
 * This entrypoint maps shell arguments to intent and delegates execution to
 * reusable lib functions.
 */
import '@endo/init';

import type { PortfolioPlanner } from '@aglocal/portfolio-contract/src/planner.exo.ts';
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import { TargetAllocationShape } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { makePortfolioQuery } from '@aglocal/portfolio-contract/tools/portfolio-actors.ts';
import type { ContractControl } from '@agoric/deploy-script-support/src/control/contract-control.contract.js';
import {
  GoalDataShape,
  getCreatorFacetKey,
  getNetworkConfig,
  makeFee,
  noPoll,
  openPositions,
  openPositionsEVM,
  overridesForEthChainInfo,
  parseTypedJSON,
} from '@aglocal/portfolio-deploy/src/ymax-tool-lib.js';
import { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import { YMAX_CONTROL_WALLET_KEY } from '@agoric/portfolio-api/src/portfolio-constants.js';
import { findOutdated } from '@aglocal/portfolio-deploy/src/vstorage-outdated.js';
import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
  makeVStorage,
  makeVstorageKit,
  reflectWalletStore,
} from '@agoric/client-utils';
import { makeTracer } from '@agoric/internal';
import type { EMethods } from '@agoric/vow/src/E.js';
import type { Instance } from '@agoric/zoe/src/zoeService/types.js';
import type { StartedInstanceKit as ZStarted } from '@agoric/zoe/src/zoeService/utils.js';
import { SigningStargateClient } from '@cosmjs/stargate';
import { E } from '@endo/far';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import repl from 'node:repl';
import { parseArgs } from 'node:util';
import type { HDAccount } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';

const nodeRequire = createRequire(import.meta.url);
const asset = (spec: string) => readFile(nodeRequire.resolve(spec), 'utf8');

type YMaxStartFn = typeof YMaxStart;

type Values = {
  positions: string;
  'skip-poll': boolean;
  'exit-success': boolean;
  'target-allocation'?: string;
  evm: string;
  redeem: boolean;
  contract: string;
  description: string;
  repl: boolean;
  getCreatorFacet: boolean;
  terminate?: string;
  buildEthOverrides?: boolean;
  installAndStart?: string;
  upgrade?: string;
  inviteOwnerProxy?: string;
  invitePlanner?: string;
  inviteResolver?: string;
  checkStorage?: boolean;
  pruneStorage: boolean;
  'submit-for'?: string;
  help: boolean;
};

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
  --repl                    Start a repl with walletStore and ymaxControl bound
  --checkStorage            Report outdated ymax0 vstorage nodes (older than agoricNames.instance)
  --pruneStorage            Prune vstorage nodes read from Record<ParentPath, ChildPathSegment[]>
                            stdin
  --buildEthOverrides       Build privateArgsOverrides sufficient to add new EVM chains
  --getCreatorFacet         Read the creator facet read from wallet store entry 'ymaxControl' and
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

const readText = async (stream: typeof process.stdin) => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

const main = async (argv = process.argv, env = process.env) => {
  const { values } = parseToolArgs(argv);
  if (values.help) {
    console.error(getUsage(argv[1]));
    return;
  }

  const { bytecode: walletBytecode } = JSON.parse(
    await asset('@aglocal/portfolio-deploy/tools/evm-orch/Wallet.json'),
  );

  const trace = makeTracer('YMXTool');
  const fetch = globalThis.fetch;
  const setTimeout = globalThis.setTimeout;
  const now = Date.now;

  try {
    const networkConfig = await fetchEnvNetworkConfig({ env, fetch });
    if (values.checkStorage) {
      console.error('finding outdated vstorage...');
      const vs = makeVStorage({ fetch }, networkConfig);
      const toPrune = await findOutdated(vs);
      process.stdout.write(`${JSON.stringify(toPrune, null, 2)}\n`);
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
        console,
        walletBytecode,
        axelarConfig,
        gmpAddresses,
      );
      process.stdout.write(
        `${JSON.stringify(privateArgsOverrides, null, 2)}\n`,
      );
      return;
    }

    // MNEMONIC below is meant to contain the "agoric wallet" mnemonic.
    // For some operations this may be a user wallet, others an operator wallet.
    let { MNEMONIC } = env;
    if (!MNEMONIC) throw Error(`MNEMONIC not set`);

    const delay: (ms: number) => Promise<void> = ms =>
      new Promise(resolve => setTimeout(() => resolve(), ms));
    const walletKit0 = await makeSmartWalletKit(
      { fetch, delay },
      networkConfig,
    );
    const walletKit = values['skip-poll']
      ? noPoll(walletKit0, trace)
      : walletKit0;

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

    const sig = await makeSigningSmartWalletKit(
      {
        connectWithSigner: SigningStargateClient.connectWithSigner,
        walletUtils: walletKit,
      },
      MNEMONIC,
    );
    trace('address', sig.address);
    const fresh = () => new Date(now()).toISOString();
    const walletStore = reflectWalletStore(sig, {
      setTimeout,
      log: trace,
      makeNonce: fresh,
      // as in: Error#1: out of gas ... gasUsed: 809068
      fee: makeFee({ gas: 809068, adjustment: 1.4 }),
    });

    if (values.redeem) {
      const { contract, description } = values;
      trace('getting instance', contract);
      const { [contract]: instance } = Object.fromEntries(
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
      const ycs = walletStore.getForSavingResults<ContractControl<YMaxStartFn>>(
        YMAX_CONTROL_WALLET_KEY,
      );
      await ycs.getCreatorFacet({ name: creatorFacetKey });
      return;
    }

    if (values.terminate) {
      const { terminate: message } = values;
      await yc.terminate({ message });
      return;
    }

    if (values.installAndStart) {
      const { installAndStart: bundleId } = values;

      const privateArgsOverrides = JSON.parse(await readText(process.stdin));

      const { BLD, USDC } = Object.fromEntries(
        await walletKit.readPublished('agoricNames.issuer'),
      );

      // work around goofy devnet PoC token
      const { upoc26 } = Object.fromEntries(
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

      const privateArgsOverrides = JSON.parse(await readText(process.stdin));

      await yc.upgrade({ bundleId, privateArgsOverrides });
      return;
    }

    if (values.pruneStorage) {
      const txt = await readText(process.stdin);
      const toPrune: Record<string, string[]> = JSON.parse(txt);
      // avoid: Must not have more than 80 properties: (an object)
      const batchSize = 50;

      const es = Object.entries(toPrune);
      for (let i = 0; i < es.length; i += batchSize) {
        const batch = es.slice(i, i + batchSize);
        await yc.pruneChainStorage(Object.fromEntries(batch));
      }
      return;
    }

    // Deliver planner/resolver/EVM Wallet Handler invitations as specified.
    type CFMethods = ZStarted<YMaxStartFn>['creatorFacet'];
    const inviters: Partial<
      Record<
        keyof Values,
        (cf: EMethods<CFMethods>, ps: Instance, addr: string) => Promise<void>
      >
    > = {
      invitePlanner: (cf, ps, addr) => cf.deliverPlannerInvitation(addr, ps),
      inviteResolver: (cf, ps, addr) => cf.deliverResolverInvitation(addr, ps),
      inviteOwnerProxy: (cf, ps, addr) =>
        cf.deliverEVMWalletHandlerInvitation(addr, ps),
    };
    for (const [optName, inviter] of Object.entries(inviters)) {
      const { contract, [optName as keyof Values]: addr } = values;
      if (typeof addr !== 'string') continue;
      const creatorFacetKey = getCreatorFacetKey(contract);
      const creatorFacet = walletStore.get<CFMethods>(creatorFacetKey);
      const instances = await walletKit.readPublished('agoricNames.instance');
      const { postalService } = Object.fromEntries(instances);
      // @ts-expect-error [PASS_STYLE] confusion
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
        trace,
        setTimeout,
      });
      trace('opened', opened);
    } else {
      const opened = await openPositions(positionData, {
        sig,
        when: now(),
        targetAllocation,
        contract: values.contract,
        console,
        trace,
        setTimeout,
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
