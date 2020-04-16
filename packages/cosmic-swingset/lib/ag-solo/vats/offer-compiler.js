/* eslint-disable no-continue */
// We don't use details`` because all of the assertion
// failures can be reflected to the caller without
// security compromise.
import { assert } from '@agoric/assert';

export default ({
  E,
  zoe,
  registry,

  collections: {
    idToOffer,
    brandToMath,
    issuerToIssuerNames,
    issuerToBrand,
    purseToIssuer,
    petnameToPurse,
  },
}) => async (id, offer, hooks = {}) => {
  const {
    instanceRegKey,
    contractIssuerIndexToKeyword = [], // FIXME: Only for compatibility with Zoe pre-Keywords
    proposalTemplate,
  } = offer;

  function createKeywordProposalAndPurses(tmpl) {
    const keywordProposal = {};
    if (tmpl.exit) {
      keywordProposal.exit = tmpl.exit;
    }
    const keywordPurses = {};
    const keywordIssuerNames = {};

    const setPurseAmount = (
      keywords,
      issuerNames,
      keyword,
      purse,
      extent = undefined,
    ) => {
      const issuer = purseToIssuer.get(purse);
      issuerNames[keyword] = issuerToIssuerNames.get(issuer);
      const brand = issuerToBrand.get(issuer);
      const amountMath = brandToMath.get(brand);
      if (extent === undefined) {
        keywords[keyword] = amountMath.getEmpty();
      } else {
        keywords[keyword] = amountMath.make(extent);
      }
    };

    for (const dir of ['give', 'want']) {
      if (!proposalTemplate[dir]) {
        continue;
      }
      keywordProposal[dir] = {};
      keywordPurses[dir] = {};
      keywordIssuerNames[dir] = {};
      Object.entries(proposalTemplate[dir]).forEach(([keyword, amount]) => {
        assert(
          amount.pursePetname,
          `Keyword ${dir} ${keyword} has no pursePetname`,
        );
        const purse = petnameToPurse.get(amount.pursePetname);
        assert(
          purse,
          `Keyword ${dir} ${keyword} pursePetname ${amount.pursePetname} is not a purse`,
        );
        keywordPurses[dir][keyword] = purse;
        setPurseAmount(
          keywordProposal[dir],
          keywordIssuerNames[dir],
          keyword,
          purse,
          amount.extent,
        );
      });
    }

    return { keywordProposal, keywordPurses, keywordIssuerNames };
  }

  const {
    keywordProposal,
    keywordPurses,
    keywordIssuerNames,
  } = createKeywordProposalAndPurses(proposalTemplate);

  // Enrich the proposalTemplate.
  const newProposalTemplate = { ...proposalTemplate };
  for (const dir of ['give', 'want']) {
    if (!proposalTemplate[dir]) {
      continue;
    }

    const newRules = {};
    Object.entries(proposalTemplate[dir] || {}).forEach(([keyword, amount]) => {
      newRules[keyword] = { ...amount, ...keywordIssuerNames[dir][keyword] };
    });
    newProposalTemplate[dir] = newRules;
  }

  // Resave the enriched offer.
  idToOffer.set(id, {
    ...offer,
    proposalTemplate: newProposalTemplate,
  });

  // Get the instance.
  const instanceHandle = await E(registry).get(instanceRegKey);
  const {
    publicAPI,
    issuerKeywordRecord, // Only present with Zoe 0.3.0.
    terms: { issuers: contractIssuers },
  } = await E(zoe).getInstanceRecord(instanceHandle);

  // If issuerKeywordRecord exists, use it.
  const keywordIssuers = { ...issuerKeywordRecord };
  if (!issuerKeywordRecord) {
    // Otherwise (pre-Zoe Keywords), use the index-to-keyword.
    Object.values(contractIssuerIndexToKeyword).forEach((keyword, i) => {
      keywordIssuers[keyword] = contractIssuers[i];
    });
  }

  async function finishCompile(proposal, directedPurses) {
    const keywordBrands = {};
    let cachedKeywordBrandsP;
    const getKeywordBrandsP = () => {
      if (cachedKeywordBrandsP) {
        return cachedKeywordBrandsP;
      }
      cachedKeywordBrandsP = Promise.all(
        Object.entries(keywordIssuers).map(async ([keyword, issuer]) => {
          keywordBrands[keyword] = await E(issuer).getBrand();
        }),
      );
      return cachedKeywordBrandsP;
    };

    // This replaces instances of keywords ending with a '*' with
    // a keywordname that matches the brand, if there is one.
    //
    // Not recursive, since the multiwords are only processed
    // after an Object.keys call on the keywords object.
    const mergedPurses = {};
    const mergedKeywords = {};
    const replaceMultiwords = async (keywords, purses, keyword, dir) => {
      let newName = keyword;
      if (keyword.endsWith('*')) {
        // It's a multiword.

        // Find the only keyword with this prefix and brand.
        const multiword = keyword;
        const multiwordPrefix = multiword.substr(0, multiword.length - 1);

        // Now we actually need the brands (if we haven't already gotten them).
        await getKeywordBrandsP();
        const { brand } = keywords[multiword];
        const keywordMatches = Object.entries(keywordBrands).filter(
          ([rname, rbrand]) =>
            rname.startsWith(multiwordPrefix) && rbrand === brand,
        );

        // We don't use details`...` because these error messages should be available
        // verbatim to the caller.
        assert(
          keywordMatches.length > 0,
          `${dir} multiword ${multiword} has no matching brand`,
        );

        assert(
          keywordMatches.length === 1,
          `${dir} multiword ${multiword} is ambiguous (${keywordMatches
            .map(([rname, _rbrand]) => rname)
            .join(',')})`,
        );

        [[newName]] = keywordMatches;
      }

      assert(
        mergedKeywords[newName] === undefined,
        `${dir} keyword ${keyword} (now ${newName}) is already used`,
      );

      assert(
        mergedPurses[newName] === undefined,
        `${dir} keyword ${keyword} purse (now ${newName}) is already used`,
      );

      if (keyword !== newName) {
        // Update the proposal we were passed in.
        keywords[newName] = keywords[keyword];
        delete keywords[keyword];
      }
      mergedKeywords[newName] = keywords[keyword];
      mergedPurses[newName] = purses[keyword];
    };

    // Replace multiwords with actual single keywords.
    await Promise.all([
      Promise.all(
        Object.keys(proposal.want || {}).map(keyword =>
          replaceMultiwords(
            proposal.want,
            directedPurses.want,
            keyword,
            'Want',
          ),
        ),
      ),
      Promise.all(
        Object.keys(proposal.give || {}).map(keyword =>
          replaceMultiwords(
            proposal.give,
            directedPurses.give,
            keyword,
            'Offer',
          ),
        ),
      ),
    ]);

    if (issuerKeywordRecord) {
      // We need Zoe Keywords support.
      return { zoeKind: 'keywords', proposal, purses: mergedPurses };
    }

    // FIXME: The rest of this file converts to the old (indexed) Zoe.
    const indexedPurses = [];
    const indexedPayoutRules = await Promise.all(
      contractIssuerIndexToKeyword.map(async (keyword, i) => {
        indexedPurses[i] = mergedPurses[keyword];
        if (proposal.want && proposal.want[keyword]) {
          return { kind: 'wantAtLeast', amount: proposal.want[keyword] };
        }
        if (proposal.give && proposal.give[keyword]) {
          return { kind: 'offerAtMost', amount: proposal.give[keyword] };
        }
        const amount = await E(
          E(contractIssuers[i]).getAmountMath(),
        ).getEmpty();
        return { kind: 'wantAtLeast', amount };
      }),
    );

    // Cheap translation of exitObj to exitRule.
    const { exit: exitObj = { onDemand: null } } = proposal;
    const exitKind = Object.keys(exitObj)[0];
    const exitRule = {};
    Object.entries(exitObj[exitKind] || {}).forEach(([key, val]) => {
      exitRule[key] = val;
    });
    exitRule.kind = exitKind;

    return {
      zoeKind: 'indexed',
      proposal: { payoutRules: indexedPayoutRules, exitRule },
      purses: indexedPurses,
    };
  }

  // Get the invite and the (possibly indexed) rules and purses.
  const { zoeKind, proposal, purses } = await finishCompile(
    keywordProposal,
    keywordPurses,
  );
  return { zoeKind, publicAPI, proposal, purses, hooks };
};
