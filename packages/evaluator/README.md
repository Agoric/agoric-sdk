## Evaluator

Follow instructions in ../../multichain-testing/README.md to launch the Kubernetes cluster from the Starship process.

Then, run `(cd ../../multichain-testing && yarn test test/evaluator.test.ts -m noop)` to install the evaluator contract.

Import the `agoricsec1` key with `agd keys add agoricsec1 --recover`.

Provision a smart-wallet:
```
make fund-wallet COIN=20000000ubld ADDR=$(agd keys show -a agoricsec1)
agoric wallet provision --spend --account=$(agd keys show -a agoricsec1)
```

Next, `agops eval claim --from=agoricsec1 | agoric wallet send --from=agoricsec1 --offer=/dev/stdin`

Finally, submit strings to evaluate with `agops eval offer --from=agoricsec1 'console.log("@@@ here we are!")' | agoric wallet send --from=agoricsec1 --offer=/dev/stdin`
