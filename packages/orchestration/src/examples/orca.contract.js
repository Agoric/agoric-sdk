import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { makeTracer } from '@agoric/internal';
import { AmountShape } from '@agoric/ertp';
// import { provideOrchestration } from '@agoric/orchestration/src/utils/start-helper.js';
import { provideOrchestration } from '../utils/start-helper.js';

const trace = makeTracer('OrchDev1');
const { entries } = Object;

export const SingleAmountRecord = M.and(
  M.recordOf(M.string(), AmountShape, {
    numPropertiesLimit: 1,
  }),
  M.not(harden({})),
);
harden(SingleAmountRecord);

/**
 * @import {Orchestrator} from '@agoric/orchestration';
 * @import {OrchestrationPowers} from '@agoric/orchestration/src/utils/start-helper.js';
 * @import {Baggage} from '@agoric/vat-data';
 * @import {GuestInterface} from '@agoric/async-flow';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 */

/**
 * Create an account on a Cosmos chain and return a continuing offer with
 * invitations makers for Delegate, WithdrawRewards, Transfer, etc.
 *
 * @param {Orchestrator} orch
 * @param {undefined} _ctx
 * @param {ZCFSeat} seat
 * @param {{ chainName: string }} offerArgs
 */
const createAccountsFn = async (orch, _ctx, seat, { chainName }) => {
  const { give } = seat.getProposal();
  trace('version 0.1.36');
  trace('give', give);
  trace('inside createAccounts');
  trace('orch', orch);
  trace('seat', seat);
  trace({ chainName });
  seat.exit();
  const chain = await orch.getChain(chainName);
  trace('chain object', chain);
  const info = await chain.getChainInfo();
  trace('chain info', info);
  const chainAccount = await chain.makeAccount();
  console.log('chainAccount', chainAccount);

  return chainAccount.asContinuingOffer();
};

/**
 * Create an account on a Cosmos chain and return a continuing offer with
 * invitations makers for Delegate, WithdrawRewards, Transfer, etc.
 *
 * @param {Orchestrator} orch
 * @param {object} ctx
 * @param {GuestInterface<ZoeTools>['localTransfer']} ctx.localTransfer
 * @param {ZCFSeat} seat
 * @param {{ chainName: string }} offerArgs
 */
const createAndFundFn = async (
  orch,
  { localTransfer },
  seat,
  { chainName },
) => {
  const { give } = seat.getProposal();
  const [[_kw, amt]] = entries(give);
  trace('orch', orch);
  trace('_kw', _kw);
  trace('amt', amt);
  trace('give:', give);

  const [agoric, chain] = await Promise.all([
    orch.getChain('agoric'),
    orch.getChain(chainName),
  ]);

  const info = await chain.getChainInfo();
  trace('chain info', info);

  const assets = await agoric.getVBankAssetInfo();
  trace('fetched assets:', assets);

  const localAccount = await agoric.makeAccount();
  trace('localAccount', localAccount);

  const remoteAccount = await chain.makeAccount();
  trace('remoteAccount', remoteAccount);
  const [localAddress, remoteAddress] = await Promise.all([
    localAccount.getAddress(),
    remoteAccount.getAddress(),
  ]);

  // vstorage tests
  trace('writing');
  // setValue(`status x`)
  // const node1 = await makeChildNode(`orca-createAndFund-${localAddress.value}-${localAddress.value}`);

  trace('localAddress', localAddress);
  trace('remoteAddress', remoteAddress);
  trace('fund new orch account');

  await localTransfer(seat, localAccount, give);

  await localAccount.transfer(
    {
      denom: 'ubld',
      value: amt.value / 2n,
    },
    remoteAddress,
  );
  seat.exit();
  // XXX localAccount is lost; consider returning via PortfolioHolder
  // Or, put this in contractState and reuse for users if we're only interested in the ICA.
  return remoteAccount.asContinuingOffer();
};

/**
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} privateArgs
 * @param {Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  trace('inside start function: v1.0.95');
  trace('inside start function: v1.0.95');
  trace('privateArgs', privateArgs);

  // destructure privateArgs to extract necessary services
  const {
    orchestrationService: orchestration,
    marshaller,
    storageNode,
    timerService,
    localchain,
    agoricNames,
  } = privateArgs;
  trace('orchestration: ', orchestration);
  trace('marshaller: ', marshaller);
  trace('storageNode: ', storageNode);
  trace('storageNode await : ', storageNode);
  trace('timer: ', timerService);
  trace('localchain: ', localchain);
  trace('agoricNames: ', agoricNames);
  const orchestrationProvided = provideOrchestration(
    zcf,
    baggage,
    privateArgs,
    privateArgs.marshaller,
  );

  trace('orchestrationProvided', orchestrationProvided);
  const { orchestrate, zone, zoeTools, asyncFlowTools } = orchestrationProvided;

  trace('orchestrate: ', orchestrate);
  trace('zone: ', zone);
  trace('zoeTools: ', zoeTools);
  trace('asyncFlowTools: ', asyncFlowTools);

  /** @type {OfferHandler} */
  const makeAccount = orchestrate('makeAccount', undefined, createAccountsFn);

  /** @type {OfferHandler} */
  const makeCreateAndFund = orchestrate(
    'makeCreateAndFund',
    {
      localTransfer: zoeTools.localTransfer,
    },
    createAndFundFn,
  );

  const publicFacet = zone.exo(
    'Orca Public Facet',
    M.interface('Orca PF', {
      makeAccountInvitation: M.callWhen().returns(InvitationShape),
      makeCreateAndFundInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeAccountInvitation() {
        return zcf.makeInvitation(makeAccount, 'Make an Orchestration Account');
      },
      makeCreateAndFundInvitation() {
        return zcf.makeInvitation(
          makeCreateAndFund,
          'Make an Orchestration Account and Fund it',
          undefined,
          M.splitRecord({ give: SingleAmountRecord }),
        );
      },
    },
  );

  return { publicFacet };
};
harden(start);

/** @typedef {typeof start} OrcaSF */
