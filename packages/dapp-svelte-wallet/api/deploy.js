// @ts-nocheck
// Agoric wallet deployment script.
// FIXME: This is just hacked together for the legacy wallet.

import { E } from '@agoric/eventual-send';
import { assert } from '@agoric/assert';

export default async function deployWallet(
  homePromise,
  { bundleSource, pathResolve },
) {
  const home = await homePromise;
  // console.log('have home', home);
  const {
    agoric: { board, faucet, rendezvous, zoe },
    local: { http, spawner, wallet: oldWallet },
  } = home;

  // Bundle the wallet sources.
  const bundle = await bundleSource(pathResolve(__dirname, './src/wallet.js'));

  // Install it on the local spawner.
  const walletInstall = E(spawner).install(bundle);

  // Wallet for both end-user client and dapp dev client
  const walletVat = await E(walletInstall).spawn({
    zoe,
    board,
    faucet,
    rendezvous,
    http,
  });

  const walletToPaymentInfo = async wallet => {
    if (!wallet) {
      return [];
    }
    const [issuers, purses] = await Promise.all([
      E(wallet).getIssuers(),
      E(wallet).getPurses(),
    ]);
    const brandToIssuer = new Map();
    await Promise.all([
      issuers.map(async ([issuerPetname, issuer]) => {
        const brand = await E(issuer).getBrand();
        const brandMatches = E(brand).isMyIssuer(issuer);
        assert(brandMatches, `issuer was using a brand which was not its own`);
        brandToIssuer.set(brand, { issuerPetname, issuer });
      }),
    ]);
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
      issuerToPetname.set(issuer, issuerPetname);
      await E(wallet).addIssuer(issuerPetname, issuer);
      return issuerToPetname.get(issuer);
    }),
  );

  await Promise.all(
    paymentInfo.map(async ({ pursePetname, issuer, payment, purse }) => {
      const issuerPetname = issuerToPetname.get(issuer);

      let paymentP;

      if (!payment && purse) {
        // Withdraw the payment from the purse.
        paymentP = E(purse)
          .getCurrentAmount()
          .then(amount => E(purse).withdraw(amount));
      } else {
        paymentP = E(issuer)
          .isLive(payment)
          .then(isLive => isLive && payment);
      }

      payment = await paymentP;
      if (!payment) {
        return;
      }
      const amount = await E(issuer).getAmountOf(payment);

      // TODO: Use AmountMath.
      const isEmpty =
        amount.value === 0 ||
        (Array.isArray(amount.value) && !amount.value.length);
      if (isEmpty) {
        return;
      }
      if (!issuerToPursePetnameP.has(issuer)) {
        issuerToPursePetnameP.set(
          issuer,
          E(wallet)
            .makeEmptyPurse(issuerPetname, pursePetname)
            .then(
              _ => pursePetname,
              _ => pursePetname,
            ),
        );
      }
      pursePetname = await issuerToPursePetnameP.get(issuer);

      // Deposit payment.
      await E(wallet).deposit(pursePetname, payment);
    }),
  );

  // Install our handlers.
  const bridgeURLHandler = await E(walletVat).getBridgeURLHandler();
  const walletURLHandler = walletVat;
  await E(http).registerWallet(wallet, walletURLHandler, bridgeURLHandler);
  await E(walletVat).setHTTPObject(http);
  await E(walletVat).setPresences();
  console.log('Deployed Wallet!');
}
