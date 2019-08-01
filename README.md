# ERTP - Electronic Rights Transfer Protocol

Mark Miller explained ERTP on Oct 10, 2018 in his [Programming Secure Smart Contracts][watch] presentation
during San Francisco Blockchain Week at a
[SF Cryptocurrency Devs meetup](https://www.meetup.com/SF-Cryptocurrency-Devs/events/253457222/).

[![miller-sfbw-erights](https://user-images.githubusercontent.com/150986/59150095-b8a65200-89e3-11e9-9b5d-43a9be8a3c90.png)][watch]

_See also more [Agoric events](https://agoric.com/events/)._

## Install and Test

Note node >= 11.0 is required.

```
$ npm install
$ npm test
```

## Higher Order Smart Contracts

The `contractHost` tests detail the composition of a covered call option
with an escrow exchange contract.

```
npx tape -r esm test/swingsetTests/contractHost/test-contractHost.js
```

For more examples, please see the code for Alice and Bob in `test/swingsetTests/contractHost/`. 

![higher-order-smart-contract-covered-call-escrow](https://user-images.githubusercontent.com/150986/59150181-f3f55080-89e4-11e9-8046-fcb9c10831b1.png)

[watch]: https://www.youtube.com/watch?v=YXUqfgdDbr8
