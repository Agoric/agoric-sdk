import { AmountShape } from '@agoric/ertp';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { makeTracer } from '@agoric/internal';
import { withOrchestration } from '@agoric/orchestration/src/utils/start-helper.js';
import { ChainInfoShape } from '@agoric/orchestration/src/typeGuards.js';
import { M } from '@endo/patterns';
import * as flows from './omniflixTip.flows.js';

const trace = makeTracer('OmniflixTip');

const SingleAmountRecord = M.and(
  M.recordOf(M.string(), AmountShape, { numPropertiesLimit: 1 }),
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

  const { tipOnOmniflix } = orchestrateAll(flows, {
    localTransfer: zoeTools.localTransfer,
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
          harden({
            give: SingleAmountRecord,
            want: {},
            exit: M.any(),
          }),
        );
      },
    },
  );

  return { publicFacet };
};

export const start = withOrchestration(contract);
harden(start);