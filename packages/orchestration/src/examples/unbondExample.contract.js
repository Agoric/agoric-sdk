// @ts-check
import { Fail } from '@agoric/assert';
import { AmountMath, AmountShape } from '@agoric/ertp';
import { Far } from '@endo/far';
import { M } from '@endo/patterns';
import { makeOrchestrationFacade } from '../facade.js';

/**
 * @import {Orchestrator, ChainAccount, CosmosValidatorAddress} from '../types.js'
 * @import {TimerService} from '@agoric/time';
 * @import {ERef} from '@endo/far'
 * @import {OrchestrationService} from '../service.js';
 * @import {Zone} from '@agoric/zone';
 */

/**
 * @param {ZCF} zcf
 * @param {{
 * orchestrationService: ERef<OrchestrationService>;
 * storageNode: ERef<StorageNode>;
 * timerService: ERef<TimerService>;
 * zone: Zone;
 * }} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const { orchestrationService, storageNode, timerService, zone } = privateArgs;

  const { orchestrate } = makeOrchestrationFacade({
    zone,
    timerService,
    zcf,
    storageNode,
    orchestrationService,
  });

  /** @type {OfferHandler} */
  const unbondAndLiquidStake = orchestrate(
    'LSTTia',
    { zcf },
    // eslint-disable-next-line no-shadow -- this `zcf` is enclosed in a membrane
    async (/** @type {Orchestrator} */ orch, { zcf }, seat, _offerArgs) => {
      console.log('zcf within the membrane', zcf);
      const { give } = seat.getProposal();
      !AmountMath.isEmpty(give.USDC.value) || Fail`Must provide USDC.`;

      // We would actually alreaady have the account from the orchestrator
      // ??? could these be passed in? It would reduce the size of this handler,
      // keeping it focused on long-running operations.
      const celestia = await orch.getChain('celestia');
      const celestiaAccount = await celestia.createAccount();

      const delegations = await celestiaAccount.getDelegations();
      // wait for the undelegations to be complete (may take weeks)
      await celestiaAccount.undelegate(delegations);

      // ??? should this be synchronous? depends on how names are resolved.
      const stride = await orch.getChain('stride');
      const strideAccount = await stride.createAccount();

      // TODO the `TIA` string actually needs to be the Brand from AgoricNames
      const tiaAmt = await celestiaAccount.getBalance('TIA');
      await celestiaAccount.transfer(tiaAmt, strideAccount.getChainAddress());

      await strideAccount.liquidStake(tiaAmt);
    },
  );

  const makeUnbondAndLiquidStakeInvitation = () =>
    zcf.makeInvitation(
      unbondAndLiquidStake,
      'Unbond and liquid stake',
      undefined,
      harden({
        give: { USDC: AmountShape },
        want: {}, // XXX ChainAccount Ownable?
        exit: M.any(),
      }),
    );

  const publicFacet = Far('SwapAndStake Public Facet', {
    makeUnbondAndLiquidStakeInvitation,
  });

  return harden({ publicFacet });
};
