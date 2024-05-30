/**
 * @file Example contract that uses orchestration
 */

import { makeTracer, StorageNodeShape } from '@agoric/internal';
import { TimerServiceShape } from '@agoric/time';
import { V as E } from '@agoric/vow/vat.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { M } from '@endo/patterns';
import { prepareStakingAccountKit } from '../exos/stakingAccountKit.js';

const trace = makeTracer('StakeAtom');
/**
 * @import { Baggage } from '@agoric/vat-data';
 * @import { IBCConnectionID } from '@agoric/vats';
 * @import { TimerService } from '@agoric/time';
 * @import { ICQConnection, OrchestrationService } from '../types.js';
 */

export const meta = harden({
  privateArgsShape: {
    orchestration: M.remotable('orchestration'),
    storageNode: StorageNodeShape,
    marshaller: M.remotable('marshaller'),
    timer: TimerServiceShape,
  },
});
export const privateArgsShape = meta.privateArgsShape;

/**
 * @typedef {{
 *  hostConnectionId: IBCConnectionID;
 *  controllerConnectionId: IBCConnectionID;
 *  bondDenom: string;
 * }} StakeAtomTerms
 */

/**
 *
 * @param {ZCF<StakeAtomTerms>} zcf
 * @param {{
 *  orchestration: OrchestrationService;
 *  storageNode: StorageNode;
 *  marshaller: Marshaller;
 *  timer: TimerService;
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  // TODO #9063 this roughly matches what we'll get from Chain<C>.getChainInfo()
  const { hostConnectionId, controllerConnectionId, bondDenom } =
    zcf.getTerms();
  const { orchestration, marshaller, storageNode, timer } = privateArgs;

  const zone = makeDurableZone(baggage);

  const { makeRecorderKit } = prepareRecorderKitMakers(baggage, marshaller);

  const makeStakingAccountKit = prepareStakingAccountKit(
    zone,
    makeRecorderKit,
    zcf,
  );

  async function makeAccountKit() {
    const account = await E(orchestration).makeAccount(
      hostConnectionId,
      controllerConnectionId,
    );
    // #9212 TODO do not fail if host does not have `async-icq` module;
    // communicate to OrchestrationAccount that it can't send queries
    const icqConnection = await E(orchestration).provideICQConnection(
      controllerConnectionId,
    );
    const accountAddress = await E(account).getAddress();
    trace('account address', accountAddress);
    const { holder, invitationMakers } = makeStakingAccountKit(
      accountAddress,
      bondDenom,
      {
        account,
        storageNode,
        icqConnection,
        timer,
      },
    );
    return {
      publicSubscribers: holder.getPublicTopics(),
      invitationMakers,
      account: holder,
    };
  }

  const publicFacet = zone.exo(
    'StakeAtom',
    M.interface('StakeAtomI', {
      makeAccount: M.callWhen().returns(M.remotable('ChainAccount')),
      makeAccountInvitationMaker: M.callWhen().returns(InvitationShape),
    }),
    {
      async makeAccount() {
        trace('makeAccount');
        const { account } = await makeAccountKit();
        return account;
      },
      makeAccountInvitationMaker() {
        trace('makeCreateAccountInvitation');
        return zcf.makeInvitation(
          async seat => {
            seat.exit();
            return makeAccountKit();
          },
          'wantStakingAccount',
          undefined,
          undefined,
        );
      },
    },
  );

  return { publicFacet };
};

/** @typedef {typeof start} StakeAtomSF */
