/**
 * @file Primarily a testing fixture, but also serves as an example of how to
 *   leverage basic functionality of the Orchestration API with async-flow.
 */
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { E } from '@endo/far';
import { preparePortfolioHolder } from '../exos/portfolio-holder-kit.js';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './basic-flows.flows.js';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
import { registerKnownChainsAndAssets } from '../utils/chain-hub-helper.js';
import fetchedChainInfo from '../fetched-chain-info.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers, OrchestrationTools} from '../utils/start-helper.js';
 */

/**
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (
  zcf,
  privateArgs,
  zone,
  { chainHub, orchestrateAll, vowTools, baggage },
) => {
  const makePortfolioHolder = preparePortfolioHolder(
    zone.subZone('portfolio'),
    vowTools,
  );

  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  const incarnationKey = 'incarnation1';

  await null;

  if (!baggage.has(incarnationKey)) {
    baggage.init(incarnationKey, true);

    // register assets in ChainHub ourselves,
    // UNTIL https://github.com/Agoric/agoric-sdk/issues/9752
    const assets =
      /** @type {import('@agoric/vats/src/vat-bank.js').AssetInfo[]} */ (
        await E(E(privateArgs.agoricNames).lookup('vbankAsset')).values()
      );

    /** @type {Record<string, Brand<'nat'>>} */
    const brands = {};

    for (const asset of assets) {
      brands[asset.issuerName] = /** @type {Brand<'nat'>} */ (asset.brand);
    }

    await registerKnownChainsAndAssets(
      {
        vowTools,
        chainHubAdmin: creatorFacet,
      },
      fetchedChainInfo,
      brands,
    );

    await E(creatorFacet).registerAsset(`ibc/uusdchash`, {
      chainName: 'agoric',
      baseName: 'agoric',
      baseDenom: 'uusdc',
    });
  }

  const orchFns = orchestrateAll(flows, { makePortfolioHolder });

  const publicFacet = zone.exo(
    'Basic Flows Public Facet',
    M.interface('Basic Flows PF', {
      makeOrchAccountInvitation: M.callWhen().returns(InvitationShape),
      makePortfolioAccountInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeOrchAccountInvitation() {
        return zcf.makeInvitation(
          orchFns.makeOrchAccount,
          'Make an Orchestration Account',
        );
      },
      makePortfolioAccountInvitation() {
        return zcf.makeInvitation(
          orchFns.makePortfolioAccount,
          'Make an Orchestration Account',
        );
      },
    },
  );

  return { publicFacet };
};

export const start = withOrchestration(contract);
harden(start);

/** @typedef {typeof start} BasicFlowsSF */
