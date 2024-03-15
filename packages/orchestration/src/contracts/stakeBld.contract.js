// @ts-check
/**
 * @file Stake BLD contract
 *
 */

import { makeTracer } from '@agoric/internal';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { M } from '@endo/patterns';
import { E } from '@endo/far';
import { atomicTransfer } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import { prepareOwnableAccountKit } from '../ownableAccount.js';

const trace = makeTracer('StakeBld');

/**
 *
 * @param {ZCF} zcf
 * @param {{
 *   localchain: import('@agoric/vats/src/localchain.js').LocalChain;
 *   marshaller: Marshaller;
 *   storageNode: StorageNode;
 * }} privateArgs
 * @param {import("@agoric/vat-data").Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { BLD } = zcf.getTerms().brands;

  const bldAmountShape = await E(BLD).getAmountShape();

  const zone = makeDurableZone(baggage);

  const makeOwnableAccountKit = prepareOwnableAccountKit(zone, zcf);

  const publicFacet = zone.exo('StakeBld', undefined, {
    makeStakeBldInvitation() {
      return zcf.makeInvitation(
        async seat => {
          const { give } = seat.getProposal();
          trace('makeStakeBldInvitation', give);
          // XXX type appears local but it's remote
          const account = await E(privateArgs.localchain).createAccount();
          const lcaSeatKit = zcf.makeEmptySeatKit();
          atomicTransfer(zcf, seat, lcaSeatKit.zcfSeat, give);
          seat.exit();
          trace('makeStakeBldInvitation tryExit lca userSeat');
          await E(lcaSeatKit.userSeat).tryExit();
          trace('awaiting payouts');
          const payouts = await E(lcaSeatKit.userSeat).getPayouts();
          const { invitationMakers } = makeOwnableAccountKit(account);
          trace('awaiting deposit');
          await E(account).deposit(await payouts.In);

          return {
            invitationMakers,
          };
        },
        'wantStake',
        undefined,
        M.splitRecord({
          give: { In: bldAmountShape },
        }),
      );
    },
  });

  return { publicFacet };
};
