import harden from '@agoric/harden';
import makeAmountMath from '@agoric/ertp/src/amountMath';

const build = async (E, log, zoe, issuers, payments, installations) => {
  const [assuranceIssuer, simoleanIssuer] = issuers;
  const simoleanMath = await Promise.all([
    E(simoleanIssuer).getBrand(),
    E(simoleanIssuer).getMathHelpersName(),
  ]).then(([brand, mathHelpersName]) => makeAmountMath(brand, mathHelpersName));
  const inviteIssuer = await E(zoe).getInviteIssuer();

  const doDvp = async (aliceP, bobP, carolP) => {
    const issuerKeywordRecord = harden({
      Assurance: assuranceIssuer,
      Currency: simoleanIssuer,
    });

    // The terms talk about the actual product. The assurance provider will wrap
    // the description up as an Assurance before contributing it to the contract
    const terms = {
      Product: 'Picasso: Three Musicians',
      Currency: simoleanMath.make(250),
    };
    const { invite } = await E(zoe).makeInstance(
      installations.dvp,
      issuerKeywordRecord,
      terms,
    );
    const { seat } = await E(zoe).redeem(invite);
    const invitePs = await E(seat).makeInvites();

    E(aliceP).doDelivery(invitePs.deliveryInvite);
    E(carolP).doVerify(invitePs.assuranceInvite);
    E(bobP).doPayment(invitePs.paymentInvite);
    E(carolP).receiveGoods();
  };

  return harden({
    startTest: async (testName, aliceP, bobP, carolP) => {
      switch (testName) {
        case 'dvp': {
          return doDvp(aliceP, bobP, carolP);
        }
        default: {
          throw new Error(`testName ${testName} not recognized`);
        }
      }
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
