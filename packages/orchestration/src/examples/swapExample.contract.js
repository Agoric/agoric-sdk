import { StorageNodeShape } from '@agoric/internal';
import { TimerServiceShape } from '@agoric/time';
import { M } from '@endo/patterns';
import { orcUtils } from '../utils/orc.js';
import { withOrchestration } from '../utils/start-helper.js';

/**
 * @import {LocalTransfer} from '../utils/zoe-tools.js';
 * @import {Orchestrator, CosmosValidatorAddress, OrchestrationFlow} from '../types.js'
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {Remote} from '@agoric/internal';
 * @import {CosmosInterchainService} from '../exos/cosmos-interchain-service.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationTools} from '../utils/start-helper.js';
 */

/**
 * @satisfies {OrchestrationFlow}
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {LocalTransfer} ctx.localTransfer
 * @param {ZCFSeat} seat
 * @param {object} offerArgs
 * @param {Amount<'nat'>} offerArgs.staked
 * @param {CosmosValidatorAddress} offerArgs.validator
 */
const stakeAndSwapFn = async (orch, { localTransfer }, seat, offerArgs) => {
  const { give } = seat.getProposal();

  const omni = await orch.getChain('omniflixhub');
  const agoric = await orch.getChain('agoric');

  const [omniAccount, localAccount] = await Promise.all([
    omni.makeAccount(),
    agoric.makeAccount(),
  ]);

  const omniAddress = omniAccount.getAddress();

  // deposit funds from user seat to LocalChainAccount
  await localTransfer(seat, localAccount, give);
  seat.exit();

  // build swap instructions with orcUtils library
  const transferMsg = orcUtils.makeOsmosisSwap({
    destChain: 'omniflixhub',
    destAddress: omniAddress,
    amountIn: give.Stable,
    brandOut: /** @type {any} */ ('FIXME'),
    slippage: 0.03,
  });

  try {
    await localAccount.transferSteps(give.Stable, transferMsg);
    await omniAccount.delegate(offerArgs.validator, offerArgs.staked);
  } catch (e) {
    console.error(e);
  }
};

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
const contract = async (zcf, privateArgs, zone, { orchestrate, zoeTools }) => {
  const { brands } = zcf.getTerms();

  /** deprecated historical example */
  const swapAndStakeHandler = orchestrate(
    'LSTTia',
    { zcf, localTransfer: zoeTools.localTransfer },
    stakeAndSwapFn,
  );

  const publicFacet = zone.exo('publicFacet', undefined, {
    makeSwapAndStakeInvitation() {
      return zcf.makeInvitation(
        swapAndStakeHandler,
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
