/**
 * @file axelar-gmp.contract.js
 *
 *   demonstrates the three types of transactions possible with axelar gmp to evm
 *   chains:
 *
 *   - call contract
 *   - call contract with tokens
 *   - send tokens
 */
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
import { AnyNatAmountShape } from '../typeGuards.js';
import { withOrchestration } from '../utils/start-helper.js';
import { registerChainsAndAssets } from '../utils/chain-hub-helper.js';
import * as flows from './axelar.flows.js';
import * as sharedFlows from './shared.flows.js';
import { GMPMessageType } from '../utils/gmp.js';

/**
 * @import {Vow} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationPowers, OrchestrationTools} from '../utils/start-helper.js';
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 */

// Proposal shapes for different invitation types
const SingleNatAmountRecord = M.and(
  M.recordOf(M.string(), AnyNatAmountShape, {
    numPropertiesLimit: 1,
  }),
  M.not(harden({})),
);
harden(SingleNatAmountRecord);

const BaseGMPShape = {
  destAddr: M.string(),
  destinationEVMChain: M.string(),
  gasAmount: M.number(),
};
harden(BaseGMPShape);

const SendGMPShape = {
  ...BaseGMPShape,
  type: M.or([
    GMPMessageType.MESSAGE_ONLY,
    GMPMessageType.MESSAGE_WITH_TOKEN,
    GMPMessageType.TOKEN_ONLY,
  ]),
  payload: M.opt(M.arrayOf(M.nat())),
  proposal: M.splitRecord({}, { give: SingleNatAmountRecord }),
};
harden(SendGMPShape);

const SetCountShape = {
  ...BaseGMPShape,
  params: {
    newCount: M.number(),
  },
};
harden(SetCountShape);

const DepositToAaveShape = {
  ...BaseGMPShape,
  params: {
    onBehalfOf: M.string(),
    referralCode: M.opt(M.number()),
  },
  proposal: M.splitRecord({ give: SingleNatAmountRecord }),
};
harden(DepositToAaveShape);

/**
 * Orchestration contract to be wrapped by withOrchestration for Zoe
 *
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 *   chainInfo?: Record<string, CosmosChainInfo>;
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
  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  // UNTIL https://github.com/Agoric/agoric-sdk/issues/9066
  const logNode = E(privateArgs.storageNode).makeChildNode('log');
  /** @type {(msg: string) => Vow<void>} */
  const log = msg => vowTools.watch(E(logNode).setValue(msg));

  const { makeLocalAccount } = orchestrateAll(sharedFlows, {});
  const sharedLocalAccountP = zone.makeOnce('localAccount', () =>
    makeLocalAccount(),
  );

  const orchFns = orchestrateAll(flows, {
    log,
    sharedLocalAccountP,
    zoeTools,
  });

  const publicFacet = zone.exo(
    'GMP PF',
    M.interface('GMP PF', {
      makeSendGMPInvitation: M.callWhen().returns(InvitationShape),
      makeSetCountInvitation: M.callWhen().returns(InvitationShape),
      makeDepositToAaveInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeSendGMPInvitation() {
        return zcf.makeInvitation(
          orchFns.sendGMP,
          'sendGMP',
          undefined,
          SendGMPShape,
        );
      },
      makeSetCountInvitation() {
        return zcf.makeInvitation(
          orchFns.setCount,
          'setCount',
          undefined,
          SetCountShape,
        );
      },
      makeDepositToAaveInvitation() {
        return zcf.makeInvitation(
          orchFns.depositToAave,
          'depositToAave',
          undefined,
          DepositToAaveShape,
        );
      },
    },
  );

  registerChainsAndAssets(
    chainHub,
    zcf.getTerms().brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
  );

  return { publicFacet, creatorFacet };
};
harden(contract);

export const start = withOrchestration(contract);
harden(start);
