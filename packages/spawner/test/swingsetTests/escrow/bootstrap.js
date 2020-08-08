// Copyright (C) 2019 Agoric, under Apache License 2.0

/* global harden */
import { E } from '@agoric/eventual-send';
import makeIssuerKit from '@agoric/ertp';
import { allComparable } from '@agoric/same-structure';
import { assert, details } from '@agoric/assert';

import { escrowExchangeSrcs } from '../../../src/escrow';

export function buildRootObject(vatPowers, vatParameters) {
  const log = vatPowers.testLog;

  function testEscrowServiceMismatches(host, randMintE, artMintE) {
    log('starting testEscrowServiceCheckMismatches');
    const installationE = E(host).install(escrowExchangeSrcs);
    const randUnitsE = E(E(randMintE).getIssuer()).makeUnits(3);
    const blueBoyUnits = E(E(artMintE).getIssuer()).makeUnits('Blue Boy');
    const blueGirlUnits = E(E(artMintE).getIssuer()).makeUnits('Blue Girl');
    const actualTermsE = harden({
      left: randUnitsE,
      right: blueBoyUnits,
    });
    const allegedTermsE = harden({
      left: randUnitsE,
      right: blueGirlUnits,
    });
    const invitesE = E(installationE).spawn(actualTermsE);
    const result = invitesE.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteUnits => {
          return allComparable(allegedTermsE).then(terms => {
            return E(installationE).checkUnits(
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

  function testEscrowServiceSuccess(host, randMintE, artMintE) {
    log('starting testEscrowServiceSuccess');
    const installationE = E(host).install(escrowExchangeSrcs);
    const randUnitsE = E(E(randMintE).getIssuer()).makeUnits(3);
    const screamUnitsE = E(E(artMintE).getIssuer()).makeUnits('The Scream');
    const termsE = harden({ left: randUnitsE, right: screamUnitsE });
    const invitesE = E(installationE).spawn(termsE);
    const result = invitesE.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteUnits => {
          return allComparable(termsE).then(terms => {
            return E(installationE).checkUnits(allegedLeftInviteUnits, terms);
          });
        });
    });
    result.then(r => {
      assert(r, details`expected successful check ${result}`);
    });
  }

  function testEscrowCheckPartialWrongPrice(host, randMintE, artMintE) {
    log('starting testEscrowServiceCheckPartial wrong price');
    const installationE = E(host).install(escrowExchangeSrcs);
    const randUnitsE = E(E(randMintE).getIssuer()).makeUnits(3);
    const otherRandUnitsE = E(E(randMintE).getIssuer()).makeUnits(5);
    const blueBoyUnits = E(E(artMintE).getIssuer()).makeUnits('Blue Boy');
    const actualTermsE = harden({
      left: randUnitsE,
      right: blueBoyUnits,
    });
    const invitesE = E(installationE).spawn(actualTermsE);
    const result = invitesE.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteUnits => {
          return allComparable(otherRandUnitsE).then(otherLeftTerms => {
            return E(installationE).checkPartialUnits(
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

  function testEscrowCheckPartialWrongStock(host, randMintE, artMintE) {
    log('starting testEscrowServiceCheckPartial wrong stock');
    const installationE = E(host).install(escrowExchangeSrcs);
    const randUnitsE = E(E(randMintE).getIssuer()).makeUnits(3);
    const blueBoyUnits = E(E(artMintE).getIssuer()).makeUnits('Blue Boy');
    const blueGirlUnits = E(E(artMintE).getIssuer()).makeUnits('Blue Girl');
    const actualTermsE = harden({
      left: randUnitsE,
      right: blueBoyUnits,
    });
    const invitesE = E(installationE).spawn(actualTermsE);
    const result = invitesE.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteUnits => {
          return allComparable(blueGirlUnits).then(otherRightTerms => {
            return E(installationE).checkPartialUnits(
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

  function testEscrowCheckPartialWrongSeat(host, randMintE, artMintE) {
    log('starting testEscrowServiceCheckPartial wrong seat');
    const installationE = E(host).install(escrowExchangeSrcs);
    const randUnitsE = E(E(randMintE).getIssuer()).makeUnits(3);
    const blueBoyUnits = E(E(artMintE).getIssuer()).makeUnits('Blue Boy');
    const actualTermsE = harden({
      left: randUnitsE,
      right: blueBoyUnits,
    });
    const invitesE = E(installationE).spawn(actualTermsE);
    const result = invitesE.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteUnits => {
          return allComparable(actualTermsE).then(terms => {
            return E(installationE).checkPartialUnits(
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
      const { mint: randMintE } = E(vats.mint).makeIssuerKit('rand');

      const { mint: artMintE } = makeIssuerKit('art', 'set');
      switch (vatParameters.argv[0]) {
        case 'escrow misMatches': {
          return testEscrowServiceMismatches(host, randMintE, artMintE);
        }
        case 'escrow matches': {
          return testEscrowServiceSuccess(host, randMintE, artMintE);
        }
        case 'escrow partial seat': {
          return testEscrowCheckPartialWrongSeat(host, randMintE, artMintE);
        }
        case 'escrow partial price': {
          return testEscrowCheckPartialWrongPrice(host, randMintE, artMintE);
        }
        case 'escrow partial stock': {
          return testEscrowCheckPartialWrongStock(host, randMintE, artMintE);
        }
        default: {
          throw Error(`unrecognized argument value ${vatParameters.argv[0]}`);
        }
      }
    },
  };
  return harden(obj0);
}
