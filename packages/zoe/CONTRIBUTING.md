# Contributing

Thank you!

## Contact

We use github issues for all bug reports:
https://github.com/Agoric/agoric-sdk/issues Please add a [Zoe]
prefix to the title and Zoe tag to Zoe-related issues.

## Installing, Testing

You'll need Node.js version 11 or higher. 

* `git clone https://github.com/Agoric/agoric-sdk/`
* `cd agoric-sdk`
* `yarn install`
* `yarn build` (This *must* be done at the top level to build all of
  the packages)
* `cd packages/Zoe`
* `yarn test`

## Pull Requests

Before submitting a pull request, please:

* run `yarn test` within `packages/Zoe` and make sure all the unit
  tests pass (running `yarn test` at the top level will test all the
  monorepo packages, which can be a good integration test.)
* run `yarn run lint-fix` to reformat the code according to our
  `eslint` profile, and fix any complaints that it can't automatically
  correct

## Making a Release

* edit NEWS.md enumerating any user-visible changes. (If there are
  changelogs/ snippets, consolidate them to build the new NEWS
  entries, and then delete all the snippets.)
* make sure `yarn config set version-git-tag false` is the current
  setting
* `yarn version` (interactive) or `yarn version --major` or `yarn version --minor`
  * that changes `package.json`
  * and does NOT do a `git commit` and `git tag`
* `git add .`
* `git commit -m "bump version"`
* `git tag -a zoe-v$VERSION -m "zoe-v$VERSION"`
* `yarn publish --access public`
* `git push`
* `git push origin zoe-v$VERSION`

Then, once the release has been made, the packages dependent on Zoe
should be updated in a PR reviewed by the owners of the packages.
Those packages are:
* packages/agoric-cli (`packages/agoric-cli/template/contract/package.json`)
* packages/cosmic-swingset (`packages/cosmic-swingset/package.json`)

To test that that the Zoe update works (in the most basic sense) with cosmic-swingset, do:

1. Run `yarn install` from the workspace root
2. Run `yarn build` from the workspace root
3. `cd packages/cosmic-swingset`
4. `make scenario3-setup`
5. `make scenario3-run-client`
6. Open `http://127.0.0.1:8000/`
8. `moolaAssayP = E(home.registrar).get("moola_3467");`
9. `simoleanAssayP = E(home.registrar).get("simolean_2059");`
10. `automaticRefundHandleP = E(home.zoe).install("function getExport() { 'use strict'; let exports = {}; const module = { exports }; 'use strict';\n\nObject.defineProperty(exports, '__esModule', { value: true });\n\nfunction _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }\n\nvar harden = _interopDefault(require('@agoric/harden'));\n\n/**\n * This is a very trivial contract to explain and test Zoe.\n * AutomaticRefund just gives you back what you put in. It has one\n * method: `makeOffer`. AutomaticRefund then tells Zoe to complete the\n * offer, which gives the user their payout through Zoe. Other\n * contracts will use these same steps, but they will have more\n * sophisticated logic and interfaces.\n * @param {contractFacet} zoe - the contract facet of zoe\n */\nconst makeContract = harden((zoe, terms) => {\n  let offersCount = 0;\n  const makeSeatInvite = () => {\n    const seat = harden({\n      makeOffer: () => {\n        offersCount += 1;\n        // eslint-disable-next-line no-use-before-define\n        zoe.complete(harden([inviteHandle]));\n        return `The offer was accepted`;\n      },\n    });\n    const { invite, inviteHandle } = zoe.makeInvite(seat, {\n      seatDesc: 'getRefund',\n    });\n    return invite;\n  };\n  return harden({\n    invite: makeSeatInvite(),\n    publicAPI: {\n      getOffersCount: () => offersCount,\n      makeInvite: makeSeatInvite,\n    },\n    terms,\n  });\n});\n\nexports.makeContract = makeContract;\n\n\nreturn module.exports;\n}\n", "getExport");`
11. `inviteP = automaticRefundHandleP.then( automaticRefundHandle =>
    E(home.zoe).makeInstance(automaticRefundHandle, harden({ assays:
    [moolaAssayP, simoleanAssayP]})));`
12. `inviteAssayP = E(home.zoe).getInviteAssay();`
13. `exclInviteP = E(inviteAssayP).claimAll(inviteP);`
14. `E(exclInviteP).getBalance();`
15. `E(moolaAssayP).makeUnits(3).then(units => moola3 = units);`
16. `E(simoleanAssayP).makeUnits(2).then(units => simoleans2 = units);`
17. `offerRules = harden({ payoutRules: [{ kind: 'wantAtLeast', units:
    moola3}, { kind: 'wantAtLeast', units: simoleans2 }], exitRule: {
    kind: 'waived' }});`
18. `seatAndPayoutP = E(home.zoe).redeem(exclInviteP, offerRules,
    harden([undefined, undefined]));`
19. `seatAndPayoutP.then(obj => {seat = obj.seat; payoutP = obj.payout});`
20. `E(seat).makeOffer();`
21. `payoutP.then(p => moolaPayment = p[0]);`
20. `E(moolaPayment).getBalance();` (should be an extent of 0)


To test that the update works with agoric-cli, follow the instructions
for [Developing Agoric CLI](https://github.com/Agoric/agoric-sdk/tree/master/packages/agoric-cli#developing-agoric-cli).
