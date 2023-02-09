/* eslint-disable import/no-extraneous-dependencies */

import bundleSource from '@endo/bundle-source';
import { E } from '@endo/eventual-send';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { CONTRACT_ELECTORATE, ParamTypes } from '../src/index.js';

const makeBundle = async sourceRoot => {
  const url = await importMetaResolve(sourceRoot, import.meta.url);
  const path = new URL(url).pathname;
  const contractBundle = await bundleSource(path);
  return contractBundle;
};

// makeBundle is a slow step, so we do it once for all the tests.
const contractGovernorBundleP = makeBundle('./puppetContractGovernor.js');
// could be called fakeCommittee. It's used as a source of invitations only
const autoRefundBundleP = makeBundle(
  '@agoric/zoe/src/contracts/automaticRefund.js',
);

/**  */

/**
 * @template {import('../src/contractGovernor.js').GovernableStartFn} T governed contract startfn
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<Installation<T>>} governedP
 * @param {import('@agoric/swingset-vat/src/vats/timer/vat-timer.js').TimerService} timer
 * @param {{ governedParams?: Record<string, unknown>, governedApis?: string[] }} governedTerms
 * @param {{}} governedPrivateArgs
 */
export const setUpGovernedContract = async (
  zoe,
  governedP,
  timer,
  governedTerms = {},
  governedPrivateArgs = {},
) => {
  const [contractGovernorBundle, autoRefundBundle] = await Promise.all([
    contractGovernorBundleP,
    autoRefundBundleP,
  ]);

  /**
   * @type {[
   * Installation<import('./puppetContractGovernor').start>,
   * Installation<any>,
   * Installation<T>,
   * ]}
   */
  const [governor, autoRefund, governed] = await Promise.all([
    E(zoe).install(contractGovernorBundle),
    E(zoe).install(autoRefundBundle),
    governedP,
  ]);
  const installs = { governor, autoRefund, governed };

  /**
   * Contract governor wants a committee invitation. Give it a random invitation.
   */
  async function getFakeInvitation() {
    const autoRefundFacets = await E(zoe).startInstance(autoRefund);
    const invitationP = E(autoRefundFacets.publicFacet).makeInvitation();
    const [fakeInvitationPayment, fakeInvitationAmount] = await Promise.all([
      invitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(invitationP),
    ]);
    return { fakeInvitationPayment, fakeInvitationAmount };
  }

  const { fakeInvitationAmount, fakeInvitationPayment } =
    await getFakeInvitation();

  const governedTermsWithElectorate = {
    ...governedTerms,
    governedParams: {
      ...governedTerms.governedParams,
      [CONTRACT_ELECTORATE]: {
        type: ParamTypes.INVITATION,
        value: fakeInvitationAmount,
      },
    },
    governedApis: governedTerms.governedApis,
  };
  const governorTerms = {
    timer,
    governedContractInstallation: governed,
    governed: {
      terms: governedTermsWithElectorate,
      issuerKeywordRecord: {},
    },
  };

  const governorFacets = await E(zoe).startInstance(
    governor,
    {},
    governorTerms,
    {
      governed: {
        ...governedPrivateArgs,
        initialPoserInvitation: fakeInvitationPayment,
      },
    },
  );

  return { getFakeInvitation, governorFacets, installs };
};
harden(setUpGovernedContract);
