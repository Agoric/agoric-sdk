// @ts-check
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { EmptyProposalShape } from '@agoric/zoe/src/typeGuards';
import { E } from '@endo/far';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
import { AnyNatAmountShape } from '../typeGuards.js';
import { withOrchestration } from '../utils/start-helper.js';
import { registerChainsAndAssets } from '../utils/chain-hub-helper.js';
import * as flows from './axelar-gmp.flows.js';
import * as sharedFlows from './shared.flows.js';
import * as evmFlows from './lca-evm.flows.js';
import { prepareEvmTap } from './evm-tap-kit.js';
import { prepareEVMTransactionKit } from './evm-transaction-kit.js';

/**
 * @import {Remote, Vow} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers, OrchestrationTools} from '../utils/start-helper.js';
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
 *   storageNode: Remote<StorageNode>;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
export const contract = async (
  zcf,
  privateArgs,
  zone,
  { baggage, chainHub, orchestrateAll, vowTools, zoeTools },
) => {
  console.log('Inside Contract');

  console.log('Channel Info Agoric:');
  console.log(privateArgs.chainInfo.agoric.connections);

  console.log('Channel Info Axelar:');
  console.log(privateArgs.chainInfo.axelar.connections);

  console.log('Registering Chain and Assets....');
  registerChainsAndAssets(
    chainHub,
    zcf.getTerms().brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
  );

  const makeEvmTap = prepareEvmTap(zone.subZone('evmTap'), vowTools);

  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  // UNTIL https://github.com/Agoric/agoric-sdk/issues/9066
  const logNode = E(privateArgs.storageNode).makeChildNode('log');
  /** @type {(msg: string) => Vow<void>} */
  const log = msg => vowTools.watch(E(logNode).setValue(msg));

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

  // orchestrate uses the names on orchestrationFns to do a "prepare" of the associated behavior
  const { sendGmp } = orchestrateAll(flows, {
    sharedLocalAccountP,
    log,
    zoeTools,
  });

  const { createAndMonitorLCA } = orchestrateAll(evmFlows, {
    makeEvmTap,
    log,
    chainHub,
  });

  const publicFacet = zone.exo(
    'Send PF',
    M.interface('Send PF', {
      gmpInvitation: M.callWhen().returns(InvitationShape),
      createAndMonitorLCA: M.callWhen().returns(M.any()),
    }),
    {
      gmpInvitation() {
        return zcf.makeInvitation(
          sendGmp,
          'send',
          undefined,
          M.splitRecord({ give: SingleNatAmountRecord }),
        );
      },
      createAndMonitorLCA() {
        return zcf.makeInvitation(
          async seat => {
            const res = await createAndMonitorLCA(seat);
            // @ts-ignore
            const localAccount = await res.payload.vowV0.shorten();
            const makeEVMTransactionKit = prepareEVMTransactionKit(
              baggage,
              { zcf },
              localAccount,
            );
            seat.exit();
            return makeEVMTransactionKit();
          },
          `send`,
          undefined,
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
