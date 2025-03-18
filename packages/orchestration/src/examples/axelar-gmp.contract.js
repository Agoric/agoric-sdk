import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
import { AnyNatAmountShape } from '../typeGuards.js';
import { withOrchestration } from '../utils/start-helper.js';
import { registerChainsAndAssets } from '../utils/chain-hub-helper.js';
import * as flows from './axelar-gmp.flows.js';
import * as sharedFlows from './shared.flows.js';
import * as evmFlows from './lca-evm.flows.js';
import { prepareEvmTap } from './evm-tap-kit.js';
import { EmptyProposalShape } from '@agoric/zoe/src/typeGuards';
import { hexlify } from '@ethersproject/bytes';
import { arrayify } from '@ethersproject/bytes';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers, OrchestrationTools} from '../utils/start-helper.js';
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {Marshaller} from '@agoric/internal/src/lib-chainStorage.js';
 */

let counter = 1;

const getRandomBytes = (length = 4) => {
  const randomBytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    randomBytes[i] = (counter * (i + 1)) % 256;
  }
  counter++;
  return randomBytes;
};

const randomFunction = () => {
  const randomBytes = getRandomBytes();
  const useHexlify = randomBytes[0] % 2 === 0;

  if (useHexlify) {
    console.log('Using hexlify:', hexlify(randomBytes));
  } else {
    console.log('Using arrayify:', arrayify(hexlify(randomBytes)));
  }
};

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
  [...Array(5)].forEach(() => randomFunction());

  console.log('Channel Info Agoric:');
  console.log(privateArgs.chainInfo.agoric.connections);

  console.log('Channel Info Osmosis:');
  console.log(privateArgs.chainInfo.osmosis.connections);

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

  // orchestrate uses the names on orchestrationFns to do a "prepare" of the associated behavior
  const { sendGmp } = orchestrateAll(flows, {
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
          createAndMonitorLCA,
          'send',
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
