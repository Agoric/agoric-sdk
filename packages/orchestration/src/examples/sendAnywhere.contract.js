import { withdrawFromSeat as wFS } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { M, mustMatch } from '@endo/patterns';
import { E } from '@endo/far';
import { heapVowE } from '@agoric/vow/vat.js';
import { makeStateRecord } from '@agoric/async-flow';
import { AmountShape } from '@agoric/ertp';
import { Fail } from '@agoric/assert';
import { CosmosChainInfoShape } from '../typeGuards.js';
import { withOrchestration } from '../utils/start-helper.js';
import { orchestrationFns } from './sendAnywhereOrchestration.js';

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

export const SingleAmountRecord = M.and(
  M.recordOf(M.string(), AmountShape, {
    numPropertiesLimit: 1,
  }),
  M.not(harden({})),
);

export const start = withOrchestration(
  async (
    zcf,
    privateArgs,
    zone,
    { vowTools, orchestrateAll, chainHub, zoeTools },
  ) => {
    const contractState = makeStateRecord(
      /** @type {{ account: OrchestrationAccount<any> | undefined }} */ {
        account: undefined,
      },
    );

    // TODO should be a provided helper
    const findBrandInVBank = vowTools.retriable(
      zone,
      'findBrandInVBank',
      async (_subzone, brand) => {
        const agoricNames = privateArgs.agoricNames;
        const assets = await E(E(agoricNames).lookup('vbankAsset')).values();
        const it = assets.find(a => a.brand === brand);
        it || Fail`brand ${brand} not in agoricNames.vbankAsset`;
        return it;
      },
    );

    // orchestrate uses the names on orchestrationFns to do a "prepare" of the associated behavior
    // TODO should orchestrateAll have `zone` passed in?  how does that relate to
    // the zone passed to orchestrationFns?
    const orchFns = orchestrateAll(/* zone,*/ orchestrationFns, {
      zcf,
      contractState,
      localTransfer: zoeTools.localTransfer,
      findBrandInVBank,
    });

    const publicFacet = zone.exo(
      'Send PF',
      M.interface('Send PF', {
        makeSendInvitation: M.callWhen().returns(InvitationShape),
      }),
      {
        makeSendInvitation() {
          return zcf.makeInvitation(
            orchFns.sendIt,
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
  },
);
