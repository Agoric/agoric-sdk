import { makeTracer } from '@agoric/internal';
import {
  ChainInfoShape,
  DenomDetailShape,
  OrchestrationPowersShape,
  registerChainsAndAssets,
  withOrchestration,
  type OrchestrationTools,
} from '@agoric/orchestration';
import type { ZCF } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type { Zone } from '@agoric/zone';
import type { CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';
import { preparePortfolioKit, type LocalAccount } from './portfolio.exo.ts';
import * as flows from './portfolio.flows.ts';
import { makeProposalShapes, type OfferArgsShapes } from './type-guards.ts';
import { AxelarChains } from './constants.js';

const { keys } = Object;
const trace = makeTracer('PortC');

const interfaceTODO = undefined;

const privateArgsShape = {
  ...(OrchestrationPowersShape as CopyRecord),
  marshaller: M.remotable('marshaller'),
  contractAddresses: M.splitRecord({
    aavePool: M.string(),
    compound: M.string(),
    factory: M.string(),
    usdc: M.string(),
  }),
  axelarChainsMap: M.recordOf(
    M.or(...keys(AxelarChains)),
    M.splitRecord({
      caip: M.string(),
      // Axelar chain Ids differ between mainnet and testnet environments.
      // Reference: https://github.com/axelarnetwork/axelarjs-sdk/blob/f84c8a21ad9685091002e24cac7001ed1cdac774/src/chains/supported-chains-list.ts
      axelarId: M.string(),
    }),
  ),
  chainInfo: M.recordOf(M.string(), ChainInfoShape),
  assetInfo: M.arrayOf([M.string(), DenomDetailShape]),
  // TODO: remove once we deploy package pr is merged
  poolMetricsNode: M.remotable(),
};

export const meta = M.splitRecord({
  privateArgsShape,
});
harden(meta);

export const contract = async (
  zcf: ZCF,
  privateArgs,
  zone: Zone,
  tools: OrchestrationTools,
) => {
  const { chainInfo, assetInfo, contractAddresses, axelarChainsMap } =
    privateArgs;
  const { brands } = zcf.getTerms();
  const { orchestrateAll, zoeTools, chainHub } = tools;

  assert(brands.USDC, 'USDC missing from brands in terms');

  // TODO: only on 1st incarnation
  registerChainsAndAssets(chainHub, brands, chainInfo, assetInfo, {
    log: trace,
  });

  const proposalShapes = makeProposalShapes(brands.USDC);

  const inertSubscriber: ResolvedPublicTopic<never>['subscriber'] = {
    getUpdateSince() {
      assert.fail('use off-chain queries');
    },
    subscribeAfter() {
      assert.fail('use off-chain queries');
    },
  };

  const makePortfolioKit = preparePortfolioKit(zone, { zcf, axelarChainsMap });
  const { makeLocalAccount, openPortfolio } = orchestrateAll(flows, {
    zoeTools,
    makePortfolioKit,
    axelarChainsMap,
    contractAddresses,
    chainHub,
    inertSubscriber,
  });

  trace('TODO: baggage test');
  const localV = zone.makeOnce('localV', _ => makeLocalAccount());

  const publicFacet = zone.exo('PortfolioPub', interfaceTODO, {
    makeOpenPortfolioInvitation() {
      trace('makeOpenPortfolioInvitation');
      return zcf.makeInvitation(
        (seat, offerArgs: OfferArgsShapes) => {
          return openPortfolio(
            seat,
            offerArgs,
            localV as unknown as Promise<LocalAccount>,
          );
        },
        'openPortfolio',
        undefined,
        proposalShapes.openPortfolio,
      );
    },
  });

  return { publicFacet };
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
