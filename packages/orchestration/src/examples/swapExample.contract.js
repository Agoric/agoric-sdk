// @ts-check
import { Fail } from '@agoric/assert';
import { AmountMath, AmountShape } from '@agoric/ertp';
import { E, Far } from '@endo/far';
import { M } from '@endo/patterns';
import { makeOrchestrationFacade } from '../facade.js';
import { orcUtils } from '../utils/orc.js';

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

  /** deprecated historical example */
  /** @type {OfferHandler} */
  const swapAndStakeHandler = orchestrate(
    'LSTTia',
    { zcf },
    // eslint-disable-next-line no-shadow -- this `zcf` is enclosed in a membrane
    async (/** @type {Orchestrator} */ orch, { zcf }, seat, offerArgs) => {
      const { give } = seat.getProposal();
      !AmountMath.isEmpty(give.USDC.value) || Fail`Must provide USDC.`;

      const celestia = await orch.getChain('celestia');
      const agoric = await orch.getChain('agoric');

      const [celestiaAccount, localAccount] = await Promise.all([
        celestia.makeAccount(),
        agoric.makeAccount(),
      ]);

      const tiaAddress = await celestiaAccount.getChainAddress();

      // deposit funds from user seat to LocalChainAccount
      const seatKit = zcf.makeEmptySeatKit();
      zcf.atomicRearrange(harden([[seat, seatKit.zcfSeat, give]]));
      // seat.exit() // exit user seat now, or later?
      const payment = await E(seatKit.userSeat).getPayout('USDC');
      await localAccount.deposit(payment);

      // build swap instructions with orcUtils library
      const transferMsg = orcUtils.makeOsmosisSwap({
        destChain: 'celestia',
        destAddress: tiaAddress,
        amountIn: give.USDC,
        brandOut: offerArgs.staked.brand,
        slippage: 0.03,
      });

      await localAccount
        .transferSteps(give.USDC, transferMsg)
        .then(_txResult =>
          celestiaAccount.delegate(offerArgs.validator, offerArgs.staked),
        )
        .catch(e => console.error(e));

      // XXX close localAccount?
      return celestiaAccount; // should be continuing inv since this is an offer?
    },
  );

  const makeSwapAndStakeInvitation = () =>
    zcf.makeInvitation(
      swapAndStakeHandler,
      'Swap for TIA and stake',
      undefined,
      harden({
        give: { USDC: AmountShape },
        want: {}, // XXX ChainAccount Ownable?
        exit: M.any(),
      }),
    );

  const publicFacet = Far('SwapAndStake Public Facet', {
    makeSwapAndStakeInvitation,
  });

  return harden({ publicFacet });
};
