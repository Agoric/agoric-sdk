/**
 * @file Stake BLD contract
 */
import { makeTracer } from '@agoric/internal';
import { heapVowE as E, prepareVowTools } from '@agoric/vow/vat.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { withdrawFromSeat } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { deeplyFulfilled } from '@endo/marshal';
import { M } from '@endo/patterns';
import { makeChainHub } from '../exos/chain-hub.js';
import { prepareLocalOrchestrationAccountKit } from '../exos/local-orchestration-account.js';
import fetchedChainInfo from '../fetched-chain-info.js';
import { makeZoeTools } from '../utils/zoe-tools.js';

/**
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote} from '@agoric/internal';
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 */

const trace = makeTracer('StakeBld');

/**
 * @param {ZCF} zcf
 * @param {{
 *   agoricNames: Remote<NameHub>;
 *   localchain: Remote<LocalChain>;
 *   marshaller: Marshaller;
 *   storageNode: StorageNode;
 *   timerService: TimerService;
 * }} privateArgs
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const zone = makeDurableZone(baggage);

  const { makeRecorderKit } = prepareRecorderKitMakers(
    baggage,
    privateArgs.marshaller,
  );
  const vowTools = prepareVowTools(zone.subZone('vows'));

  const chainHub = makeChainHub(
    zone.subZone('chainHub'),
    privateArgs.agoricNames,
    vowTools,
  );
  const zoeTools = makeZoeTools(zcf, vowTools);

  const { localchain, timerService } = privateArgs;
  const makeLocalOrchestrationAccountKit = prepareLocalOrchestrationAccountKit(
    zone,
    {
      makeRecorderKit,
      zcf,
      timerService,
      vowTools,
      chainHub,
      localchain,
      zoeTools,
    },
  );

  // ----------------
  // All `prepare*` calls should go above this line.

  const BLD = zcf.getTerms().brands.In;
  const bldAmountShape = await E(BLD).getAmountShape();

  // XXX big dependency (59KB) but in production will probably already be registered in agoricNames
  chainHub.registerChain('agoric', fetchedChainInfo.agoric);
  chainHub.registerAsset('ubld', {
    baseName: 'agoric',
    baseDenom: 'ubld',
    brand: BLD,
    chainName: 'agoric',
  });

  async function makeLocalAccountKit() {
    const account = await E(privateArgs.localchain).makeAccount();
    const address = await E(account).getAddress();
    // FIXME 'address' is implied by 'account'; use an async maker that get the value itself
    return makeLocalOrchestrationAccountKit({
      account,
      address: harden({
        value: address,
        encoding: 'bech32',
        chainId: 'agoriclocal',
      }),
      storageNode: privateArgs.storageNode,
    });
  }

  const publicFacet = zone.exo(
    'StakeBld',
    M.interface('StakeBldI', {
      makeAccount: M.callWhen().returns(M.remotable('LocalChainAccountHolder')),
      makeAccountInvitationMaker: M.callWhen().returns(InvitationShape),
      makeStakeBldInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      /**
       * Invitation to make an account, initialized with the give's BLD
       */
      makeStakeBldInvitation() {
        return zcf.makeInvitation(
          async seat => {
            const { give } = seat.getProposal();
            trace('makeStakeBldInvitation', give);
            const { holder } = await makeLocalAccountKit();
            /** @type {Record<string, Payment<'nat'>>} */
            // @ts-expect-error XXX PaymentPKeywordRecord throught deeplyFulfilled will be a PaymnentKeywordRecord
            const { In } = await deeplyFulfilled(
              withdrawFromSeat(zcf, seat, give),
            );
            await E(holder).deposit(In);
            seat.exit();
            return holder.asContinuingOffer();
          },
          'wantStake',
          undefined,
          M.splitRecord({
            give: { In: bldAmountShape },
          }),
        );
      },
      async makeAccount() {
        trace('makeAccount');
        const { holder } = await makeLocalAccountKit();
        return holder;
      },
      /**
       * Invitation to make an account, without any funds
       */
      makeAccountInvitationMaker() {
        trace('makeCreateAccountInvitation');
        return zcf.makeInvitation(async seat => {
          seat.exit();
          const { holder } = await makeLocalAccountKit();
          return holder.asContinuingOffer();
        }, 'wantLocalChainAccount');
      },
    },
  );

  return { publicFacet };
};
harden(start);
