/**
 * This file shows that using a payment as the extent of another payment is a bad idea
 * 
 * For this purpose, we have Alice who initially owns 1000 Money (which is a fungible asset)
 * She wants to buy a Vault from Joker for 100 Money. This Vault contains 1 Apple payment
 * 
 * The Vault is a non-fungible asset. Apples are fungible assets
 *  
 * A Vault is a payment. The extent of the Vault is an object with a single `open` method
 * This open method returns whatever is in the Vault
 * 
 * Joker will create the Vault
 * 
 */

import { assert } from "@agoric/assert";

// simple substitute for Zoe + SimpleExchange contract
function makeFakeSimpleExchange() {

  const issuerByBrand = new WeakMap()

  let firstAsset;
  let firstResolve;

  return harden({
    addIssuer(issuer){
      issuerByBrand.set(issuer.getBrand(), issuer)
    },
    place(payment) { // and trust that you'll be handed over what you want
      if(!firstAsset){
        // first person to place an asset to exchange
        return new Promise((resolve) => {
          firstResolve = resolve;

          // fakeSimpleExchange takes exclusive control of the asset
          firstAsset = issuerByBrand.get(payment.getAllegedBrand()).claim(payment)
        })
      }
      else{
        // second person to place an asset to exchange
        return new Promise((secondResolve) => {
          // acquiring exclusive access to the asset before swapping
          const secondAsset = issuerByBrand.get(payment.getAllegedBrand()).claim(payment)
          // if the previous line did not throw, both payments are in exclusive control
          // of fakeSimpleExchange
          
          // performing swap
          firstResolve(secondAsset)
          secondResolve(firstAsset)
        })
      }
    }
  })
}

function makeVault(content) {

  return harden({
    withdraw() {
      const _content = content
      content = undefined; // empty vault
      return _content;
    }
  })
}



test('A payment as extent of another payment is a bad idea', t => {
  t.plan(15776)

  // setup
  const {
    mint: moneyMint,
    issuer: moneyIssuer,
    amountMath: { make: money },
  } = produceIssuer('Money', 'nat');

  const {
    mint: appleMint,
    issuer: appleIssuer,
    amountMath: { make: apple },
  } = produceIssuer('Apple', 'nat');

  const {
    mint: vaultMint,
    issuer: vaultIssuer,
    amountMath: { make: vault, isEmpty: vaultIsEmpty },
  } = produceIssuer('Vault', 'set');

  const simpleExchange = makeFakeSimpleExchange()
  simpleExchange.addIssuer(moneyIssuer);
  simpleExchange.addIssuer(appleIssuer);
  simpleExchange.addIssuer(vaultIssuer);

  {
    // Joker part
    // It creates an Apple payment and places it in a Vault payment
    const applePayment = appleMint.mint(1)

    const vault = makeVault(applePayment)

    const vaultPayment = vaultMint.mint(harden([vault]))

    const moneyPaymentFromAliceP = simpleExchange.place(vaultPayment)

    moneyPaymentFromAliceP.then(payment => {
      // Joker recovers the Money payment
      const moneyPayment = moneyIssuer.claim(payment);
      assert(moneyPayment)

      // simpleExchange (like Zoe + simpleExchange contract) guarantees that
      // Joker does not have access to the vault any longer

      assert(vaultIsEmpty(vaultPayment))

      // ...however, Joker still has access to the Apple payment that was 
      // inside the vault!!
      // oh no! They can race against Alice to claim the payment before she does!

      const alsoApplePayment = appleIssuer.claim(applePayment);

      // Whoa, Joker has both the Money and the Apple!
      // That's really bad!
      assert(alsoApplePayment.extent, 1)
    })
  }

  {
    // Alice part
    // Per initial conditions, Alice starts with 1000 Money
    const aliceMoneyPurse = moneyIssuer.makeEmptyPurse()
    aliceMoneyPurse.deposit(moneyMint.mint(1000))

    const aliceMoneyPayment = aliceMoneyPurse.withdraw(money(100))

    const appleVaultFromJokerP = simpleExchange.place(aliceMoneyPayment)

    appleVaultFromJokerP.then(vaultPayment => {
      assert(vaultPayment)

      // wait a bit to open the vault
      // simpleExchange returned the vault. What bad thing could happen, right?
      // Waiting 100ms won't change a thing, right?
      setTimeout(() => {
        const vault = vaultIssuer.getAmount(vaultPayment).extent;
        const applePayment = vault.open()

        // just checkin' the Apple payment content casually
        assert(apple.extent, 0)
        // Oh noooooooooooo! where is the Apple i paid for???!!!

        // maybe my payment didn't go through and i still have my Money
        assert(aliceMoneyPayment, 0)
        // Noooooooooooooooooooooooooooooooooooo
        // https://tenor.com/view/no-theoffice-stevecarrell-michaelscott-gif-4652931
      }, 100)
    })
  }

  /**
   * Sadly for Alice, her Money is gone and she has no Apple. She only has access 
   * to a useless empty Vault
   * 
   * The vulnerability in the exchange lies in the fact that Joker keeps a reference 
   * to the 1-Apple payment. Even when the payment is inside the vault, Joker can 
   * gets the Apple content back.
   * 
   * A solution for this is to design smart contracts in a way that Zoe is the 
   * only party directly manipulating assets. Zoe is designed to handle assets on
   * behalf of users
   * Here, maybe the vault should be a Zoe contract instead of a pure-JavaScript 
   * object with methods
   * 
   * Another possible solution would be to implement the Vault in a way that it 
   * acquires exclusive access to the Apple payment upon creation
   * ... but that would be reimplementing parts of Zoe while Zoe already does 
   * this well
   * 
   */
})

