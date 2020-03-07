import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';

// O(n^2)
export const cleanOfferRules = (roleNames, amountMaths, offerRules) => {
  const wantObj = offerRules.want || {};
  const offerObj = offerRules.offer || {};
  const exitObj = offerRules.exit || { onDemand: {} };

  const exitProperties = Object.getOwnPropertyNames(exitObj);
  assert(
    exitProperties.length === 1,
    details`exit ${offerRules.exit} should only have one key`,
  );
  const exitKind = exitProperties[0];
  const acceptableKinds = ['onDemand', 'afterDeadline', 'waived'];
  assert(
    acceptableKinds.includes(exitKind),
    details`exit rule ${exitKind} was not an acceptable kind`,
  );

  const newExitRule = { kind: exitKind, ...exitObj[exitKind] };

  const wants = Object.getOwnPropertyNames(wantObj).map(roleName => ({
    role: roleName,
    amount: wantObj[roleName],
    kind: 'wantAtLeast',
  }));

  const offers = Object.getOwnPropertyNames(offerObj).map(roleName => ({
    role: roleName,
    amount: offerObj[roleName],
    kind: 'offerAtMost',
  }));

  const payoutRules = [...wants, ...offers];
  assert(
    payoutRules.length <= roleNames.length,
    details`payoutRules cannot be longer than the contract's roles`,
  );

  // Check that all payout rules have valid role names.
  assert(
    payoutRules.every(payoutRule => roleNames.includes(payoutRule.role)),
    `all payoutRule roleNames must be valid`,
  );

  // Transform the payoutRules by finding the unique role
  const newPayoutRules = [];
  for (let i = 0; i < roleNames.length; i += 1) {
    let roleFound = false;
    for (let j = 0; j < payoutRules.length; j += 1) {
      const payoutRule = payoutRules[j];
      if (payoutRule.role === roleNames[i]) {
        roleFound = true;
        newPayoutRules.push(payoutRule);
        break;
      }
    }
    if (!roleFound) {
      newPayoutRules.push({
        role: roleNames[i],
        kind: 'wantAtLeast',
        amount: amountMaths[i].getEmpty(),
      });
    }
  }

  return harden({
    payoutRules: newPayoutRules,
    exitRule: newExitRule,
  });
};
