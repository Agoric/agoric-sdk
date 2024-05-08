// @ts-check
/**
 * @file Example contract that uses orchestration
 */
import { makeTracer } from '@agoric/internal';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { V as E } from '@agoric/vow/vat.js';
import { M } from '@endo/patterns';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport';
import { prepareStakingAccountKit } from '../exos/stakingAccountKit.js';

const trace = makeTracer('StakeAtom');
/**
 * @import {Baggage} from '@agoric/vat-data';
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {IBCChannelInfo, OrchestrationService, BrandToIssuer} from '@agoric/orchestration';
 * @import {TimerBrand, TimerService} from '@agoric/time'
 */

/**
 * @typedef {{
 *  hostConnectionId: IBCConnectionID;
 *  controllerConnectionId: IBCConnectionID;
 *  bondDenom: string;
 *  bondDenomLocal: string;
 *  transferChannel: IBCChannelInfo;
 *  icqEnabled: boolean;
 *  chainTimerBrand: TimerBrand;
 * }} StakeAtomTerms
 */

/**
 *
 * @param {ZCF<StakeAtomTerms>} zcf
 * @param {{
 *  localchain: LocalChain;
 *  orchestration: OrchestrationService;
 *  storageNode: StorageNode;
 *  marshaller: Marshaller;
 *  chainTimerService: TimerService;
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  // TODO #9063 this roughly matches what we'll get from Chain<C>.getChainInfo()
  const {
    hostConnectionId,
    controllerConnectionId,
    bondDenom,
    bondDenomLocal,
    transferChannel,
    issuers,
    brands,
    icqEnabled,
    chainTimerBrand,
  } = zcf.getTerms();
  const {
    localchain,
    orchestration,
    marshaller,
    storageNode,
    chainTimerService,
  } = privateArgs;

  const zone = makeDurableZone(baggage);

  const { makeRecorderKit } = prepareRecorderKitMakers(baggage, marshaller);

  const makeStakingAccountKit = prepareStakingAccountKit(
    baggage,
    makeRecorderKit,
    zcf,
  );

  /** @type {BrandToIssuer} */
  const brandToIssuer = zone.mapStore('brandToIssuer');
  for (const [keyword, brand] of Object.entries(brands)) {
    brandToIssuer.init(brand, issuers[keyword]);
  }

  async function makeAccount() {
    const account = await E(orchestration).makeAccount(
      hostConnectionId,
      controllerConnectionId,
    );

    // TODO #9063, #9212 this should come from Chain object
    const icqConnection = icqEnabled
      ? await E(orchestration).provideICQConnection(controllerConnectionId)
      : undefined;

    const localAccount = await E(localchain).makeAccount();
    const localAccountAddress = await E(localAccount).getAddress();
    const chainAddress = await E(account).getAddress();
    const { holder, invitationMakers } = makeStakingAccountKit({
      account,
      localAccount,
      storageNode,
      chainAddress,
      localAccountAddress,
      icqConnection,
      bondDenom,
      bondDenomLocal,
      transferChannel,
      brandToIssuer,
      chainTimerService,
      chainTimerBrand,
    });
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
      makeAcountInvitationMaker: M.call().returns(M.promise()),
    }),
    {
      async makeAccount() {
        trace('makeAccount');
        return makeAccount().then(({ account }) => account);
      },
      makeAcountInvitationMaker() {
        trace('makeCreateAccountInvitation');
        return zcf.makeInvitation(
          async seat => {
            seat.exit();
            return makeAccount();
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
