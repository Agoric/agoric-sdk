import { Far } from '@endo/far';
import { M } from '@endo/patterns';
import { provideOrchestration } from '../utils/start-helper.js';

/**
 * @import {Orchestrator, IcaAccount, CosmosValidatorAddress} from '../types.js'
 * @import {TimerService} from '@agoric/time';
 * @import {Baggage} from '@agoric/vat-data';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote} from '@agoric/internal';
 * @import {OrchestrationService} from '../service.js';
 */

/**
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {ZCF} ctx.zcf
 * @param {ZCFSeat} _seat
 * @param {undefined} _offerArgs
 */
const unbondAndLiquidStakeFn = async (orch, { zcf }, _seat, _offerArgs) => {
  console.log('zcf within the membrane', zcf);
  // We would actually alreaady have the account from the orchestrator
  // ??? could these be passed in? It would reduce the size of this handler,
  // keeping it focused on long-running operations.
  const omni = await orch.getChain('omniflixhub');
  const omniAccount = await omni.makeAccount();

  // TODO implement these
  // const delegations = await celestiaAccount.getDelegations();
  // // wait for the undelegations to be complete (may take weeks)
  // await celestiaAccount.undelegate(delegations);
  // ??? should this be synchronous? depends on how names are resolved.
  const stride = await orch.getChain('stride');
  const strideAccount = await stride.makeAccount();

  // TODO the `TIA` string actually needs to be the Brand from AgoricNames
  // const tiaAmt = await celestiaAccount.getBalance('TIA');
  // await celestiaAccount.transfer(tiaAmt, strideAccount.getAddress());
  // await strideAccount.liquidStake(tiaAmt);
  console.log(omniAccount, strideAccount);
};

/**
 * @param {ZCF} zcf
 * @param {{
 *   agoricNames: Remote<NameHub>;
 *   localchain: Remote<LocalChain>;
 *   orchestrationService: Remote<OrchestrationService>;
 *   storageNode: Remote<StorageNode>;
 *   marshaller: Marshaller;
 *   timerService: Remote<TimerService>;
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const {
    agoricNames,
    localchain,
    orchestrationService,
    storageNode,
    marshaller,
    timerService,
  } = privateArgs;

  const { orchestrate } = provideOrchestration(
    zcf,
    baggage,
    {
      agoricNames,
      localchain,
      orchestrationService,
      storageNode,
      timerService,
    },
    marshaller,
  );

  /** @type {OfferHandler} */
  const unbondAndLiquidStake = orchestrate(
    'LSTTia',
    { zcf },
    unbondAndLiquidStakeFn,
  );

  const makeUnbondAndLiquidStakeInvitation = () =>
    zcf.makeInvitation(
      unbondAndLiquidStake,
      'Unbond and liquid stake',
      undefined,
      harden({
        // Nothing to give; the funds come from undelegating
        give: {},
        want: {}, // XXX ChainAccount Ownable?
        exit: M.any(),
      }),
    );

  const publicFacet = Far('SwapAndStake Public Facet', {
    makeUnbondAndLiquidStakeInvitation,
  });

  return harden({ publicFacet });
};
