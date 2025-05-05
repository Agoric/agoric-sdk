// @ts-check
import { makeTracer, mustMatch } from '@agoric/internal';
import { withOrchestration, ChainInfoShape } from '@agoric/orchestration';
import { M } from '@endo/patterns';
import * as flows from './ica-probe.flows.js';

/**
 * @import {TypedPattern} from '@agoric/internal';
 * @import { ZCF } from '@agoric/zoe/src/zoeService/zoe.js';
 * @import {Zone} from '@agoric/zone';
 * @import {ChainInfo} from '@agoric/orchestration';
 * @import {OrchestrationPowers, OrchestrationTools} from '@agoric/orchestration/src/utils/start-helper.js';
 */

const trace = makeTracer('ICApr');

/** @type {TypedPattern<{ name: string, chainInfo: ChainInfo }>} */
const registerArgsShape = harden({
  name: M.string(),
  chainInfo: ChainInfoShape,
});

/**
 * @param {ZCF} zcf
 * @param {OrchestrationPowers} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (zcf, privateArgs, zone, tools) => {
  const { makeICA } = tools.orchestrateAll(flows, {});

  const registerChainHandler = zone.exo('rch', undefined, {
    handle(seat, offerArgs) {
      trace('TODO: charge fee to register chain');
      mustMatch(offerArgs, registerArgsShape);
      const { name, chainInfo } = offerArgs;
      tools.chainHub.registerChain(name, chainInfo);
      return name;
    },
  });

  const publicFacet = zone.exo('ICAProbeAPI', undefined, {
    makeRegisterChainInvitation() {
      return zcf.makeInvitation(registerChainHandler, 'register chain');
    },
    makeMakeICAIinvitation() {
      return zcf.makeInvitation(makeICA, 'makeICA');
    },
  });

  return { publicFacet };
};

export const start = withOrchestration(contract);
