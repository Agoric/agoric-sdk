// @ts-nocheck
/* eslint-disable no-undef */

const addCollateral = async powers => {
  const {
    consume: {
      contractKits: contractKitsP,
      reserveKit: reserveKitP,
      zoe,
      agoricNames,
    },
  } = powers;

  const [contractKits, reserveKit, usdLemonsIssuer, usdLemonsBrand] =
    await Promise.all([
      contractKitsP,
      reserveKitP,
      E(agoricNames).lookup('issuer', 'USD_LEMONS'),
      E(agoricNames).lookup('brand', 'USD_LEMONS'),
    ]);

  console.log('[CONTRACT_KITS]', contractKits);
  console.log('[ISSUER]', usdLemonsIssuer);

  const { governorCreatorFacet } = reserveKit;

  const arPublicFacet = await E(governorCreatorFacet).getPublicFacet();
  const arLimitedFacet = await E(governorCreatorFacet).getCreatorFacet();

  let usdLemonsMint;
  for (const { publicFacet, creatorFacet: mint } of contractKits.values()) {
    if (publicFacet === usdLemonsIssuer) {
      usdLemonsMint = mint;
      console.log('USD_LEMONS found', mint);
      break;
    }
  }

  await E(arLimitedFacet).addIssuer(usdLemonsIssuer, 'USD_LEMONS');

  console.log('Minting USD_LEMONS');
  const amt = harden({ brand: usdLemonsBrand, value: 500000n });
  const helloPayment = await E(usdLemonsMint).mintPayment(amt);

  console.log('Adding to the reserve...');

  const seat = E(zoe).offer(
    E(arPublicFacet).makeAddCollateralInvitation(),
    harden({
      give: { Collateral: amt },
    }),
    harden({ Collateral: helloPayment }),
  );

  console.log(await E(seat).getOfferResult());
  console.log('Done.');
};

addCollateral;
