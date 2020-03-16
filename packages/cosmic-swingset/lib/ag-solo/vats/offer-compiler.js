/* eslint-disable no-continue */
// We don't use details`` because all of the assertion
// failures can be reflected to the caller without
// security compromise.
import { assert } from '@agoric/assert';

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
      const amountMath = brandToMath.get(brand);
      if (extent === undefined) {
        roles[role] = amountMath.getEmpty();
      } else {
        roles[role] = amountMath.make(extent);
      }
    };

    for (const dir of ['offer', 'want']) {
      if (!offerRulesTemplate[dir]) {
        continue;
      }
      roleOfferRules[dir] = {};
      rolePurses[dir] = {};
      Object.entries(offerRulesTemplate[dir]).forEach(([role, amount]) => {
        assert(amount.pursePetname, `Role ${dir} ${role} has no pursePetname`);
        const purse = petnameToPurse.get(amount.pursePetname);
        assert(
          purse,
          `Role ${dir} ${role} pursePetname ${amount.pursePetname} is not a purse`,
        );
        rolePurses[dir][role] = purse;
        setPurseAmount(roleOfferRules[dir], role, purse, amount.extent);
      });
    }

    return { roleOfferRules, rolePurses };
  }

  const { roleOfferRules, rolePurses } = createRoleOfferRulesAndPurses(
    offerRulesTemplate,
  );

  // Enrich the offerRulesTemplate.
  const newOfferRulesTemplate = { ...offerRulesTemplate };
  for (const dir of ['offer', 'want']) {
    if (!offerRulesTemplate[dir]) {
      continue;
    }

    const newRules = {};
    Object.entries(offerRulesTemplate[dir] || {}).forEach(([role, amount]) => {
      newRules[role] = { ...amount, ...roleIssuerNames[role] };
    });
    newOfferRulesTemplate[dir] = newRules;
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
    roles: contractRoleIssuers, // Only present with Zoe Roles.
    terms: { issuers: contractIssuers },
  } = await E(zoe).getInstance(instanceHandle);

  // If contractRoleIssuers exists, use it.
  const roleIssuers = { ...contractRoleIssuers };
  if (!contractRoleIssuers) {
    // Otherwise (pre-Zoe Roles), use the index-to-role.
    Object.values(contractIssuerIndexToRole).forEach((role, i) => {
      roleIssuers[role] = contractIssuers[i];
    });
  }

  async function finishCompile(offerRules, directedPurses) {
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

    // This replaces instances of roles ending with a '*' with
    // a rolename that matches the brand, if there is one.
    //
    // Not recursive, since the multiroleNames are only processed
    // after an Object.keys call on the roles object.
    const mergedPurses = {};
    const mergedRoles = {};
    const replaceMultiroles = async (roles, purses, roleName, dir) => {
      let newName = roleName;
      if (roleName.endsWith('*')) {
        // It's a multirole.

        // Find the only role with this prefix and brand.
        const multiroleName = roleName;
        const multirolePrefix = multiroleName.substr(
          0,
          multiroleName.length - 1,
        );

        // Now we actually need the brands (if we haven't already gotten them).
        await getRoleBrandsP();
        const { brand } = roles[multiroleName];
        const roleMatches = Object.entries(roleBrands).filter(
          ([rname, rbrand]) =>
            rname.startsWith(multirolePrefix) && rbrand === brand,
        );

        // We don't use details`...` because these error messages should be available
        // verbatim to the caller.
        assert(
          roleMatches.length > 0,
          `${dir} multirole ${multiroleName} has no matching brand`,
        );

        assert(
          roleMatches.length === 1,
          `${dir} multirole ${multiroleName} is ambiguous (${roleMatches
            .map(([rname, _rbrand]) => rname)
            .join(',')})`,
        );

        [[newName]] = roleMatches;
      }

      assert(
        mergedRoles[newName] === undefined,
        `${dir} role ${roleName} (now ${newName}) is already used`,
      );

      assert(
        mergedPurses[newName] === undefined,
        `${dir} role ${roleName} purse (now ${newName}) is already used`,
      );

      if (roleName !== newName) {
        // Update the offerRules we were passed in.
        roles[newName] = roles[roleName];
        delete roles[roleName];
      }
      mergedRoles[newName] = roles[roleName];
      mergedPurses[newName] = purses[roleName];
    };

    // Replace multiroles with actual single roles.
    await Promise.all([
      Promise.all(
        Object.keys(offerRules.want || {}).map(role =>
          replaceMultiroles(offerRules.want, directedPurses.want, role, 'Want'),
        ),
      ),
      Promise.all(
        Object.keys(offerRules.offer || {}).map(role =>
          replaceMultiroles(
            offerRules.offer,
            directedPurses.offer,
            role,
            'Offer',
          ),
        ),
      ),
    ]);

    if (contractRoleIssuers) {
      // We need Zoe Roles support.
      return { zoeKind: 'roles', offerRules, purses: mergedPurses };
    }

    // FIXME: The rest of this file converts to the old (indexed) Zoe.
    const indexedPurses = [];
    const indexedPayoutRules = await Promise.all(
      contractIssuerIndexToRole.map(async (role, i) => {
        indexedPurses[i] = mergedPurses[role];
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
