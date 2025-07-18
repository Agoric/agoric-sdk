# orch-skel - skeletal orchestration contract package

To develop an orchestration contract:
  1. make a rough sequence diagram - `test/my-orch-sequence.mmd`
  2. refine the sequence diagram to `@agoric/orchestration` objects and messages
  3. prototype each of the objects in the sequence diagram and make a test to exercise them - `test/my-orch-seq-sim.test.ts`
  4. refine the prototype into a contract (`src/my.contract.ts`) with flows (`my.flows.ts`) and make a test for it (`test/my-orch-contract.test.ts`)

## Install Dependencies

```
yarn install
```

## Run Static Checks

```console
yarn lint
```

## Run Tests

```console
yarn test
```

Don't be surprised by `Error#2: TODO!`: the contract and flows are incomplete.
