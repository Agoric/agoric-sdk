import harden from '@agoric/harden';
import { insist } from '@agoric/ertp/util/insist';

// O(n^2), probably better than that though. How expensive is splicing?
export const sortPayoutRules = (assays, unitOpsArray, hardenedPayoutRules) => {
  const payoutRules = [...hardenedPayoutRules];
  insist(
    payoutRules.length <= assays.length,
  )`payoutRules cannot be longer than the contract's assays`;

  const newPayoutRules = [];

  for (let i = 0; i < assays.length; i += 1) {
    let assayFound = false;
    for (let j = 0; j < payoutRules.length; j += 1) {
      const payoutRule = payoutRules[j];
      if (payoutRule.units.label.assay === assays[i]) {
        assayFound = true;
        payoutRules.splice(j, 1);
        newPayoutRules.push(payoutRule);
      }
    }
    if (!assayFound) {
      newPayoutRules.push({
        kind: 'wantAtLeast',
        units: unitOpsArray[i].empty(),
      });
    }
  }
  return harden(newPayoutRules);
};
