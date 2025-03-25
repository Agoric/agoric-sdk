// import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { AnyNatAmountShape } from '@agoric/orchestration/src/typeGuards.js';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
import { withOrchestration } from '../utils/start-helper.js';
import { registerChainsAndAssets } from '../utils/chain-hub-helper.js';
// import * as flows from './axelar-gmp.flows.js';
// import * as sharedFlows from './shared.flows.js';
// import * as evmFlows from './lca-evm.flows.js';
import * as makeAccountFlows from './make-account.flows.js';
import { prepareEvmAccountKit } from './evm-tap-kit.js';
// import { EmptyProposalShape } from '@agoric/zoe/src/typeGuards';

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
 * Not currently used, but this is the convention for defining it.
 *
 * @param {Zone} zone
 */
const prepareMakeUpdateAddress = zone =>
  zone.exoClass(
    'Update Address',
    undefined,
    /** @param {string} [address] */
    address => ({ address }),
    {
      updateAddress(newAddress) {
        this.state.address = newAddress;
      },
    },
  );
/** @typedef {ReturnType<typeof prepareMakeUpdateAddress>} MakeUpdateAddress */

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
  { chainHub, orchestrateAll, vowTools, zoeTools, zcfTools, baggage },
) => {
  console.log('Inside Contract');

  console.log('Channel Info Agoric:');
  console.log(privateArgs.chainInfo.agoric.connections);

  console.log('Channel Info Osmosis:');
  console.log(privateArgs.chainInfo.axelar.connections);

  console.log('Registering Chain and Assets....');
  registerChainsAndAssets(
    chainHub,
    zcf.getTerms().brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
  );

  const makeEvmAccountKit = prepareEvmAccountKit(zone.subZone('evmTap'), {
    vowTools,
    zcf,
  });
  // const makeUpdateAddress = prepareMakeUpdateAddress(zone);

  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  // const { makeLocalAccount } = orchestrateAll(sharedFlows, {});
  /**
   * Setup a shared local account for use in async-flow functions. Typically,
   * exo initState functions need to resolve synchronously, but `makeOnce`
   * allows us to provide a Promise. When using this inside a flow, we must
   * await it to ensure the account is available for use.
   *
   * @type {any} sharedLocalAccountP expects a Promise but this is a vow
   *   https://github.com/Agoric/agoric-sdk/issues/9822
   */
  // const sharedLocalAccountP = zone.makeOnce('localAccount', () =>
  //   makeLocalAccount()
  // );

  // // orchestrate uses the names on orchestrationFns to do a "prepare" of the associated behavior
  // const { sendGmp } = orchestrateAll(flows, {
  //   sharedLocalAccountP,
  //   zoeTools,
  // });

  // const { createAndMonitorLCA } = orchestrateAll(evmFlows, {
  //   makeEvmTap,
  //   chainHub,
  // });

  const { makeAccountAndSendGMP } = orchestrateAll(makeAccountFlows, {
    makeEvmAccountKit,
    // makeUpdateAddress,
    chainHub,
    zoeTools,
    baggage,
    zcfTools,
    zone,
  });

  const publicFacet = zone.exo(
    'Send PF',
    M.interface('Send PF', {
      // gmpInvitation: M.callWhen().returns(InvitationShape),
      // createAndMonitorLCA: M.callWhen().returns(M.any()),
      makeAccountAndSendGMP: M.callWhen().returns(M.any()),
    }),
    {
      // gmpInvitation() {
      //   return zcf.makeInvitation(
      //     sendGmp,
      //     'send',
      //     undefined,
      //     M.splitRecord({ give: SingleNatAmountRecord })
      //   );
      // },
      // createAndMonitorLCA() {
      //   return zcf.makeInvitation(
      //     createAndMonitorLCA,
      //     'send',
      //     undefined,
      //     EmptyProposalShape
      //   );
      // },
      makeAccountAndSendGMP() {
        return zcf.makeInvitation(
          makeAccountAndSendGMP,
          'send',
          undefined,
          M.splitRecord({ give: SingleNatAmountRecord }),
        );
      },
    },
  );

  return { publicFacet, creatorFacet };
};
harden(contract);

export const start = withOrchestration(contract, { publishAccountInfo: true });
harden(start);
