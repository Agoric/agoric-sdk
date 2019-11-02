import harden from '@agoric/harden';

function checkOrder(a0, a1, b0, b1) {
  if (a0 === b0 && a1 === b1) {
    return true;
  }

  if (a0 === b1 && a1 === b0) {
    return false;
  }

  throw new TypeError('Canot resove asset ordering');
}

export function makeExchange(E, log, host, zoe, registrar) {

  function getPrice(instanceId, extent0, assayId0, assayId1) {
    const instanceHandleP = E(registrar).get(instanceId);
    const regAssay0P = E(registrar).get(assayId0);
    const regAssay1P = E(registrar).get(assayId1);
    const unit0P = E(regAssay0P).makeUnits(extent0);

    return Promise.all([instanceHandleP, regAssay0P, regAssay1P, unit0P]).then(
      ([instanceHandle, regAssay0, regAssay1, unit0]) =>
        E(zoe)
          .getInstance(instanceHandle)
          .then(
            ({
              terms: {
                assays: [contractAssay0, contractAssay1],
              },
              instance,
            }) => {
              // Check whether we sell on contract assay 0 or 1.
              const normal = checkOrder(
                regAssay0,
                regAssay1,
                contractAssay0,
                contractAssay1,
              );
              // Order the units accordingly.
              const units = [
                normal ? unit0 : undefined,
                normal ? undefined : unit0,
                undefined,
              ];
              return E(instance)
                .getPrice(units)
                .then(unit1 => unit1.extent);
            },
          ),
    );
  }

  function getOfferRules(instanceId, extent0, assayId0, assayId1) {
    const instanceHandleP = E(registrar).get(instanceId);
    const regAssay0P = E(registrar).get(assayId0);
    const regAssay1P = E(registrar).get(assayId1);

    return Promise.all([instanceHandleP, regAssay0P, regAssay1P]).then(
      ([instanceHandle, regAssay0, regAssay1]) =>
        E(zoe)
          .getInstance(instanceHandle)
          .then(({ terms: { assays: [contractAssay0, contractAssay1] } }) => {
            // Check whether we sell on contract assay 0 or 1.
            const normal = checkOrder(
              regAssay0,
              regAssay1,
              contractAssay0,
              contractAssay1,
            );

            // Contrust the rules for serialization (no instance).
            // This rule is the payment
            const rule0 = {
              kind: 'offerExactly',
              units: { assayId: assayId0, extent: extent0 },
            };
            // This rule is the payout
            const rule1 = {
              kind: 'wantAtLeast',
              units: { assayId: assayId1 },
            };

            // Order the rules accordingly.
            const offerRules = harden({
              payoutRules: [
                normal ? rule0 : rule1,
                normal ? rule1 : rule0,
                {
                  kind: 'wantAtLeast',
                  units: {},
                },
              ],
              exitRule: {
                kind: 'onDemand',
              },
            });

            return offerRules;
          }),
    );
  }

  const autoswap = harden({
    userFacet: {
      getPrice,
      getOfferRules,
    },
    adminFacet: {},
    readFacet: {},
  });

  return autoswap;
}
