/**
 * @file variation of sendAnywhere.contract.js that has a vow that never
 *   resolves, for use in testing replacing this with a working contract during
 *   in-flight offers
 */
import { makeStateRecord } from '@agoric/async-flow';
import { AmountShape } from '@agoric/ertp';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import { withOrchestration } from '../utils/start-helper.js';
import { orchestrationFns } from './sendAnywhereFlows.js';

/**
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote, Vow} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {VBankAssetDetail} from '@agoric/vats/tools/board-utils.js';
 * @import {CosmosChainInfo, IBCConnectionInfo} from '../cosmos-api';
 * @import {CosmosInterchainService} from '../exos/cosmos-interchain-service.js';
 * @import {OrchestrationTools} from '../utils/start-helper.js';
 */

/**
 * @typedef {{
 *   localchain: Remote<LocalChain>;
 *   orchestrationService: Remote<CosmosInterchainService>;
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
 * Orchestration contract to be wrapped by withOrchestration for Zoe
 *
 * @param {ZCF} zcf
 * @param {OrchestrationPowers & {
 *   marshaller: Marshaller;
 * }} privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 */
const contract = async (
  zcf,
  privateArgs,
  zone,
  { orchestrateAll, vowTools, zoeTools },
) => {
  const contractState = makeStateRecord(
    /** @type {{ account: OrchestrationAccount<any> | undefined }} */ {
      account: undefined,
    },
  );

  /** @type {(brand: Brand) => Vow<VBankAssetDetail>} */
  const findBrandInVBank = vowTools.retriable(
    zone,
    'findBrandInVBank',
    /** @param {Brand} brand */
    async brand => {
      // BUG: this never resolves
      const assets = await new Promise(() => {});
      const it = assets.find(a => a.brand === brand);
      it || Fail`brand ${brand} not in agoricNames.vbankAsset`;
      return it;
    },
  );

  // orchestrate uses the names on orchestrationFns to do a "prepare" of the associated behavior
  const orchFns = orchestrateAll(orchestrationFns, {
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
  return { publicFacet };
};

export const start = withOrchestration(contract);
