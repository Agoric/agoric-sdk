# Agoric Javascript Smart Contract Platform

## Choose your Prerequisite

<details><summary>Run directly from NPM using `npx`</summary>
**NOTE: This doesn't work right now due to missing published packages.**

You will need a local installation of Node.js, at least version 11.

```sh
alias agoric='npx agoric'
```
</details>

<details><summary>Install from NPM globally on your host</summary>
**NOTE: This doesn't work right now due to missing published packages.**

You will need a local installation of Node.js, at least version 11.

```sh
npm install -g agoric
unalias agoric
```
</details>

<details><summary>Use as part of Agoric SDK</summary>

If you have cloned and installed the Agoric SDK as described by its [README](/Agoric/agoric-sdk/#readme), you can use the Agoric CLI directly.

```sh
alias agoric="/PATH/TO/agoric-sdk/packages/agoric-cli/bin/agoric --sdk"
```

If you want to modify the `template` directory used by Agoric SDK, you can `cd template` and skip to the `agoric install` stage below.  Then, iterate on editing the template and, when you're finished, create a PR from your changes.
</details>

## Your first Agoric dApp

Here is a simple script for how to get started.  Be sure to have run the appropriate instructions from the [above section](#Choose-your-Prerequisites).

```sh
# Initialize your dapp project.
# Note: Change the `demo` name to something meaningful.
agoric init demo
# Go to its directory.
cd demo
# Install Javascript dependencies.
agoric install
# Run the local vat machine, resetting to factory defaults.
# Leave off `--reset` if you want to resume where you left off.
agoric start --reset
# Now you can navigate to http://localhost:8000/

# Install your smart contract and web api
agoric deploy ./contract/deploy.js ./api/deploy.js
```
