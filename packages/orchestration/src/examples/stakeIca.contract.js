/** @file Example contract that uses orchestration */

import { makeTracer, StorageNodeShape } from '@agoric/internal';
import { TimerServiceShape } from '@agoric/time';
import { V as E } from '@agoric/vow/vat.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { M } from '@endo/patterns';
import { prepareCosmosOrchestrationAccount } from '../exos/cosmosOrchestrationAccount.js';

const trace = makeTracer('StakeAtom');
/**
 * @import {Baggage} from '@agoric/vat-data';
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {TimerService} from '@agoric/time';
 * @import {ICQConnection, OrchestrationService} from '../types.js';
 */

/** @type {ContractMeta<typeof start>} */
export const meta = harden({
  customTermsShape: {
    chainId: M.string(),
    hostConnectionId: M.string(),
    controllerConnectionId: M.string(),
    bondDenom: M.string(),
  },
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
 *   chainId: string;
 *   hostConnectionId: IBCConnectionID;
 *   controllerConnectionId: IBCConnectionID;
 *   bondDenom: string;
 * }} StakeIcaTerms
 */

/**
 * @param {ZCF<StakeIcaTerms>} zcf
 * @param {{
 *   orchestration: OrchestrationService;
 *   storageNode: StorageNode;
 *   marshaller: Marshaller;
 *   timer: TimerService;
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { chainId, hostConnectionId, controllerConnectionId, bondDenom } =
    zcf.getTerms();
  const { orchestration, marshaller, storageNode, timer } = privateArgs;

  const zone = makeDurableZone(baggage);

  const { makeRecorderKit } = prepareRecorderKitMakers(baggage, marshaller);

  const makeCosmosOrchestrationAccount = prepareCosmosOrchestrationAccount(
    zone,
    makeRecorderKit,
    zcf,
  );

  async function makeAccountKit() {
    const account = await E(orchestration).makeAccount(
      chainId,
      hostConnectionId,
      controllerConnectionId,
    );
    // TODO https://github.com/Agoric/agoric-sdk/issues/9326
    // Should not fail if host does not have `async-icq` module;
    // communicate to OrchestrationAccount that it can't send queries
    const icqConnection = await E(orchestration).provideICQConnection(
      controllerConnectionId,
    );
    const accountAddress = await E(account).getAddress();
    trace('account address', accountAddress);
    const holder = makeCosmosOrchestrationAccount(accountAddress, bondDenom, {
      account,
      storageNode,
      icqConnection,
      timer,
    });
    return holder;
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
        return makeAccountKit();
      },
      makeAccountInvitationMaker() {
        trace('makeCreateAccountInvitation');
        return zcf.makeInvitation(
          async seat => {
            seat.exit();
            const holder = await makeAccountKit();
            return holder.asContinuingOffer();
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
