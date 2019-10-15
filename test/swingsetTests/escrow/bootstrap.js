// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { escrowExchangeSrcs } from '../../../core/escrow';
import { makeInviteConfig } from '../../../core/config/inviteConfig';
import { insist } from '../../../util/insist';
import { makeMint } from '../../../core/mint';
import { allComparable } from '../../../util/sameStructure';

function build(E, log) {
  function testEscrowServiceMismatches(host, randMintP, artMintP) {
    log('starting testEscrowServiceCheckMismatches');
    const installationP = E(host).install(escrowExchangeSrcs);
    const randAssetDescP = E(E(randMintP).getAssay()).makeAssetDesc(3);
    const blueBoyAssetDesc = E(E(artMintP).getAssay()).makeAssetDesc(
      'Blue Boy',
    );
    const blueGirlAssetDesc = E(E(artMintP).getAssay()).makeAssetDesc(
      'Blue Girl',
    );
    const actualTermsP = harden({
      left: randAssetDescP,
      right: blueBoyAssetDesc,
    });
    const allegedTermsP = harden({
      left: randAssetDescP,
      right: blueGirlAssetDesc,
    });
    const invitesP = E(installationP).spawn(actualTermsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteAssetDesc => {
          return allComparable(allegedTermsP).then(terms => {
            return E(installationP).checkAssetDesc(
              allegedLeftInviteAssetDesc,
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
    const randAssetDescP = E(E(randMintP).getAssay()).makeAssetDesc(3);
    const screamAssetDescP = E(E(artMintP).getAssay()).makeAssetDesc(
      'The Scream',
    );
    const termsP = harden({ left: randAssetDescP, right: screamAssetDescP });
    const invitesP = E(installationP).spawn(termsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteAssetDesc => {
          return allComparable(termsP).then(terms => {
            return E(installationP).checkAssetDesc(
              allegedLeftInviteAssetDesc,
              terms,
            );
          });
        });
    });
    result.then(r => {
      insist(r)`\
expected successful check ${result}`;
    });
  }

  function testEscrowCheckPartialWrongPrice(host, randMintP, artMintP) {
    log('starting testEscrowServiceCheckPartial wrong price');
    const installationP = E(host).install(escrowExchangeSrcs);
    const randAssetDescP = E(E(randMintP).getAssay()).makeAssetDesc(3);
    const otherRandAssetDescP = E(E(randMintP).getAssay()).makeAssetDesc(5);
    const blueBoyAssetDesc = E(E(artMintP).getAssay()).makeAssetDesc(
      'Blue Boy',
    );
    const actualTermsP = harden({
      left: randAssetDescP,
      right: blueBoyAssetDesc,
    });
    const invitesP = E(installationP).spawn(actualTermsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteAssetDesc => {
          return allComparable(otherRandAssetDescP).then(otherLeftTerms => {
            return E(installationP).checkPartialAssetDesc(
              allegedLeftInviteAssetDesc,
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
    const randAssetDescP = E(E(randMintP).getAssay()).makeAssetDesc(3);
    const blueBoyAssetDesc = E(E(artMintP).getAssay()).makeAssetDesc(
      'Blue Boy',
    );
    const blueGirlAssetDesc = E(E(artMintP).getAssay()).makeAssetDesc(
      'Blue Girl',
    );
    const actualTermsP = harden({
      left: randAssetDescP,
      right: blueBoyAssetDesc,
    });
    const invitesP = E(installationP).spawn(actualTermsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteAssetDesc => {
          return allComparable(blueGirlAssetDesc).then(otherRightTerms => {
            return E(installationP).checkPartialAssetDesc(
              allegedLeftInviteAssetDesc,
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
    const randAssetDescP = E(E(randMintP).getAssay()).makeAssetDesc(3);
    const blueBoyAssetDesc = E(E(artMintP).getAssay()).makeAssetDesc(
      'Blue Boy',
    );
    const actualTermsP = harden({
      left: randAssetDescP,
      right: blueBoyAssetDesc,
    });
    const invitesP = E(installationP).spawn(actualTermsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteAssetDesc => {
          return allComparable(actualTermsP).then(terms => {
            return E(installationP).checkPartialAssetDesc(
              allegedLeftInviteAssetDesc,
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
    async bootstrap(argv, vats) {
      const host = await E(vats.host).makeHost();
      const randMintP = E(vats.mint).makeMint('rand');

      const artMintP = makeMint('art', makeInviteConfig);
      switch (argv[0]) {
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
          throw new Error(`unrecognized argument value ${argv[0]}`);
        }
      }
    },
  };
  return harden(obj0);
}
harden(build);

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  log(`=> setup called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, log),
    helpers.vatID,
  );
}
export default harden(setup);
