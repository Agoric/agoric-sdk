// @ts-nocheck
/* eslint-disable no-undef */

const swapAnchorForMintedSeat = async powers => {
  const {
    consume: { zoe, contractKits: contractKitsP, psmKit: psmKitP, agoricNames },
  } = powers;

  const [contractKits, psmKit, usdcIssuer, usdcBrand] = await Promise.all([
    contractKitsP,
    psmKitP,
    E(agoricNames).lookup('issuer', 'USDC'),
    E(agoricNames).lookup('brand', 'USDC'),
  ]);

  console.log('CONTRACT_KITS', contractKits);
  console.log('ISSUER', usdcIssuer);

  let govCreatorFacet;
  for (const { psmGovernorCreatorFacet, label } of psmKit.values()) {
    if (label === 'psm-IST-USDC') {
      govCreatorFacet = psmGovernorCreatorFacet;
      console.log('psm-IST-USDC found', label);
    }
  }

  const psmPublicFacet = await E(govCreatorFacet).getPublicFacet();

  let usdcMint;
  for (const { publicFacet, creatorFacet: mint } of contractKits.values()) {
    if (publicFacet === usdcIssuer) {
      usdcMint = mint;
      console.log('USDC found', mint);
      break;
    }
  }

  console.log('Minting USDC');
  assert(usdcMint, 'USDC mint not found');

  const amt = harden({ brand: usdcBrand, value: 500000n });
  const payment = await E(usdcMint).mintPayment(amt);

  const seat = E(zoe).offer(
    E(psmPublicFacet).makeWantMintedInvitation(),
    harden({
      give: { In: amt },
    }),
    harden({ In: payment }),
  );

  console.log(await E(seat).getPayouts());

  // We'll check for success in the tests that run this proposal by validating the metric values in
  // vstorage
  console.log('Done.');
};

swapAnchorForMintedSeat;
