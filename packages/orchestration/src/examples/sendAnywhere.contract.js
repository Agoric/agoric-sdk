import { withdrawFromSeat } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M, mustMatch } from '@endo/patterns';
import { heapVowE as E } from '@agoric/vow/vat.js';
import { AmountShape } from '@agoric/ertp';
import { CosmosChainInfoShape } from '../typeGuards.js';
import { provideOrchestration } from '../utils/start-helper.js';

const { entries } = Object;
const { Fail } = assert;

/**
 * @import {Baggage} from '@agoric/vat-data';
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {VBankAssetDetail} from '@agoric/vats/tools/board-utils.js';
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
 * @param {(brand: Brand) => Promise<VBankAssetDetail>} ctx.findBrandInVBank
 * @param {{ account: OrchestrationAccount<any> }} ctx.constractState
 * @param {ZCFSeat} seat
 * @param {object} offerArgs
 * @param {string} offerArgs.chainName
 * @param {string} offerArgs.destAddr
 */
const sendItFn = async (
  orch,
  { zcf, findBrandInVBank, constractState },
  seat,
  offerArgs,
) => {
  mustMatch(offerArgs, harden({ chainName: M.scalar(), destAddr: M.string() }));
  const { chainName, destAddr } = offerArgs;
  const { give } = seat.getProposal();
  const [[kw, amt]] = entries(give);
  const { denom } = await findBrandInVBank(amt.brand);
  const chain = await orch.getChain(chainName);

  if (!constractState.account) {
    const agoricChain = await orch.getChain('agoric');
    constractState.account = await agoricChain.makeAccount();
    console.log('account', constractState.account);
  }

  const info = await chain.getChainInfo();
  console.log('info', info);
  const { chainId } = info;
  assert(typeof chainId === 'string', 'bad chainId');
  const { [kw]: pmtP } = await withdrawFromSeat(zcf, seat, give);
  await E.when(pmtP, pmt => constractState.account.deposit(pmt));
  await constractState.account.transfer(
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
  const { chainHub, orchestrate, zone } = provideOrchestration(
    zcf,
    baggage,
    privateArgs,
    privateArgs.marshaller,
  );

  /** @type {OrchestrationAccount<any> | undefined} */
  let account;
  const constractState = harden({
    get account() {
      return account;
    },
    set account(newValue) {
      account = newValue;
    },
  });

  const findBrandInVBank = async brand => {
    const assets = await E(
      // XXX heapVowE
      /** @type {Promise<Promise<NameHub<VBankAssetDetail>>>} */ (
        E(privateArgs.agoricNames).lookup('vbankAsset')
      ),
    ).values();
    const it = assets.find(a => a.brand === brand);
    if (!it) {
      throw Fail`brand ${brand} not in agoricNames.vbankAsset`;
    }
    return it;
  };

  /** @type {OfferHandler} */
  const sendIt = orchestrate(
    'sendIt',
    { zcf, findBrandInVBank, constractState },
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
        const agoricChainInfo = await E.when(chainHub.getChainInfo('agoric'));
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
