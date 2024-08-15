import { makeSharedStateRecord } from '@agoric/async-flow';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { withOrchestration } from '../utils/start-helper.js';
import { prepareChainHubAdmin } from '../exos/chain-hub-admin.js';
import * as flows from './zoe-tools.flows.js';
import fetchedChainInfo from '../fetched-chain-info.js';

const { values } = Object;

/**
 * @import {TimerService} from '@agoric/time';
 * @import {LocalChain} from '@agoric/vats/src/localchain.js';
 * @import {NameHub} from '@agoric/vats';
 * @import {Remote} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {AssetInfo} from '@agoric/vats/src/vat-bank.js';
 * @import {CosmosInterchainService} from '@agoric/orchestration';
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

/**
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
  { chainHub, orchestrateAll, zoeTools },
) => {
  const contractState = makeSharedStateRecord(
    /** @type {{ account: OrchestrationAccount<any> | undefined }} */ {
      localAccount: undefined,
    },
  );

  const creatorFacet = prepareChainHubAdmin(zone, chainHub);

  const orchFns = orchestrateAll(flows, {
    zcf,
    contractState,
    zoeTools,
  });

  const assets = /** @type {AssetInfo[]} */ (
    await E(E(privateArgs.agoricNames).lookup('vbankAsset')).values()
  );
  for (const chainName of ['agoric', 'cosmoshub']) {
    chainHub.registerChain(chainName, fetchedChainInfo[chainName]);
  }
  for (const brand of values(zcf.getTerms().brands)) {
    const info = assets.find(a => a.brand === brand);
    if (info) {
      chainHub.registerAsset(info.denom, {
        // we are only registering agoric assets, so safe to use denom and
        // hardcode chainName
        baseDenom: info.denom,
        baseName: 'agoric',
        chainName: 'agoric',
        brand,
      });
    }
  }

  const publicFacet = zone.exo(
    'Zoe Tools Test PF',
    M.interface('Zoe Tools Test PF', {
      makeDepositSendInvitation: M.callWhen().returns(InvitationShape),
      makeDepositInvitation: M.callWhen().returns(InvitationShape),
      makeWithdrawInvitation: M.callWhen().returns(InvitationShape),
    }),
    {
      makeDepositSendInvitation() {
        return zcf.makeInvitation(orchFns.depositSend, 'depositSend');
      },
      makeDepositInvitation() {
        return zcf.makeInvitation(orchFns.deposit, 'deposit');
      },
      makeWithdrawInvitation() {
        return zcf.makeInvitation(orchFns.withdraw, 'withdraw');
      },
    },
  );

  return { publicFacet, creatorFacet };
};

export const start = withOrchestration(contract);
harden(start);
