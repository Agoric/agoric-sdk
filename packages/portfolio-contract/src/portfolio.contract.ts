import { makeTracer } from '@agoric/internal';
import {
  OrchestrationPowersShape,
  registerChainsAndAssets,
  withOrchestration,
  type OrchestrationAccount,
  type OrchestrationTools,
} from '@agoric/orchestration';
import type { ZCF } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type { Zone } from '@agoric/zone';
import type { CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';
import { preparePortfolioKit } from './portfolio.exo.ts';
import * as flows from './portfolio.flows.ts';
import { makeProposalShapes } from './type-guards.ts';

const trace = makeTracer('PortC');

const interfaceTODO = undefined;

export const meta = M.splitRecord({
  privateArgsShape: {
    ...(OrchestrationPowersShape as CopyRecord),
    marshaller: M.remotable('marshaller'),
    contractAddresses: M.splitRecord({
      aavePoolAddress: M.string(),
      compoundAddress: M.string(),
      factoryAddress: M.string(),
    }),
  },
});
harden(meta);

export const contract = async (
  zcf: ZCF,
  privateArgs,
  zone: Zone,
  tools: OrchestrationTools,
) => {
  const { brands } = zcf.getTerms();
  const { contractAddresses } = privateArgs;
  const { orchestrateAll, zoeTools, chainHub } = tools;

  assert(brands.USDC, 'USDC missing from brands in terms');
  assert(
    contractAddresses.aavePoolAddress,
    'aavePoolAddress missing from contractAddresses',
  );
  assert(
    contractAddresses.compoundAddress,
    'compoundAddress missing from contractAddresses',
  );
  assert(
    contractAddresses.factoryAddress,
    'factoryAddress missing from contractAddresses',
  );

  // TODO: only on 1st incarnation
  registerChainsAndAssets(
    chainHub,
    brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
    { log: trace },
  );

  const proposalShapes = makeProposalShapes(brands.USDC);

  const inertSubscriber: ResolvedPublicTopic<never>['subscriber'] = {
    getUpdateSince() {
      assert.fail('use off-chain queries');
    },
    subscribeAfter() {
      assert.fail('use off-chain queries');
    },
  };

  const makePortfolioKit = preparePortfolioKit(zone);
  const { makeLocalAccount, openPortfolio } = orchestrateAll(flows, {
    zoeTools,
    makePortfolioKit,
    chainHub,
    contractAddresses,
    inertSubscriber,
  });

  trace('TODO: baggage test');
  const localV = zone.makeOnce('localV', _ => makeLocalAccount());

  const publicFacet = zone.exo('PortfolioPub', interfaceTODO, {
    makeOpenPortfolioInvitation() {
      trace('makeOpenPortfolioInvitation');
      return zcf.makeInvitation(
        (seat, offerArgs) => {
          assert(offerArgs, 'offerArgs missing in openPortfolio');
          return openPortfolio(
            seat,
            offerArgs,
            localV as unknown as Promise<
              OrchestrationAccount<{ chainId: 'agoric-any' }>
            >,
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
