# Evaluator

The evaluator contract is a test contract that allows executing code. It is intended for testing. Note that it is only intended in local testnets for simplifying validation and testing, it **should never be run on public environments or mainnet**.

## Setup

1. Make sure you build the SDK and have `agoric`, `agd`, and `agops`.

2. Follow instructions in [../../multichain-testing/README.md](../../multichain-testing/README.md) to launch the Kubernetes cluster from the Starship process.

3. Run `(cd ../../multichain-testing && yarn test test/evaluator.test.ts -m noop)` to install the evaluator contract.

4. Import the `agoricsec1` key with `agd keys add agoricsec1 --recover`.
**Note:** You can alternatively use any of the accounts allowed in [`invitedOwners` in the proposal](./src/evaluator.builder.js#L15-L20)

5. Provision a smart-wallet:
In `../../multichain-testing`:
```
make fund-wallet COIN=20000000ubld ADDR=$(agd keys show -a agoricsec1)
```
```
agoric wallet provision --spend --account=$(agd keys show -a agoricsec1)
```

6. Claim the invitation to eval: `agops eval claim --from=agoricsec1 | agoric wallet send --from=agoricsec1 --offer=/dev/stdin`

7. Submit strings to evaluate with `agops eval offer --from=agoricsec1 'console.log("@@@ here we are!")' | agoric wallet send --from=agoricsec1 --offer=/dev/stdin`

You can grep for unique patterns in the code (e.g., "@@@") or contract output like "evaluating" or "evaluator replied with" in the agd logs, see [multichain-testing/README.md#logs](../../multichain-testing/README.md#logs):

```
2024-07-24T20:15:39.410Z SwingSet: vat: v50: wallet agoric1wh060h62uc7m98trnn49hx9x80sqwzyamguawq starting executeOffer eval-1721852138689
2024-07-24T20:15:39.634Z SwingSet: vat: v56: evaluating console.log("@@@ here we are!")
2024-07-24T20:15:39.643Z SwingSet: vat: v50: wallet agoric1wh060h62uc7m98trnn49hx9x80sqwzyamguawq eval-1721852138689 seated
2024-07-24T20:15:39.719Z SwingSet: vat: v1: @@@ here we are!
2024-07-24T20:15:39.740Z SwingSet: vat: v56: evaluator replied with undefined

```
