// @jessie-check
// @ts-check

import { ParamTypes } from '@agoric/governance';
import {
  GovernorFacetShape,
  InvitationShape,
} from '@agoric/governance/src/typeGuards.js';
import { Far } from '@endo/marshal';
import { M } from '@agoric/store';
import { prepareExo } from '@agoric/vat-data';
import { provideSingleton } from '@agoric/zoe/src/contractSupport/durability.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/topics.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { makeStoredPublisherKit, SubscriberShape } from '@agoric/notifier';
import { makeParamManagerFromTerms } from '@agoric/governance/src/contractGovernance/typedParamManager.js';
import {
  prepareBridgeProvisionTool,
  prepareProvisionPoolKit,
} from './provisionPoolKit.js';

/** @import {Marshal} from '@endo/marshal'; */

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
 *   storageNode: StorageNode;
 *   marshaller: Marshal<any>;
 *   governedParamOverrides?: Record<string, Amount>;
 *   metricsOverride?: import('./provisionPoolKit.js').MetricsNotification;
 * }} privateArgs
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { poolBank, metricsOverride } = privateArgs;

  const { makeRecorderKit } = prepareRecorderKitMakers(
    baggage,
    privateArgs.marshaller,
  );

  /** @type {import('@agoric/notifier').StoredPublisherKit<GovernanceSubscriptionState>} */
  const publisherKit = makeStoredPublisherKit(
    privateArgs.storageNode,
    privateArgs.marshaller,
    'governance',
  );
  const paramManager = makeParamManagerFromTerms(
    publisherKit,
    zcf,
    { Electorate: privateArgs.initialPoserInvitation },
    {
      PerAccountInitialAmount: ParamTypes.AMOUNT,
    },
    privateArgs.governedParamOverrides,
  );
  const params = paramManager.readonly();

  const zone = makeDurableZone(baggage);

  const makeBridgeProvisionTool = prepareBridgeProvisionTool(zone);
  const makeProvisionPoolKit = prepareProvisionPoolKit(zone, {
    makeRecorderKit,
    params,
    poolBank,
    zcf,
    makeBridgeProvisionTool,
  });

  const provisionPoolKit = await provideSingleton(
    baggage,
    'provisionPoolKit',
    () =>
      makeProvisionPoolKit({
        // XXX governance can change the brand of the amount but should only be able to change the value
        // NB: changing the brand will break this pool
        // @ts-expect-error XXX Brand AssetKind
        poolBrand: params.getPerAccountInitialAmount().brand,
        storageNode: privateArgs.storageNode,
      }),
    kit => kit.helper.start({ metrics: metricsOverride }),
  );

  const publicFacet = prepareExo(
    baggage,
    'Provisioning Pool public',
    M.interface('ProvisionPool', {
      getMetrics: M.call().returns(M.remotable('MetricsSubscriber')),
      getPublicTopics: M.call().returns(TopicsRecordShape),
      getSubscription: M.call().returns(M.remotable('StoredSubscription')),
      getGovernedParams: M.call().returns(M.or(M.record(), M.promise())),
      getElectorateSubscription: M.call().returns(SubscriberShape),
    }),
    {
      getMetrics: () =>
        provisionPoolKit.public.getPublicTopics().metrics.subscriber,
      getPublicTopics: () => provisionPoolKit.public.getPublicTopics(),
      getSubscription: () => paramManager.getSubscription(),
      getGovernedParams: () => paramManager.getParams(),
      getElectorateSubscription: () => paramManager.getSubscription(),
    },
  );

  const creatorFacet = prepareExo(
    baggage,
    'governorFacet',
    M.interface('governorFacet', GovernorFacetShape),
    {
      getParamMgrRetriever: () =>
        Far('paramRetriever', { get: () => paramManager }),
      getInvitation: name => paramManager.getInternalParamValue(name),
      getLimitedCreatorFacet: () => provisionPoolKit.machine,
      getGovernedApis: () => Far('governedAPIs', {}),
      getGovernedApiNames: () => Object.keys({}),
      setOfferFilter: strings => zcf.setOfferFilter(strings),
    },
  );

  return harden({
    creatorFacet,
    publicFacet,
  });
};

harden(start);
