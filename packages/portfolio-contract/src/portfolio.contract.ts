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
import { M, mustMatch } from '@endo/patterns';
import { preparePortfolioKit, type LocalAccount } from './portfolio.exo.ts';
import * as flows from './portfolio.flows.ts';
import {
  makeProposalShapes,
  makeOfferArgsShapes,
  type OfferArgsShapes,
} from './type-guards.ts';

const trace = makeTracer('PortC');

const interfaceTODO = undefined;

const privateArgsShape = {
  ...(OrchestrationPowersShape as CopyRecord),
  marshaller: M.remotable('marshaller'),
  contract: M.splitRecord({
    aavePool: M.string(),
    compound: M.string(),
    factory: M.string(),
  }),
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
  const { brands } = zcf.getTerms();
  const { orchestrateAll, zoeTools, chainHub } = tools;

  assert(brands.USDC, 'USDC missing from brands in terms');

  // TODO: only on 1st incarnation
  registerChainsAndAssets(
    chainHub,
    brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
    { log: trace },
  );

  const proposalShapes = makeProposalShapes(brands.USDC);
  const offerArgsShapes = makeOfferArgsShapes();

  const inertSubscriber: ResolvedPublicTopic<never>['subscriber'] = {
    getUpdateSince() {
      assert.fail('use off-chain queries');
    },
    subscribeAfter() {
      assert.fail('use off-chain queries');
    },
  };

  const makePortfolioKit = preparePortfolioKit(zone, { zcf });
  const { makeLocalAccount, openPortfolio } = orchestrateAll(flows, {
    zoeTools,
    makePortfolioKit,
    chainHub,
    contract: privateArgs.contract,
    inertSubscriber,
  });

  trace('TODO: baggage test');
  const localV = zone.makeOnce('localV', _ => makeLocalAccount());

  const publicFacet = zone.exo('PortfolioPub', interfaceTODO, {
    makeOpenPortfolioInvitation() {
      trace('makeOpenPortfolioInvitation');
      return zcf.makeInvitation(
        (seat, offerArgs: OfferArgsShapes) => {
          mustMatch(offerArgs, offerArgsShapes);
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
