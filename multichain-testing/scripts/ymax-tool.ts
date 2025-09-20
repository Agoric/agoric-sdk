#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file tools for integration testing for ymax proof of concept.
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
import {
  makePortfolioQuery,
  makePortfolioSteps,
} from '@aglocal/portfolio-contract/tools/portfolio-actors.ts';
import {
  axelarConfigTestnet,
  gmpAddresses as gmpConfigs,
} from '@aglocal/portfolio-deploy/src/axelar-configs.js';
import type { ContractControl } from '@aglocal/portfolio-deploy/src/contract-control.js';
import { lookupInterchainInfo } from '@aglocal/portfolio-deploy/src/orch.start.js';
import { findOutdated } from '@aglocal/portfolio-deploy/src/vstorage-outdated.js';
import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
  type SigningSmartWalletKit,
  type VstorageKit,
} from '@agoric/client-utils';
import { AmountMath } from '@agoric/ertp';
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
import { YieldProtocol } from '@agoric/portfolio-api/src/constants.js';
import type { OfferStatus } from '@agoric/smart-wallet/src/offers.js';
import type { NameHub } from '@agoric/vats';
import type { StartedInstanceKit as ZStarted } from '@agoric/zoe/src/zoeService/utils';
import { SigningStargateClient } from '@cosmjs/stargate';
import { M } from '@endo/patterns';
import { parseArgs } from 'node:util';
import {
  reflectWalletStore,
  walletUpdates,
} from '../tools/wallet-store-reflect.ts';

type YMaxStartFn = typeof YMaxStart;

const getUsage = (
  programName: string,
): string => `USAGE: ${programName} [options]
Options:
  --skip-poll         Skip polling for offer result
  --exit-success      Exit with success code even if errors occur
  --positions         JSON string of opening positions (e.g. '{"USDN":6000,"Aave":4000}')
  --target-allocation JSON string of target allocation (e.g. '{"USDN":6000,"Aave_Arbitrum":4000}')
  --redeem            redeem invitation
  --contract=[ymax0]  agoricNames.instance name of contract that issued invitation
  --description=[planner]
  --submit-for <id>   submit (empty) plan for portfolio <id>
  -h, --help          Show this help message`;

const parseToolArgs = (argv: string[]) =>
  parseArgs({
    args: argv.slice(2),
    options: {
      positions: { type: 'string', default: '{}' },
      'skip-poll': { type: 'boolean', default: false },
      'exit-success': { type: 'boolean', default: false },
      'target-allocation': { type: 'string' },
      redeem: { type: 'boolean', default: false },
      contract: { type: 'string', default: 'ymax0' },
      description: { type: 'string', default: 'planner' },
      getCreatorFacet: { type: 'boolean', default: false },
      terminate: { type: 'string' },
      installAndStart: { type: 'string' },
      invitePlanner: { type: 'string' },
      pruneStorage: { type: 'boolean', default: false },
      'submit-for': { type: 'string' },
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
    id = `open-${new Date(when).toISOString()}`,
  }: {
    sig: SigningSmartWalletKit;
    when: number;
    targetAllocation?: TargetAllocation;
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
  const { give: giveWFees } = makePortfolioSteps(goal, { evm, feeBrand: BLD });
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
          instancePath: ['ymax0'],
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
      console.debug('readPublished', kind, child);
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
 * Build privateArgsOverrides sufficient to add new EVM chains.
 *
 * @param vsk
 * @param axelarConfig
 * @param gmpAddresses
 */
const overridesForEthChainInfo = async (
  vsk: VstorageKit,
  axelarConfig = axelarConfigTestnet,
  gmpAddresses = gmpConfigs.testnet,
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
  });
  console.log(
    'privateArgsOverrides',
    JSON.stringify(privateArgsOverrides, null, 2),
  );
  return privateArgsOverrides;
};

const main = async (
  argv = process.argv,
  env = process.env,
  {
    fetch = globalThis.fetch,
    setTimeout = globalThis.setTimeout,
    connectWithSigner = SigningStargateClient.connectWithSigner,
    now = Date.now,
  } = {},
) => {
  const { values } = parseToolArgs(argv);

  if (values.help) {
    console.error(getUsage(argv[1]));
    return;
  }

  const { MNEMONIC } = env;
  if (!MNEMONIC) throw Error(`MNEMONIC not set`);

  const delay = ms =>
    new Promise(resolve => setTimeout(resolve, ms)).then(_ => {});
  const networkConfig = await fetchEnvNetworkConfig({ env, fetch });
  const walletKit0 = await makeSmartWalletKit({ fetch, delay }, networkConfig);
  const walletKit = values['skip-poll'] ? noPoll(walletKit0) : walletKit0;
  const sig = await makeSigningSmartWalletKit(
    { connectWithSigner, walletUtils: walletKit },
    MNEMONIC,
  );
  trace('address', sig.address);
  const walletStore = reflectWalletStore(sig, {
    setTimeout,
    log: trace,
    fresh: () => new Date(now()).toISOString(),
  });

  if (values.redeem) {
    const { contract, description } = values;
    trace('getting instance', contract);
    const { [contract]: instance } = fromEntries(
      await walletKit.readPublished('agoricNames.instance'),
    );
    const result = await walletStore.saveOfferResult(
      { instance, description },
      description.replace(/^deliver /, ''),
    );
    trace('redeem result', result);
    return;
  }

  const yc = walletStore.get<ContractControl<YMaxStartFn>>('ymaxControl');

  if (values.getCreatorFacet) {
    await walletStore.savingResult('creatorFacet', () => yc.getCreatorFacet());
    return;
  }

  if (values.terminate) {
    const { terminate: message } = values;
    await yc.terminate({ message });
    return;
  }

  if (values.installAndStart) {
    const { installAndStart: bundleId } = values;
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
      privateArgsOverrides: await overridesForEthChainInfo(walletKit),
    });
    return;
  }

  if (values.pruneStorage) {
    console.error('finding outdated vstorage...');
    const toPrune = await findOutdated(walletKit.vstorage);
    console.log('toPrune', toPrune);
    await yc.pruneChainStorage(toPrune);
  }

  if (values.invitePlanner) {
    const { invitePlanner: planner } = values;
    const cf =
      walletStore.get<ZStarted<YMaxStartFn>['creatorFacet']>('creatorFacet');
    const { postalService } = fromEntries(
      await walletKit.readPublished('agoricNames.instance'),
    );
    await cf.deliverPlannerInvitation(planner, postalService);
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
    const opened = await openPositions(positionData, {
      sig,
      when: now(),
      targetAllocation,
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
