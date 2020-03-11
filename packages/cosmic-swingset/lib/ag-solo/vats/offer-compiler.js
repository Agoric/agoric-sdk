import { assert, details } from '@agoric/assert';

export default ({
  E,
  zoe,
  registrar,

  collections: {
    idToOfferDesc,
    brandToMath,
    issuerToIssuerNames,
    issuerToBrand,
    purseToIssuer,
    petnameToPurse,
  },
}) => async (id, offerDesc, hooks = {}) => {
  const {
    instanceRegKey,
    contractIssuerIndexToRole = [], // FIXME: Only for compatibility with Zoe pre-Roles
    offerRulesTemplate,
  } = offerDesc;

  const roleIssuerNames = {};
  function createRoleOfferRulesAndPurses(tmpl) {
    const roleOfferRules = { exit: tmpl.exit };
    const rolePurses = {};

    const setPurseAmount = (roles, role, purse, extent = undefined) => {
      const issuer = purseToIssuer.get(purse);
      roleIssuerNames[role] = issuerToIssuerNames.get(issuer);
      const brand = issuerToBrand.get(issuer);
      let amount;
      if (extent === undefined) {
        amount = brandToMath.get(brand).getEmpty();
      } else {
        amount = { brand, extent };
      }
      roles[role] = amount;
    };

    if (offerRulesTemplate.want) {
      roleOfferRules.want = {};
    }
    Object.entries(offerRulesTemplate.want || {}).forEach(([role, amount]) => {
      assert(
        amount.pursePetname,
        details`Want role ${role} has no pursePetname`,
      );
      const purse = petnameToPurse.get(amount.pursePetname);
      assert(
        purse,
        details`Want role ${role} pursePetname ${amount.pursePetname} is not a purse`,
      );
      rolePurses[role] = purse;
      setPurseAmount(roleOfferRules.want, role, purse, amount.extent);
    });

    if (offerRulesTemplate.offer) {
      roleOfferRules.offer = {};
    }
    Object.entries(offerRulesTemplate.offer || {}).forEach(([role, amount]) => {
      assert(
        amount.pursePetname,
        details`Offer role ${role} has no pursePetname`,
      );
      const purse = petnameToPurse.get(amount.pursePetname);
      assert(
        purse,
        details`Offer role ${role} pursePetname ${amount.pursePetname} is not a purse`,
      );
      rolePurses[role] = purse;
      setPurseAmount(roleOfferRules.offer, role, purse, amount.extent);
    });

    return { roleOfferRules, rolePurses };
  }

  const { roleOfferRules, rolePurses } = createRoleOfferRulesAndPurses(
    offerRulesTemplate,
  );

  // Enrich the offerRulesTemplate.
  const newOfferRulesTemplate = { ...offerRulesTemplate };
  if (offerRulesTemplate.want) {
    const newRules = {};
    Object.entries(offerRulesTemplate.want || {}).forEach(([role, amount]) => {
      newRules[role] = { ...amount, ...roleIssuerNames[role] };
    });
    newOfferRulesTemplate.want = newRules;
  }

  if (offerRulesTemplate.offer) {
    const newRules = {};
    Object.entries(offerRulesTemplate.offer || {}).forEach(([role, amount]) => {
      newRules[role] = { ...amount, ...roleIssuerNames[role] };
    });
    newOfferRulesTemplate.offer = newRules;
  }

  // Resave the enriched offerDesc.
  idToOfferDesc.set(id, {
    ...offerDesc,
    offerRulesTemplate: newOfferRulesTemplate,
  });

  // Get the instance.
  const instanceHandle = await E(registrar).get(instanceRegKey);
  const {
    publicAPI,
    roles: contractRoleIssuers,
    terms: { issuers: contractIssuers },
  } = await E(zoe).getInstance(instanceHandle);

  const roleIssuers = { ...contractRoleIssuers };
  Object.values(contractIssuerIndexToRole).forEach((role, i) => {
    roleIssuers[role] = contractIssuers[i];
  });

  async function finishCompile(offerRules, purses) {
    const roleBrands = {};
    let cachedRoleBrandsP;
    const getRoleBrandsP = () => {
      if (cachedRoleBrandsP) {
        return cachedRoleBrandsP;
      }
      cachedRoleBrandsP = Promise.all(
        Object.entries(roleIssuers).map(async ([role, issuer]) => {
          roleBrands[role] = await E(issuer).getBrand();
        }),
      );
      return cachedRoleBrandsP;
    };

    const replacePlaceholderRoles = async (roles, role) => {
      if (role[0] !== '$') {
        return;
      }

      // It's a placeholder role.  Find the first matching role with that brand.
      await getRoleBrandsP();
      const { brand } = roles[role];
      const roleEnt = Object.entries(roleBrands).find(
        ([_rname, rbrand]) => rbrand === brand,
      );
      assert(roleEnt, details`Placeholder role ${role} has no matching brand`);
      roles[roleEnt[0]] = roles[role];
      delete roles[role];
      purses[roleEnt[0]] = purses[role];
      delete purses[role];
    };

    // Swap the placeholder roles for actual roles.
    await Promise.all([
      Promise.all(
        Object.keys(offerRules.want || {}).map(role =>
          replacePlaceholderRoles(offerRules.want, role),
        ),
      ),
      Promise.all(
        Object.keys(offerRules.offer || {}).map(role =>
          replacePlaceholderRoles(offerRules.offer, role),
        ),
      ),
    ]);

    if (contractIssuerIndexToRole.length === 0) {
      // We rely on Zoe Roles support.
      return { zoeKind: 'roles', offerRules, purses };
    }

    const indexedPurses = [];
    const indexedPayoutRules = await Promise.all(
      contractIssuerIndexToRole.map(async (role, i) => {
        indexedPurses[i] = purses[role];
        if (offerRules.want && offerRules.want[role]) {
          return { kind: 'wantAtLeast', amount: offerRules.want[role] };
        }
        if (offerRules.offer && offerRules.offer[role]) {
          return { kind: 'offerAtMost', amount: offerRules.offer[role] };
        }
        const amount = await E(
          E(contractIssuers[i]).getAmountMath(),
        ).getEmpty();
        return { kind: 'wantAtLeast', amount };
      }),
    );

    // Cheap translation of exitObj to exitRule.
    const exitObj = offerRules.exit || { onDemand: {} };
    const exitKind = Object.keys(exitObj)[0];
    const exitRule = {};
    Object.entries(exitObj[exitKind]).forEach(([key, val]) => {
      // Prevent functions from slipping in.
      if (typeof val !== 'function') {
        exitRule[key] = val;
      }
    });
    exitRule.kind = exitKind;

    return {
      zoeKind: 'indexed',
      offerRules: { payoutRules: indexedPayoutRules, exitRule },
      purses: indexedPurses,
    };
  }

  // Get the invite and the (possibly indexed) rules and purses.
  const { zoeKind, offerRules, purses } = await finishCompile(
    roleOfferRules,
    rolePurses,
  );
  return { zoeKind, publicAPI, offerRules, purses, hooks };
};
