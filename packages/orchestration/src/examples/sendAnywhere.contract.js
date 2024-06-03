import { makeDurableZone } from '@agoric/zone/durable.js';
import { M, mustMatch } from '@endo/patterns';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/far';
import { withdrawFromSeat } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';

import { AmountShape } from '@agoric/ertp';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { CosmosChainInfoShape } from '../typeGuards.js';
import { makeOrchestrationFacade } from '../facade.js';
import { prepareLocalChainAccountKit } from '../exos/local-chain-account-kit.js';

const { entries } = Object;
const { Fail } = assert;

/**
 * @import {Baggage} from '@agoric/vat-data';
 * @import {CosmosChainInfo} from '../cosmos-api';
 * @import {MapStore} from '@agoric/store';
 * @import {TimerService, TimerBrand} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {ERef} from '@endo/far'
 * @import {OrchestrationService} from '../service.js';
 * @import {Chain} from '../orchestration-api.js';
 * @import {NameHub, Board} from '@agoric/vats';
 * @import { Remote } from '@agoric/vow';
 */

/**
 * @typedef {{
 *   localchain: ERef<LocalChain>;
 *   orchestrationService: ERef<OrchestrationService>;
 *   storageNode: ERef<StorageNode>;
 *   timerService: ERef<TimerService>;
 *   agoricNames: ERef<NameHub>;
 *   board: ERef<Board>;
 * }} OrchestrationPowers
 */

const SingleAmountRecord = M.recordOf(M.string(), AmountShape, {
  numPropertiesLimit: 1,
});

/**
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 *   agoricChainInfo: Pick<CosmosChainInfo, 'chainId' | 'connections'>;
 *   timerService: TimerService;
 *   timerBrand: TimerBrand;
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const zone = makeDurableZone(baggage);
  /** @type {MapStore<number, { chain: Chain, chainInfo: CosmosChainInfo}>} */
  const chains = zone.mapStore('chains');

  const { makeRecorderKit } = prepareRecorderKitMakers(
    baggage,
    privateArgs.marshaller,
  );
  const makeLocalChainAccountKit = prepareLocalChainAccountKit(
    baggage,
    makeRecorderKit,
    zcf,
    privateArgs.timerService,
    privateArgs.timerBrand,
    privateArgs.agoricChainInfo,
  );

  const { orchestrate } = makeOrchestrationFacade({
    zcf,
    zone,
    ...privateArgs,
  });

  const { localchain } = privateArgs;
  const lowLevelAccountP = E(localchain).makeAccount();
  const [lowLevelAccount, address] = await Promise.all([
    lowLevelAccountP,
    E(lowLevelAccountP).getAddress(),
  ]);
  const { holder: contractAccount } = makeLocalChainAccountKit({
    account: lowLevelAccount,
    address,
    storageNode: await privateArgs.storageNode, // TODO: Remote
  });

  const findBrandInVBank = async brand => {
    const assets = await E(
      E(privateArgs.agoricNames).lookup('vbankAsset'),
    ).values();
    const it = assets.find(a => a.brand === brand);
    it || Fail`brand ${brand} not in agoricNames.vbankAsset`;
    return it;
  };

  /** @type {OfferHandler} */
  const sendIt = orchestrate(
    'sendIt',
    { zcf },
    // eslint-disable-next-line no-shadow -- this `zcf` is enclosed in a membrane
    async (orch, { zcf }, seat, offerArgs) => {
      mustMatch(
        offerArgs,
        harden({ chainKey: M.scalar(), destAddr: M.string() }),
      );
      const { chainKey, destAddr } = offerArgs;
      const { chainInfo, chain } = chains.get(chainKey);
      const { give } = seat.getProposal();
      entries(give).length > 0 || Fail`empty give`;
      const [[kw, amt]] = entries(give);
      const { [kw]: pmtP } = await withdrawFromSeat(zcf, seat, give);
      const { chainId } = chainInfo;
      await E(contractAccount).deposit(await pmtP, amt);
      const { denom } = await findBrandInVBank(amt.brand);
      const { value } = amt;
      // TODO: fix transfer to not depend on a global
      // chainId registry? #8879
      await E(contractAccount).transfer(
        { denom, value },
        {
          address: destAddr,
          addressEncoding: 'bech32',
          chainId,
        },
      );
    },
  );

  const publicFacet = zone.exo(
    'Send PF',
    M.interface('Send PF', {
      makeSendInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeSendInvitation() {
        return zcf.makeInvitation(
          sendIt,
          'send',
          undefined,
          M.splitRecord({ give: SingleAmountRecord }),
        );
      },
    },
  );

  const addChain = orchestrate(
    'sendIt',
    { zcf },
    // eslint-disable-next-line no-shadow -- this `zcf` is enclosed in a membrane
    async (orch, { zcf }, _seat, offerArgs) => {
      const { chainInfo } = offerArgs;
      const chain = await orch.makeChain(chainInfo);
      const chainKey = chains.getSize();
      chains.init(chainKey, harden({ chainInfo, chain }));
      return chainKey;
    },
  );

  const creatorFacet = zone.exo(
    'Send CF',
    M.interface('Send CF', {
      addChain: M.call(CosmosChainInfoShape).returns(M.scalar()),
    }),
    {
      /**
       * @param {CosmosChainInfo} chainInfo
       * TODO: support other kinds of chain
       */
      addChain(chainInfo) {
        return addChain(undefined, { chainInfo });
      },
    },
  );

  return { publicFacet, creatorFacet };
};
