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

    // This code has been rearranged to remove this cascaded message.
    // See https://github.com/Agoric/SwingSet/issues/183
    // const assay0Label = E(regAssay0P).getLabel();
    // In order to work around the cascade, we send the getLabel message later
    return Promise.all([instanceHandleP, regAssay0P, regAssay1P]).then(
      ([instanceHandle, regAssay0, regAssay1]) =>
        E(zoe)
          .getInstance(instanceHandle)
          .then(
            ({
              terms: {
                assays: [contractAssay0, contractAssay1],
              },
              instance,
            }) => {
              const assay0LabelP = E(regAssay0P).getLabel();
              // Check whether we sell on contract assay 0 or 1.
              const normal = checkOrder(
                regAssay0,
                regAssay1,
                contractAssay0,
                contractAssay1,
              );
              return assay0LabelP.then(label => {
                const unit0 = harden({label, extent: extent0});
                // Order the units accordingly.
                const units = [
                  normal ? unit0 : undefined,
                  normal ? undefined : unit0,
                  undefined,
                ];
                return E(instance)
                    .getPrice(units)
                    .then(unit1 => unit1.extent);
              })
            },
          )
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
