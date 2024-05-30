/**
 * @file Stake BLD contract
 */
import { makeTracer } from '@agoric/internal';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { withdrawFromSeat } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { E } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';
import { M } from '@endo/patterns';
import { prepareLocalChainAccountKit } from '../exos/local-chain-account-kit.js';
import { prepareMockChainInfo } from '../utils/mockChainInfo.js';

/**
 * @import {TimerBrand, TimerService} from '@agoric/time';
 */

const trace = makeTracer('StakeBld');

/**
 *
 * @param {ZCF} zcf
 * @param {{
 *   localchain: import('@agoric/vats/src/localchain.js').LocalChain;
 *   marshaller: Marshaller;
 *   storageNode: StorageNode;
 *   timerService: TimerService;
 *   timerBrand: TimerBrand;
 * }} privateArgs
 * @param {import("@agoric/vat-data").Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const BLD = zcf.getTerms().brands.In;

  // XXX is this safe to call before prepare statements are completed?
  const bldAmountShape = await E(BLD).getAmountShape();

  const zone = makeDurableZone(baggage);

  const { makeRecorderKit } = prepareRecorderKitMakers(
    baggage,
    privateArgs.marshaller,
  );

  // Mocked until #8879
  // Would expect this to be instantiated elsewhere, and passed in as a reference
  const agoricChainInfo = prepareMockChainInfo(zone);

  const makeLocalChainAccountKit = prepareLocalChainAccountKit(
    zone,
    makeRecorderKit,
    zcf,
    privateArgs.timerService,
    privateArgs.timerBrand,
    agoricChainInfo,
  );

  async function makeLocalAccountKit() {
    const account = await E(privateArgs.localchain).makeAccount();
    const address = await E(account).getAddress();
    // XXX 'address' is implied by 'account'; use an async maker that get the value itself
    return makeLocalChainAccountKit({
      account,
      address,
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
