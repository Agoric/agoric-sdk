import { withdrawFromSeat } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M, mustMatch } from '@endo/patterns';
import { E } from '@endo/far';
import { heapVowE } from '@agoric/vow/vat.js';
import { makeStateRecord } from '@agoric/async-flow';
import { AmountShape } from '@agoric/ertp';
import { CosmosChainInfoShape } from '../typeGuards.js';
import { provideOrchestration } from '../utils/start-helper.js';
import { makeResumableAgoricNamesHack } from '../exos/agoric-names-tools.js';

const { entries } = Object;

/**
 * @import {Baggage} from '@agoric/vat-data';
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote} from '@agoric/vow';
 * @import {CosmosChainInfo, IBCConnectionInfo} from '../cosmos-api';
 * @import {OrchestrationService} from '../service.js';
 * @import {Orchestrator} from '../types.js'
 * @import {OrchestrationAccount} from '../orchestration-api.js'
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

/**
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {ZCF} ctx.zcf
 * @param {any} ctx.agoricNamesTools TODO Give this a better type
 * @param {{ account: OrchestrationAccount<any> }} ctx.contractState
 * @param {ZCFSeat} seat
 * @param {object} offerArgs
 * @param {string} offerArgs.chainName
 * @param {string} offerArgs.destAddr
 */
const sendItFn = async (
  orch,
  { zcf, agoricNamesTools, contractState },
  seat,
  offerArgs,
) => {
  mustMatch(offerArgs, harden({ chainName: M.scalar(), destAddr: M.string() }));
  const { chainName, destAddr } = offerArgs;
  const { give } = seat.getProposal();
  const [[kw, amt]] = entries(give);
  const { denom } = await agoricNamesTools.findBrandInVBank(amt.brand);
  const chain = await orch.getChain(chainName);

  if (!contractState.account) {
    const agoricChain = await orch.getChain('agoric');
    contractState.account = await agoricChain.makeAccount();
    console.log('contractState.account', contractState.account);
  }

  const info = await chain.getChainInfo();
  console.log('info', info);
  const { chainId } = info;
  assert(typeof chainId === 'string', 'bad chainId');
  const { [kw]: pmtP } = await withdrawFromSeat(zcf, seat, give);
  await E.when(pmtP, pmt => contractState.account.deposit(pmt));
  await contractState.account.transfer(
    { denom, value: amt.value },
    {
      address: destAddr,
      addressEncoding: 'bech32',
      chainId,
    },
  );
};

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
  const { chainHub, orchestrate, vowTools, zone } = provideOrchestration(
    zcf,
    baggage,
    privateArgs,
    privateArgs.marshaller,
  );
  const agoricNamesTools = makeResumableAgoricNamesHack(zone, {
    agoricNames: privateArgs.agoricNames,
    vowTools,
  });

  const contractState = makeStateRecord(
    /** @type {{ account: OrchestrationAccount<any> | undefined }} */ {
      account: undefined,
    },
  );

  /** @type {OfferHandler} */
  const sendIt = orchestrate(
    'sendIt',
    { zcf, agoricNamesTools, contractState },
    sendItFn,
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
        const agoricChainInfo = await heapVowE.when(
          chainHub.getChainInfo('agoric'),
        );
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
