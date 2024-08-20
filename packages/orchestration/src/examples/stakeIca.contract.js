/** @file Example contract that uses orchestration */

import { makeTracer, StorageNodeShape } from '@agoric/internal';
import { TimerServiceShape } from '@agoric/time';
import { heapVowE as E, prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import {
  prepareRecorderKitMakers,
  provideAll,
} from '@agoric/zoe/src/contractSupport';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { M } from '@endo/patterns';
import { prepareCosmosOrchestrationAccount } from '../exos/cosmos-orchestration-account.js';
import { makeChainHub } from '../exos/chain-hub.js';

const trace = makeTracer('StakeIca');
/**
 * @import {Baggage} from '@agoric/vat-data';
 * @import {Remote} from '@agoric/internal';
 * @import {IBCConnectionID, NameHub} from '@agoric/vats';
 * @import {TimerService} from '@agoric/time';
 * @import {ResolvedContinuingOfferResult} from '../utils/zoe-tools.js';
 * @import {ICQConnection, CosmosInterchainService, ChainHub} from '../types.js';
 */

/** @type {ContractMeta<typeof start>} */
export const meta = harden({
  customTermsShape: {
    chainId: M.string(),
    hostConnectionId: M.string(),
    controllerConnectionId: M.string(),
    bondDenom: M.string(),
    icqEnabled: M.boolean(),
  },
  privateArgsShape: {
    agoricNames: M.remotable('agoricNames NameHub'),
    cosmosInterchainService: M.remotable('cosmosInterchainService'),
    storageNode: StorageNodeShape,
    marshaller: M.remotable('marshaller'),
    timer: TimerServiceShape,
  },
});
harden(meta);
export const privateArgsShape = meta.privateArgsShape;
harden(privateArgsShape);

/**
 * @typedef {{
 *   chainId: string;
 *   hostConnectionId: IBCConnectionID;
 *   controllerConnectionId: IBCConnectionID;
 *   bondDenom: string;
 *   icqEnabled: boolean;
 * }} StakeIcaTerms
 */

/**
 * @param {ZCF<StakeIcaTerms>} zcf
 * @param {{
 *   agoricNames: Remote<NameHub>;
 *   cosmosInterchainService: CosmosInterchainService;
 *   storageNode: StorageNode;
 *   marshaller: Marshaller;
 *   timer: TimerService;
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const {
    chainId,
    hostConnectionId,
    controllerConnectionId,
    bondDenom,
    icqEnabled,
  } = zcf.getTerms();
  const {
    agoricNames,
    cosmosInterchainService: orchestration,
    marshaller,
    storageNode,
    timer,
  } = privateArgs;

  const zone = makeDurableZone(baggage);

  const { accountsStorageNode } = await provideAll(baggage, {
    accountsStorageNode: () => E(storageNode).makeChildNode('accounts'),
  });

  const { makeRecorderKit } = prepareRecorderKitMakers(baggage, marshaller);

  const vowTools = prepareSwingsetVowTools(zone.subZone('vows'));

  const chainHub = makeChainHub(agoricNames, vowTools);

  const makeCosmosOrchestrationAccount = prepareCosmosOrchestrationAccount(
    zone,
    {
      chainHub,
      makeRecorderKit,
      timerService: timer,
      vowTools,
      zcf,
    },
  );

  async function makeAccountKit() {
    const account = await E(orchestration).makeAccount(
      chainId,
      hostConnectionId,
      controllerConnectionId,
    );
    // TODO permissionless queries https://github.com/Agoric/agoric-sdk/issues/9326
    const icqConnection = icqEnabled
      ? await E(orchestration).provideICQConnection(controllerConnectionId)
      : undefined;

    const accountAddress = await E(account).getAddress();
    trace('account address', accountAddress);
    const accountNode = await E(accountsStorageNode).makeChildNode(
      accountAddress.value,
    );
    const holder = makeCosmosOrchestrationAccount(accountAddress, bondDenom, {
      account,
      storageNode: accountNode,
      icqConnection,
      timer,
    });
    return holder;
  }

  const publicFacet = zone.exo(
    'StakeAtom',
    M.interface('StakeAtomI', {
      makeAccount: M.callWhen().returns(M.remotable('OrchestrationAccountKit')),
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
          // XXX use `orchestrate` membrane for vow?
          /**
           * @param {ZCFSeat} seat
           * @returns {Promise<ResolvedContinuingOfferResult>}
           */
          async seat => {
            seat.exit();
            const holder = await makeAccountKit();
            return vowTools.when(holder.asContinuingOffer());
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
harden(start);

/** @typedef {typeof start} StakeIcaSF */
