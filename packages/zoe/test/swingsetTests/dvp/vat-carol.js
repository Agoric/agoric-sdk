import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import makePromise from '@agoric/make-promise';
import { getLocalAmountMath } from '../helpers';

const build = async (
  E,
  log,
  zoe,
  issuers,
  payments,
  installations,
  assuranceMint,
) => {
  const [assuranceIssuer, simoleanIssuer] = issuers;
  const inviteIssuer = await E(zoe).getInviteIssuer();
  const simoleanMath = await getLocalAmountMath(simoleanIssuer);

  const expectedStructure = harden({
    Currency: simoleanIssuer,
    Assurance: assuranceIssuer,
  });
  const deliveryReceived = makePromise();

  return harden({
    makePhysicalDelivery: (productAmount, instanceHandle) => {
      // verify handle
      const { terms, issuerKeywordRecord } = E(zoe).getInstance(instanceHandle);
      assert(sameStructure(issuerKeywordRecord, expectedStructure));
      assert(simoleanMath.isEqual(productAmount, terms.Product));
      deliveryReceived.resolve(assuranceMint.mintPayment(productAmount));
    },
    doVerify: async inviteP => {
      // validate invite; extract handle
      const invite = await E(inviteIssuer).claim(inviteP);
  debugger
      const { extent: inviteExtent } = await E(inviteIssuer).getAmountOf(
        invite,
      );
debugger
      const { installationHandle, terms, issuerKeywordRecord } = await E(
        zoe,
      ).getInstance(inviteExtent[0].instanceHandle);
      assert(
        installationHandle === installations.dvp,
        details`wrong installation`,
      );
      assert(
        sameStructure(
          harden({ Assurance: assuranceIssuer, Currency: simoleanIssuer }),
          issuerKeywordRecord,
        ),
        details`issuerKeywordRecord was not as expected`,
      );
      assert(
        sameStructure(terms, {
          Assurance: assuranceIssuer,
          Currency: simoleanIssuer,
        }),
      );

      // when deliveryReceived, send assurance to zoe
    },
  });
};

const setup = (syscall, state, helpers) =>
  helpers.makeLiveSlots(syscall, state, E =>
    harden({
      build: (...args) => build(E, helpers.log, ...args),
    }),
  );
export default harden(setup);
