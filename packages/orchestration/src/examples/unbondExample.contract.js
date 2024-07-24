import { M } from '@endo/patterns';
import { makeStateRecord } from '@agoric/async-flow';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './unbondExample.flows.js';

/**
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote} from '@agoric/internal';
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosInterchainService} from '../exos/cosmos-interchain-service.js';
 * @import {OrchestrationTools} from '../utils/start-helper.js';
 */

/**
 * Example: unbond, liquid-stake
 *
 * @param {ZCF} zcf
 * @param {{
 *   agoricNames: Remote<NameHub>;
 *   localchain: Remote<LocalChain>;
 *   orchestrationService: Remote<CosmosInterchainService>;
 *   storageNode: Remote<StorageNode>;
 *   marshaller: Marshaller;
 *   timerService: Remote<TimerService>;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (zcf, privateArgs, zone, { orchestrate }) => {
  const contractState = makeStateRecord(
    /** @type {{ account: OrchestrationAccount<any> | undefined }} */ {
      account: undefined,
    },
  );
  const unbondAndLiquidStake = orchestrate(
    'LSTTia',
    { zcf, contractState },
    flows.unbondAndLiquidStake,
  );

  const proposalShape = harden({
    // Nothing to give; the funds come from undelegating
    give: {},
    want: {}, // XXX ChainAccount Ownable?
    exit: M.any(),
  });

  const publicFacet = zone.exo('publicFacet', undefined, {
    makeUnbondAndLiquidStakeInvitation() {
      return zcf.makeInvitation(
        unbondAndLiquidStake,
        'Unbond and liquid stake',
        undefined,
        proposalShape,
      );
    },
  });

  return harden({ publicFacet });
};

export const start = withOrchestration(contract);
