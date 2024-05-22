import { StorageNodeShape } from '@agoric/internal';
import { withdrawFromSeat } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { Far } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';
import { M, objectMap } from '@endo/patterns';
import { makeOrchestrationFacade } from '../facade.js';
import { orcUtils } from '../utils/orc.js';

/**
 * @import {Orchestrator, IcaAccount, CosmosValidatorAddress} from '../types.js'
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {ERef} from '@endo/far'
 * @import {OrchestrationService} from '../service.js';
 * @import {Zone} from '@agoric/zone';
 */

/** @type {ContractMeta} */
export const meta = {
  privateArgsShape: {
    localchain: M.any(),
    orchestrationService: M.any(),
    storageNode: StorageNodeShape,
    timerService: M.any(),
    zone: M.any(),
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
 * @param {ZCF} zcf
 * @param {{
 * localchain: ERef<LocalChain>;
 * orchestrationService: ERef<OrchestrationService>;
 * storageNode: ERef<StorageNode>;
 * timerService: ERef<TimerService>;
 * zone: Zone;
 * }} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const { brands } = zcf.getTerms();

  const { localchain, orchestrationService, storageNode, timerService, zone } =
    privateArgs;

  const { orchestrate } = makeOrchestrationFacade({
    zone,
    timerService,
    zcf,
    localchain,
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
      const payments = await withdrawFromSeat(zcf, seat, give);
      await deeplyFulfilled(objectMap(payments, localAccount.deposit));
      seat.exit();

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
