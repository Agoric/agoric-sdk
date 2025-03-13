import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { prepareChainHubAdmin } from '@agoric/orchestration/src/exos/chain-hub-admin.js';
import { AnyNatAmountShape } from '@agoric/orchestration/src/typeGuards.js';
import { withOrchestration } from '@agoric/orchestration/src/utils/start-helper.js';
import { registerChainsAndAssets } from '@agoric/orchestration/src/utils/chain-hub-helper.js';
import * as gmpflows from './axelar-gmp.flows.js';
import * as tokenTransferflows from './axelar-token-transfer.flows.js';
import * as sharedFlows from './shared.flows.js';
import * as evmFlows from './axelar-evm.flows.js';
import { prepareEvmTap } from './evm-tap-kit.js';
import { EmptyProposalShape } from '@agoric/zoe/src/typeGuards';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers, OrchestrationTools} from '@agoric/orchestration/src/utils/start-helper.js';
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {Marshaller} from '@agoric/internal/src/lib-chainStorage.js';
 */

export const SingleNatAmountRecord = M.and(
  M.recordOf(M.string(), AnyNatAmountShape, {
    numPropertiesLimit: 1,
  }),
  M.not(harden({})),
);
harden(SingleNatAmountRecord);

/**
 * Orchestration contract to be wrapped by withOrchestration for Zoe
 *
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 *   chainInfo: Record<string, CosmosChainInfo>;
 *   assetInfo?: [Denom, DenomDetail & { brandKey?: string }][];
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
export const contract = async (
  zcf,
  privateArgs,
  zone,
  { chainHub, orchestrateAll, vowTools, zoeTools },
) => {
  console.log('Inside Contract');

  console.log('Channel Info Agoric:');

  console.log(privateArgs.chainInfo['agoric'].connections);
  console.log('Channel Info Osmosis:');
  console.log(privateArgs.chainInfo['osmosis'].connections);

  console.log('Registering Chain and Assets....');
  registerChainsAndAssets(
    chainHub,
    zcf.getTerms().brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
  );

  const makeEvmTap = prepareEvmTap(zone.subZone('evmTap'), vowTools);

  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  const { makeLocalAccount } = orchestrateAll(sharedFlows, {});
  /**
   * Setup a shared local account for use in async-flow functions. Typically,
   * exo initState functions need to resolve synchronously, but `makeOnce`
   * allows us to provide a Promise. When using this inside a flow, we must
   * await it to ensure the account is available for use.
   *
   * @type {any} sharedLocalAccountP expects a Promise but this is a vow
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  const sharedLocalAccountP = zone.makeOnce('localAccount', () =>
    makeLocalAccount(),
  );

  const { makeEVMContractCall } = orchestrateAll(gmpflows, {
    sharedLocalAccountP,
    zoeTools,
  });

  const { sendTokensToEVM } = orchestrateAll(tokenTransferflows, {
    sharedLocalAccountP,
    zoeTools,
  });

  const { createAndMonitorLCA } = orchestrateAll(evmFlows, {
    makeEvmTap,
    chainHub,
  });

  const publicFacet = zone.exo(
    'Send PF',
    M.interface('Send PF', {
      contractCallInvitation: M.callWhen().returns(InvitationShape),
      sendTokensInvitation: M.callWhen().returns(InvitationShape),
      createAndMonitorAccount: M.callWhen().returns(M.any()),
    }),
    {
      contractCallInvitation() {
        return zcf.makeInvitation(
          makeEVMContractCall,
          'makeEVMContractCall',
          undefined,
          M.splitRecord({ give: SingleNatAmountRecord }),
        );
      },
      sendTokensInvitation() {
        return zcf.makeInvitation(
          sendTokensToEVM,
          'sendTokensToEVM',
          undefined,
          M.splitRecord({ give: SingleNatAmountRecord }),
        );
      },
      createAndMonitorAccount() {
        return zcf.makeInvitation(
          createAndMonitorLCA,
          'send',
          undefined,
          // TODO: temporarily use EmptyProposalShape
          EmptyProposalShape,
        );
      },
    },
  );

  return { publicFacet, creatorFacet };
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
