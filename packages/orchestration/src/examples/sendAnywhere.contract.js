import { makeSharedStateRecord } from '@agoric/async-flow';
import { AmountShape } from '@agoric/ertp';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './sendAnywhere.flows.js';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';

/**
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote, Vow} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {VBankAssetDetail} from '@agoric/vats/tools/board-utils.js';
 * @import {CosmosInterchainService} from '../exos/cosmos-interchain-service.js';
 * @import {OrchestrationTools} from '../utils/start-helper.js';
 */

/**
 * @typedef {{
 *   localchain: Remote<LocalChain>;
 *   orchestrationService: Remote<CosmosInterchainService>;
 *   storageNode: Remote<StorageNode>;
 *   timerService: Remote<TimerService>;
 *   agoricNames: Remote<NameHub>;
 * }} OrchestrationPowers
 */

export const SingleAmountRecord = M.and(
  M.recordOf(M.string(), AmountShape, {
    numPropertiesLimit: 1,
  }),
  M.not(harden({})),
);
harden(SingleAmountRecord);

/**
 * Orchestration contract to be wrapped by withOrchestration for Zoe
 *
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
  { chainHub, orchestrateAll, zoeTools },
) => {
  const contractState = makeSharedStateRecord(
    /** @type {{ account: OrchestrationAccount<any> | undefined }} */ {
      localAccount: undefined,
    },
  );

  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  // orchestrate uses the names on orchestrationFns to do a "prepare" of the associated behavior
  const orchFns = orchestrateAll(flows, {
    zcf,
    contractState,
    localTransfer: zoeTools.localTransfer,
  });

  const publicFacet = zone.exo(
    'Send PF',
    M.interface('Send PF', {
      makeSendInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeSendInvitation() {
        return zcf.makeInvitation(
          orchFns.sendIt,
          'send',
          undefined,
          M.splitRecord({ give: SingleAmountRecord }),
        );
      },
    },
  );

  return { publicFacet, creatorFacet };
};

export const start = withOrchestration(contract);
harden(start);
