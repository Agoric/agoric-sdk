/**
 * @file shared logic for the ymax CLI tool.
 *
 * Scope: implement the intent of CLI operations without ambient authority.
 * Callers pass explicit capabilities so these APIs can be reused by other CLIs
 * or composed into other modules.
 */
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { MovementDesc } from '@aglocal/portfolio-contract/src/type-guards-steps.ts';
import {
  type OfferArgsFor,
  type ProposalType,
  type TargetAllocation,
} from '@aglocal/portfolio-contract/src/type-guards.ts';
import { makePortfolioSteps } from '@aglocal/portfolio-contract/tools/plan-transfers.ts';
import type { SigningSmartWalletKit, VstorageKit } from '@agoric/client-utils';
import { walletUpdates } from '@agoric/deploy-script-support/src/wallet-utils.js';
import { AmountMath, type Brand } from '@agoric/ertp';
import {
  multiplyBy,
  parseRatio,
  type ParsableNumber,
} from '@agoric/ertp/src/ratio.js';
import { mustMatch, objectMap, type TypedPattern } from '@agoric/internal';
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
import type { OfferStatus } from '@agoric/smart-wallet/src/offers.js';
import type { NameHub } from '@agoric/vats';
import type { StdFee } from '@cosmjs/stargate';
import { type CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';

import type { HDAccount } from 'viem';
import {
  axelarConfig as axelarConfigMainnet,
  axelarConfigTestnet,
  gmpAddresses as gmpConfigs,
  type AxelarChainConfig,
} from './axelar-configs.js';
import { lookupInterchainInfo } from './orch.start.js';

type YMaxStartFn = typeof YMaxStart;

export const makeFee = ({
  gas = 20_000, // cosmjs default
  adjustment = 1.0,
  denom = 'ubld',
  price = 0.01, // ubld. per 2025-11 community discussion
} = {}): StdFee => ({
  gas: `${Math.round(gas * adjustment)}`,
  amount: [{ denom, amount: `${Math.round(gas * adjustment * price)}` }],
});

export type GoalData = Partial<Record<YieldProtocol, ParsableNumber>>;
const YieldProtocolShape = M.or(...Object.keys(YieldProtocol));
const ParseableNumberShape = M.or(M.number(), M.string());
export const GoalDataShape: TypedPattern<GoalData> = M.recordOf(
  YieldProtocolShape,
  ParseableNumberShape,
);

const { fromEntries } = Object;
const { make } = AmountMath;

export const parseTypedJSON = <T>(
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

export const noPoll = <
  T extends { pollOffer: (...args: unknown[]) => unknown },
>(
  wk: T,
  trace: (...args: unknown[]) => void,
): T => ({
  ...wk,
  pollOffer: async () => {
    trace('polling skippped');
    return harden({ status: 'polling skipped' } as unknown as OfferStatus);
  },
});

export const openPositions = async (
  goalData: GoalData,
  {
    sig,
    when,
    targetAllocation,
    contract = 'ymax0',
    id = `open-${new Date(when).toISOString()}`,
    console,
    trace,
    setTimeout,
  }: {
    sig: SigningSmartWalletKit;
    when: number;
    targetAllocation?: TargetAllocation;
    contract?: string;
    id?: string;
    console: Console;
    trace: (...args: unknown[]) => void;
    setTimeout: typeof globalThis.setTimeout;
  },
) => {
  await null;
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

export const openPositionsEVM = async ({
  targetAllocation,
  sig,
  evmAccount,
  when,
  axelarChainConfig,
  axelarChain,
  id = `open-${new Date(when).toISOString()}`,
  trace,
  setTimeout,
}: {
  sig: SigningSmartWalletKit;
  evmAccount: HDAccount;
  axelarChainConfig: AxelarChainConfig;
  axelarChain: AxelarChain;
  when: number;
  contract?: string;
  id?: string;
  targetAllocation: TargetAllocation;
  trace: (...args: unknown[]) => void;
  setTimeout: typeof globalThis.setTimeout;
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
export const getCreatorFacetKey = (contract: string): string =>
  contract === 'ymax0' ? 'creatorFacet' : `creatorFacet-${contract}`;

/**
 * Build a NameHub suitable for use by lookupInterchainInfo,
 * filtering odd stuff found in devnet.
 *
 * @param vsk
 */
const agoricNamesForChainInfo = (vsk: VstorageKit, console: Console) => {
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
export const getNetworkConfig = (network: 'main' | 'devnet') => {
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
 * @param console
 * @param walletBytecode
 * @param axelarConfig
 * @param gmpAddresses
 */
export const overridesForEthChainInfo = async (
  vsk: VstorageKit,
  console: Console,
  walletBytecode: string,
  axelarConfig:
    | typeof axelarConfigTestnet
    | typeof axelarConfigMainnet = axelarConfigTestnet,
  gmpAddresses:
    | typeof gmpConfigs.testnet
    | typeof gmpConfigs.mainnet = gmpConfigs.testnet,
) => {
  const { chainInfo: cosmosChainInfo } = await lookupInterchainInfo(
    agoricNamesForChainInfo(vsk, console),
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
