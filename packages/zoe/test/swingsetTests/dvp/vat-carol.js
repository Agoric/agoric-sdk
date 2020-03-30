import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import makePromise from '@agoric/make-promise';
import { getLocalAmountMath, showPurseBalance } from '../helpers';

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

  let invite;
  let instanceHandle;

  return harden({
    makePhysicalDelivery: (productAmount, instanceHandle) => {
      // verify handle
      const { terms, issuerKeywordRecord } = E(zoe).getInstance(instanceHandle);
      assert(sameStructure(issuerKeywordRecord, expectedStructure));
      assert(simoleanMath.isEqual(productAmount, terms.Product));
      deliveryReceived.resolve(assuranceMint.mintPayment(productAmount));
    },

    receiveGoods: () => {
      // At this point in the demo, the buyer has deposited funds, and we
      // have just received physical delivery from the seller. We will create
      // an assurance, and include it as a payment with our redeem call.
      if (!instanceHandle) {
        zoe.reject();
      }

      // I want teh terms from getInstance
      const payments = harden({
        give: { Assurance: assurance },
        exit: something,
      });
      const { seat } = E(zoe).redeem(invite, proposal, payments);

      E(zoe).complete();
    },

    doVerify: async inviteP => {
      // validate invite; extract handle
      invite = await E(inviteIssuer).claim(inviteP);
      const { extent: inviteExtent } = await E(inviteIssuer).getAmountOf(
        invite,
      );
      const { installationHandle, terms, issuerKeywordRecord } = await E(
        zoe,
      ).getInstance(inviteExtent[0].instanceHandle);
      instanceHandle = inviteExtent[0].instanceHandle;
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
debugger
      assert(terms.Currency === simoleanIssuer, details`wrong currency issuer`);
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
