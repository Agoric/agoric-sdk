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

export async function makeExchange(E, log, host, zoe, registrar) {
  // === API

  async function getPrice(instanceId, extent0, assayId0, assayId1) {
    const instanceHandle = await E(registrar).get(instanceId);

    // Find the assays in the registrar
    const registrarAssays = await Promise.all([
      E(registrar).get(assayId0),
      E(registrar).get(assayId1),
    ]);

    // Get the assays in the contract.
    // Get the contract instance.
    const {
      terms: { assays: contractAssays },
      instance,
    } = await E(zoe).getInstance(instanceHandle);

    // Check whether we sell on contract assay 0 or 1.
    const normal = checkOrder(
      registrarAssays[0],
      registrarAssays[1],
      contractAssays[0],
      contractAssays[1],
    );

    // Units of the input amount.
    const unit0 = await E(registrarAssays[0]).makeUnits(extent0);

    // Order the units accordingly.
    const units = [
      normal ? unit0 : undefined,
      normal ? undefined : unit0,
      undefined,
    ];

    // Extract the price (multi steps for debugging).
    const unit1 = await E(instance).getPrice(units);
    const { extent } = unit1;
    return extent;
  }

  async function getOfferRules(instanceId, extent, assayId0, assayId1) {
    const instanceHandle = await E(registrar).get(instanceId);

    // Find the assays by id in the registrar.
    const registrarAssays = await Promise.all([
      E(registrar).get(assayId0),
      E(registrar).get(assayId1),
    ]);

    // Get the assays in the contract.
    const {
      terms: { assays: contractAssays },
    } = await E(zoe).getInstance(instanceHandle);

    // Check whether we sell on contract assay 0 or 1.
    const normal = checkOrder(
      registrarAssays[0],
      registrarAssays[1],
      contractAssays[0],
      contractAssays[1],
    );

    // Contrust the rules for serialization (no instance).
    // This rule is the payment
    const rule0 = {
      kind: 'offerExactly',
      units: { assayId: assayId0, extent },
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
