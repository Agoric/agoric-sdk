import { withdrawFromSeat } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { V } from '@agoric/vow/vat.js';
import { AmountShape } from '@agoric/ertp';
import { CosmosChainInfoShape } from '../typeGuards.js';
import { provideOrchestration } from '../utils/start-helper.js';

const { entries } = Object;
const { Fail } = assert;

/**
 * @import {Baggage} from '@agoric/vat-data';
 * @import {CosmosChainInfo, IBCConnectionInfo} from '../cosmos-api';
 * @import {TimerService, TimerBrand} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {OrchestrationService} from '../service.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote} from '@agoric/vow';
 */

/**
 * @typedef {{
 *   localchain: Remote<LocalChain>;
 *   orchestrationService: Remote<OrchestrationService>;
 *   storageNode: Remote<StorageNode>;
 *   timerService: Remote<TimerService>;
 *   agoricNames: Remote<NameHub>;
 * }} OrchestrationPowers
 */

export const SingleAmountRecord = M.and(
  M.recordOf(M.string(), AmountShape, {
    numPropertiesLimit: 1,
  }),
  M.not(harden({})),
);

/**
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { chainHub, orchestrate, zone } = provideOrchestration(
    zcf,
    baggage,
    privateArgs,
    privateArgs.marshaller,
  );

  /** @type {import('../orchestration-api.js').OrchestrationAccount<any>} */
  let contractAccount;

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
        harden({ chainName: M.scalar(), destAddr: M.string() }),
      );
      const { chainName, destAddr } = offerArgs;
      const { give } = seat.getProposal();
      const [[kw, amt]] = entries(give);
      const { denom } = await findBrandInVBank(amt.brand);
      const chain = await orch.getChain(chainName);

      // FIXME ok to use a heap var crossing the membrane scope this way?
      if (!contractAccount) {
        const agoricChain = await orch.getChain('agoric');
        // XXX when() until membrane
        contractAccount = await V.when(agoricChain.makeAccount());
        console.log('contractAccount', contractAccount);
      }

      // XXX when() until membrane
      const info = await V.when(chain.getChainInfo());
      console.log('info', info);
      const { chainId } = info;
      assert(typeof chainId === 'string', 'bad chainId');
      const { [kw]: pmtP } = await withdrawFromSeat(zcf, seat, give);
      await E.when(pmtP, pmt => contractAccount.deposit(pmt));
      await contractAccount.transfer(
        { denom, value: amt.value },
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

  let nonce = 0n;
  const ConnectionInfoShape = M.record(); // TODO
  const creatorFacet = zone.exo(
    'Send CF',
    M.interface('Send CF', {
      addChain: M.callWhen(CosmosChainInfoShape, ConnectionInfoShape).returns(
        M.scalar(),
      ),
    }),
    {
      /**
       * @param {CosmosChainInfo} chainInfo
       * @param {IBCConnectionInfo} connectionInfo
       */
      async addChain(chainInfo, connectionInfo) {
        const chainKey = `${chainInfo.chainId}-${(nonce += 1n)}`;
        // when() because chainHub methods return vows. If this were inside
        // orchestrate() the membrane would wrap/unwrap automatically.
        const agoricChainInfo = await V.when(chainHub.getChainInfo('agoric'));
        chainHub.registerChain(chainKey, chainInfo);
        chainHub.registerConnection(
          agoricChainInfo.chainId,
          chainInfo.chainId,
          connectionInfo,
        );
        return chainKey;
      },
    },
  );

  return { publicFacet, creatorFacet };
};
