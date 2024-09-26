import { StorageNodeShape } from '@agoric/internal';
import { TimerServiceShape } from '@agoric/time';
import { M } from '@endo/patterns';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './swap.flows.js';

/**
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {Remote} from '@agoric/internal';
 * @import {CosmosInterchainService} from '../exos/exo-interfaces.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationTools} from '../utils/start-helper.js';
 */

/** @type {ContractMeta<typeof start>} */
export const meta = {
  privateArgsShape: {
    agoricNames: M.remotable('agoricNames'),
    localchain: M.remotable('localchain'),
    orchestrationService: M.or(M.remotable('orchestration'), null),
    storageNode: StorageNodeShape,
    marshaller: M.remotable('marshaller'),
    timerService: M.or(TimerServiceShape, null),
  },
  upgradability: 'canUpgrade',
};
harden(meta);

// XXX copied from inter-protocol
// TODO move to new `@agoric/contracts` package when we have it
/**
 * @param {Brand} brand must be a 'nat' brand, not checked
 * @param {NatValue} [min]
 */
export const makeNatAmountShape = (brand, min) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });
harden(makeNatAmountShape);

/**
 * Orchestration contract to be wrapped by withOrchestration for Zoe
 *
 * @param {ZCF} zcf
 * @param {{
 *   agoricNames: Remote<NameHub>;
 *   localchain: Remote<LocalChain>;
 *   orchestrationService: Remote<CosmosInterchainService>;
 *   storageNode: Remote<StorageNode>;
 *   timerService: Remote<TimerService>;
 *   marshaller: Marshaller;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (
  zcf,
  privateArgs,
  zone,
  { orchestrateAll, zoeTools },
) => {
  const { brands } = zcf.getTerms();

  const { stakeAndSwap } = orchestrateAll(flows, {
    localTransfer: zoeTools.localTransfer,
  });

  const publicFacet = zone.exo('publicFacet', undefined, {
    makeSwapAndStakeInvitation() {
      return zcf.makeInvitation(
        stakeAndSwap,
        'Swap for TIA and stake',
        undefined,
        harden({
          give: { Stable: makeNatAmountShape(brands.Stable, 1n) },
          want: {}, // XXX ChainAccount Ownable?
          exit: M.any(),
        }),
      );
    },
  });

  return harden({ publicFacet });
};

export const start = withOrchestration(contract);
harden(start);
