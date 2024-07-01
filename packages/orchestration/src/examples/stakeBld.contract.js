/**
 * @file Stake BLD contract
 */
import { makeTracer } from '@agoric/internal';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { withdrawFromSeat } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareVowTools, heapVowE as E } from '@agoric/vow/vat.js';
import { deeplyFulfilled } from '@endo/marshal';
import { M } from '@endo/patterns';
import { prepareLocalOrchestrationAccountKit } from '../exos/local-orchestration-account.js';
import { makeChainHub } from '../exos/chain-hub.js';

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

  const makeLocalOrchestrationAccountKit = prepareLocalOrchestrationAccountKit(
    zone,
    makeRecorderKit,
    zcf,
    privateArgs.timerService,
    vowTools,
    makeChainHub(privateArgs.agoricNames),
  );

  // ----------------
  // All `prepare*` calls should go above this line.

  const BLD = zcf.getTerms().brands.In;
  const bldAmountShape = await E(BLD).getAmountShape();

  async function makeLocalAccountKit() {
    const account = await E(privateArgs.localchain).makeAccount();
    const address = await E(account).getAddress();
    // FIXME 'address' is implied by 'account'; use an async maker that get the value itself
    return makeLocalOrchestrationAccountKit({
      account,
      address: harden({
        address,
        addressEncoding: 'bech32',
        chainId: 'local',
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
            const { holder, invitationMakers } = await makeLocalAccountKit();
            const { In } = await deeplyFulfilled(
              withdrawFromSeat(zcf, seat, give),
            );
            await E(holder).deposit(In);
            seat.exit();
            return harden({
              publicSubscribers: holder.getPublicTopics(),
              invitationMakers,
              account: holder,
            });
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
          const { holder, invitationMakers } = await makeLocalAccountKit();
          return harden({
            publicSubscribers: holder.getPublicTopics(),
            invitationMakers,
            account: holder,
          });
        }, 'wantLocalChainAccount');
      },
    },
  );

  return { publicFacet };
};
