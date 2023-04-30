// @jessie-check
// @ts-check

import {
  handleParamGovernance,
  ParamTypes,
  publicMixinAPI,
} from '@agoric/governance';
import { M } from '@agoric/store';
import { prepareExo } from '@agoric/vat-data';
import { provideSingleton } from '@agoric/zoe/src/contractSupport/durability.js';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { prepareProvisionPoolKit } from './provisionPoolKit.js';

export const privateArgsShape = harden({
  poolBank: M.eref(M.remotable('bank')),
  initialPoserInvitation: M.remotable('Invitation'),
  storageNode: M.eref(M.remotable('storageNode')),
  marshaller: M.eref(M.remotable('marshaller')),
});

/**
 * @typedef {StandardTerms & GovernanceTerms<{
 *    PerAccountInitialAmount: 'amount',
 *   }>} ProvisionTerms
 *
 * TODO: ERef<GovernedCreatorFacet<ProvisionCreator>>
 *
 * @param {ZCF<ProvisionTerms>} zcf
 * @param {{
 *   poolBank: import('@endo/far').ERef<import('./vat-bank.js').Bank>,
 *   initialPoserInvitation: Invitation,
 *  storageNode: StorageNode,
 *  marshaller: Marshaller
 * }} privateArgs
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const prepare = async (zcf, privateArgs, baggage) => {
  const { poolBank } = privateArgs;

  const { makeRecorderKit } = prepareRecorderKitMakers(
    baggage,
    privateArgs.marshaller,
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
    );

  const makeProvisionPoolKit = prepareProvisionPoolKit(baggage, {
    makeRecorderKit,
    params,
    poolBank,
    zcf,
  });

  const provisionPoolKit = await provideSingleton(
    baggage,
    'provisionPoolKit',
    () =>
      makeProvisionPoolKit({
        // XXX governance can change the brand of the amount but should only be able to change the value
        // NB: changing the brand will break this pool
        poolBrand: params.getPerAccountInitialAmount().brand,
        storageNode: privateArgs.storageNode,
      }),
    kit => kit.helper.start(),
  );

  const publicFacet = prepareExo(
    baggage,
    'Provisioning Pool public',
    M.interface('ProvisionPool', {
      getMetrics: M.call().returns(M.remotable('MetricsSubscriber')),
      ...publicMixinAPI,
    }),
    {
      getMetrics() {
        return provisionPoolKit.public.getPublicTopics().metrics.subscriber;
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

harden(prepare);
