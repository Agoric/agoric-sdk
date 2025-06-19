import { makeTracer, type TypedPattern } from '@agoric/internal';
import {
  ChainInfoShape,
  DenomDetailShape,
  OrchestrationPowersShape,
  registerChainsAndAssets,
  withOrchestration,
  type ChainInfo,
  type Denom,
  type DenomDetail,
  type OrchestrationPowers,
  type OrchestrationTools,
} from '@agoric/orchestration';
import type { ZCF } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type { Zone } from '@agoric/zone';
import type { CopyRecord } from '@endo/pass-style';
import { M, mustMatch } from '@endo/patterns';
import { preparePortfolioKit, type LocalAccount } from './portfolio.exo.ts';
import * as flows from './portfolio.flows.ts';
import {
  EVMContractAddressesShape,
  makeProposalShapes,
  EVMOfferArgsShape,
  type EVMContractAddresses,
  type EVMOfferArgs,
  type AxelarChainsMap,
  AxelarChainsMapShape,
} from './type-guards.ts';

const trace = makeTracer('PortC');

const interfaceTODO = undefined;

type PortfolioPrivateArgs = OrchestrationPowers & {
  assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
  chainInfo: Record<string, ChainInfo>;
  marshaller: Marshaller;
  contractAddresses: EVMContractAddresses;
  axelarChainsMap: AxelarChainsMap;
};

const privateArgsShape: TypedPattern<PortfolioPrivateArgs> = {
  ...(OrchestrationPowersShape as CopyRecord),
  marshaller: M.remotable('marshaller'),
  contractAddresses: EVMContractAddressesShape,
  chainInfo: M.recordOf(M.string(), ChainInfoShape),
  assetInfo: M.arrayOf([M.string(), DenomDetailShape]),
  axelarChainsMap: AxelarChainsMapShape,
};

export const meta = {
  privateArgsShape,
};
harden(meta);

export const contract = async (
  zcf: ZCF,
  privateArgs: PortfolioPrivateArgs,
  zone: Zone,
  tools: OrchestrationTools,
) => {
  const {
    chainInfo,
    assetInfo,
    contractAddresses,
    axelarChainsMap,
    timerService,
  } = privateArgs;
  const { brands } = zcf.getTerms();
  const { orchestrateAll, zoeTools, chainHub, vowTools } = tools;

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

  const makePortfolioKit = preparePortfolioKit(zone, {
    zcf,
    axelarChainsMap,
    chainHub,
    timer: timerService,
    vowTools,
  });
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
        (seat, offerArgs: EVMOfferArgs) => {
          mustMatch(offerArgs, EVMOfferArgsShape);
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
