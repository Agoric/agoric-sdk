# ERTP - Electronic Rights Transfer Protocol

Bitcoin has unspent transactions. Ethereum has account balances. Agoric
has ERTP. 

ERTP is a uniform way of transferring tokens and other digital
assets in JavaScript. All kinds of digital assets can be easily
created, but importantly, they can be transferred in exactly the same
ways, with exactly the same security properties. 

Learn more about [ERTP fundamentals like mints, assays, purses and payments](#a-quick-tutorial).

ERTP is also home to Zoe, our smart contract framework. Zoe enforces
what we call "offer-safety". Offer-safety means that a user of a smart
contract is guaranteed to either get what they wanted or get a refund.
Smart contracts built on Zoe can't steal a user's money, even if they
are buggy or malicious.

For smart contract developers, Zoe makes things easier. Zoe handles
escrowing and payouts and checks invariants like offer-safety and
conservation of supply, meaning that developers can just focus on the
particular logic of their contract. 

Learn more about how to write a smart contract on [Zoe](core/zoe/docs/zoe.md).

## A quick tutorial

Let's look at an example. In ERTP, all digital assets, including fungible and
non-fungible tokens, are created by a `mint`. Having access to the mint
gives you the power to create more digital assets of the same type at
will. For instance, let's say we want to create a new community
currency called 'BaytownBucks':

```js
const baytownBucksMint = makeMint('BaytownBucks');
```

Great! Now let's use our mint to create 1000 new BaytownBucks.

```js
const purse = baytownBucksMint.mint(1000, 'community treasury');
```

The act of minting created 1000 BaytownBucks and stored them together in a
`purse`. Purses in ERTP only hold one type of digital asset, so this
purse can only ever hold BaytownBucks.

Let's distribute the BaytownBucks to members of the community. To send
money in ERTP, we withdraw `payments` from purses. 

```js
const paymentForAlice = purse.withdraw(10, `alice's community money`);
```

Like our purse, this payment contains BaytownBucks, but unlike purses,
payments are used to represent tokens in transit. A payment can be
sent to someone else, a purse never should be. 

Now let's send the payment to Alice as message:

```
alice.receivePayment(paymentForAlice);
```

This may seem strange at first, but ERTP is built on top of [an
infrastructure](https://github.com/Agoric/SwingSet) in which
everything is an object. In this example, we have a reference to the
object `alice`, and can call her `receivePayment` to ask her to
receive this payment. Alice's methods are entirely up to her, and are
not part of ERTP.

## Security Properties

How does Alice know that she got paid real money? She could have been
sent fake money, or she could have been sent money that was
[double-spent](https://en.wikipedia.org/wiki/Double-spending). 

When Alice receives an alleged payment, she can call a method to know
that the alleged payment was valid, and get a new payment that is
exclusively hers:

```js
const myExclusivePayment = BaytownBucksAssay.claimAll(allegedPayment);
```

The BaytownBucksAssay is associated with the BaytownBucksMint, but
the assay is the public-facing version that is accessible to anyone.
By holding the reference to a mint, you can mint more tokens. By
holding a reference to the assay for a mint, you can check that a
payment is valid and exclusively claim it in a new payment to yourself. 

That's the basic use case for a fungible token. `makeMint` in
[mint.js](core/mint.js) takes
in an optional configuration that allows for many more possibilities. 

## Pixel Gallery Demo

To explore further types of digital assets, beyond fungible tokens, we
decided to create a demo for our
[testnet](https://github.com/Agoric/cosmic-swingset) in which users
can buy and sell the right to color a pixel on a webpage. Read [more
about the gallery](/GALLERY-README.md).

## Gotchas

When looking at the code in our [tests](test), you might see some new
concepts:

* __Vats__: All user code runs in what we call a `vat`. Within a vat,
  code is run synchronously. Communication with another vat happens
  asynchronously. The [SwingSet
  infrastructure](https://github.com/Agoric/SwingSet) creates the vats
  and makes communication between vats possible. 

* __E() and tildot (~.)__: Instead of `obj.foo()`, we can write
  `E(obj).foo()` or the syntactic sugar, `obj~.foo()` and get a promise
  for the result. The syntax means "deliver the message foo() to the
  actual object asynchronously, in its own turn, wherever and whenever
  it is, even if it is local." Using E or ~., you can talk
  asynchronously to local and remote objects in exactly the same way.

* __Presences__: Presences are our name for the local object that
  stands in for the remote object. If `obj` is a presence of a remote
  object, we can send messages to the remote object by using
  "~." on `obj`, as in the above example. 
