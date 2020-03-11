import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';

export const cleanOfferRules = (roleNames, amountMaths, offerRules) => {
  const { want = {}, offer = {}, exit = { onDemand: {} } } = offerRules;
  // Create an unfrozen version in case we need to add properties.
  const wantObj = { ...want };

  const exitProperties = Object.getOwnPropertyNames(exit);
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

  const wantRoleNames = Object.getOwnPropertyNames(wantObj);
  const offerRoleNames = Object.getOwnPropertyNames(offer);
  const allOfferRulesRoleNames = [...wantRoleNames, ...offerRoleNames];
  allOfferRulesRoleNames.forEach(roleName =>
    assert(
      roleNames.includes(roleName),
      details`roleName ${roleName} must be valid`,
    ),
  );

  const hasProp = (obj, prop) => obj[prop] !== undefined;

  roleNames.forEach(roleName => {
    // check that roleName is in wantObj or offerObj but not both.
    const wantHas = hasProp(wantObj, roleName);
    const offerHas = hasProp(offer, roleName);
    assert(
      !(wantHas && offerHas),
      details`a roleName cannot be in both 'want' and 'offer'`,
    );
    // If roleName is in neither, fill in with a 'want' of empty.
    if (!(wantHas || offerHas)) {
      wantObj[roleName] = amountMaths[roleName].getEmpty();
    }
  });

  return harden({
    want: wantObj,
    offer,
    exit,
  });
};
