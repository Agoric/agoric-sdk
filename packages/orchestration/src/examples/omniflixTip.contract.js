import { AmountShape } from '@agoric/ertp';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { makeTracer } from '@agoric/internal';
import { withOrchestration } from '@agoric/orchestration/src/utils/start-helper.js';
import { ChainInfoShape } from '@agoric/orchestration/src/typeGuards.js';
import { M } from '@endo/patterns';
import { AnyNatAmountShape } from '../typeGuards.js';
import * as flows from './omniflixTip.flows.js';
import { SingleNatAmountRecord } from './send-anywhere.contract.js';
import * as sharedFlows from './shared.flows.js';

const trace = makeTracer('OmniflixTip');

const SingleAmountRecord = M.and(
  M.recordOf(M.string(), AnyNatAmountShape, { numPropertiesLimit: 1 }),
  M.not(harden({})),
);

const OrchestrationPowersShape = M.splitRecord({
  localchain: M.remotable('localchain'),
  orchestrationService: M.remotable('orchestrationService'),
  storageNode: M.remotable('storageNode'),
  timerService: M.remotable('timerService'),
  agoricNames: M.remotable('agoricNames'),
});

/** @type {ContractMeta} */
export const meta = {
  privateArgsShape: M.and(
    OrchestrationPowersShape,
    M.splitRecord({
      marshaller: M.remotable('marshaller'),
    }),
  ),
  customTermsShape: {
    chainDetails: M.recordOf(M.string(), ChainInfoShape),
  },
};
harden(meta);

const contract = async (
  zcf,
  privateArgs,
  zone,
  { orchestrateAll, zoeTools, chainHub },
) => {
  trace('Starting OmniflixTip contract');

  const { chainDetails } = zcf.getTerms();
  for (const [name, info] of Object.entries(chainDetails)) {
    chainHub.registerChain(name, info);
    const { connections = {} } = info;
    for (const [chainId, connInfo] of Object.entries(connections)) {
      chainHub.registerConnection(info.chainId, chainId, connInfo);
    }
  }

  chainHub.registerAsset('uosmo', {
    baseName: 'agoric',
    baseDenom: 'uosmo',
    chainName: 'agoric',
  });

  const txChannelDefaults = {
    counterPartyPortId: 'transfer',
    version: 'ics20-1',
    portId: 'transfer',
    ordering: 1, // ORDER_UNORDERED
    state: 3, // STATE_OPEN
  };
  const agoricToFlixConnection = {
    id: 'connection-1',
    client_id: '07-tendermint-1',
    state: 3, // STATE_OPEN
    counterparty: {
      client_id: '07-tendermint-2109',
      connection_id: 'connection-1649',
    },
    transferChannel: {
      counterPartyChannelId: 'channel-1',
      channelId: 'channel-0',
      ...txChannelDefaults,
    },
  };
  chainHub.registerConnection(
    'agoriclocal',
    'flix-chain-0',
    agoricToFlixConnection,
  );

  const { makeLocalAccount } = orchestrateAll(sharedFlows, {});
  const localAccountP = zone.makeOnce('localAccount2', () =>
    makeLocalAccount(),
  );

  const { tipOnOmniflix } = orchestrateAll(flows, {
    localAccountP: localAccountP,
    localTransfer: zoeTools.localTransfer,
    withdrawToSeat: zoeTools.withdrawToSeat,
  });

  const publicFacet = zone.exo(
    'OmniflixTip Public Facet',
    M.interface('OmniflixTip PF', {
      makeTipInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeTipInvitation() {
        return zcf.makeInvitation(
          tipOnOmniflix,
          'Tip FLIX on Omniflix',
          undefined,
          {
            give: SingleNatAmountRecord,
            want: {},
            exit: { onDemand: null },
          },
        );
      },
    },
  );

  return { publicFacet };
};

export const start = withOrchestration(contract);
harden(start);
