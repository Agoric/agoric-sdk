// @ts-nocheck
/* eslint-disable no-undef */
const PROVISIONING_POOL_ADDR = 'agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346';

const depositUsdLemons = async powers => {
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

  const [contractKits, usdLemonsIssuer, usdLemonsBrand, ppDepositFacet] =
    await Promise.all([
      contractKitsP,
      E(agoricNames).lookup('issuer', 'USD_LEMONS'),
      E(agoricNames).lookup('brand', 'USD_LEMONS'),
      getDepositFacet(PROVISIONING_POOL_ADDR),
    ]);

  console.log('[CONTRACT_KITS]', contractKits);
  console.log('[ISSUER]', usdLemonsIssuer);

  let usdLemonsMint;
  for (const { publicFacet, creatorFacet: mint } of contractKits.values()) {
    if (publicFacet === usdLemonsIssuer) {
      usdLemonsMint = mint;
      console.log('BINGO', mint);
      break;
    }
  }

  console.log('Minting USD_LEMONS');
  const helloPayment = await E(usdLemonsMint).mintPayment(
    harden({ brand: usdLemonsBrand, value: 500000n }),
  );

  console.log('Funding provision pool...');
  await E(ppDepositFacet).receive(helloPayment);

  console.log('Done.');
};

depositUsdLemons;
