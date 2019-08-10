// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { escrowExchangeSrcs } from '../../../core/escrow';
import { makeUniAssayConfigMaker } from '../../../core/config/uniAssayConfig';
import { insist } from '../../../util/insist';
import { makeMint } from '../../../core/issuers';
import { allComparable } from '../../../util/sameStructure';

function build(E, log) {
  function testEscrowServiceMismatches(host, randMintP, artMintP) {
    log('starting testEscrowServiceCheckMismatches');
    const installationP = E(host).install(escrowExchangeSrcs);
    const randAmountP = E(E(randMintP).getIssuer()).makeAmount(3);
    const blueBoyAmount = E(E(artMintP).getIssuer()).makeAmount('Blue Boy');
    const blueGirlAmount = E(E(artMintP).getIssuer()).makeAmount('Blue Girl');
    const actualTermsP = harden({ left: randAmountP, right: blueBoyAmount });
    const allegedTermsP = harden({ left: randAmountP, right: blueGirlAmount });
    const invitesP = E(installationP).spawn(actualTermsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteAmount => {
          return allComparable(allegedTermsP).then(terms => {
            return E(installationP).checkAmount(
              allegedLeftInviteAmount,
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
    const randAmountP = E(E(randMintP).getIssuer()).makeAmount(3);
    const screamAmountP = E(E(artMintP).getIssuer()).makeAmount('The Scream');
    const termsP = harden({ left: randAmountP, right: screamAmountP });
    const invitesP = E(installationP).spawn(termsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteAmount => {
          return allComparable(termsP).then(terms => {
            return E(installationP).checkAmount(allegedLeftInviteAmount, terms);
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
    const randAmountP = E(E(randMintP).getIssuer()).makeAmount(3);
    const otherRandAmountP = E(E(randMintP).getIssuer()).makeAmount(5);
    const blueBoyAmount = E(E(artMintP).getIssuer()).makeAmount('Blue Boy');
    const actualTermsP = harden({ left: randAmountP, right: blueBoyAmount });
    const invitesP = E(installationP).spawn(actualTermsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteAmount => {
          return allComparable(otherRandAmountP).then(otherLeftTerms => {
            return E(installationP).checkPartialAmount(
              allegedLeftInviteAmount,
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
    const randAmountP = E(E(randMintP).getIssuer()).makeAmount(3);
    const blueBoyAmount = E(E(artMintP).getIssuer()).makeAmount('Blue Boy');
    const blueGirlAmount = E(E(artMintP).getIssuer()).makeAmount('Blue Girl');
    const actualTermsP = harden({ left: randAmountP, right: blueBoyAmount });
    const invitesP = E(installationP).spawn(actualTermsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteAmount => {
          return allComparable(blueGirlAmount).then(otherRightTerms => {
            return E(installationP).checkPartialAmount(
              allegedLeftInviteAmount,
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
    const randAmountP = E(E(randMintP).getIssuer()).makeAmount(3);
    const blueBoyAmount = E(E(artMintP).getIssuer()).makeAmount('Blue Boy');
    const actualTermsP = harden({ left: randAmountP, right: blueBoyAmount });
    const invitesP = E(installationP).spawn(actualTermsP);
    const result = invitesP.then(invites => {
      return E(invites.left)
        .getBalance()
        .then(allegedLeftInviteAmount => {
          return allComparable(actualTermsP).then(terms => {
            return E(installationP).checkPartialAmount(
              allegedLeftInviteAmount,
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

      const makeUniAssayConfig = makeUniAssayConfigMaker();

      const artMintP = makeMint('art', makeUniAssayConfig);
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
