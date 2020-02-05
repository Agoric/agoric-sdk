// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import { makeMint } from '@agoric/ertp';
import { allComparable } from '@agoric/same-structure';
import { assert, details } from '@agoric/assert';
import { inviteConfig } from '@agoric/ertp/src/config/inviteConfig';

// eslint-disable-next-line import/no-unresolved, import/extensions
import escrowBundle from './bundle-escrow';

function build(E, log) {
  function testEscrowServiceMismatches(host, randMintP, artMintP) {
    log('starting testEscrowServiceCheckMismatches');
    const installationP = E(host).install(escrowBundle, 'module');
    const randUnitsP = E(E(randMintP).getAssay()).makeUnits(3);
    const blueBoyUnits = E(E(artMintP).getAssay()).makeUnits('Blue Boy');
    const blueGirlUnits = E(E(artMintP).getAssay()).makeUnits('Blue Girl');
    const actualTermsP = harden({
      left: randUnitsP,
      right: blueBoyUnits,
    });
    const allegedTermsP = harden({
      left: randUnitsP,
      right: blueGirlUnits,
    });
    const result = E(installationP)
      .spawn(actualTermsP)
      .then(({ rootObject }) => {
        const checkerInviteP = E(rootObject).checker();
        return E(E(rootObject).left())
          .getBalance()
          .then(allegedLeftInviteUnits => {
            return allComparable(allegedTermsP).then(terms =>
              E(E(host).redeem(checkerInviteP)).checkUnits(
                installationP,
                allegedLeftInviteUnits,
                terms,
                'left',
              ),
            );
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
    const installationP = E(host).install(escrowBundle, 'module');
    const randUnitsP = E(E(randMintP).getAssay()).makeUnits(3);
    const screamUnitsP = E(E(artMintP).getAssay()).makeUnits('The Scream');
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
      assert(r, details`expected successful check ${result}`);
    });
  }

  function testEscrowCheckPartialWrongPrice(host, randMintP, artMintP) {
    log('starting testEscrowServiceCheckPartial wrong price');
    const installationP = E(host).install(escrowBundle, 'module');
    const randUnitsP = E(E(randMintP).getAssay()).makeUnits(3);
    const otherRandUnitsP = E(E(randMintP).getAssay()).makeUnits(5);
    const blueBoyUnits = E(E(artMintP).getAssay()).makeUnits('Blue Boy');
    const actualTermsP = harden({
      left: randUnitsP,
      right: blueBoyUnits,
    });
    const result = E(installationP)
      .spawn(actualTermsP)
      .then(({ rootObject }) => {
        const checkerInviteP = E(rootObject).checker();
        return E(E(rootObject).left())
          .getBalance()
          .then(allegedLeftInviteUnits =>
            allComparable(otherRandUnitsP).then(otherLeftTerms => {
              return E(E(host).redeem(checkerInviteP)).checkPartialUnits(
                installationP,
                allegedLeftInviteUnits,
                otherLeftTerms,
                'left',
              );
            }),
          );
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
    const installationP = E(host).install(escrowBundle, 'module');
    const randUnitsP = E(E(randMintP).getAssay()).makeUnits(3);
    const blueBoyUnits = E(E(artMintP).getAssay()).makeUnits('Blue Boy');
    const blueGirlUnits = E(E(artMintP).getAssay()).makeUnits('Blue Girl');
    const actualTermsP = harden({
      left: randUnitsP,
      right: blueBoyUnits,
    });
    const result = E(installationP)
      .spawn(actualTermsP)
      .then(({ rootObject }) => {
        const leftInviteP = E(rootObject).left();
        return E(leftInviteP)
          .getBalance()
          .then(allegedLeftInviteUnits => {
            const checkerInviteP = E(rootObject).checker();
            const checker = E(host).redeem(checkerInviteP);
            return allComparable(blueGirlUnits).then(otherRightTerms =>
              E(checker).checkPartialUnits(
                installationP,
                allegedLeftInviteUnits,
                otherRightTerms,
                'right',
              ),
            );
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
    const installationP = E(host).install(escrowBundle, 'module');
    const randUnitsP = E(E(randMintP).getAssay()).makeUnits(3);
    const blueBoyUnits = E(E(artMintP).getAssay()).makeUnits('Blue Boy');
    const actualTermsP = harden({
      left: randUnitsP,
      right: blueBoyUnits,
    });
    const result = E(installationP)
      .spawn(actualTermsP)
      .then(({ rootObject }) => {
        const checkerInviteP = E(rootObject).checker();
        return E(E(rootObject).left())
          .getBalance()
          .then(allegedLeftInviteUnits => {
            return allComparable(actualTermsP).then(terms => {
              return E(E(host).redeem(checkerInviteP)).checkPartialUnits(
                installationP,
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
    async bootstrap(argv, vats, devices) {
      const randMintP = E(vats.mint).makeMint('rand');
      const adminVat = vats.vatAdmin;
      const adminServiceP = E(adminVat).createVatAdminService(devices.vatAdmin);
      const host = await E(vats.host).makeHost(adminServiceP);

      const artMintP = makeMint('art', inviteConfig);
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
