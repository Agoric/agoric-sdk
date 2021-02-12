// Copyright (C) 2019 Agoric, under Apache License 2.0

import { E } from '@agoric/eventual-send';
import { makeIssuerKit } from '@agoric/ertp';
import { allComparable } from '@agoric/same-structure';
import { assert, details as X } from '@agoric/assert';

import { escrowExchangeSrcs } from '../../../src/escrow';

export function buildRootObject(vatPowers, vatParameters) {
  const log = vatPowers.testLog;

  function testEscrowServiceMismatches(host, randMintP, artMintP) {
    log('starting testEscrowServiceCheckMismatches');
    const installationP = E(host).install(escrowExchangeSrcs);
    const randUnitsP = E(E(randMintP).getIssuer()).makeUnits(3);
    const blueBoyUnits = E(E(artMintP).getIssuer()).makeUnits('Blue Boy');
    const blueGirlUnits = E(E(artMintP).getIssuer()).makeUnits('Blue Girl');
    const actualTermsP = harden({
      left: randUnitsP,
      right: blueBoyUnits,
    });
    const allegedTermsP = harden({
      left: randUnitsP,
      right: blueGirlUnits,
    });
    const invitesP = E(installationP).spawn(actualTermsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteUnits => {
          return allComparable(allegedTermsP).then(terms => {
            return E(installationP).checkUnits(
              allegedLeftInviteUnits,
              terms,
              'left',
            );
          });
        });
    });
    result.then(
      r => {
        log(`didn't expect successful check ${r}`);
      },
      r => {
        log(`expected unsuccessful check ${r}`);
      },
    );
  }

  function testEscrowServiceSuccess(host, randMintP, artMintP) {
    log('starting testEscrowServiceSuccess');
    const installationP = E(host).install(escrowExchangeSrcs);
    const randUnitsP = E(E(randMintP).getIssuer()).makeUnits(3);
    const screamUnitsP = E(E(artMintP).getIssuer()).makeUnits('The Scream');
    const termsP = harden({ left: randUnitsP, right: screamUnitsP });
    const invitesP = E(installationP).spawn(termsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteUnits => {
          return allComparable(termsP).then(terms => {
            return E(installationP).checkUnits(allegedLeftInviteUnits, terms);
          });
        });
    });
    result.then(r => {
      assert(r, X`expected successful check ${result}`);
    });
  }

  function testEscrowCheckPartialWrongPrice(host, randMintP, artMintP) {
    log('starting testEscrowServiceCheckPartial wrong price');
    const installationP = E(host).install(escrowExchangeSrcs);
    const randUnitsP = E(E(randMintP).getIssuer()).makeUnits(3);
    const otherRandUnitsP = E(E(randMintP).getIssuer()).makeUnits(5);
    const blueBoyUnits = E(E(artMintP).getIssuer()).makeUnits('Blue Boy');
    const actualTermsP = harden({
      left: randUnitsP,
      right: blueBoyUnits,
    });
    const invitesP = E(installationP).spawn(actualTermsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteUnits => {
          return allComparable(otherRandUnitsP).then(otherLeftTerms => {
            return E(installationP).checkPartialUnits(
              allegedLeftInviteUnits,
              otherLeftTerms,
              'left',
            );
          });
        });
    });

    result.then(
      r => {
        log(`didn't expect successful check ${r}`);
      },
      r => {
        log(`expected wrong price ${r}`);
      },
    );
  }

  function testEscrowCheckPartialWrongStock(host, randMintP, artMintP) {
    log('starting testEscrowServiceCheckPartial wrong stock');
    const installationP = E(host).install(escrowExchangeSrcs);
    const randUnitsP = E(E(randMintP).getIssuer()).makeUnits(3);
    const blueBoyUnits = E(E(artMintP).getIssuer()).makeUnits('Blue Boy');
    const blueGirlUnits = E(E(artMintP).getIssuer()).makeUnits('Blue Girl');
    const actualTermsP = harden({
      left: randUnitsP,
      right: blueBoyUnits,
    });
    const invitesP = E(installationP).spawn(actualTermsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteUnits => {
          return allComparable(blueGirlUnits).then(otherRightTerms => {
            return E(installationP).checkPartialUnits(
              allegedLeftInviteUnits,
              otherRightTerms,
              'right',
            );
          });
        });
    });

    result.then(
      r => {
        log(`didn't expect successful check ${r}`);
      },
      r => {
        log(`expected wrong stock ${r}`);
      },
    );
  }

  function testEscrowCheckPartialWrongSeat(host, randMintP, artMintP) {
    log('starting testEscrowServiceCheckPartial wrong seat');
    const installationP = E(host).install(escrowExchangeSrcs);
    const randUnitsP = E(E(randMintP).getIssuer()).makeUnits(3);
    const blueBoyUnits = E(E(artMintP).getIssuer()).makeUnits('Blue Boy');
    const actualTermsP = harden({
      left: randUnitsP,
      right: blueBoyUnits,
    });
    const invitesP = E(installationP).spawn(actualTermsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteUnits => {
          return allComparable(actualTermsP).then(terms => {
            return E(installationP).checkPartialUnits(
              allegedLeftInviteUnits,
              terms,
              'right',
            );
          });
        });
    });

    result.then(
      r => {
        log(`didn't expect successful check ${r}`);
      },
      r => {
        log(`expected wrong side ${r}`);
      },
    );
  }

  const obj0 = {
    async bootstrap(vats) {
      const host = await E(vats.host).makeHost();
      const { mint: randMintP } = E(vats.mint).makeIssuerKit('rand');

      const { mint: artMintP } = makeIssuerKit('art', 'set');
      switch (vatParameters.argv[0]) {
        case 'escrow misMatches': {
          return testEscrowServiceMismatches(host, randMintP, artMintP);
        }
        case 'escrow matches': {
          return testEscrowServiceSuccess(host, randMintP, artMintP);
        }
        case 'escrow partial seat': {
          return testEscrowCheckPartialWrongSeat(host, randMintP, artMintP);
        }
        case 'escrow partial price': {
          return testEscrowCheckPartialWrongPrice(host, randMintP, artMintP);
        }
        case 'escrow partial stock': {
          return testEscrowCheckPartialWrongStock(host, randMintP, artMintP);
        }
        default: {
          assert.fail(X`unrecognized argument value ${vatParameters.argv[0]}`);
        }
      }
    },
  };
  return harden(obj0);
}
