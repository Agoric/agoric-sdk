import { makeDurableZone } from '@agoric/zone/durable.js';
import { M, mustMatch } from '@endo/patterns';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/far';
import { withdrawFromSeat } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';

import { AmountShape } from '@agoric/ertp';
import { CosmosChainInfoShape } from '../typeGuards.js';
import { makeOrchestrationFacade } from '../facade.js';

const { entries } = Object;
const { Fail } = assert;

/**
 * @import {Baggage} from '@agoric/vat-data';
 * @import {CosmosChainInfo} from '../cosmos-api';
 * @import {MapStore} from '@agoric/store';
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {ERef} from '@endo/far'
 * @import {OrchestrationService} from '../service.js';
 * @import {NameHub, Board} from '@agoric/vats';
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
 * @param {OrchestrationPowers} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const zone = makeDurableZone(baggage);
  /** @type {MapStore<number, CosmosChainInfo>} */
  const chains = zone.mapStore('chains');

  const { orchestrate } = makeOrchestrationFacade({
    zcf,
    zone,
    ...privateArgs,
  });

  const { localchain } = privateArgs;
  const contractAccountP = E(localchain).makeAccount();

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
      const chain = chains.get(chainKey);
      const { give } = seat.getProposal();
      entries(give).length > 0 || Fail`empty give`;
      const [[kw, amt]] = entries(give);
      const { [kw]: pmtP } = await withdrawFromSeat(zcf, seat, give);
      await E(contractAccountP).deposit(await pmtP, amt);
      await E(contractAccountP).transfer(amt, chain, destAddr);
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

  const creatorFacet = zone.exo(
    'Send CF',
    M.interface('Send CF', {
      addChain: M.call(CosmosChainInfoShape).returns(M.scalar()),
    }),
    {
      /** @param {CosmosChainInfo} chainInfo */
      addChain(chainInfo) {
        const chainKey = chains.getSize();
        chains.init(chainKey, chainInfo);
        return chainKey;
      },
    },
  );

  return { publicFacet, creatorFacet };
};
