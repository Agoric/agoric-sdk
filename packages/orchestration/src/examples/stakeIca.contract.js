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
import { makeChainHub } from '../exos/chain-hub.js';
import { prepareCosmosOrchestrationAccount } from '../exos/cosmos-orchestration-account.js';

const trace = makeTracer('StakeIca');
/**
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote} from '@agoric/vow';
 * @import {Baggage} from '@agoric/vat-data';
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {TimerService} from '@agoric/time';
 * @import {ICQConnection, CosmosInterchainService} from '../types.js';
 */

/** @type {ContractMeta<typeof start>} */
export const meta = harden({
  customTermsShape: {
    remoteChainName: M.string(),
  },
  privateArgsShape: {
    agoricNames: M.remotable('agoricNames'),
    cosmosInterchainService: M.remotable('cosmosInterchainService'),
    storageNode: StorageNodeShape,
    marshaller: M.remotable('marshaller'),
    timer: TimerServiceShape,
  },
});
export const privateArgsShape = meta.privateArgsShape;

/**
 * @typedef {{
 *   remoteChainName: string;
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
  const { remoteChainName } = zcf.getTerms();
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

  const makeCosmosOrchestrationAccount = prepareCosmosOrchestrationAccount(
    zone,
    makeRecorderKit,
    vowTools,
    zcf,
  );

  const chainHub = makeChainHub(agoricNames, vowTools);
  const [_, remote, connection] = await vowTools.when(
    chainHub.getChainsAndConnection('agoric', remoteChainName),
  );

  const chainId = remote.chainId;
  const hostConnectionId = connection.id;
  const controllerConnectionId = connection.counterparty.connection_id;
  // @ts-expect-error XXX ChainHub literal
  const bondDenom = remote.stakingTokens[0].denom;
  // @ts-expect-error XXX ChainHub literal
  const icqEnabled = remote.icqEnabled;

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

/** @typedef {typeof start} StakeIcaSF */
