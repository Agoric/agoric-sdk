// @ts-nocheck
/* eslint-disable no-undef */
const GOV_ONE_ADDR = 'agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q';

const depositUsdOlives = async powers => {
  const {
    consume: {
      contractKits: contractKitsP,
      namesByAddressAdmin: namesByAddressAdminP,
      agoricNames,
    },
  } = powers;

  const namesByAddressAdmin = await namesByAddressAdminP;

  const getDepositFacet = async address => {
    const hub = E(E(namesByAddressAdmin).lookupAdmin(address)).readonly();
    return E(hub).lookup('depositFacet');
  };

  const [contractKits, usdOlivesIssuer, usdOlivesBrand, ppDepositFacet] =
    await Promise.all([
      contractKitsP,
      E(agoricNames).lookup('issuer', 'USD_OLIVES'),
      E(agoricNames).lookup('brand', 'USD_OLIVES'),
      getDepositFacet(GOV_ONE_ADDR),
    ]);

  console.log('[CONTRACT_KITS]', contractKits);
  console.log('[ISSUER]', usdOlivesIssuer);

  let usdOlivesMint;
  for (const { publicFacet, creatorFacet: mint } of contractKits.values()) {
    if (publicFacet === usdOlivesIssuer) {
      usdOlivesMint = mint;
      console.log('BINGO', mint);
      break;
    }
  }

  console.log('Minting USD_OLIVES');
  const helloPayment = await E(usdOlivesMint).mintPayment(
    harden({ brand: usdOlivesBrand, value: 1_000_000n }),
  );

  console.log('Funding provision pool...');
  await E(ppDepositFacet).receive(helloPayment);

  console.log('Done.');
};

depositUsdOlives;
