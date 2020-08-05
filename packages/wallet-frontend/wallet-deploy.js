// @ts-nocheck
// Agoric wallet deployment script.
// FIXME: This is just hacked together for the legacy wallet.

import { E } from '@agoric/eventual-send';

export default async function deployWallet(
  homePromise,
  { bundleSource, pathResolve },
) {
  const home = await homePromise;
  // console.log('have home', home);
  const {
    agoric: { board, faucet, zoe },
    local: { http, spawner, wallet: oldWallet },
  } = home;

  if (oldWallet) {
    console.log(`You already have a wallet installed.`);
    return 0;
  }

  // Bundle the wallet sources.
  const bundle = await bundleSource(pathResolve(__dirname, './lib/wallet.js'));

  // Install it on the local spawner.
  const walletInstall = E(spawner).install(bundle);

  // Wallet for both end-user client and dapp dev client
  const walletVat = await E(walletInstall).spawn({
    zoe,
    board,
    faucet,
    http,
  });

  // Get the payments that were given to us by the chain.
  const paymentInfo = await E(faucet).tapFaucet();

  // Claim the payments.
  const wallet = await E(walletVat).getWallet();
  await Promise.all(
    paymentInfo.map(
      async ({ issuerPetname, pursePetname, issuer, payment }) => {
        // Create some issuer petnames.
        await E(wallet).addIssuer(issuerPetname, issuer);
        // Make empty purses. Have some petnames for them.
        await E(wallet).makeEmptyPurse(issuerPetname, pursePetname);
        // Deposit payments.
        const p = await payment;
        await E(wallet).deposit(pursePetname, p);
      },
    ),
  );

  // Install our handlers.
  const bridgeURLHandler = await E(walletVat).getBridgeURLHandler();
  const walletURLHandler = walletVat;
  await E(http).registerWallet(wallet, walletURLHandler, bridgeURLHandler);
  await E(walletVat).setHTTPObject(http);
  await E(walletVat).setPresences();
  console.log('Deployed @agoric/wallet-frontend!');
}
