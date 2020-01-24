import harden from '@agoric/harden';

const replaceAssayInUnits = (map, units) => {
  const {
    label: { allegedName, assay },
    extent,
  } = units;
  return harden({
    label: { allegedName, assay: map.get(assay) },
    extent,
  });
};

const replaceAssayInPayoutRules = (map, payoutRules) => {
  return payoutRules.map(({ kind, units }) =>
    harden({
      kind,
      units: replaceAssayInUnits(map, units),
    }),
  );
};

// TODO: write code for dehydration of timers
const replaceTimerInExitRule = (map, exitRule) => exitRule;

const replaceInOfferRules = (assayMap, timerMap, offerRules) => {
  const { payoutRules, exitRule } = offerRules;
  return harden({
    payoutRules: replaceAssayInPayoutRules(assayMap, payoutRules),
    exitRule: replaceTimerInExitRule(timerMap, exitRule),
  });
};

export const dehydrateUnits = (assayToRegKeyMap, units) =>
  replaceAssayInUnits(assayToRegKeyMap, units);
export const hydrateUnits = (regKeyToAssayMap, dehydratedUnits) =>
  replaceAssayInUnits(regKeyToAssayMap, dehydratedUnits);

export const dehydratePayoutRules = (assayToRegKeyMap, payoutRules) =>
  replaceAssayInPayoutRules(assayToRegKeyMap, payoutRules);
export const hydratePayoutRules = (regKeyToAssayMap, dehydratedPayoutRules) =>
  replaceAssayInPayoutRules(regKeyToAssayMap, dehydratedPayoutRules);

export const dehydrateOfferRules = (
  assayToRegKeyMap,
  timerToRegKeyMap,
  offerRules,
) => replaceInOfferRules(assayToRegKeyMap, timerToRegKeyMap, offerRules);

export const hydrateOfferRules = (
  regKeyToAssayMap,
  regKeyToTimerMap,
  dehydratedOfferRules,
) =>
  replaceInOfferRules(regKeyToAssayMap, regKeyToTimerMap, dehydratedOfferRules);
