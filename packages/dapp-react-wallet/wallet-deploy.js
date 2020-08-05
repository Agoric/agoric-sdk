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

  const walletToPaymentInfo = async wallet => {
    if (!wallet) {
      return [];
    }
    const issuers = await E(wallet).getIssuers();
    const brandToIssuer = new Map();
    await Promise.all([
      issuers.map(async ([issuerPetname, issuer]) => {
        const brand = await E(issuer).getBrand();
        brandToIssuer.set(brand, { issuerPetname, issuer });
      }),
    ]);
    const purses = await E(wallet).getPurses();
    return Promise.all(
      purses.map(async ([pursePetname, purse]) => {
        const brand = await E(purse).getAllegedBrand();
        const { issuerPetname, issuer } = brandToIssuer.get(brand);
        return { issuerPetname, pursePetname, issuer, purse };
      }),
    );
  };

  const importedPaymentInfo = await walletToPaymentInfo(oldWallet);

  // Get the payments that were given to us by the chain.
  const tapPaymentInfo = await E(faucet).tapFaucet();
  const paymentInfo = [...importedPaymentInfo, ...tapPaymentInfo];

  // Claim the payments.
  const issuerToPetname = new Map();
  const issuerToPursePetnameP = new Map();
  const wallet = await E(walletVat).getWallet();
  await Promise.all(
    paymentInfo.map(async ({ issuerPetname, issuer }) => {
      // Create some issuer petnames.
      if (issuerToPetname.has(issuer)) {
        return issuerToPetname.get(issuer);
      }
      console.log('setting petname of', issuer, 'to', issuerPetname);
      issuerToPetname.set(issuer, issuerPetname);
      await E(wallet).addIssuer(issuerPetname, issuer);
      return issuerToPetname.get(issuer);
    }),
  );

  await Promise.all(
    paymentInfo.map(async ({ pursePetname, issuer, payment, purse }) => {
      const issuerPetname = issuerToPetname.get(issuer);

      if (!issuerToPursePetnameP.has(issuer)) {
        issuerToPursePetnameP.set(
          issuer,
          E(wallet)
            .makeEmptyPurse(issuerPetname, pursePetname)
            .then(_ => pursePetname),
        );
      }
      pursePetname = await issuerToPursePetnameP.get(issuer);

      let paymentP = payment;
      if (!paymentP) {
        // Withdraw the payment from the purse.
        paymentP = E(purse)
          .getCurrentAmount()
          .then(amount => E(purse).withdraw(amount));
      }

      // Deposit payment.
      const p = await paymentP;
      await E(wallet).deposit(pursePetname, p);
    }),
  );

  // Install our handlers.
  const bridgeURLHandler = await E(walletVat).getBridgeURLHandler();
  const walletURLHandler = walletVat;
  await E(http).registerWallet(wallet, walletURLHandler, bridgeURLHandler);
  await E(walletVat).setHTTPObject(http);
  await E(walletVat).setPresences();
  console.log('Deployed @agoric/wallet-frontend!');
}
