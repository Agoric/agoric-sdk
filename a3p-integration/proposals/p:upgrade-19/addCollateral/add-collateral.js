// @ts-nocheck
/* eslint-disable no-undef */
const PROVISIONING_POOL_ADDR = 'agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346';

const addCollateral = async powers => {
  const {
    consume: {
      reserveKit: reserveKitP,
      namesByAddressAdmin: namesByAddressAdminP,
      agoricNames,
    },
  } = powers;

  const namesByAddressAdmin = await namesByAddressAdminP;

  const getDepositFacet = async address => {
    const hub = E(E(namesByAddressAdmin).lookupAdmin(address)).readonly();
    return E(hub).lookup('depositFacet');
  };

  const [reserveKit] = await Promise.all([reserveKitP]);

  const { adminFacet, instance } = reserveKit;

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

addCollateral;
