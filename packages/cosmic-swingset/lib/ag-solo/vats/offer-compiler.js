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
    brandTable,
    purseToBrand,
    issuerToIssuerNames,
    purseMapping,
  },
}) => async (id, offer, hooks = {}) => {
  const { instanceRegKey, proposalTemplate } = offer;

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
      const brand = purseToBrand.get(purse);
      const { issuer, amountMath } = brandTable.get(brand);
      issuerNames[keyword] = issuerToIssuerNames.get(issuer);
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
        const purse = purseMapping.petnameToVal.get(amount.pursePetname);
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
  const { publicAPI, issuerKeywordRecord } = await E(zoe).getInstanceRecord(
    instanceHandle,
  );

  // If issuerKeywordRecord exists, use it.
  const keywordIssuers = { ...issuerKeywordRecord };

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

    return { proposal, purses: mergedPurses };
  }

  // Get the invite and the (possibly indexed) rules and purses.
  const { proposal, purses } = await finishCompile(
    keywordProposal,
    keywordPurses,
  );
  return { publicAPI, proposal, purses, hooks };
};
