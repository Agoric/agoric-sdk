import { E, Far } from '@endo/far';
import { M } from '@endo/patterns';
import { makeOrchestrationFacade } from '../facade.js';
import { orcUtils } from '../utils/orc.js';

/**
 * @import {Orchestrator, IcaAccount, CosmosValidatorAddress} from '../types.js'
 * @import {TimerService} from '@agoric/time';
 * @import {ERef} from '@endo/far'
 * @import {OrchestrationService} from '../service.js';
 * @import {Zone} from '@agoric/zone';
 */

// XXX copied from inter-protocol
// TODO move to new `@agoric/contracts` package when we have it
/**
 * @param {Brand} brand must be a 'nat' brand, not checked
 * @param {NatValue} [min]
 */
export const makeNatAmountShape = (brand, min) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });

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
  const { brands } = zcf.getTerms();

  const { orchestrationService, storageNode, timerService, zone } = privateArgs;

  const { orchestrate } = makeOrchestrationFacade({
    zone,
    timerService,
    zcf,
    storageNode,
    orchestrationService,
  });

  /** deprecated historical example */
  /** @type {OfferHandler<unknown, {staked: Amount<'nat'>, validator: CosmosValidatorAddress}>} */
  const swapAndStakeHandler = orchestrate(
    'LSTTia',
    { zcf },
    // eslint-disable-next-line no-shadow -- this `zcf` is enclosed in a membrane
    async (/** @type {Orchestrator} */ orch, { zcf }, seat, offerArgs) => {
      const { give } = seat.getProposal();

      const celestia = await orch.getChain('celestia');
      const agoric = await orch.getChain('agoric');

      const [celestiaAccount, localAccount] = await Promise.all([
        celestia.makeAccount(),
        agoric.makeAccount(),
      ]);

      const tiaAddress = celestiaAccount.getAddress();

      // deposit funds from user seat to LocalChainAccount
      const seatKit = zcf.makeEmptySeatKit();
      zcf.atomicRearrange(harden([[seat, seatKit.zcfSeat, give]]));
      seat.exit();
      await E(seatKit.userSeat).tryExit();
      const payment = await E(seatKit.userSeat).getPayout('Stable');
      await localAccount.deposit(payment);

      // build swap instructions with orcUtils library
      const transferMsg = orcUtils.makeOsmosisSwap({
        destChain: 'celestia',
        destAddress: tiaAddress,
        amountIn: give.Stable,
        brandOut: /** @type {any} */ ('FIXME'),
        slippage: 0.03,
      });

      await localAccount
        .transferSteps(give.Stable, transferMsg)
        .then(_txResult =>
          celestiaAccount.delegate(offerArgs.validator, offerArgs.staked),
        )
        .catch(e => console.error(e));

      // XXX close localAccount?
      // return continuing inv since this is an offer?
    },
  );

  const makeSwapAndStakeInvitation = () =>
    zcf.makeInvitation(
      swapAndStakeHandler,
      'Swap for TIA and stake',
      undefined,
      harden({
        give: { Stable: makeNatAmountShape(brands.Stable, 1n) },
        want: {}, // XXX ChainAccount Ownable?
        exit: M.any(),
      }),
    );

  const publicFacet = Far('SwapAndStake Public Facet', {
    makeSwapAndStakeInvitation,
  });

  return harden({ publicFacet });
};
