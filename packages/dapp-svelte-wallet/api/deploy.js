/* global __dirname */
// @ts-nocheck
// Agoric wallet deployment script.
// FIXME: This is just hacked together for the legacy wallet.

import { E } from '@agoric/eventual-send';
import { assert, details as X } from '@agoric/assert';

export default async function deployWallet(
  homePromise,
  { bundleSource, pathResolve },
) {
  const home = await homePromise;
  // console.log('have home', home);
  const {
    agoric: { agoricNames, namesByAddress, board, faucet, zoe },
    local: { http, spawner, wallet: oldWallet },
  } = home;

  // Bundle the wallet sources.
  const bundle = await bundleSource(pathResolve(__dirname, './src/wallet.js'));

  // Install it on the local spawner.
  const walletInstall = E(spawner).install(bundle);

  // Wallet for both end-user client and dapp dev client
  const walletVat = await E(walletInstall).spawn({
    agoricNames,
    namesByAddress,
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
        const brandMatches = E(brand).isMyIssuer(issuer);
        assert(brandMatches, X`issuer was using a brand which was not its own`);
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

  // Get the payments that were given to us by the chain.
  const [importedPaymentInfo, tapPaymentInfo] = await Promise.all([
    walletToPaymentInfo(oldWallet),
    E(faucet).tapFaucet(),
  ]);
  const paymentInfo = [...importedPaymentInfo, ...tapPaymentInfo];

  // Claim the payments.
  const issuerToPetname = new Map();
  const issuerToPursePetnameP = new Map();
  const wallet = E(walletVat).getWallet();
  const walletAdmin = E(wallet).getAdminFacet();
  await Promise.all(
    paymentInfo.map(async ({ issuerPetname, issuer }) => {
      // Create some issuer petnames.
      if (issuerToPetname.has(issuer)) {
        return issuerToPetname.get(issuer);
      }
      issuerToPetname.set(issuer, issuerPetname);
      await E(walletAdmin).addIssuer(issuerPetname, issuer);
      return issuerToPetname.get(issuer);
    }),
  );

  await Promise.all(
    paymentInfo.map(async ({ pursePetname, issuer, payment, purse }) => {
      const issuerPetname = issuerToPetname.get(issuer);

      if (!payment && purse) {
        // Withdraw the payment from the purse.
        payment = E(purse)
          .getCurrentAmount()
          .then(amount => E(purse).withdraw(amount));
      }

      if (!issuerToPursePetnameP.has(issuer)) {
        issuerToPursePetnameP.set(
          issuer,
          E(walletAdmin)
            .makeEmptyPurse(issuerPetname, pursePetname, true)
            .then(
              _ => pursePetname,
              _ => pursePetname,
            ),
        );
      }
      if (!payment) {
        return;
      }
      pursePetname = await issuerToPursePetnameP.get(issuer);

      // Deposit payment.
      await E(walletAdmin).deposit(pursePetname, payment);
    }),
  );

  // Install our handlers.
  const bridgeURLHandler = await E(walletVat).getBridgeURLHandler();
  const walletURLHandler = walletVat;
  await E(http).registerWallet(wallet, walletURLHandler, bridgeURLHandler);
  await E(walletVat).setHTTPObject(http);
  console.log('Deployed Wallet!');
}
