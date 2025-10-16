// @jessie-check

import {
  handleParamGovernance,
  ParamTypes,
  publicMixinAPI,
} from '@agoric/governance';
import { InvitationShape } from '@agoric/governance/src/typeGuards.js';
import { M } from '@agoric/store';
import { prepareExo } from '@agoric/vat-data';
import { provideSingleton } from '@agoric/zoe/src/contractSupport/durability.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/topics.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import {
  prepareBridgeProvisionTool,
  prepareProvisionPoolKit,
} from './provisionPoolKit.js';

/**
 * @import {Remote, ERemote} from '@agoric/internal';
 * @import {EMarshaller} from '@agoric/internal/src/marshal/wrap-marshaller.js';
 * @import {Amount, Brand, Payment, Purse} from '@agoric/ertp';
 * @import {ContractMeta, Invitation, StandardTerms, ZCF} from '@agoric/zoe';
 * @import {GovernanceTerms} from '@agoric/governance/src/types.js';
 */

/** @type {ContractMeta} */
export const meta = {
  privateArgsShape: M.splitRecord(
    {
      poolBank: M.eref(M.remotable('bank')),
      storageNode: M.eref(M.remotable('storageNode')),
      marshaller: M.eref(M.remotable('marshaller')),
    },
    {
      // only necessary on first invocation, not subsequent
      initialPoserInvitation: InvitationShape,
      metricsOverride: M.recordOf(M.string()),
    },
  ),
  upgradability: 'canUpgrade',
};
harden(meta);

/**
 * @typedef {StandardTerms &
 *   GovernanceTerms<{
 *     PerAccountInitialAmount: 'amount';
 *   }>} ProvisionTerms
 *   TODO: ERef<GovernedCreatorFacet<ProvisionCreator>>
 * @param {ZCF<ProvisionTerms>} zcf
 * @param {{
 *   poolBank: import('@endo/far').ERef<
 *     import('@agoric/vats/src/vat-bank.js').Bank
 *   >;
 *   initialPoserInvitation: Invitation;
 *   storageNode: Remote<StorageNode>;
 *   marshaller: Remote<Marshaller>;
 *   metricsOverride?: import('./provisionPoolKit.js').MetricsNotification;
 *   governedParamOverrides?: Record<string, Amount | undefined>;
 * }} privateArgs
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { poolBank, metricsOverride } = privateArgs;

  const { marshaller: remoteMarshaller } = privateArgs;

  /** @type {ERemote<EMarshaller>} */
  const cachingMarshaller = remoteMarshaller;

  const { makeRecorderKit } = prepareRecorderKitMakers(
    baggage,
    cachingMarshaller,
  );

  // Governance
  const { publicMixin, makeDurableGovernorFacet, params } =
    await handleParamGovernance(
      zcf,
      privateArgs.initialPoserInvitation,
      {
        PerAccountInitialAmount: ParamTypes.AMOUNT,
      },
      privateArgs.storageNode,
      privateArgs.marshaller,
      privateArgs.governedParamOverrides,
    );

  const zone = makeDurableZone(baggage);

  const makeBridgeProvisionTool = prepareBridgeProvisionTool(zone);
  const makeProvisionPoolKit = prepareProvisionPoolKit(zone, {
    makeRecorderKit,
    params,
    poolBank,
    zcf,
    makeBridgeProvisionTool,
  });

  const poolBrand = /** @type {Brand<'nat'>} */ (
    params.getPerAccountInitialAmount().brand
  );
  const provisionPoolKit = await provideSingleton(
    baggage,
    'provisionPoolKit',
    () =>
      makeProvisionPoolKit({
        poolBrand,
        storageNode: privateArgs.storageNode,
      }),
  );
  provisionPoolKit.helper.start(poolBrand, { metrics: metricsOverride });

  const publicFacet = prepareExo(
    baggage,
    'Provisioning Pool public',
    M.interface('ProvisionPool', {
      getMetrics: M.callWhen().returns(M.remotable('MetricsSubscriber')),
      getPublicTopics: M.callWhen().returns(TopicsRecordShape),
      ...publicMixinAPI,
    }),
    {
      async getMetrics() {
        await null;
        return provisionPoolKit.public.getPublicTopics().metrics.subscriber;
      },
      async getPublicTopics() {
        await null;
        return provisionPoolKit.public.getPublicTopics();
      },
      ...publicMixin,
    },
  );

  return harden({
    creatorFacet: makeDurableGovernorFacet(baggage, provisionPoolKit.machine)
      .governorFacet,
    publicFacet,
  });
};

harden(start);
